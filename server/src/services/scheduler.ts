import cron, { ScheduledTask } from 'node-cron';
import cronParser from 'cron-parser';
import { db } from '../config/firebase.js';
import { WiseOldManService } from './wiseOldMan.js';
import { Timestamp } from 'firebase-admin/firestore';

const womService = new WiseOldManService();
const DELAY_MS = 5500; // Delay between each player's update

interface ScheduledJob {
  eventId: string;
  task: ScheduledTask;
}

const scheduledJobs: ScheduledJob[] = [];

export function startScheduler() {
  console.log('⏰ XP Refresh Scheduler started');
  loadScheduledJobs();
  
  // Re-check every minute for new/changed schedules
  setInterval(loadScheduledJobs, 60000);
}

async function loadScheduledJobs() {
  try {
    // Get all events with a refresh schedule (query without composite index)
    const eventsSnapshot = await db
      .collection('events')
      .where('refreshSchedule', '!=', null)
      .get();

    // Filter in JavaScript to avoid needing composite index
    const validEvents = eventsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.status === 'active' && data.trackingEnabled === true && data.refreshSchedule;
    });

    const dbEventIds = new Set(validEvents.map((d) => d.id));

    // Remove jobs for events that no longer have schedules
    for (const job of scheduledJobs) {
      if (!dbEventIds.has(job.eventId)) {
        console.log(`🗑️ Removing scheduled job for event ${job.eventId}`);
        job.task.stop();
        scheduledJobs.splice(scheduledJobs.indexOf(job), 1);
      }
    }

    // Add or update jobs
    for (const eventDoc of validEvents) {
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;
      const cronExpression = eventData.refreshSchedule;

      if (!cronExpression || !cron.validate(cronExpression)) {
        console.warn(`⚠️ Invalid cron expression for event ${eventId}: ${cronExpression}`);
        continue;
      }

      const existingJob = scheduledJobs.find((j) => j.eventId === eventId);

      if (!existingJob) {
        // Create new job
        console.log(`📅 Scheduling XP refresh for event ${eventId} with schedule: ${cronExpression}`);
        const task = cron.schedule(cronExpression, () => {
          refreshEventSnapshots(eventId);
        });
        scheduledJobs.push({ eventId, task });
      }
    }
  } catch (error) {
    console.error('❌ Error loading scheduled jobs:', error);
  }
}

export function reloadScheduledJobs() {
  console.log('🔄 Reloading scheduled jobs...');
  // Stop all existing jobs
  for (const job of scheduledJobs) {
    job.task.stop();
  }
  scheduledJobs.length = 0;
  // Reload from database
  loadScheduledJobs();
}

export async function refreshEventSnapshots(eventId: string): Promise<{ success: boolean; playersUpdated?: number; error?: string }> {
  try {
    console.log(`🔄 Starting scheduled XP refresh for event ${eventId}`);

    const eventDoc = await db.collection('events').doc(eventId).get();

    if (!eventDoc.exists) {
      return { success: false, error: 'Event not found' };
    }

    const eventData = eventDoc.data();
    if (!eventData?.trackingEnabled) {
      return { success: false, error: 'Event tracking not active' };
    }

    const baselineSnapshots = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('snapshotType', '==', 'baseline')
      .get();

    if (baselineSnapshots.empty) {
      return { success: false, error: 'No baseline snapshots found' };
    }

    const oldCurrentSnapshots = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('snapshotType', '==', 'current')
      .get();

    // DON'T delete old snapshots yet - we'll do it after creating new ones
    // This prevents data loss if the update fails partway through
    const oldSnapshotRefs = oldCurrentSnapshots.docs.map(doc => doc.ref);

    const allUsernames = baselineSnapshots.docs.map((doc) => doc.data().rsn);
    const usernames = [...new Set(allUsernames)];
    console.log(`🔄 Refreshing ${usernames.length} unique players for event ${eventId}...`);

    const batch = db.batch();
    const now = Timestamp.now();
    const processedRSNs = new Set<string>();
    const failedPlayers: string[] = [];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      try {
        console.log(`  🔄 [${i + 1}/${usernames.length}] Updating and fetching snapshot for ${username}...`);
        const snapshot = await womService.updatePlayerAndGetSnapshot(username);

        if (snapshot) {
          processedRSNs.add(username);
          
          // Find the baseline snapshot for this player to get teamId and userId
          const baselineDoc = baselineSnapshots.docs.find(
            (doc) => doc.data().rsn === username
          );
          
          if (baselineDoc) {
            const baselineData = baselineDoc.data();
            const snapshotData = {
              eventId,
              teamId: baselineData.teamId,
              userId: baselineData.userId,
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
          console.log(`  ✅ Updated ${username}`);
        }

        // Wait between each player to avoid rate limiting
        if (i < usernames.length - 1) {
          console.log(`  ⏳ Waiting ${DELAY_MS/1000}s before next player...`);
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to update ${username}:`, error.message);
        failedPlayers.push(username);
        // Still wait even on failure to avoid hammering the API
        if (i < usernames.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    // Save new snapshots first
    await batch.commit();

    // Then delete old snapshots - but only for players that were successfully updated
    // Keep old snapshots for failed players so they don't lose data
    if (failedPlayers.length > 0) {
      console.warn(`⚠️ Failed to update ${failedPlayers.length} players (${failedPlayers.join(', ')}), keeping their old snapshots`);
      
      // Find which old snapshots to delete (all except failed players)
      const failedSet = new Set(failedPlayers);
      const oldSnapshotsToDelete = oldCurrentSnapshots.docs
        .filter(doc => !failedSet.has(doc.data().rsn))
        .map(doc => doc.ref);
      
      if (oldSnapshotsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${oldSnapshotsToDelete.length} old current snapshots (for successful updates)...`);
        const deleteBatch = db.batch();
        oldSnapshotsToDelete.forEach((ref) => {
          deleteBatch.delete(ref);
        });
        await deleteBatch.commit();
      }
    } else {
      // All updates succeeded, delete all old snapshots
      if (oldSnapshotRefs.length > 0) {
        console.log(`🗑️ Deleting ${oldSnapshotRefs.length} old current snapshots...`);
        const deleteBatch = db.batch();
        oldSnapshotRefs.forEach((ref) => {
          deleteBatch.delete(ref);
        });
        await deleteBatch.commit();
      }
    }

    console.log(`✅ Scheduled XP refresh completed for event ${eventId}, ${processedRSNs.size} players updated`);
    return { success: true, playersUpdated: processedRSNs.size };
  } catch (error: any) {
    console.error(`❌ Scheduled XP refresh failed for event ${eventId}:`, error);
    return { success: false, error: error.message };
  }
}

export function stopAllJobs() {
  for (const job of scheduledJobs) {
    job.task.stop();
  }
  scheduledJobs.length = 0;
  console.log('⏹️ All scheduled jobs stopped');
}

export function getScheduledJobs() {
  return scheduledJobs.map((j) => j.eventId);
}

export function getNextRunTime(cronExpression: string): Date | null {
  try {
    const interval = cronParser.parseExpression(cronExpression);
    return interval.next().toDate();
  } catch (error) {
    console.error('Error parsing cron expression:', error);
    return null;
  }
}
