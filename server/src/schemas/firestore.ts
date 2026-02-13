import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Base interface for all documents with Firestore metadata
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User Schema
export interface UserDocument extends FirestoreDocument {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  avatarUrl?: string;
  rsn?: string; // RuneScape Name for XP tracking
  createdEvents: string[]; // Array of event IDs
  joinedTeams: string[]; // Array of team IDs
}

// Event Schema
export interface EventDocument extends FirestoreDocument {
  name: string;
  description: string;
  boardSize: 5 | 7 | 9 | 10;
  creatorId: string; // Reference to User document
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate?: Timestamp;
  endDate?: Timestamp;
  eventStartedAt?: Timestamp; // When tracking actually started
  eventEndedAt?: Timestamp; // When tracking ended
  trackingEnabled: boolean; // Whether XP tracking is active
  teamIds: string[]; // Array of team IDs
  taskIds: string[]; // Array of task IDs
  joinCode: string; // 6-character code for joining event
  settings: {
    allowMultipleCompletions: boolean; // Can multiple teams complete same task
    requireVerification: boolean; // Require admin verification for task completion
    maxTeams?: number;
    maxPlayersPerTeam?: number;
  };
}

// Team Schema
export interface TeamDocument extends FirestoreDocument {
  eventId: string; // Reference to Event document
  name: string;
  description?: string;
  captainId: string; // Reference to User document
  memberIds: string[]; // Array of User IDs
  score: number;
  completedTaskIds: string[]; // Array of Task IDs
  color?: string; // Team color for UI
  joinCode: string; // 6-character code for joining team
}

// Task Schema
export interface TaskDocument extends FirestoreDocument {
  eventId: string; // Reference to Event document
  title: string;
  description: string;
  points: number;
  position: number; // Position on the bingo board (0 to boardSize^2 - 1)
  row: number; // Calculated row position
  col: number; // Calculated column position
  category?: string; // e.g., "PvM", "Skilling", "Questing"
  difficulty?: 'easy' | 'medium' | 'hard' | 'elite';
  imageUrl?: string;
  hints?: string[];
  completedByTeamIds: string[]; // Array of Team IDs that completed this task
  verificationRequired: boolean;
}

// Task Completion Schema (for tracking completion history)
export interface TaskCompletionDocument extends FirestoreDocument {
  taskId: string; // Reference to Task document
  teamId: string; // Reference to Team document
  eventId: string; // Reference to Event document
  completedBy: string; // User ID who marked it complete
  completedAt: Timestamp;
  verificationImageUrl?: string;
  verificationImagePath?: string; // Storage path for deletion
  verificationNote?: string;
  verified: boolean;
  verifiedBy?: string; // User ID who verified
  verifiedAt?: Timestamp;
  points: number; // Points earned (snapshot at completion time)
}

// Event Invitation Schema
export interface EventInvitationDocument extends FirestoreDocument {
  eventId: string;
  teamId?: string; // Optional: invite to specific team
  inviteCode: string;
  invitedBy: string; // User ID
  expiresAt?: Timestamp;
  maxUses?: number;
  usedCount: number;
  status: 'active' | 'expired' | 'revoked';
}

// Type for creating new documents (without Firestore metadata)
export type CreateUserInput = Omit<
  UserDocument,
  keyof FirestoreDocument | 'createdEvents' | 'joinedTeams'
>;
export type CreateEventInput = Omit<
  EventDocument,
  keyof FirestoreDocument | 'teamIds' | 'taskIds' | 'joinCode'
>;
export type CreateTeamInput = Omit<
  TeamDocument,
  | keyof FirestoreDocument
  | 'memberIds'
  | 'score'
  | 'completedTaskIds'
  | 'joinCode'
>;
export type CreateTaskInput = Omit<TaskDocument, keyof FirestoreDocument | 'completedByTeamIds'>;
export type CreateTaskCompletionInput = Omit<TaskCompletionDocument, keyof FirestoreDocument>;

// Firestore timestamp helper types
export type TimestampField = Timestamp | FieldValue;

// Query result types
export interface PaginatedResult<T> {
  data: T[];
  lastDoc?: any;
  hasMore: boolean;
  total?: number;
}

// Statistics types
export interface EventStats {
  eventId: string;
  totalTasks: number;
  completedTasks: number;
  totalTeams: number;
  totalPoints: number;
  leaderboard: {
    teamId: string;
    teamName: string;
    score: number;
    completedTasks: number;
  }[];
}

export interface TeamStats {
  teamId: string;
  totalMembers: number;
  completedTasks: number;
  score: number;
  completionRate: number; // Percentage
  lastActivity?: Timestamp;
}

// Player snapshot for XP tracking
export interface PlayerSnapshotDocument {
  eventId: string;
  teamId: string;
  userId: string;
  rsn: string; // RuneScape Name
  snapshotType: 'baseline' | 'current'; // baseline = event start, current = latest
  capturedAt: Timestamp;
  skills: {
    [skillName: string]: {
      experience: number;
      level: number;
    };
  };
}
