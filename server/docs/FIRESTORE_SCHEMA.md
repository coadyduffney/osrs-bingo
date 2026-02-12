# Firestore Schema Documentation

This document describes the Firestore database schema for the OSRS Bingo application.

## Collections Overview

```
osrs-bingo (Firestore Database)
├── users/
├── events/
├── teams/
├── tasks/
├── taskCompletions/
└── eventInvitations/
```

## Collection Schemas

### 1. Users Collection (`users`)

Stores user account information.

```typescript
{
  id: string,                    // Document ID
  username: string,              // Unique username
  email: string,                 // Unique email
  passwordHash: string,          // Bcrypt hashed password
  displayName?: string,          // Optional display name
  avatarUrl?: string,            // Profile picture URL
  createdEvents: string[],       // Array of event IDs created by user
  joinedTeams: string[],         // Array of team IDs user is member of
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)

### 2. Events Collection (`events`)

Stores bingo event information.

```typescript
{
  id: string,
  name: string,
  description: string,
  boardSize: 5 | 7 | 9 | 10,     // Size of bingo board
  creatorId: string,             // User ID of creator
  status: 'draft' | 'active' | 'completed' | 'cancelled',
  startDate?: Timestamp,
  endDate?: Timestamp,
  teamIds: string[],             // Array of team IDs in this event
  taskIds: string[],             // Array of task IDs for this event
  settings: {
    allowMultipleCompletions: boolean,
    requireVerification: boolean,
    maxTeams?: number,
    maxPlayersPerTeam?: number
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `creatorId`
- `status`
- `createdAt` (desc)

### 3. Teams Collection (`teams`)

Stores team information for events.

```typescript
{
  id: string,
  eventId: string,               // Reference to event
  name: string,
  description?: string,
  captainId: string,             // User ID of team captain
  memberIds: string[],           // Array of user IDs in team
  score: number,                 // Total points earned
  completedTaskIds: string[],    // Array of completed task IDs
  color?: string,                // Team color for UI
  inviteCode?: string,           // Unique code for joining
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `eventId`
- `captainId`
- `memberIds` (array-contains)
- `score` (desc)

### 4. Tasks Collection (`tasks`)

Stores individual tasks for bingo boards.

```typescript
{
  id: string,
  eventId: string,               // Reference to event
  title: string,
  description: string,
  points: number,
  position: number,              // Position on board (0 to boardSize² - 1)
  row: number,                   // Calculated row
  col: number,                   // Calculated column
  category?: string,             // e.g., "PvM", "Skilling"
  difficulty?: 'easy' | 'medium' | 'hard' | 'elite',
  imageUrl?: string,
  hints?: string[],
  completedByTeamIds: string[],  // Teams that completed this
  verificationRequired: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `eventId`
- `position`
- `category`
- `difficulty`

### 5. Task Completions Collection (`taskCompletions`)

Tracks completion history of tasks.

```typescript
{
  id: string,
  taskId: string,
  teamId: string,
  eventId: string,
  completedBy: string,           // User ID who marked complete
  completedAt: Timestamp,
  verificationImageUrl?: string,
  verificationNote?: string,
  verified: boolean,
  verifiedBy?: string,           // User ID who verified
  verifiedAt?: Timestamp,
  points: number,                // Points at time of completion
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `taskId`
- `teamId`
- `eventId`
- `completedAt` (desc)
- `verified`

### 6. Event Invitations Collection (`eventInvitations`)

Manages event/team invitation codes.

```typescript
{
  id: string,
  eventId: string,
  teamId?: string,               // Optional: specific team
  inviteCode: string,            // Unique invite code
  invitedBy: string,             // User ID
  expiresAt?: Timestamp,
  maxUses?: number,
  usedCount: number,
  status: 'active' | 'expired' | 'revoked',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes:**
- `eventId`
- `inviteCode` (unique)
- `status`

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(userId);
    }
    
    // Events collection
    match /events/{eventId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.creatorId);
    }
    
    // Teams collection
    match /teams/{teamId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (isOwner(resource.data.captainId) || 
         request.auth.uid in resource.data.memberIds);
      allow delete: if isOwner(resource.data.captainId);
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Task completions collection
    match /taskCompletions/{completionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if false; // Completions cannot be deleted
    }
    
    // Event invitations collection
    match /eventInvitations/{invitationId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
  }
}
```

## Usage Examples

### Creating a User
```typescript
import { userRepo } from './repositories';

const newUser = await userRepo.create({
  username: 'player1',
  email: 'player1@example.com',
  passwordHash: await bcrypt.hash('password', 10)
});
```

### Creating an Event
```typescript
import { eventRepo, userRepo } from './repositories';

const event = await eventRepo.create({
  name: 'Summer Bingo 2026',
  description: 'Our summer clan event',
  boardSize: 5,
  creatorId: userId,
  status: 'draft',
  settings: {
    allowMultipleCompletions: false,
    requireVerification: true,
    maxTeams: 10
  }
});

// Add event to user's createdEvents
await userRepo.addCreatedEvent(userId, event.id);
```

### Creating a Team
```typescript
import { teamRepo, eventRepo, userRepo } from './repositories';

const team = await teamRepo.create({
  eventId: eventId,
  name: 'Team Alpha',
  captainId: userId,
  description: 'Best team ever!'
});

// Update references
await eventRepo.addTeam(eventId, team.id);
await userRepo.addJoinedTeam(userId, team.id);
```

### Completing a Task
```typescript
import { taskRepo, teamRepo, taskCompletionRepo } from './repositories';

const task = await taskRepo.findById(taskId);
const team = await teamRepo.findById(teamId);

// Create completion record
await taskCompletionRepo.create({
  taskId: task.id,
  teamId: team.id,
  eventId: task.eventId,
  completedBy: userId,
  verified: !task.verificationRequired,
  points: task.points
});

// Update task and team
await taskRepo.markCompleted(taskId, teamId);
await teamRepo.completeTask(teamId, taskId, task.points);
```

### Getting Event Statistics
```typescript
import { eventRepo } from './repositories';

const stats = await eventRepo.getStats(eventId);
console.log(stats.leaderboard); // Top teams by score
```

## Migration from In-Memory Storage

Replace the in-memory arrays with Firestore repository calls:

**Before:**
```typescript
const events: Event[] = [];
events.push(newEvent);
```

**After:**
```typescript
import { eventRepo } from './repositories';
const newEvent = await eventRepo.create(eventData);
```
