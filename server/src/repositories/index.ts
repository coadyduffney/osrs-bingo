import { db, COLLECTIONS } from '../config/firebase.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type {
  UserDocument,
  EventDocument,
  TeamDocument,
  TaskDocument,
  TaskCompletionDocument,
  CreateUserInput,
  CreateEventInput,
  CreateTeamInput,
  CreateTaskInput,
  CreateTaskCompletionInput,
  EventStats,
  TeamStats,
} from '../schemas/firestore.js';

// Helper function to convert Firestore Timestamps to ISO strings
function serializeDocument<T extends Record<string, any>>(doc: T): T {
  const serialized: any = {};
  
  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof Timestamp) {
      // Convert Firestore Timestamp to ISO string
      serialized[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively serialize nested objects
      serialized[key] = serializeDocument(value);
    } else {
      serialized[key] = value;
    }
  }
  
  return serialized as T;
}

// Helper function to generate a 6-character alphanumeric code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// USER REPOSITORY
// ============================================
export class UserRepository {
  private collection = db.collection(COLLECTIONS.USERS);

  async create(data: CreateUserInput): Promise<UserDocument> {
    const docRef = this.collection.doc();
    const now = Timestamp.now();

    const userData: UserDocument = {
      id: docRef.id,
      ...data,
      createdEvents: [],
      joinedTeams: [],
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(userData);
    return serializeDocument(userData);
  }

  async findById(id: string): Promise<UserDocument | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? serializeDocument(doc.data() as UserDocument) : null;
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    const snapshot = await this.collection
      .where('username', '==', username)
      .limit(1)
      .get();
    return snapshot.empty ? null : serializeDocument(snapshot.docs[0].data() as UserDocument);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const snapshot = await this.collection
      .where('email', '==', email)
      .limit(1)
      .get();
    return snapshot.empty ? null : serializeDocument(snapshot.docs[0].data() as UserDocument);
  }

  async update(id: string, data: Partial<UserDocument>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  async addCreatedEvent(userId: string, eventId: string): Promise<void> {
    await this.collection.doc(userId).update({
      createdEvents: FieldValue.arrayUnion(eventId),
      updatedAt: Timestamp.now(),
    });
  }

  async addJoinedTeam(userId: string, teamId: string): Promise<void> {
    await this.collection.doc(userId).update({
      joinedTeams: FieldValue.arrayUnion(teamId),
      updatedAt: Timestamp.now(),
    });
  }
}

// ============================================
// EVENT REPOSITORY
// ============================================
export class EventRepository {
  private collection = db.collection(COLLECTIONS.EVENTS);

  async create(data: CreateEventInput): Promise<EventDocument> {
    const docRef = this.collection.doc();
    const now = Timestamp.now();

    const eventData: EventDocument = {
      id: docRef.id,
      ...data,
      teamIds: [],
      taskIds: [],
      joinCode: generateJoinCode(),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(eventData);
    return serializeDocument(eventData);
  }

  async findById(id: string): Promise<EventDocument | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? serializeDocument(doc.data() as EventDocument) : null;
  }

  async findAll(limit = 50): Promise<EventDocument[]> {
    const snapshot = await this.collection
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as EventDocument));
  }

  async findByCreator(creatorId: string): Promise<EventDocument[]> {
    const snapshot = await this.collection
      .where('creatorId', '==', creatorId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as EventDocument));
  }

  async findByStatus(
    status: EventDocument['status'],
  ): Promise<EventDocument[]> {
    const snapshot = await this.collection
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as EventDocument));
  }

  async update(id: string, data: Partial<EventDocument>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  async addTeam(eventId: string, teamId: string): Promise<void> {
    await this.collection.doc(eventId).update({
      teamIds: FieldValue.arrayUnion(teamId),
      updatedAt: Timestamp.now(),
    });
  }

  async addTask(eventId: string, taskId: string): Promise<void> {
    await this.collection.doc(eventId).update({
      taskIds: FieldValue.arrayUnion(taskId),
      updatedAt: Timestamp.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async findByJoinCode(joinCode: string): Promise<EventDocument | null> {
    const snapshot = await this.collection
      .where('joinCode', '==', joinCode)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return serializeDocument(snapshot.docs[0].data() as EventDocument);
  }

  async getStats(eventId: string): Promise<EventStats> {
    const event = await this.findById(eventId);
    if (!event) throw new Error('Event not found');

    const teamsSnapshot = await db
      .collection(COLLECTIONS.TEAMS)
      .where('eventId', '==', eventId)
      .get();

    const tasksSnapshot = await db
      .collection(COLLECTIONS.TASKS)
      .where('eventId', '==', eventId)
      .get();

    const teams = teamsSnapshot.docs.map((doc) => doc.data() as TeamDocument);
    const tasks = tasksSnapshot.docs.map((doc) => doc.data() as TaskDocument);

    const completedTasksCount = tasks.filter(
      (t) => t.completedByTeamIds.length > 0,
    ).length;
    const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

    const leaderboard = teams
      .map((team) => ({
        teamId: team.id,
        teamName: team.name,
        score: team.score,
        completedTasks: team.completedTaskIds.length,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      eventId,
      totalTasks: tasks.length,
      completedTasks: completedTasksCount,
      totalTeams: teams.length,
      totalPoints,
      leaderboard,
    };
  }
}

// ============================================
// TEAM REPOSITORY
// ============================================
export class TeamRepository {
  private collection = db.collection(COLLECTIONS.TEAMS);

  async create(data: CreateTeamInput): Promise<TeamDocument> {
    const docRef = this.collection.doc();
    const now = Timestamp.now();

    const teamData: TeamDocument = {
      id: docRef.id,
      ...data,
      memberIds: [data.captainId], // Captain is first member
      score: 0,
      completedTaskIds: [],
      joinCode: generateJoinCode(),
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(teamData);
    return serializeDocument(teamData);
  }

  async findById(id: string): Promise<TeamDocument | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? serializeDocument(doc.data() as TeamDocument) : null;
  }

  async findByEvent(eventId: string): Promise<TeamDocument[]> {
    const snapshot = await this.collection
      .where('eventId', '==', eventId)
      .orderBy('score', 'desc')
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as TeamDocument));
  }

  async findByMember(userId: string): Promise<TeamDocument[]> {
    const snapshot = await this.collection
      .where('memberIds', 'array-contains', userId)
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as TeamDocument));
  }

  async update(id: string, data: Partial<TeamDocument>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  async addMember(teamId: string, userId: string): Promise<void> {
    await this.collection.doc(teamId).update({
      memberIds: FieldValue.arrayUnion(userId),
      updatedAt: Timestamp.now(),
    });
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.collection.doc(teamId).update({
      memberIds: FieldValue.arrayRemove(userId),
      updatedAt: Timestamp.now(),
    });
  }

  async transferCaptain(teamId: string, newCaptainId: string): Promise<void> {
    await this.collection.doc(teamId).update({
      captainId: newCaptainId,
      updatedAt: Timestamp.now(),
    });
  }

  async findByJoinCode(joinCode: string): Promise<TeamDocument | null> {
    const snapshot = await this.collection
      .where('joinCode', '==', joinCode)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return serializeDocument(snapshot.docs[0].data() as TeamDocument);
  }

  async completeTask(
    teamId: string,
    taskId: string,
    points: number,
  ): Promise<void> {
    await this.collection.doc(teamId).update({
      completedTaskIds: FieldValue.arrayUnion(taskId),
      score: FieldValue.increment(points),
      updatedAt: Timestamp.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async getStats(teamId: string): Promise<TeamStats> {
    const team = await this.findById(teamId);
    if (!team) throw new Error('Team not found');

    const event = await db
      .collection(COLLECTIONS.EVENTS)
      .doc(team.eventId)
      .get();
    const eventData = event.data() as EventDocument;

    const totalTasks = eventData.taskIds.length;
    const completionRate =
      totalTasks > 0 ? (team.completedTaskIds.length / totalTasks) * 100 : 0;

    return {
      teamId: team.id,
      totalMembers: team.memberIds.length,
      completedTasks: team.completedTaskIds.length,
      score: team.score,
      completionRate,
      lastActivity: team.updatedAt,
    };
  }
}

// ============================================
// TASK REPOSITORY
// ============================================
export class TaskRepository {
  private collection = db.collection(COLLECTIONS.TASKS);

  async create(data: CreateTaskInput): Promise<TaskDocument> {
    const docRef = this.collection.doc();
    const now = Timestamp.now();

    // Calculate row and column from position
    const event = await db
      .collection(COLLECTIONS.EVENTS)
      .doc(data.eventId)
      .get();
    const eventData = event.data() as EventDocument;
    const boardSize = eventData.boardSize;

    const taskData: TaskDocument = {
      id: docRef.id,
      ...data,
      row: Math.floor(data.position / boardSize),
      col: data.position % boardSize,
      completedByTeamIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(taskData);
    return serializeDocument(taskData);
  }

  async findById(id: string): Promise<TaskDocument | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? serializeDocument(doc.data() as TaskDocument) : null;
  }

  async findByEvent(eventId: string): Promise<TaskDocument[]> {
    const snapshot = await this.collection
      .where('eventId', '==', eventId)
      .orderBy('position', 'asc')
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as TaskDocument));
  }

  async update(id: string, data: Partial<TaskDocument>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  async markCompleted(
    taskId: string,
    teamId: string,
    userId: string,
    verificationData?: {
      imageUrl?: string;
      imagePath?: string;
      note?: string;
    },
  ): Promise<void> {
    // Get the task to retrieve points
    const task = await this.findById(taskId);
    if (!task) throw new Error('Task not found');

    const now = Timestamp.now();

    // Update task with completed team
    await this.collection.doc(taskId).update({
      completedByTeamIds: FieldValue.arrayUnion(teamId),
      updatedAt: now,
    });

    // Update team score and completed tasks
    const teamRepo = new TeamRepository();
    await teamRepo.completeTask(teamId, taskId, task.points);

    // Create task completion record
    const completionRepo = new TaskCompletionRepository();
    await completionRepo.create({
      taskId,
      teamId,
      eventId: task.eventId,
      completedBy: userId,
      completedAt: now,
      points: task.points,
      verified: !task.verificationRequired,
      ...(verificationData?.imageUrl && {
        verificationImageUrl: verificationData.imageUrl,
      }),
      ...(verificationData?.imagePath && {
        verificationImagePath: verificationData.imagePath,
      }),
      ...(verificationData?.note && {
        verificationNote: verificationData.note,
      }),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async bulkCreate(tasks: CreateTaskInput[]): Promise<TaskDocument[]> {
    const batch = db.batch();
    const createdTasks: TaskDocument[] = [];

    for (const taskData of tasks) {
      const docRef = this.collection.doc();
      const now = Timestamp.now();

      const event = await db
        .collection(COLLECTIONS.EVENTS)
        .doc(taskData.eventId)
        .get();
      const eventData = event.data() as EventDocument;
      const boardSize = eventData.boardSize;

      const task: TaskDocument = {
        id: docRef.id,
        ...taskData,
        row: Math.floor(taskData.position / boardSize),
        col: taskData.position % boardSize,
        completedByTeamIds: [],
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, task);
      createdTasks.push(serializeDocument(task));
    }

    await batch.commit();
    return createdTasks;
  }
}

// ============================================
// TASK COMPLETION REPOSITORY
// ============================================
export class TaskCompletionRepository {
  private collection = db.collection(COLLECTIONS.TASK_COMPLETIONS);

  async create(
    data: CreateTaskCompletionInput,
  ): Promise<TaskCompletionDocument> {
    const docRef = this.collection.doc();
    const now = Timestamp.now();

    const completionData: TaskCompletionDocument = {
      id: docRef.id,
      ...data,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(completionData);
    return serializeDocument(completionData);
  }

  async findById(id: string): Promise<TaskCompletionDocument | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? serializeDocument(doc.data() as TaskCompletionDocument) : null;
  }

  async findByTask(taskId: string): Promise<TaskCompletionDocument[]> {
    const snapshot = await this.collection.where('taskId', '==', taskId).get();

    // Serialize and sort in memory to avoid needing a Firestore index
    const docs = snapshot.docs.map(
      (doc) => serializeDocument(doc.data() as TaskCompletionDocument),
    );
    // After serialization, dates are ISO strings
    return docs.sort(
      (a, b) => new Date(b.completedAt as any).getTime() - new Date(a.completedAt as any).getTime(),
    );
  }

  async findByTeam(teamId: string): Promise<TaskCompletionDocument[]> {
    const snapshot = await this.collection
      .where('teamId', '==', teamId)
      .orderBy('completedAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as TaskCompletionDocument));
  }

  async findByEvent(eventId: string): Promise<TaskCompletionDocument[]> {
    const snapshot = await this.collection
      .where('eventId', '==', eventId)
      .orderBy('completedAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => serializeDocument(doc.data() as TaskCompletionDocument));
  }

  async verify(id: string, verifiedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      verified: true,
      verifiedBy,
      verifiedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async update(
    id: string,
    data: Partial<TaskCompletionDocument>,
  ): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
  }
}

// Export repository instances
export const userRepo = new UserRepository();
export const eventRepo = new EventRepository();
export const teamRepo = new TeamRepository();
export const taskRepo = new TaskRepository();
export const taskCompletionRepo = new TaskCompletionRepository();
