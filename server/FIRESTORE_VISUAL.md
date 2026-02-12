# Firestore Database Structure - Visual Guide

## 📊 Collection Structure Overview

```
Firestore Database: osrs-bingo
│
├── 📁 users/
│   ├── user_abc123/
│   │   ├── id: "user_abc123"
│   │   ├── username: "player1"
│   │   ├── email: "player1@example.com"
│   │   ├── passwordHash: "$2b$10$..."
│   │   ├── displayName: "Player One"
│   │   ├── avatarUrl: "https://..."
│   │   ├── createdEvents: ["event_1", "event_2"]
│   │   ├── joinedTeams: ["team_1", "team_2"]
│   │   ├── createdAt: Timestamp
│   │   └── updatedAt: Timestamp
│   │
│   └── user_def456/
│       └── ... (same structure)
│
├── 📁 events/
│   ├── event_xyz789/
│   │   ├── id: "event_xyz789"
│   │   ├── name: "Summer Bingo 2026"
│   │   ├── description: "Annual summer event"
│   │   ├── boardSize: 5 (or 7, 9, 10)
│   │   ├── creatorId: "user_abc123" ──────┐
│   │   ├── status: "active"                │ References
│   │   ├── startDate: Timestamp            │
│   │   ├── endDate: Timestamp              │
│   │   ├── teamIds: ["team_1", "team_2"]   │
│   │   ├── taskIds: ["task_1", ...]        │
│   │   ├── settings: {                     │
│   │   │   allowMultipleCompletions: false │
│   │   │   requireVerification: true       │
│   │   │   maxTeams: 10                    │
│   │   │   maxPlayersPerTeam: 5            │
│   │   │ }                                 │
│   │   ├── createdAt: Timestamp            │
│   │   └── updatedAt: Timestamp            │
│   │                                        │
│   └── event_abc456/                       │
│       └── ... (same structure)            │
│                                            │
├── 📁 teams/                                │
│   ├── team_def456/                        │
│   │   ├── id: "team_def456"               │
│   │   ├── eventId: "event_xyz789" ────────┤
│   │   ├── name: "Team Alpha"              │
│   │   ├── description: "Best team!"       │
│   │   ├── captainId: "user_abc123" ───────┘
│   │   ├── memberIds: ["user_abc123", "user_def456"]
│   │   ├── score: 150
│   │   ├── completedTaskIds: ["task_1", "task_5"]
│   │   ├── color: "#FF5733"
│   │   ├── inviteCode: "ALPHA2026"
│   │   ├── createdAt: Timestamp
│   │   └── updatedAt: Timestamp
│   │
│   └── team_ghi789/
│       └── ... (same structure)
│
├── 📁 tasks/
│   ├── task_001/                    ┌─ Position 0 (top-left of board)
│   │   ├── id: "task_001"           │
│   │   ├── eventId: "event_xyz789" ─┤
│   │   ├── title: "Defeat Zulrah"   │
│   │   ├── description: "..."       │
│   │   ├── points: 10               │
│   │   ├── position: 0 ─────────────┘
│   │   ├── row: 0 (calculated)
│   │   ├── col: 0 (calculated)
│   │   ├── category: "PvM"
│   │   ├── difficulty: "medium"
│   │   ├── imageUrl: "https://..."
│   │   ├── hints: ["tip1", "tip2"]
│   │   ├── completedByTeamIds: ["team_def456"]
│   │   ├── verificationRequired: true
│   │   ├── createdAt: Timestamp
│   │   └── updatedAt: Timestamp
│   │
│   ├── task_002/ (position: 1)
│   ├── task_003/ (position: 2)
│   ├── ... (25 tasks total for 5x5 board)
│   └── task_025/ (position: 24, bottom-right)
│
├── 📁 taskCompletions/
│   ├── completion_jkl012/
│   │   ├── id: "completion_jkl012"
│   │   ├── taskId: "task_001" ──────────┐
│   │   ├── teamId: "team_def456" ───────┤ References
│   │   ├── eventId: "event_xyz789" ─────┤
│   │   ├── completedBy: "user_abc123" ──┘
│   │   ├── completedAt: Timestamp
│   │   ├── verificationImageUrl: "https://..."
│   │   ├── verificationNote: "Screenshot"
│   │   ├── verified: true
│   │   ├── verifiedBy: "user_xyz999"
│   │   ├── verifiedAt: Timestamp
│   │   ├── points: 10 (snapshot)
│   │   ├── createdAt: Timestamp
│   │   └── updatedAt: Timestamp
│   │
│   └── completion_mno345/
│       └── ... (one per team per task completion)
│
└── 📁 eventInvitations/
    ├── invite_pqr678/
    │   ├── id: "invite_pqr678"
    │   ├── eventId: "event_xyz789" ─────┐
    │   ├── teamId: "team_def456" ───────┤ References
    │   ├── inviteCode: "SUMMER2026" (unique)
    │   ├── invitedBy: "user_abc123" ────┘
    │   ├── expiresAt: Timestamp
    │   ├── maxUses: 10
    │   ├── usedCount: 3
    │   ├── status: "active"
    │   ├── createdAt: Timestamp
    │   └── updatedAt: Timestamp
    │
    └── invite_stu901/
        └── ... (same structure)
```

## 🎯 Bingo Board Layout Example (5x5)

```
Position numbering in Firestore:

┌─────┬─────┬─────┬─────┬─────┐
│  0  │  1  │  2  │  3  │  4  │  Row 0
├─────┼─────┼─────┼─────┼─────┤
│  5  │  6  │  7  │  8  │  9  │  Row 1
├─────┼─────┼─────┼─────┼─────┤
│ 10  │ 11  │ 12  │ 13  │ 14  │  Row 2
├─────┼─────┼─────┼─────┼─────┤
│ 15  │ 16  │ 17  │ 18  │ 19  │  Row 3
├─────┼─────┼─────┼─────┼─────┤
│ 20  │ 21  │ 22  │ 23  │ 24  │  Row 4
└─────┴─────┴─────┴─────┴─────┘
Col:   0     1     2     3     4

Calculation:
- row = Math.floor(position / boardSize)
- col = position % boardSize
- Example: position 12 → row 2, col 2 (center)
```

## 🔗 Relationship Diagram

```
┌──────────┐
│  User    │
│  (users) │
└────┬─────┘
     │
     ├─creates──────────┐
     │                  ▼
     │            ┌──────────┐
     │            │  Event   │
     │            │ (events) │
     │            └────┬─────┘
     │                 │
     │                 ├─has────────┐
     │                 │             ▼
     │                 │       ┌──────────┐
     │                 │       │  Task    │
     │                 │       │ (tasks)  │
     │                 │       └────┬─────┘
     │                 │            │
     │                 │            │
     │                 ├─has────────┐
     │                 │             ▼
     │                 │       ┌──────────────┐
     │                 │       │   Team       │
     │                 │       │  (teams)     │
     │                 │       └────┬─────────┘
     │                 │            │
     └─joins───────────┘            │
                                    │
     ┌──────────────────────────────┼─────────────┐
     │                              │             │
     ▼                              ▼             ▼
┌─────────────────┐      ┌──────────────────────────┐
│ TaskCompletion  │◄─────│  Event creates Invitation│
│(taskCompletions)│      │  (eventInvitations)      │
└─────────────────┘      └──────────────────────────┘
```

## 📈 Data Flow Example

### Creating an Event with Tasks:

```
1. User creates event
   ├─→ Write to: events/event_xyz789
   └─→ Update: users/user_abc123.createdEvents += "event_xyz789"

2. Create 25 tasks for 5x5 board
   ├─→ Write to: tasks/task_001 (position: 0)
   ├─→ Write to: tasks/task_002 (position: 1)
   ├─→ ... (23 more tasks)
   └─→ Write to: tasks/task_025 (position: 24)

3. Create teams
   ├─→ Write to: teams/team_def456
   └─→ Update: events/event_xyz789.teamIds += "team_def456"

4. User joins team
   ├─→ Update: teams/team_def456.memberIds += "user_def456"
   └─→ Update: users/user_def456.joinedTeams += "team_def456"

5. Team completes task
   ├─→ Write to: taskCompletions/completion_jkl012
   ├─→ Update: tasks/task_001.completedByTeamIds += "team_def456"
   ├─→ Update: teams/team_def456.completedTaskIds += "task_001"
   └─→ Update: teams/team_def456.score += 10
```

## 🎲 Collection Sizes

### Small Event (5x5 board, 5 teams):
```
1 event       →    1 document   →    ~1 KB
5 teams       →    5 documents  →    ~5 KB
25 tasks      →   25 documents  →   ~25 KB
50 completions →  50 documents  →   ~50 KB
───────────────────────────────────────────
TOTAL                             ~81 KB
```

### Medium Event (7x7 board, 10 teams):
```
1 event       →    1 document   →    ~1 KB
10 teams      →   10 documents  →   ~10 KB
49 tasks      →   49 documents  →   ~49 KB
150 completions → 150 documents → ~150 KB
───────────────────────────────────────────
TOTAL                            ~210 KB
```

### Large Event (10x10 board, 20 teams):
```
1 event        →    1 document   →    ~1 KB
20 teams       →   20 documents  →   ~20 KB
100 tasks      →  100 documents  →  ~100 KB
500 completions → 500 documents  →  ~500 KB
────────────────────────────────────────────
TOTAL                             ~621 KB
```

## 🔍 Common Queries

```typescript
// 1. Get event with all teams and tasks
const event = await db.collection('events').doc(eventId).get();
const teams = await db.collection('teams').where('eventId', '==', eventId).get();
const tasks = await db.collection('tasks').where('eventId', '==', eventId).get();

// 2. Get leaderboard (teams sorted by score)
const leaderboard = await db.collection('teams')
  .where('eventId', '==', eventId)
  .orderBy('score', 'desc')
  .get();

// 3. Get user's teams
const userTeams = await db.collection('teams')
  .where('memberIds', 'array-contains', userId)
  .get();

// 4. Get incomplete tasks for a team
const allTasks = await db.collection('tasks').where('eventId', '==', eventId).get();
const team = await db.collection('teams').doc(teamId).get();
const incompleteTasks = allTasks.docs.filter(
  task => !team.data().completedTaskIds.includes(task.id)
);

// 5. Get completion history for an event
const completions = await db.collection('taskCompletions')
  .where('eventId', '==', eventId)
  .orderBy('completedAt', 'desc')
  .limit(50)
  .get();
```

## ✅ Setup Checklist

- [ ] Create Firebase project
- [ ] Enable Firestore Database
- [ ] Download service account key
- [ ] Configure .env file
- [ ] Create composite indexes (4 total)
- [ ] Set security rules
- [ ] Test with API calls
- [ ] Verify documents appear in Firestore Console

---

All collections are automatically created when you insert the first document!

Just make sure to create the **composite indexes** manually for optimal query performance.
