# Firestore Setup Guide for OSRS Bingo

This guide will help you set up Google Cloud Firestore as the database for your OSRS Bingo application.

## Prerequisites

- Google Cloud account
- Firebase project (or create a new one)
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Enable Firestore Database:
   - Go to "Build" → "Firestore Database"
   - Click "Create database"
   - Choose production mode or test mode
   - Select a location close to your users

## Step 2: Generate Service Account Key

### Option A: Using Service Account JSON File (Recommended for Development)

1. In Firebase Console, go to Project Settings (gear icon)
2. Navigate to "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file as `serviceAccountKey.json`
5. Move it to your `server/` directory
6. **Important**: Add `serviceAccountKey.json` to `.gitignore`

```bash
cd server
# Place your serviceAccountKey.json here
echo "serviceAccountKey.json" >> .gitignore
```

### Option B: Using Environment Variables (Recommended for Production)

Extract values from the service account JSON:

```json
{
  "project_id": "your-project-id",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

## Step 3: Configure Environment Variables

Edit your `server/.env` file:

### Option A: Using Service Account File

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=http://localhost:5173

# Firebase - Service Account File Path
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### Option B: Using Individual Environment Variables

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=http://localhost:5173

# Firebase - Individual Credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**Note**: When using `FIREBASE_PRIVATE_KEY`, keep the quotes and actual newline characters (`\n`).

## Step 4: Set Up Firestore Security Rules

1. In Firebase Console, go to Firestore Database
2. Click on "Rules" tab
3. Replace with these security rules:

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
      allow delete: if false;
    }
    
    // Event invitations collection
    match /eventInvitations/{invitationId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
  }
}
```

4. Click "Publish"

## Step 5: Create Firestore Indexes

Some queries require composite indexes. Create them:

1. Go to Firestore Database → Indexes
2. Click "Add index"
3. Create these indexes:

### Events Index
- Collection: `events`
- Fields: `creatorId` (Ascending), `createdAt` (Descending)

### Teams Index
- Collection: `teams`
- Fields: `eventId` (Ascending), `score` (Descending)

### Tasks Index
- Collection: `tasks`
- Fields: `eventId` (Ascending), `position` (Ascending)

### Task Completions Index
- Collection: `taskCompletions`
- Fields: `eventId` (Ascending), `completedAt` (Descending)

**Note**: You can also wait for Firestore to suggest indexes when you run queries that need them.

## Step 6: Update Your Code to Use Firestore

The Firestore integration is already set up! Here's what's included:

### Files Created:
- `src/config/firebase.ts` - Firebase initialization
- `src/schemas/firestore.ts` - TypeScript types for Firestore documents
- `src/repositories/index.ts` - Repository pattern for database operations
- `FIRESTORE_SCHEMA.md` - Complete schema documentation

### Using the Repositories:

Replace in-memory storage in your routes with Firestore repositories:

**Example: Auth Routes**

```typescript
// OLD (in-memory)
const users: Array<User> = [];
users.push(newUser);

// NEW (Firestore)
import { userRepo } from '../repositories/index.js';
const newUser = await userRepo.create({
  username,
  email,
  passwordHash
});
```

**Example: Event Routes**

```typescript
// OLD
const events: Event[] = [];
const event = events.find(e => e.id === id);

// NEW
import { eventRepo } from '../repositories/index.js';
const event = await eventRepo.findById(id);
```

## Step 7: Test the Connection

1. Start your server:
```bash
npm run dev
```

2. Check the console for: `✅ Firebase Admin initialized successfully`

3. Test creating a user via API:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

4. Check Firestore Console to see the new user document

## Step 8: Migrate Existing Routes

Update your route files to use Firestore repositories:

### `src/routes/auth.ts`
```typescript
import { userRepo } from '../repositories/index.js';

// In register route:
const newUser = await userRepo.create({
  username,
  email,
  passwordHash
});

// In login route:
const user = await userRepo.findByUsername(username);
```

### `src/routes/events.ts`
```typescript
import { eventRepo, userRepo } from '../repositories/index.js';

// Create event
const event = await eventRepo.create({
  name,
  description,
  boardSize,
  creatorId: req.user.id, // From auth middleware
  status: 'draft',
  settings: {
    allowMultipleCompletions: false,
    requireVerification: false
  }
});

await userRepo.addCreatedEvent(req.user.id, event.id);
```

### `src/routes/teams.ts`
```typescript
import { teamRepo, eventRepo, userRepo } from '../repositories/index.js';

const team = await teamRepo.create({
  eventId,
  name,
  captainId: req.user.id
});

await eventRepo.addTeam(eventId, team.id);
await userRepo.addJoinedTeam(req.user.id, team.id);
```

### `src/routes/tasks.ts`
```typescript
import { taskRepo, eventRepo } from '../repositories/index.js';

const task = await taskRepo.create({
  eventId,
  title,
  description,
  points,
  position,
  verificationRequired: false
});

await eventRepo.addTask(eventId, task.id);
```

## Repository API Reference

### UserRepository
- `create(data)` - Create new user
- `findById(id)` - Find user by ID
- `findByUsername(username)` - Find by username
- `findByEmail(email)` - Find by email
- `update(id, data)` - Update user
- `addCreatedEvent(userId, eventId)` - Add event to user's created events
- `addJoinedTeam(userId, teamId)` - Add team to user's joined teams

### EventRepository
- `create(data)` - Create new event
- `findById(id)` - Find event by ID
- `findAll(limit)` - Get all events
- `findByCreator(creatorId)` - Get user's events
- `findByStatus(status)` - Get events by status
- `update(id, data)` - Update event
- `addTeam(eventId, teamId)` - Add team to event
- `addTask(eventId, taskId)` - Add task to event
- `delete(id)` - Delete event
- `getStats(eventId)` - Get event statistics

### TeamRepository
- `create(data)` - Create new team
- `findById(id)` - Find team by ID
- `findByEvent(eventId)` - Get teams for event
- `findByMember(userId)` - Get user's teams
- `update(id, data)` - Update team
- `addMember(teamId, userId)` - Add member
- `removeMember(teamId, userId)` - Remove member
- `completeTask(teamId, taskId, points)` - Mark task complete
- `delete(id)` - Delete team
- `getStats(teamId)` - Get team statistics

### TaskRepository
- `create(data)` - Create new task
- `findById(id)` - Find task by ID
- `findByEvent(eventId)` - Get tasks for event
- `update(id, data)` - Update task
- `markCompleted(taskId, teamId)` - Mark as completed by team
- `delete(id)` - Delete task
- `bulkCreate(tasks)` - Create multiple tasks

### TaskCompletionRepository
- `create(data)` - Create completion record
- `findById(id)` - Find by ID
- `findByTask(taskId)` - Get completions for task
- `findByTeam(teamId)` - Get team's completions
- `findByEvent(eventId)` - Get event's completions
- `verify(id, verifiedBy)` - Verify a completion
- `update(id, data)` - Update completion

## Troubleshooting

### Error: "Firebase credentials not configured"
- Make sure `.env` file exists and has correct values
- Check that `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Verify service account JSON file is in the right location

### Error: "Permission denied" in Firestore
- Check your Firestore Security Rules
- Ensure authentication is working correctly
- Verify user has proper permissions

### Error: "The query requires an index"
- Firestore will provide a link to create the index
- Click the link or create manually in Firebase Console
- Wait a few minutes for index to build

### Slow Queries
- Add appropriate indexes
- Use `.limit()` on large collections
- Implement pagination for large result sets

## Production Considerations

1. **Security**:
   - Never commit service account keys to git
   - Use environment variables in production
   - Enable Firebase App Check
   - Review and tighten security rules

2. **Performance**:
   - Create all necessary indexes
   - Use batch operations for bulk writes
   - Implement caching where appropriate
   - Monitor Firestore usage in console

3. **Backup**:
   - Set up automated backups in Firebase Console
   - Export important data regularly
   - Test restore procedures

4. **Monitoring**:
   - Enable Firebase Performance Monitoring
   - Set up alerts for errors
   - Monitor Firestore usage and costs

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Configure environment variables
3. ✅ Set security rules
4. ✅ Create indexes
5. [ ] Update all route files to use repositories
6. [ ] Test all API endpoints
7. [ ] Add error handling for Firestore operations
8. [ ] Implement pagination for large collections
9. [ ] Add data validation
10. [ ] Deploy to production

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Security Rules Reference](https://firebase.google.com/docs/firestore/security/rules-structure)

---

Need help? Check `FIRESTORE_SCHEMA.md` for detailed schema documentation and usage examples.
