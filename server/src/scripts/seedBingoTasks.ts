import { db } from '../config/firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

const eventId = 'NJVN4qSZT7He4EKSlJHJ';

const tasks = [
  { taskNum: 1, title: '5m agi xp', difficulty: 2 },
  { taskNum: 2, title: '5m rc xp', difficulty: 2 },
  { taskNum: 3, title: '4m mining xp', difficulty: 2 },
  { taskNum: 4, title: '6m sailing xp', difficulty: 2 },
  { taskNum: 5, title: '1 unsired', difficulty: 3 },
  { taskNum: 6, title: 'full bludgeon', difficulty: 7 },
  { taskNum: 7, title: 'Any Jar', difficulty: 9 },
  { taskNum: 8, title: 'Hydra Leather/Claw', difficulty: 7 },
  { taskNum: 9, title: 'Araxxor Unique', difficulty: 4 },
  { taskNum: 10, title: 'Full Nox Hally (3pieces total)', difficulty: 7 },
  { taskNum: 11, title: 'Barrows Item', difficulty: 1 },
  { taskNum: 12, title: 'Barrows Set', difficulty: 5 },
  { taskNum: 13, title: 'Bryo Essence', difficulty: 3 },
  { taskNum: 14, title: 'Voidwaker Piece', difficulty: 5 },
  { taskNum: 15, title: 'Any Cerb Crystal', difficulty: 6 },
  { taskNum: 16, title: 'Chaos Ele Pet', difficulty: 4 },
  { taskNum: 17, title: 'Any Sara Unique', difficulty: 6 },
  { taskNum: 18, title: 'Any Krill Unique', difficulty: 6 },
  { taskNum: 19, title: 'Any Arma Unique', difficulty: 6 },
  { taskNum: 20, title: 'Any Bandos Unique', difficulty: 6 },
  { taskNum: 21, title: 'Full Godwars blade', difficulty: 5 },
  { taskNum: 22, title: 'Nex Unique', difficulty: 8 },
  { taskNum: 23, title: 'Crop Unique', difficulty: 8 },
  { taskNum: 24, title: 'Glacial Timmothys', difficulty: 1 },
  { taskNum: 25, title: 'Araxxor Fang', difficulty: 7 },
  { taskNum: 26, title: '1 DKs Ring', difficulty: 2 },
  { taskNum: 27, title: 'All 4 DKs Ring', difficulty: 7 },
  { taskNum: 28, title: 'Non Ring DK Unique (Axe,Seercul,Mud)', difficulty: 3 },
  { taskNum: 29, title: 'Steel Ring', difficulty: 1 },
  { taskNum: 30, title: 'Any Doom Unique', difficulty: 6 },
  { taskNum: 31, title: '2k Fish From Deep Sea', difficulty: 4 },
  { taskNum: 32, title: 'Any Virtus', difficulty: 9 },
  { taskNum: 33, title: 'Ignot from DT2', difficulty: 3 },
  { taskNum: 34, title: 'Gold Ring Vard', difficulty: 5 },
  { taskNum: 35, title: 'Gold Ring Duke', difficulty: 5 },
  { taskNum: 36, title: 'Gold Ring Whisper', difficulty: 5 },
  { taskNum: 37, title: 'Gold Ring Levi', difficulty: 5 },
  { taskNum: 38, title: '300 Total CA points (Whole Team)', difficulty: 7 },
  { taskNum: 39, title: "Account's 1st quiver", difficulty: 9 },
  { taskNum: 40, title: 'Colo Unique', difficulty: 7 },
  { taskNum: 41, title: '1 CG Unique', difficulty: 6 },
  { taskNum: 42, title: 'Grotesque Gaurdians Unique', difficulty: 5 },
  { taskNum: 43, title: 'Cumpost Buck-et', difficulty: 3 },
  { taskNum: 44, title: 'Huey Unique', difficulty: 3 },
  { taskNum: 45, title: "Account's 1st Inferno Cape", difficulty: 9 },
  { taskNum: 46, title: 'KQ Clog Item from KQ', difficulty: 7 },
  { taskNum: 47, title: '1 piece of moons gear', difficulty: 1 },
  { taskNum: 48, title: 'Full Moon Set', difficulty: 5 },
  { taskNum: 49, title: 'Nightmare Unique', difficulty: 8 },
  { taskNum: 50, title: 'Venator Shard', difficulty: 3 },
  { taskNum: 51, title: 'Titans Unique', difficulty: 2 },
  { taskNum: 52, title: 'Twinflame staff', difficulty: 4 },
  { taskNum: 53, title: 'CUDGED UP', difficulty: 2 },
  { taskNum: 54, title: '1k Red Eggs', difficulty: 2 },
  { taskNum: 55, title: 'Yama Unique (Armor + Horn)', difficulty: 7 },
  { taskNum: 56, title: 'Tool Seed from Zalcano', difficulty: 5 },
  { taskNum: 57, title: 'Zulrah Unique', difficulty: 4 },
  { taskNum: 58, title: 'Cox Prayer Scroll', difficulty: 3 },
  { taskNum: 59, title: 'Cox Mega Rare', difficulty: 9 },
  { taskNum: 60, title: 'Cox everything else', difficulty: 6 },
  { taskNum: 61, title: 'Tob Weapon', difficulty: 7 },
  { taskNum: 62, title: 'Tob Armor', difficulty: 7 },
  { taskNum: 63, title: 'New Toa Kit or Pet', difficulty: 9 },
  { taskNum: 64, title: 'Toa Armor Piece', difficulty: 6 },
  { taskNum: 65, title: 'Toa Weapon/ offhand', difficulty: 6 },
  { taskNum: 66, title: 'Gem/Thread', difficulty: 2 },
  { taskNum: 67, title: 'Clue Mega Rare (Guilded +)', difficulty: 8 },
  { taskNum: 68, title: 'Any Medium clue boot', difficulty: 5 },
  { taskNum: 69, title: 'Any Clue Requirement from a Hard', difficulty: 4 },
  { taskNum: 70, title: '100 Brimhaven Tickets', difficulty: 5 },
  { taskNum: 71, title: 'Lantern/Needle/Talisman from GOTR', difficulty: 5 },
  { taskNum: 72, title: '300 Pearls', difficulty: 4 },
  { taskNum: 73, title: 'Ring of Endurance', difficulty: 8 },
  { taskNum: 74, title: 'Bones To Peaches from MTA', difficulty: 3 },
  { taskNum: 75, title: 'Goggles from MM', difficulty: 4 },
  { taskNum: 76, title: 'Necklace from MM', difficulty: 4 },
  { taskNum: 77, title: 'Herb Sack from fresh', difficulty: 6 },
  { taskNum: 78, title: 'Vale Totems Unique (spool/helm/knife)', difficulty: 4 },
  { taskNum: 79, title: 'Any pet (not Chaos Ele or Chompy)', difficulty: 10 },
  { taskNum: 80, title: 'Broken Cannon Barrel', difficulty: 8 },
  { taskNum: 81, title: 'Zenyte', difficulty: 5 },
  { taskNum: 82, title: '50 Rumor Openings (MUST BE STREAMED)', difficulty: 5 },
  { taskNum: 83, title: 'Rev Unique', difficulty: 4 },
  { taskNum: 84, title: '5 Dragon Metal Sheets', difficulty: 3 },
  { taskNum: 85, title: 'Blood Shard', difficulty: 4 },
  { taskNum: 86, title: 'Superior Slayer unique (Staff/heart/gem)', difficulty: 7 },
  { taskNum: 87, title: 'Antler Guard', difficulty: 3 },
  { taskNum: 88, title: 'Any Boppers', difficulty: 2 },
  { taskNum: 89, title: "Any TD's Unique", difficulty: 4 },
  { taskNum: 90, title: 'Dragonstone Armor', difficulty: 6 },
  { taskNum: 91, title: 'Dragon Warhammer', difficulty: 7 },
  { taskNum: 92, title: 'Aquanite Tendon or Squid Beak', difficulty: 5 },
  { taskNum: 93, title: '20 Hespori Seeds total', difficulty: 2 },
  { taskNum: 94, title: "Pharo's Sceptre", difficulty: 7 },
  { taskNum: 95, title: 'Any Boat Paint', difficulty: 2 },
  { taskNum: 96, title: 'Kill 5 enemy clanmates', difficulty: 8 },
  { taskNum: 97, title: 'Dagonhai Piece', difficulty: 7 },
  { taskNum: 98, title: '2k Rannars Ggathered Total', difficulty: 3 },
  { taskNum: 99, title: '250 Yama Shards', difficulty: 6 },
  { taskNum: 100, title: '5m Herb xp', difficulty: 2 },
];

async function seedTasks() {
  try {
    console.log(`Starting to seed ${tasks.length} tasks for event ${eventId}...`);

    const batch = db.batch();
    let count = 0;

    for (const task of tasks) {
      const taskRef = db.collection('tasks').doc();
      
      batch.set(taskRef, {
        eventId,
        title: task.title,
        description: `Difficulty: ${task.difficulty}/10`,
        points: task.difficulty * 10, // Points based on difficulty (10-100)
        position: task.taskNum - 1, // 0-indexed position
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      count++;

      // Firestore batch limit is 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Committed batch of ${count} tasks...`);
      }
    }

    // Commit any remaining tasks
    if (count % 500 !== 0) {
      await batch.commit();
    }

    console.log(`✅ Successfully seeded ${tasks.length} tasks!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
    process.exit(1);
  }
}

seedTasks();
