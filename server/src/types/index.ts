export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  boardSize: number; // 5, 7, 9, or 10
  creatorId: string;
  status: 'draft' | 'active' | 'completed';
  startDate?: Date;
  endDate?: Date;
  refreshSchedule?: string; // cron expression (e.g., '0 * * * *' for every hour)
  trackingEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  score: number;
  memberIds: string[];
  createdAt: Date;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description: string;
  points: number;
  position: number; // Position on the board (0 to boardSize^2 - 1)
  completedByTeamIds: string[];
  imageUrl?: string;
  createdAt: Date;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  teamId: string;
  completedAt: Date;
  verificationImageUrl?: string;
  verified: boolean;
}
