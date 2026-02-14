import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase.js';
import { authMiddleware } from '../middleware/auth.js';
import { WiseOldManService } from '../services/wiseOldMan.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const router = Router();
const womService = new WiseOldManService();

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

    const eventData = eventDoc.data();
    if (eventData?.creatorId !== userId) {
      return res.status(403).json({ error: 'Only event creator can update player data' });
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

    const eventData = eventDoc.data();
    if (eventData?.creatorId !== userId) {
      return res.status(403).json({ error: 'Only event creator can start tracking' });
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

    // Update all players via existing WiseOldMan group (single API call)
    const usernames = membersWithRSN.map((m) => m.rsn);
    console.log(`🔄 Updating ${usernames.length} players via group ${WOM_GROUP_ID}...`);
    
    const updateResult = await womService.updateGroup(WOM_GROUP_ID, WOM_VERIFICATION_CODE);
    if (!updateResult) {
      console.warn('⚠️  Group update failed, continuing with stale data');
    }

    // Wait for WOM to process the updates
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create baseline snapshots for all members
    const batch = db.batch();
    const now = Timestamp.now();

    for (const member of membersWithRSN) {
      try {
        const snapshot = await womService.getLatestSnapshot(member.rsn);

        if (snapshot) {
          const snapshotData = {
            eventId,
            teamId: member.teamId,
            userId: member.userId,
            rsn: member.rsn,
            snapshotType: 'baseline',
            capturedAt: now,
            skills: snapshot.skills,
            createdAt: now,
            updatedAt: now,
          };

          const snapshotRef = db.collection('playerSnapshots').doc();
          batch.set(snapshotRef, snapshotData);
        }
      } catch (error) {
        console.error(`Failed to get snapshot for ${member.rsn}:`, error);
        // Continue with other players
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

    const eventData = eventDoc.data();
    if (eventData?.creatorId !== userId) {
      return res.status(403).json({ error: 'Only event creator can end tracking' });
    }

    if (!eventData?.trackingEnabled) {
      return res.status(400).json({ error: 'Event tracking not active' });
    }

    // Update all players one final time using the group
    console.log(`🔄 Updating group ${WOM_GROUP_ID} for final snapshot...`);
    await womService.updateGroup(WOM_GROUP_ID, WOM_VERIFICATION_CODE);
    // Wait for WOM to process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create final current snapshots
    const baselineSnapshots = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('snapshotType', '==', 'baseline')
      .get();

    const batch = db.batch();
    const now = Timestamp.now();

    for (const doc of baselineSnapshots.docs) {
      const data = doc.data();
      try {
        const snapshot = await womService.getLatestSnapshot(data.rsn);

        if (snapshot) {
          const snapshotData = {
            eventId,
            teamId: data.teamId,
            userId: data.userId,
            rsn: data.rsn,
            snapshotType: 'current',
            capturedAt: now,
            skills: snapshot.skills,
            createdAt: now,
            updatedAt: now,
          };

          const snapshotRef = db.collection('playerSnapshots').doc();
          batch.set(snapshotRef, snapshotData);
        }
      } catch (error) {
        console.error(`Failed to get final snapshot for ${data.rsn}:`, error);
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

    const deleteBatch = db.batch();
    oldCurrentSnapshots.docs.forEach((doc) => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();

    // Update players in WOM using the existing group (much faster!)
    const usernames = baselineSnapshots.docs.map((doc) => doc.data().rsn);
    console.log(`🔄 Refreshing ${usernames.length} players via group ${WOM_GROUP_ID}...`);
    await womService.updateGroup(WOM_GROUP_ID, WOM_VERIFICATION_CODE);

    // Wait for WOM to process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create new current snapshots
    const batch = db.batch();
    const now = Timestamp.now();

    for (const doc of baselineSnapshots.docs) {
      const data = doc.data();
      try {
        const snapshot = await womService.getLatestSnapshot(data.rsn);

        if (snapshot) {
          const snapshotData = {
            eventId,
            teamId: data.teamId,
            userId: data.userId,
            rsn: data.rsn,
            snapshotType: 'current',
            capturedAt: now,
            skills: snapshot.skills,
            createdAt: now,
            updatedAt: now,
          };

          const snapshotRef = db.collection('playerSnapshots').doc();
          batch.set(snapshotRef, snapshotData);
        }
      } catch (error) {
        console.error(`Failed to refresh snapshot for ${data.rsn}:`, error);
      }
    }

    await batch.commit();

    return res.json({
      success: true,
      data: {
        message: 'Snapshots refreshed',
        playersUpdated: baselineSnapshots.size,
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

    return res.json({
      success: true,
      data: {
        eventId,
        teams: Array.from(teamGains.values()),
      },
    });
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

    baselines.forEach((baseline, key) => {
      const current = currents.get(key);
      if (!current) return;

      const teamId = baseline.teamId;
      if (!teamGains.has(teamId)) {
        teamGains.set(teamId, {});
      }

      const gains = teamGains.get(teamId)!;

      // Calculate skill gains
      for (const skill in baseline.skills) {
        const baseXP = baseline.skills[skill].experience;
        const currentXP = current.skills[skill]?.experience || baseXP;
        const gain = currentXP - baseXP;

        if (!gains[skill]) {
          gains[skill] = 0;
        }
        gains[skill] += gain;
      }
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
          // Mark task as completed
          batch.update(taskDoc.ref, {
            completedByTeamIds: [...task.completedByTeamIds, teamId],
            updatedAt: Timestamp.now(),
          });

          // Update team's completed tasks
          const teamRef = db.collection('teams').doc(teamId);
          batch.update(teamRef, {
            completedTaskIds: FieldValue.arrayUnion(taskDoc.id) as any,
            score: FieldValue.increment(task.points) as any,
            updatedAt: Timestamp.now(),
          });

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
