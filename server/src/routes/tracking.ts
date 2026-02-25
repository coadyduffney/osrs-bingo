import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase.js';
import { authMiddleware } from '../middleware/auth.js';
import { WiseOldManService } from '../services/wiseOldMan.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { isEventCreatorOrAdmin } from '../utils/permissions.js';
import { notifyTaskCompleted } from '../services/discord.js';
import type { EventDocument } from '../schemas/firestore.js';

const router = Router();
const womService = new WiseOldManService();

const DELAY_MS = 5500;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 10000;

// Simple in-memory cache for XP progress to reduce Firestore reads
const progressCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 300000; // 5 minutes cache

// In-flight request tracking to prevent duplicate concurrent requests
const inFlightProgressRequests = new Map<string, Promise<any>>();

function getCachedProgress(eventId: string): any | null {
  const cached = progressCache.get(eventId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedProgress(eventId: string, data: any): void {
  progressCache.set(eventId, { data, timestamp: Date.now() });
}

export function invalidateProgressCache(eventId: string): void {
  progressCache.delete(eventId);
}

// Use existing WiseOldMan group for all events (Bibzys Bingo)
const WOM_GROUP_ID = parseInt(process.env.WOM_GROUP_ID || '22343');
const WOM_VERIFICATION_CODE = process.env.WOM_VERIFICATION_CODE || '';

// Update player data via WOM group (queues updates for all members)
router.post('/:eventId/update-players', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user.id;

    // Get event and verify creator
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data() as EventDocument;
    if (!isEventCreatorOrAdmin(eventData, userId)) {
      return res.status(403).json({ error: 'Only event creator or admins can update player data' });
    }

    console.log(`🔄 Queueing player updates for group ${WOM_GROUP_ID}...`);
    
    const updateResult = await womService.updateGroup(WOM_GROUP_ID, WOM_VERIFICATION_CODE);
    
    if (!updateResult) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to queue player updates. Please try again.' 
      });
    }

    return res.json({
      success: true,
      data: {
        message: 'Player data update queued successfully',
        info: 'WiseOldMan will update players one by one. This may take a few minutes.',
        count: updateResult.count || 0
      },
    });
  } catch (error) {
    console.error('Error updating player data:', error);
    return next(error);
  }
});

// Start event tracking - snapshots all team members' XP
router.post('/:eventId/start', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user.id;

    // Get event and verify creator
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data() as EventDocument;
    if (!isEventCreatorOrAdmin(eventData, userId)) {
      return res.status(403).json({ error: 'Only event creator or admins can start tracking' });
    }

    if (eventData?.trackingEnabled) {
      return res.status(400).json({ error: 'Event tracking already started' });
    }

    // Get all teams in the event
    const teamsSnapshot = await db
      .collection('teams')
      .where('eventId', '==', eventId)
      .get();

    // Get all team members (users) with their RSNs
    const membersWithRSN: Array<{ userId: string; teamId: string; rsn: string }> = [];

    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const memberIds = teamData.memberIds || [];

      for (const memberId of memberIds) {
        const userDoc = await db.collection('users').doc(memberId).get();
        const userData = userDoc.data();

        if (userData?.rsn) {
          membersWithRSN.push({
            userId: memberId,
            teamId: teamDoc.id,
            rsn: userData.rsn,
          });
        }
      }
    }

    if (membersWithRSN.length === 0) {
      return res.status(400).json({
        error: 'No team members have RSN set. Players must add their RuneScape names first.',
      });
    }

    console.log(`📋 Starting tracking for ${membersWithRSN.length} players...`);

    // Update players individually with delays to avoid rate limiting - deduplicate RSNs first
    const allUsernames = membersWithRSN.map((m) => m.rsn);
    const usernames = [...new Set(allUsernames)]; // Remove duplicates
    console.log(`🔄 Updating ${usernames.length} unique players (from ${allUsernames.length} entries) individually...`);
    
    const batch = db.batch();
    const now = Timestamp.now();
    const failedPlayers: string[] = [];

    const updatePlayer = async (username: string): Promise<boolean> => {
      console.log(`  Updating and fetching snapshot for ${username}...`);
      const snapshot = await womService.updatePlayerAndGetSnapshot(username);
      
      if (snapshot) {
        const member = membersWithRSN.find(m => m.rsn === username);
        if (member) {
          const snapshotData = {
            eventId,
            teamId: member.teamId,
            userId: member.userId,
            rsn: username,
            snapshotType: 'baseline',
            capturedAt: now,
            skills: snapshot.skills,
            createdAt: now,
            updatedAt: now,
          };
          const snapshotRef = db.collection('playerSnapshots').doc();
          batch.set(snapshotRef, snapshotData);
        }
      }
      console.log(`  ✅ Updated ${username}`);
      return !!snapshot;
    };

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      let success = false;
      let lastError: string = '';

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          success = await updatePlayer(username);
          if (success) break;
        } catch (error: any) {
          lastError = error.message;
          console.error(`  ❌ Failed to update ${username} (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, lastError);
          
          if (attempt < MAX_RETRIES) {
            console.log(`  ⏳ Waiting ${RETRY_DELAY_MS/1000}s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      if (!success) {
        console.error(`  ❌ Failed to update ${username} after ${MAX_RETRIES + 1} attempts:`, lastError);
        failedPlayers.push(username);
      }
      
      if (i < usernames.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // Update event to enable tracking
    batch.set(eventRef, {
      trackingEnabled: true,
      eventStartedAt: now,
      updatedAt: now,
    }, { merge: true });

    await batch.commit();
    
    console.log(`✅ Tracking started for event ${eventId} with ${membersWithRSN.length} players`);
    
    // Verify the update worked
    const updatedEvent = await eventRef.get();
    console.log('Updated event trackingEnabled:', updatedEvent.data()?.trackingEnabled);

    return res.json({
      success: true,
      data: {
        message: 'Event tracking started',
        playersTracked: membersWithRSN.length,
        players: membersWithRSN.map((m) => m.rsn),
      },
    });
  } catch (error) {
    console.error('Error starting tracking:', error);
    return next(error);
  }
});

// End event tracking
router.post('/:eventId/end', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user.id;

    // Get event and verify creator
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data() as EventDocument;
    if (!isEventCreatorOrAdmin(eventData, userId)) {
      return res.status(403).json({ error: 'Only event creator or admins can end tracking' });
    }

    if (!eventData?.trackingEnabled) {
      return res.status(400).json({ error: 'Event tracking not active' });
    }

    // Get baseline snapshots to know who to update
    const baselineSnapshots = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('snapshotType', '==', 'baseline')
      .get();

    // Update players individually with delays for final snapshot - deduplicate RSNs first
    const allUsernames = baselineSnapshots.docs.map((doc) => doc.data().rsn);
    const usernames = [...new Set(allUsernames)]; // Remove duplicates
    console.log(`🔄 Updating ${usernames.length} unique players (from ${allUsernames.length} snapshots) individually for final snapshot...`);
    
    const batch = db.batch();
    const now = Timestamp.now();
    const failedPlayers: string[] = [];

    const updatePlayer = async (username: string): Promise<boolean> => {
      console.log(`  Updating and fetching snapshot for ${username}...`);
      const snapshot = await womService.updatePlayerAndGetSnapshot(username);

      if (snapshot) {
        const baselineDoc = baselineSnapshots.docs.find(doc => doc.data().rsn === username);
        if (baselineDoc) {
          const data = baselineDoc.data();
          const snapshotData = {
            eventId,
            teamId: data.teamId,
            userId: data.userId,
            rsn: username,
            snapshotType: 'current',
            capturedAt: now,
            skills: snapshot.skills,
            createdAt: now,
            updatedAt: now,
          };
          const snapshotRef = db.collection('playerSnapshots').doc();
          batch.set(snapshotRef, snapshotData);
        }
      }
      console.log(`  ✅ Updated ${username}`);
      return !!snapshot;
    };

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      let success = false;
      let lastError: string = '';

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          success = await updatePlayer(username);
          if (success) break;
        } catch (error: any) {
          lastError = error.message;
          console.error(`  ❌ Failed to update ${username} (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, lastError);
          
          if (attempt < MAX_RETRIES) {
            console.log(`  ⏳ Waiting ${RETRY_DELAY_MS/1000}s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      if (!success) {
        console.error(`  ❌ Failed to update ${username} after ${MAX_RETRIES + 1} attempts:`, lastError);
        failedPlayers.push(username);
      }
      
      if (i < usernames.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // Update event
    batch.set(eventRef, {
      trackingEnabled: false,
      eventEndedAt: now,
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    return res.json({ 
      success: true,
      data: { message: 'Event tracking ended' },
    });
  } catch (error) {
    return next(error);
  }
});

// Refresh current snapshots (can be called daily or on-demand)
router.post('/:eventId/refresh', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    // Get event
    const eventDoc = await db.collection('events').doc(eventId).get();

    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data();
    if (!eventData?.trackingEnabled) {
      return res.status(400).json({ error: 'Event tracking not active' });
    }

    // Get baseline snapshots to know who to update
    const baselineSnapshots = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('snapshotType', '==', 'baseline')
      .get();

    if (baselineSnapshots.empty) {
      return res.status(400).json({ error: 'No baseline snapshots found' });
    }

    // Delete old current snapshots
    const oldCurrentSnapshots = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('snapshotType', '==', 'current')
      .get();

    // Get all unique userIds from baselines
    const baselineData = baselineSnapshots.docs.map(doc => doc.data());
    const uniqueUserIds = [...new Set(baselineData.map(b => b.userId))];

    // Fetch current RSNs from users collection (in case players changed their RSN)
    const userDocs = await db.collection('users').where('id', 'in', uniqueUserIds).get();
    const userIdToRSN = new Map<string, string>();
    userDocs.forEach(doc => {
      const userData = doc.data();
      if (userData.rsn) {
        userIdToRSN.set(doc.id, userData.rsn);
      }
    });

    // Build map of old RSN -> new RSN for players who changed their name
    const rsnRemap = new Map<string, string>();
    baselineData.forEach(baseline => {
      const currentRSN = userIdToRSN.get(baseline.userId);
      if (currentRSN && currentRSN !== baseline.rsn) {
        console.log(`  📝 Player ${baseline.rsn} changed RSN to ${currentRSN}`);
        rsnRemap.set(baseline.rsn, currentRSN);
      }
    });

    // Get usernames - use remapped RSNs if available
    const usernames = baselineData.map(b => rsnRemap.get(b.rsn) || b.rsn);
    const uniqueUsernames = [...new Set(usernames)];
    console.log(`🔄 Refreshing ${uniqueUsernames.length} unique players (from ${baselineData.length} snapshots) individually...`);
    
    const newSnapshotsBatch = db.batch();
    const now = Timestamp.now();
    let playersUpdated = 0;
    const failedPlayers: string[] = [];

    const updatePlayer = async (username: string): Promise<boolean> => {
      console.log(`  Updating and fetching snapshot for ${username}...`);
      const snapshot = await womService.updatePlayerAndGetSnapshot(username);

      if (snapshot) {
        // Find baseline by matching either the new RSN or the old RSN
        const baselineDoc = baselineSnapshots.docs.find(doc => {
          const data = doc.data();
          return data.rsn === username || rsnRemap.get(data.rsn) === username;
        });
        if (baselineDoc) {
          const data = baselineDoc.data();
          const snapshotData = {
            eventId,
            teamId: data.teamId,
            userId: data.userId,
            rsn: username,
            snapshotType: 'current',
            capturedAt: now,
            skills: snapshot.skills,
            createdAt: now,
            updatedAt: now,
          };
          const snapshotRef = db.collection('playerSnapshots').doc();
          newSnapshotsBatch.set(snapshotRef, snapshotData);
          playersUpdated++;
        }
      }
      console.log(`  ✅ Updated ${username}`);
      return !!snapshot;
    };

    for (let i = 0; i < uniqueUsernames.length; i++) {
      const username = uniqueUsernames[i];
      let success = false;
      let lastError: string = '';

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          success = await updatePlayer(username);
          if (success) break;
        } catch (error: any) {
          lastError = error.message;
          console.error(`  ❌ Failed to update ${username} (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, lastError);
          
          if (attempt < MAX_RETRIES) {
            console.log(`  ⏳ Waiting ${RETRY_DELAY_MS/1000}s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      if (!success) {
        console.error(`  ❌ Failed to update ${username} after ${MAX_RETRIES + 1} attempts:`, lastError);
        failedPlayers.push(username);
      }
      
      if (i < usernames.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // Only delete old snapshots AFTER all new ones are created
    // This way we don't lose data if something fails
    if (failedPlayers.length > 0) {
      console.warn(`⚠️ Failed to update ${failedPlayers.length} players (${failedPlayers.join(', ')}), keeping their old snapshots`);
    }

    // First commit new snapshots
    if (playersUpdated > 0) {
      console.log(`💾 Saving ${playersUpdated} new snapshots...`);
      await newSnapshotsBatch.commit();
      
      // Then delete old ones - but only for successful updates
      const failedSet = new Set(failedPlayers);
      const oldSnapshotsToDelete = oldCurrentSnapshots.docs
        .filter(doc => !failedSet.has(doc.data().rsn))
        .map(doc => doc.ref);
      
      if (oldSnapshotsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${oldSnapshotsToDelete.length} old current snapshots (for successful updates)...`);
        const deleteBatch = db.batch();
        oldSnapshotsToDelete.forEach(ref => deleteBatch.delete(ref));
        await deleteBatch.commit();
      }
    } else {
      console.log(`⚠️ No snapshots were updated, not deleting old ones`);
    }

    // Emit Socket.IO event to notify clients to refresh their XP data
    const io = (req.app as any).get('io');
    if (io && playersUpdated > 0) {
      io.to(`event-${eventId}`).emit('xp-snapshots-refreshed', {
        eventId,
        playersUpdated,
      });
    }

    // Invalidate progress cache so next request fetches fresh data
    invalidateProgressCache(eventId);

    return res.json({
      success: true,
      data: {
        message: 'Snapshots refreshed',
        playersUpdated: playersUpdated,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// Get XP progress for an event
router.get('/:eventId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    // Check cache first
    const cached = getCachedProgress(eventId);
    if (cached) {
      return res.json(cached);
    }

    // Check if there's already an in-flight request for this event
    const existingRequest = inFlightProgressRequests.get(eventId);
    if (existingRequest) {
      console.log(`⏳ Waiting for in-flight progress request for event ${eventId}`);
      const result = await existingRequest;
      return res.json(result);
    }

    // Create new request promise
    const requestPromise = (async () => {
      // Get all baseline and current snapshots
      const snapshotsSnapshot = await db
        .collection('playerSnapshots')
        .where('eventId', '==', eventId)
        .get();

      const baselines = new Map();
      const currents = new Map();

      snapshotsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const key = `${data.teamId}-${data.userId}`;

        if (data.snapshotType === 'baseline') {
          baselines.set(key, data);
        } else if (data.snapshotType === 'current') {
          currents.set(key, data);
        }
      });

      // Calculate gains per team
      const teamGains = new Map();

      baselines.forEach((baseline, key) => {
        const current = currents.get(key);
        if (!current) return;

        const teamId = baseline.teamId;
        if (!teamGains.has(teamId)) {
          teamGains.set(teamId, {
          teamId,
          members: [],
          totalGains: {},
        });
      }

      const memberGains: any = {
        userId: baseline.userId,
        rsn: baseline.rsn,
        gains: {},
      };

      // Calculate skill gains
      for (const skill in baseline.skills) {
        const baseXP = baseline.skills[skill].experience;
        const currentXP = current.skills[skill]?.experience || baseXP;
        const gain = currentXP - baseXP;

        memberGains.gains[skill] = {
          baseXP,
          currentXP,
          gain,
        };

        // Add to team totals
        const teamData = teamGains.get(teamId);
        if (!teamData.totalGains[skill]) {
          teamData.totalGains[skill] = 0;
        }
        teamData.totalGains[skill] += gain;
      }

        teamGains.get(teamId).members.push(memberGains);
      });

      const response = {
        success: true,
        data: {
          eventId,
          teams: Array.from(teamGains.values()),
        },
      };

      // Cache the response
      setCachedProgress(eventId, response);
      return response;
    })();

    // Store the in-flight request
    inFlightProgressRequests.set(eventId, requestPromise);

    try {
      const result = await requestPromise;
      return res.json(result);
    } finally {
      // Clean up the in-flight request
      inFlightProgressRequests.delete(eventId);
    }
  } catch (error) {
    return next(error);
  }
});

// Check and auto-complete XP-based tasks
router.post('/:eventId/check-xp-tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    // Get all XP-based tasks for this event
    const tasksSnapshot = await db
      .collection('tasks')
      .where('eventId', '==', eventId)
      .where('isXPTask', '==', true)
      .get();

    if (tasksSnapshot.empty) {
      return res.json({
        success: true,
        data: {
          message: 'No XP-based tasks found',
          completedTasks: [],
        },
      });
    }

    // Get progress data
    const snapshotsSnapshot = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .get();

    const baselines = new Map();
    const currents = new Map();

    snapshotsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.teamId}-${data.userId}`;

      if (data.snapshotType === 'baseline') {
        baselines.set(key, data);
      } else if (data.snapshotType === 'current') {
        currents.set(key, data);
      }
    });

    // Calculate team XP gains
    const teamGains = new Map<string, { [skill: string]: number }>();
    const playerGains = new Map<string, { teamId: string; userId: string; rsn: string; gains: { [skill: string]: number } }>();

    baselines.forEach((baseline, key) => {
      const current = currents.get(key);
      if (!current) return;

      const teamId = baseline.teamId;
      if (!teamGains.has(teamId)) {
        teamGains.set(teamId, {});
      }

      const gains = teamGains.get(teamId)!;
      const individualGains: { [skill: string]: number } = {};

      // Calculate skill gains
      for (const skill in baseline.skills) {
        const baseXP = baseline.skills[skill].experience;
        const currentXP = current.skills[skill]?.experience || baseXP;
        const gain = currentXP - baseXP;

        if (!gains[skill]) {
          gains[skill] = 0;
        }
        gains[skill] += gain;
        individualGains[skill] = gain;
      }

      // Store individual player gains
      playerGains.set(key, {
        teamId,
        userId: baseline.userId,
        rsn: baseline.rsn,
        gains: individualGains,
      });
    });

    // Check each task and auto-complete if requirement met
    const completedTasks: Array<{ taskId: string; teamId: string; skill: string; gained: number; required: number }> = [];
    const batch = db.batch();

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      if (!task.xpRequirement) continue;

      const { skill, amount } = task.xpRequirement;

      // Check each team's progress
      teamGains.forEach((gains, teamId) => {
        const skillGain = gains[skill.toLowerCase()] || 0;

        // If team gained enough XP and hasn't completed this task yet
        if (skillGain >= amount && !task.completedByTeamIds.includes(teamId)) {
          // Find the player who contributed the most XP for this skill
          let topContributor: { userId: string; rsn: string; gain: number } | null = null;
          
          playerGains.forEach((player) => {
            if (player.teamId === teamId) {
              const playerSkillGain = player.gains[skill.toLowerCase()] || 0;
              if (!topContributor || playerSkillGain > topContributor.gain) {
                topContributor = {
                  userId: player.userId,
                  rsn: player.rsn,
                  gain: playerSkillGain,
                };
              }
            }
          });

          const now = Timestamp.now();

          // Mark task as completed
          batch.update(taskDoc.ref, {
            completedByTeamIds: [...task.completedByTeamIds, teamId],
            updatedAt: now,
          });

          // Update team's completed tasks
          const teamRef = db.collection('teams').doc(teamId);
          batch.update(teamRef, {
            completedTaskIds: FieldValue.arrayUnion(taskDoc.id) as any,
            score: FieldValue.increment(task.points) as any,
            updatedAt: now,
          });

          // Create task completion record (assign to top contributor)
          if (topContributor) {
            const completionRef = db.collection('taskCompletions').doc();
            batch.set(completionRef, {
              id: completionRef.id,
              taskId: taskDoc.id,
              teamId,
              eventId,
              completedBy: topContributor.userId,
              completedAt: now,
              points: task.points,
              verified: true,
              verificationNote: `Auto-completed via XP tracking (${topContributor.rsn} gained ${topContributor.gain.toLocaleString()} ${skill} XP)`,
              createdAt: now,
              updatedAt: now,
            });
          }

          completedTasks.push({
            taskId: taskDoc.id,
            teamId,
            skill: skill.toLowerCase(),
            gained: skillGain,
            required: amount,
          });
        }
      });
    }

    if (completedTasks.length > 0) {
      await batch.commit();

      // Emit Socket.IO events to all clients in the event room
      const io = (req.app as any).get('io');
      if (io) {
        for (const completed of completedTasks) {
          // Fetch the updated task
          const updatedTaskDoc = await db.collection('tasks').doc(completed.taskId).get();
          const updatedTask = updatedTaskDoc.data();
          
          if (updatedTask) {
            // Get team name for Discord notification
            let teamName = 'Unknown Team';
            try {
              const teamDoc = await db.collection('teams').doc(completed.teamId).get();
              if (teamDoc.exists) {
                teamName = teamDoc.data()?.name || teamName;
              }
            } catch (err) {
              console.error('Error fetching team for Discord notification:', err);
            }

            // Send Discord notification for auto-completed XP task
            notifyTaskCompleted(
              teamName,
              `⚡ ${updatedTask.title} (XP: ${completed.skill})`,
              updatedTask.points
            );

            io.to(`event-${eventId}`).emit('task-completed', {
              task: { id: completed.taskId, ...updatedTask },
              teamId: completed.teamId,
            });
          }
        }
      }
    }

    return res.json({
      success: true,
      data: {
        message: `Checked ${tasksSnapshot.size} XP tasks, auto-completed ${completedTasks.length}`,
        completedTasks,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
