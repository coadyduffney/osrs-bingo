import { db } from '../config/firebase.js';
import type { TaskCompletionDocument, TaskDocument, EventDocument } from '../schemas/firestore.js';

/**
 * Query and display all tasks completed by a specific user
 * Usage: npm run script src/scripts/getUserCompletions.ts -- <username>
 */
async function getUserCompletions(username: string) {
  try {
    console.log(`🔍 Searching for user: ${username}\n`);

    // Find user by username
    const usersSnapshot = await db
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`❌ User "${username}" not found`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`✅ Found user: ${userData.displayName || userData.username} (ID: ${userId})`);
    console.log(`📧 Email: ${userData.email}\n`);

    // Query all task completions by this user for specific event
    const eventId = 'Pit5RcAkebJ8mFSZ0gMQ';
    const completionsSnapshot = await db
      .collection('taskCompletions')
      .where('completedBy', '==', userId)
      .where('eventId', '==', eventId)
      .orderBy('completedAt', 'desc')
      .get();

    if (completionsSnapshot.empty) {
      console.log(`📝 No completed tasks found for ${username} in event ID: ${eventId}`);
      return;
    }

    console.log(`🎯 Found ${completionsSnapshot.size} completed task(s):\n`);
    console.log('='.repeat(80));

    // Fetch and display details for each completion
    for (const completionDoc of completionsSnapshot.docs) {
      const completion = completionDoc.data() as TaskCompletionDocument;

      // Fetch task details
      const taskDoc = await db.collection('tasks').doc(completion.taskId).get();
      const task = taskDoc.exists ? (taskDoc.data() as TaskDocument) : null;

      // Fetch event details
      const eventDoc = await db.collection('events').doc(completion.eventId).get();
      const event = eventDoc.exists ? (eventDoc.data() as EventDocument) : null;

      // Fetch team details
      const teamDoc = await db.collection('teams').doc(completion.teamId).get();
      const team = teamDoc.exists ? teamDoc.data() : null;

      // Format completion date
      const completedDate = completion.completedAt?.toDate
        ? completion.completedAt.toDate().toLocaleString()
        : 'Unknown';

      console.log(`\n📌 Completion ID: ${completion.id}`);
      console.log(`   Event: ${event?.name || 'Unknown Event'} (${completion.eventId})`);
      console.log(`   Team: ${team?.name || 'Unknown Team'} (${completion.teamId})`);
      console.log(`   Task: ${task?.title || 'Unknown Task'}`);
      console.log(`   Description: ${task?.description || 'N/A'}`);
      console.log(`   Points: ${completion.points}`);
      console.log(`   Completed At: ${completedDate}`);
      console.log(`   Verified: ${completion.verified ? '✓ Yes' : '✗ No'}`);
      
      if (completion.verificationNote) {
        console.log(`   Note: ${completion.verificationNote}`);
      }
      
      if (completion.verificationImageUrl) {
        console.log(`   Image: ${completion.verificationImageUrl}`);
      }

      console.log('-'.repeat(80));
    }

    // Summary statistics
    const totalPoints = completionsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().points || 0),
      0
    );
    const verifiedCount = completionsSnapshot.docs.filter(
      (doc) => doc.data().verified
    ).length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Completions: ${completionsSnapshot.size}`);
    console.log(`   Total Points: ${totalPoints}`);
    console.log(`   Verified: ${verifiedCount}/${completionsSnapshot.size}`);
    console.log(`   Unverified: ${completionsSnapshot.size - verifiedCount}`);

    // Group by event
    const eventMap = new Map<string, number>();
    for (const doc of completionsSnapshot.docs) {
      const completion = doc.data();
      const eventId = completion.eventId;
      eventMap.set(eventId, (eventMap.get(eventId) || 0) + 1);
    }

    if (eventMap.size > 0) {
      console.log(`\n📅 COMPLETIONS BY EVENT:`);
      for (const [eventId, count] of eventMap.entries()) {
        const eventDoc = await db.collection('events').doc(eventId).get();
        const eventName = eventDoc.exists ? eventDoc.data()?.name : 'Unknown Event';
        console.log(`   ${eventName}: ${count} task(s)`);
      }
    }

  } catch (error) {
    console.error('❌ Error querying completions:', error);
    throw error;
  }
}

// Main execution
const username = process.argv[2] || 'Snibzy';

getUserCompletions(username)
  .then(() => {
    console.log('\n✅ Query completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Query failed:', error);
    process.exit(1);
  });
