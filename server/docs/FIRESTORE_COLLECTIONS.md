# Firestore Database Collections Setup

This document shows exactly what collections to create in your Firestore database for the OSRS Bingo application.

## 🗄️ Collections Overview

You need to create **6 main collections** in Firestore. These will be created automatically when you add the first document, but it's helpful to understand the structure upfront.

---

## 📋 Collection List

### 1. `users`
**Purpose**: Store user accounts and authentication data

**Fields Example**:
```javascript
{
  id: "user_abc123",                    // Auto-generated document ID
  username: "player1",                  // Unique username
  email: "player1@example.com",         // Unique email
  passwordHash: "$2b$10$...",           // Bcrypt hashed password
  displayName: "Player One",            // Optional display name
  avatarUrl: "https://...",             // Optional profile picture
  createdEvents: ["event_1", "event_2"], // Array of event IDs they created
  joinedTeams: ["team_1", "team_2"],    // Array of team IDs they're in
  createdAt: Timestamp,                 // Auto-generated
  updatedAt: Timestamp                  // Auto-updated
}
```

**Indexes Needed**:
- `username` (Single field, Ascending)
- `email` (Single field, Ascending)

---

### 2. `events`
**Purpose**: Store bingo event information

**Fields Example**:
```javascript
{
  id: "event_xyz789",                   // Auto-generated document ID
  name: "Summer Bingo 2026",            // Event name
  description: "Annual summer event",   // Event description
  boardSize: 5,                         // 5, 7, 9, or 10
  creatorId: "user_abc123",             // Reference to user who created it
  status: "active",                     // draft, active, completed, cancelled
  startDate: Timestamp,                 // Optional start date
  endDate: Timestamp,                   // Optional end date
  teamIds: ["team_1", "team_2"],        // Array of team IDs in this event
  taskIds: ["task_1", "task_2", ...],   // Array of task IDs (25, 49, 81, or 100)
  settings: {
    allowMultipleCompletions: false,    // Can multiple teams complete same task?
    requireVerification: true,          // Require admin verification?
    maxTeams: 10,                       // Optional max teams
    maxPlayersPerTeam: 5                // Optional max players per team
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Needed**:
- Composite: `creatorId` (Ascending) + `createdAt` (Descending)
- `status` (Single field, Ascending)

---

### 3. `teams`
**Purpose**: Store team information for each event

**Fields Example**:
```javascript
{
  id: "team_def456",                    // Auto-generated document ID
  eventId: "event_xyz789",              // Reference to parent event
  name: "Team Alpha",                   // Team name
  description: "Best team ever!",       // Optional description
  captainId: "user_abc123",             // User ID of team captain
  memberIds: ["user_abc123", "user_def456"], // Array of all member user IDs
  score: 150,                           // Total points earned
  completedTaskIds: ["task_1", "task_5"], // Array of completed task IDs
  color: "#FF5733",                     // Optional team color for UI
  inviteCode: "ALPHA2026",              // Optional unique invite code
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Needed**:
- Composite: `eventId` (Ascending) + `score` (Descending)
- `captainId` (Single field, Ascending)
- `memberIds` (Array-contains)

---

### 4. `tasks`
**Purpose**: Store individual bingo board tasks

**Fields Example**:
```javascript
{
  id: "task_ghi789",                    // Auto-generated document ID
  eventId: "event_xyz789",              // Reference to parent event
  title: "Defeat Zulrah",               // Task title
  description: "Kill the snake boss",   // Task description
  points: 10,                           // Points awarded for completion
  position: 12,                         // Position on board (0 to boardSize²-1)
  row: 2,                               // Calculated row (position / boardSize)
  col: 2,                               // Calculated column (position % boardSize)
  category: "PvM",                      // Optional: PvM, Skilling, Questing, etc.
  difficulty: "medium",                 // Optional: easy, medium, hard, elite
  imageUrl: "https://...",              // Optional task image
  hints: ["Bring antivenom", "Use magic"], // Optional hints array
  completedByTeamIds: ["team_1"],       // Array of team IDs that completed this
  verificationRequired: true,           // Does this task need verification?
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Needed**:
- Composite: `eventId` (Ascending) + `position` (Ascending)
- `category` (Single field, Ascending)
- `difficulty` (Single field, Ascending)

---

### 5. `taskCompletions`
**Purpose**: Track the history of task completions (one record per team per task)

**Fields Example**:
```javascript
{
  id: "completion_jkl012",              // Auto-generated document ID
  taskId: "task_ghi789",                // Reference to task
  teamId: "team_def456",                // Reference to team
  eventId: "event_xyz789",              // Reference to event
  completedBy: "user_abc123",           // User ID who marked it complete
  completedAt: Timestamp,               // When it was completed
  verificationImageUrl: "https://...",  // Optional proof image
  verificationNote: "Screenshot attached", // Optional note
  verified: true,                       // Has it been verified?
  verifiedBy: "user_xyz999",            // User ID who verified (if verified)
  verifiedAt: Timestamp,                // When it was verified (if verified)
  points: 10,                           // Points snapshot at completion time
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Needed**:
- `taskId` (Single field, Ascending)
- `teamId` (Single field, Ascending)
- Composite: `eventId` (Ascending) + `completedAt` (Descending)
- `verified` (Single field, Ascending)

---

### 6. `eventInvitations`
**Purpose**: Manage invite codes for events and teams

**Fields Example**:
```javascript
{
  id: "invite_mno345",                  // Auto-generated document ID
  eventId: "event_xyz789",              // Reference to event
  teamId: "team_def456",                // Optional: specific team invite
  inviteCode: "SUMMER2026",             // Unique invite code (like "ZOOM123")
  invitedBy: "user_abc123",             // User ID who created the invite
  expiresAt: Timestamp,                 // Optional expiration date
  maxUses: 10,                          // Optional max number of uses
  usedCount: 3,                         // Current number of times used
  status: "active",                     // active, expired, revoked
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Needed**:
- `eventId` (Single field, Ascending)
- `inviteCode` (Single field, Ascending)
- `status` (Single field, Ascending)

---

## 🎯 Quick Setup Checklist

### Step 1: Create Collections (Automatic)
Collections are created automatically when you add the first document. The code will handle this for you.

### Step 2: Create Indexes (Important!)

Go to **Firebase Console** → **Firestore Database** → **Indexes** → **Composite** → **Create Index**

Create these **composite indexes**:

1. **events**: `creatorId` (Ascending) + `createdAt` (Descending)
2. **teams**: `eventId` (Ascending) + `score` (Descending)
3. **tasks**: `eventId` (Ascending) + `position` (Ascending)
4. **taskCompletions**: `eventId` (Ascending) + `completedAt` (Descending)

### Step 3: Set Security Rules

Go to **Firebase Console** → **Firestore Database** → **Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(userId);
    }
    
    // Events
    match /events/{eventId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.creatorId);
    }
    
    // Teams
    match /teams/{teamId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (isOwner(resource.data.captainId) || 
         request.auth.uid in resource.data.memberIds);
      allow delete: if isOwner(resource.data.captainId);
    }
    
    // Tasks
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Task Completions
    match /taskCompletions/{completionId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if false;
    }
    
    // Event Invitations
    match /eventInvitations/{invitationId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
  }
}
```

---

## 📊 Collection Relationships

```
User (users collection)
  ├─→ Creates Events (events.creatorId → users.id)
  ├─→ Joins Teams (teams.memberIds contains users.id)
  └─→ Completes Tasks (taskCompletions.completedBy → users.id)

Event (events collection)
  ├─→ Has Teams (teams.eventId → events.id)
  ├─→ Has Tasks (tasks.eventId → events.id)
  ├─→ Has Completions (taskCompletions.eventId → events.id)
  └─→ Has Invitations (eventInvitations.eventId → events.id)

Team (teams collection)
  ├─→ Belongs to Event (teams.eventId → events.id)
  ├─→ Has Members (teams.memberIds → users.id array)
  ├─→ Completes Tasks (taskCompletions.teamId → teams.id)
  └─→ Has Completed Tasks (teams.completedTaskIds → tasks.id array)

Task (tasks collection)
  ├─→ Belongs to Event (tasks.eventId → events.id)
  ├─→ Has Completions (taskCompletions.taskId → tasks.id)
  └─→ Completed By Teams (tasks.completedByTeamIds → teams.id array)

TaskCompletion (taskCompletions collection)
  ├─→ References Task (taskCompletions.taskId → tasks.id)
  ├─→ References Team (taskCompletions.teamId → teams.id)
  ├─→ References Event (taskCompletions.eventId → events.id)
  └─→ Completed By User (taskCompletions.completedBy → users.id)
```

---

## 💾 Typical Data Flow Example

### Creating a New Bingo Event:

1. **Create Event** document in `events` collection
2. **Create 25 Tasks** (for 5x5) in `tasks` collection
3. **Create Teams** in `teams` collection
4. **Users Join Teams** (update `teams.memberIds`)
5. **Tasks are Completed** → Create `taskCompletions` document
6. **Update Task** → Add team ID to `tasks.completedByTeamIds`
7. **Update Team** → Increment `teams.score`, add to `teams.completedTaskIds`

---

## 🔍 Sample Queries You'll Run

```typescript
// Get all events
db.collection('events').orderBy('createdAt', 'desc').get()

// Get teams for an event (sorted by score)
db.collection('teams')
  .where('eventId', '==', eventId)
  .orderBy('score', 'desc')
  .get()

// Get tasks for an event (sorted by position)
db.collection('tasks')
  .where('eventId', '==', eventId)
  .orderBy('position', 'asc')
  .get()

// Get completions for a team
db.collection('taskCompletions')
  .where('teamId', '==', teamId)
  .orderBy('completedAt', 'desc')
  .get()

// Find user by username
db.collection('users')
  .where('username', '==', username)
  .limit(1)
  .get()
```

---

## ⚡ Index Creation Note

**Important**: Some queries will fail until you create the composite indexes. When you see an error like:

```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

Just click the provided link to auto-create the index, or create it manually in the Firebase Console.

---

## 📦 Size Estimates

For a typical event:

- **1 Event** = ~1 KB
- **10 Teams** = ~10 KB
- **25 Tasks** (5x5) = ~25 KB
- **100 Completions** = ~100 KB
- **Total per event**: ~136 KB

With Firestore's free tier (1 GB storage), you can store thousands of events!

---

## ✅ Quick Verification

After setup, test with these operations:

```bash
# 1. Create a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# 2. Check Firestore Console
# You should see: users/[document_id]

# 3. Create an event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Event","boardSize":"5","description":"Test"}'

# 4. Check Firestore Console
# You should see: events/[document_id]
```

---

## 🎯 Summary

**Collections to Create**: 6 total
1. ✅ `users` - User accounts
2. ✅ `events` - Bingo events
3. ✅ `teams` - Event teams
4. ✅ `tasks` - Bingo tasks
5. ✅ `taskCompletions` - Completion history
6. ✅ `eventInvitations` - Invite codes

**No manual creation needed** - Collections are created automatically when you add the first document!

**DO create manually**: Composite indexes (4 required - see Step 2 above)

**DO set**: Security Rules (see Step 3 above)

---

See `FIRESTORE_SETUP.md` for complete setup instructions!
