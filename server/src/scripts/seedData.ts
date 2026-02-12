import { db } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import bcrypt from 'bcrypt';

// OSRS-themed task data
const osrsTasks = [
  { title: 'Complete Monkey Madness I', description: 'Finish the iconic quest', points: 10, category: 'Questing', difficulty: 'medium' as const },
  { title: 'Defeat the Giant Mole', description: 'Kill the Giant Mole boss', points: 15, category: 'PvM', difficulty: 'medium' as const },
  { title: 'Reach 50 Firemaking', description: 'Train Firemaking to level 50', points: 5, category: 'Skilling', difficulty: 'easy' as const },
  { title: 'Complete Recipe for Disaster', description: 'Finish the entire quest series', points: 25, category: 'Questing', difficulty: 'hard' as const },
  { title: 'Get a Barrows Item', description: 'Obtain any item from Barrows', points: 20, category: 'PvM', difficulty: 'medium' as const },
  { title: 'Achieve 99 in Any Skill', description: 'Reach level 99 in any skill', points: 50, category: 'Skilling', difficulty: 'elite' as const },
  { title: 'Complete a Clue Scroll (Medium)', description: 'Solve a medium clue scroll', points: 8, category: 'Clue', difficulty: 'easy' as const },
  { title: 'Defeat Jad', description: 'Beat TzTok-Jad in Fight Caves', points: 30, category: 'PvM', difficulty: 'hard' as const },
  { title: 'Obtain a Pet', description: 'Get any skilling or boss pet', points: 40, category: 'Pet', difficulty: 'elite' as const },
  { title: 'Complete Desert Treasure', description: 'Finish the quest for Ancient Magicks', points: 20, category: 'Questing', difficulty: 'hard' as const },
  { title: 'Reach 1000 Total Level', description: 'Achieve 1000 total level', points: 15, category: 'Skilling', difficulty: 'medium' as const },
  { title: 'Complete a God Wars Dungeon Boss', description: 'Defeat any GWD boss', points: 25, category: 'PvM', difficulty: 'hard' as const },
  { title: 'Get Full Graceful', description: 'Obtain complete Graceful outfit', points: 18, category: 'Skilling', difficulty: 'medium' as const },
  { title: 'Complete a Hard Diary', description: 'Finish any hard achievement diary', points: 22, category: 'Achievement', difficulty: 'hard' as const },
  { title: 'Craft 100 Nature Runes', description: 'Runecraft 100 nature runes', points: 10, category: 'Skilling', difficulty: 'medium' as const },
  { title: 'Defeat Vorkath', description: 'Kill Vorkath the dragon', points: 28, category: 'PvM', difficulty: 'hard' as const },
  { title: 'Complete A Kingdom Divided', description: 'Finish the quest', points: 15, category: 'Questing', difficulty: 'medium' as const },
  { title: 'Reach 70 in All Combat Stats', description: 'Get 70 Attack, Strength, Defence', points: 20, category: 'Combat', difficulty: 'medium' as const },
  { title: 'Complete Chambers of Xeric', description: 'Finish a CoX raid', points: 35, category: 'Raid', difficulty: 'elite' as const },
  { title: 'Get a Dragon Defender', description: 'Obtain Dragon Defender from Warriors Guild', points: 12, category: 'Combat', difficulty: 'medium' as const },
  { title: 'Complete Song of the Elves', description: 'Finish the grandmaster quest', points: 30, category: 'Questing', difficulty: 'elite' as const },
  { title: 'Mine 100 Runite Ore', description: 'Mine 100 runite ore', points: 18, category: 'Skilling', difficulty: 'hard' as const },
  { title: 'Complete a Slayer Task', description: 'Finish any slayer assignment', points: 5, category: 'Slayer', difficulty: 'easy' as const },
  { title: 'Defeat Zulrah', description: 'Kill Zulrah the snake boss', points: 25, category: 'PvM', difficulty: 'hard' as const },
  { title: 'Obtain Fire Cape', description: 'Get Fire Cape from Fight Caves', points: 30, category: 'PvM', difficulty: 'hard' as const },
];

// Generate random usernames
const usernames = [
  'ZezimaCool',
  'DankGnome420',
  'IronManBTW',
  'PurePker99',
  'SkillSpecsGG',
  'RuneScapeNoob',
  'DragonSlayer',
  'GoblinBoi',
  'ElvenQueen',
  'DwarfKing',
  'WizardMage',
  'RangerDude',
  'MeleeWarrior',
  'NatureRunner',
  'ClueHunter',
];

// Team names
const teamNames = [
  'Dragon Slayers',
  'Wilderness Warriors',
  'Skilling Legends',
  'Quest Masters',
  'Raid Squad',
  'PvM Pros',
];

// Team colors
const teamColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DFE6E9', // Gray
];

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Create Users
    console.log('👥 Creating users...');
    const userIds: string[] = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      const userRef = db.collection('users').doc();
      const userId = userRef.id;
      userIds.push(userId);

      await userRef.set({
        id: userId,
        username: username,
        email: `${username.toLowerCase()}@osrs.test`,
        passwordHash: hashedPassword,
        displayName: username,
        avatarUrl: '', // Empty as requested
        createdEvents: [],
        joinedTeams: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✓ Created user: ${username} (${userId})`);
    }

    // Create Events
    console.log('\n🎯 Creating events...');
    const eventIds: string[] = [];
    const events = [
      {
        name: 'OSRS Winter Bingo 2026',
        description: 'Epic winter bingo competition! Complete tasks across Gielinor to earn points for your team.',
        boardSize: 5 as const,
        status: 'active' as const,
        creatorId: userIds[0],
      },
      {
        name: 'Skilling Championship',
        description: 'Focus on skilling tasks and achievement diaries. May the best skiller win!',
        boardSize: 7 as const,
        status: 'active' as const,
        creatorId: userIds[1],
      },
    ];

    for (const eventData of events) {
      const eventRef = db.collection('events').doc();
      const eventId = eventRef.id;
      eventIds.push(eventId);

      await eventRef.set({
        id: eventId,
        name: eventData.name,
        description: eventData.description,
        boardSize: eventData.boardSize,
        creatorId: eventData.creatorId,
        status: eventData.status,
        startDate: Timestamp.now(),
        endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
        teamIds: [],
        taskIds: [],
        joinCode: generateRandomCode(),
        settings: {
          allowMultipleCompletions: true,
          requireVerification: false,
          maxTeams: 10,
          maxPlayersPerTeam: 5,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✓ Created event: ${eventData.name} (${eventId})`);
    }

    // Create Tasks for each event
    console.log('\n📋 Creating tasks...');
    const taskIdsByEvent: { [eventId: string]: string[] } = {};

    for (let eventIndex = 0; eventIndex < eventIds.length; eventIndex++) {
      const eventId = eventIds[eventIndex];
      const eventData = events[eventIndex];
      const boardSize = eventData.boardSize;
      const totalTasks = boardSize * boardSize;
      const taskIds: string[] = [];

      // Create enough tasks by cycling through osrsTasks if needed
      for (let position = 0; position < totalTasks; position++) {
        const taskData = osrsTasks[position % osrsTasks.length];
        const row = Math.floor(position / boardSize);
        const col = position % boardSize;

        const taskRef = db.collection('tasks').doc();
        const taskId = taskRef.id;
        taskIds.push(taskId);

        await taskRef.set({
          id: taskId,
          eventId: eventId,
          title: taskData.title,
          description: taskData.description,
          points: taskData.points,
          position: position,
          row: row,
          col: col,
          category: taskData.category,
          difficulty: taskData.difficulty,
          imageUrl: '', // Empty as requested
          hints: [],
          completedByTeamIds: [],
          verificationRequired: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      taskIdsByEvent[eventId] = taskIds;

      // Update event with task IDs
      await db.collection('events').doc(eventId).update({
        taskIds: taskIds,
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✓ Created ${totalTasks} tasks for ${eventData.name}`);
    }

    // Create Teams and assign users
    console.log('\n👥 Creating teams...');
    const teamIdsByEvent: { [eventId: string]: string[] } = {};

    for (let eventIndex = 0; eventIndex < eventIds.length; eventIndex++) {
      const eventId = eventIds[eventIndex];
      const eventName = events[eventIndex].name;
      const teamsForEvent = 3; // 3 teams per event
      const teamIds: string[] = [];

      for (let teamIndex = 0; teamIndex < teamsForEvent; teamIndex++) {
        const teamRef = db.collection('teams').doc();
        const teamId = teamRef.id;
        teamIds.push(teamId);

        // Assign 3-5 random users to each team
        const teamSize = 3 + Math.floor(Math.random() * 3);
        const availableUsers = userIds.filter(
          (uid) => !teamIds.some((tid) => tid === uid),
        );
        const memberIds = availableUsers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(teamSize, availableUsers.length));
        const captainId = memberIds[0];

        await teamRef.set({
          id: teamId,
          eventId: eventId,
          name: teamNames[teamIndex + eventIndex * 3] || `Team ${teamIndex + 1}`,
          description: `Competing in ${eventName}`,
          captainId: captainId,
          memberIds: memberIds,
          score: 0,
          completedTaskIds: [],
          color: teamColors[teamIndex + eventIndex * 3] || '#95a5a6',
          joinCode: generateRandomCode(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Update users with team membership
        for (const userId of memberIds) {
          await db
            .collection('users')
            .doc(userId)
            .update({
              joinedTeams: [...(await db.collection('users').doc(userId).get()).data()?.joinedTeams || [], teamId],
              updatedAt: Timestamp.now(),
            });
        }

        console.log(
          `   ✓ Created team: ${teamNames[teamIndex + eventIndex * 3]} with ${memberIds.length} members`,
        );
      }

      teamIdsByEvent[eventId] = teamIds;

      // Update event with team IDs
      await db.collection('events').doc(eventId).update({
        teamIds: teamIds,
        updatedAt: Timestamp.now(),
      });
    }

    // Complete some random tasks
    console.log('\n✅ Marking some tasks as completed...');
    let completionCount = 0;

    for (const eventId of eventIds) {
      const taskIds = taskIdsByEvent[eventId];
      const teamIds = teamIdsByEvent[eventId];

      // Complete 30-50% of tasks randomly
      const completionRate = 0.3 + Math.random() * 0.2;
      const tasksToComplete = Math.floor(taskIds.length * completionRate);

      const selectedTaskIds = [...taskIds]
        .sort(() => Math.random() - 0.5)
        .slice(0, tasksToComplete);

      for (const taskId of selectedTaskIds) {
        // Random team completes this task
        const completingTeamId = teamIds[Math.floor(Math.random() * teamIds.length)];
        const teamDoc = await db.collection('teams').doc(completingTeamId).get();
        const teamData = teamDoc.data();
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        const taskData = taskDoc.data();

        if (!teamData || !taskData) continue;

        // Random team member completed it
        const completedBy =
          teamData.memberIds[
            Math.floor(Math.random() * teamData.memberIds.length)
          ];

        // Create completion record
        const completionRef = db.collection('taskCompletions').doc();
        await completionRef.set({
          id: completionRef.id,
          taskId: taskId,
          teamId: completingTeamId,
          eventId: eventId,
          completedBy: completedBy,
          completedAt: Timestamp.fromDate(
            new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          ), // Random time in last 7 days
          verificationImageUrl: '', // Empty as requested
          verificationImagePath: '',
          verificationNote: '',
          verified: true,
          points: taskData.points,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Update task
        await db
          .collection('tasks')
          .doc(taskId)
          .update({
            completedByTeamIds: [...(taskData.completedByTeamIds || []), completingTeamId],
            updatedAt: Timestamp.now(),
          });

        // Update team
        const newCompletedTaskIds = [...(teamData.completedTaskIds || []), taskId];
        const newScore = teamData.score + taskData.points;

        await db
          .collection('teams')
          .doc(completingTeamId)
          .update({
            completedTaskIds: newCompletedTaskIds,
            score: newScore,
            updatedAt: Timestamp.now(),
          });

        completionCount++;
      }
    }

    console.log(`   ✓ Completed ${completionCount} tasks across all events`);

    console.log('\n✨ Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Users created: ${userIds.length}`);
    console.log(`   • Events created: ${eventIds.length}`);
    console.log(`   • Total tasks created: ${Object.values(taskIdsByEvent).flat().length}`);
    console.log(`   • Total teams created: ${Object.values(teamIdsByEvent).flat().length}`);
    console.log(`   • Task completions: ${completionCount}`);
    console.log('\n🔑 Login credentials:');
    console.log('   Username: Any of the created usernames');
    console.log('   Password: password123\n');

    console.log('📋 Sample event join codes:');
    for (const eventId of eventIds) {
      const eventDoc = await db.collection('events').doc(eventId).get();
      const eventData = eventDoc.data();
      if (eventData) {
        console.log(`   • ${eventData.name}: ${eventData.joinCode}`);
      }
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed script
seedDatabase()
  .then(() => {
    console.log('\n✅ Seed script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });
