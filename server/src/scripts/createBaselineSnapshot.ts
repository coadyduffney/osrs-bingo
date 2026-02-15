import { db } from '../config/firebase.js';
import { WiseOldManService } from '../services/wiseOldMan.js';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Script to create a baseline snapshot for a user who joined a team
 * after XP tracking was enabled (fixing the missing baseline issue)
 * 
 * Usage: npm run create-baseline -- <username>
 * Example: npm run create-baseline -- BloatzToez
 */

const womService = new WiseOldManService();

async function createBaselineSnapshot(username: string) {
  try {
    console.log(`🔍 Looking for user: ${username}`);
    
    // Find user by RSN
    const usersSnapshot = await db.collection('users')
      .where('rsn', '==', username)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ User with RSN "${username}" not found`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`✅ Found user: ${userData.username} (RSN: ${userData.rsn})`);

    // Find teams the user is a member of
    const teamsSnapshot = await db.collection('teams')
      .where('memberIds', 'array-contains', userId)
      .get();

    if (teamsSnapshot.empty) {
      console.error(`❌ User is not a member of any teams`);
      process.exit(1);
    }

    console.log(`📋 User is in ${teamsSnapshot.size} team(s)`);

    // Process each team
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;

      console.log(`\n🏆 Processing team: ${teamData.name}`);

      // Get the event
      const eventDoc = await db.collection('events').doc(teamData.eventId).get();
      
      if (!eventDoc.exists) {
        console.log(`  ⚠️ Event not found, skipping...`);
        continue;
      }

      const eventData = eventDoc.data();

      // Check if tracking is enabled
      if (!eventData?.trackingEnabled) {
        console.log(`  ⏸️ Event tracking not enabled, skipping...`);
        continue;
      }

      console.log(`  ✅ Event is tracking XP: ${eventData.name}`);

      // Check if baseline already exists
      const existingSnapshot = await db.collection('playerSnapshots')
        .where('eventId', '==', teamData.eventId)
        .where('userId', '==', userId)
        .where('snapshotType', '==', 'baseline')
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        console.log(`  ⚠️ Baseline snapshot already exists for this event, skipping...`);
        continue;
      }

      // Fetch snapshot from WiseOldMan
      console.log(`  🔄 Fetching snapshot from WiseOldMan...`);
      const snapshot = await womService.updatePlayerAndGetSnapshot(userData.rsn);

      if (!snapshot) {
        console.error(`  ❌ Failed to fetch snapshot from WiseOldMan`);
        continue;
      }

      // Create baseline snapshot
      const snapshotData = {
        eventId: teamData.eventId,
        teamId: teamId,
        userId: userId,
        rsn: userData.rsn,
        snapshotType: 'baseline',
        capturedAt: Timestamp.now(),
        skills: snapshot.skills,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await db.collection('playerSnapshots').add(snapshotData);
      console.log(`  ✅ Baseline snapshot created successfully!`);
      console.log(`     Event: ${eventData.name}`);
      console.log(`     Team: ${teamData.name}`);
      console.log(`     User: ${userData.username} (${userData.rsn})`);
    }

    console.log(`\n✨ Done!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('❌ Usage: npm run create-baseline -- <username>');
  console.error('   Example: npm run create-baseline -- BloatzToez');
  process.exit(1);
}

createBaselineSnapshot(username);
