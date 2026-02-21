import { db } from '../config/firebase.js';
import { WiseOldManService } from '../services/wiseOldMan.js';
import { Timestamp } from 'firebase-admin/firestore';

const womService = new WiseOldManService();

interface Args {
  eventId: string;
  username: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2).filter(arg => arg !== '--');
  const username = args.find(arg => arg.startsWith('--username='))?.replace('--username=', '') || '';
  const eventId = args.find(arg => !arg.startsWith('--')) || '';

  if (!eventId || !username) {
    console.error('Usage: npm run update-player -- <eventId> --username=<rsn>');
    console.error('Example: npm run update-player -- event123 --username=dumbironcuck');
    process.exit(1);
  }

  return { eventId, username };
}

async function updatePlayer() {
  const { eventId, username } = parseArgs();

  console.log(`\n🔄 Manually updating player "${username}" for event "${eventId}"...\n`);

  try {
    // First, find the baseline snapshot to get the teamId and userId
    const baselineSnapshot = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('rsn', '==', username)
      .where('snapshotType', '==', 'baseline')
      .get();

    if (baselineSnapshot.empty) {
      console.error(`❌ No baseline snapshot found for "${username}" in event "${eventId}"`);
      process.exit(1);
    }

    const baselineData = baselineSnapshot.docs[0].data();
    const teamId = baselineData.teamId;
    const userId = baselineData.userId;

    console.log(`📋 Found baseline snapshot:`);
    console.log(`   Team ID: ${teamId}`);
    console.log(`   User ID: ${userId}`);

    // Fetch fresh snapshot from WiseOldMan
    console.log(`\n📡 Fetching fresh snapshot from WiseOldMan...`);
    const snapshot = await womService.updatePlayerAndGetSnapshot(username);

    if (!snapshot) {
      console.error(`❌ No snapshot returned from WiseOldMan for "${username}"`);
      process.exit(1);
    }

    console.log(`✅ Got snapshot with skills: ${Object.keys(snapshot.skills).join(', ')}`);

    // Delete old current snapshots for this player
    const oldCurrents = await db
      .collection('playerSnapshots')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('snapshotType', '==', 'current')
      .get();

    if (!oldCurrents.empty) {
      console.log(`🗑️ Deleting ${oldCurrents.size} old current snapshots...`);
      const deleteBatch = db.batch();
      oldCurrents.docs.forEach(doc => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
    }

    // Create new current snapshot
    const now = Timestamp.now();
    const snapshotData = {
      eventId,
      teamId,
      userId,
      rsn: username,
      snapshotType: 'current',
      capturedAt: now,
      skills: snapshot.skills,
      createdAt: now,
      updatedAt: now,
    };

    const newSnapshotRef = await db.collection('playerSnapshots').add(snapshotData);
    console.log(`\n✅ Created new current snapshot: ${newSnapshotRef.id}`);

    // Show skill gains
    const skills = snapshot.skills;
    const baselineSkills = baselineData.skills;
    
    console.log(`\n📊 XP Gains for ${username}:`);
    const skillGains: { skill: string; gain: number }[] = [];
    
    for (const [skill, data] of Object.entries(skills)) {
      const baseXP = baselineSkills[skill]?.experience || 0;
      const currentXP = data.experience;
      const gain = currentXP - baseXP;
      if (gain > 0) {
        skillGains.push({ skill, gain });
      }
    }

    skillGains.sort((a, b) => b.gain - a.gain);
    
    for (const { skill, gain } of skillGains.slice(0, 10)) {
      const formattedGain = gain >= 1000000 
        ? `${(gain / 1000000).toFixed(2)}M` 
        : gain >= 1000 
          ? `${(gain / 1000).toFixed(1)}K` 
          : gain;
      console.log(`   ${skill}: +${formattedGain}`);
    }

    if (skillGains.length === 0) {
      console.log(`   (No XP gains yet)`);
    }

    console.log(`\n✨ Done!`);

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

updatePlayer();
