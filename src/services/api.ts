// API base URL - use define'd value for Docker compatibility
const API_BASE_URL =
  (window as any).__VITE_API_URL__ || import.meta.env.VITE_API_URL || (import.meta.env.MODE === "development" ? "http://localhost:3000" : "");

// API client configuration
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // Try to parse the response as JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw a generic error
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error('Invalid response format');
      }

      // If response is not ok, throw the error message
      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `HTTP error! status: ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      // Re-throw errors with better context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  rsn?: string; // RuneScape Name for XP tracking
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  boardSize: number;
  creatorId: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  joinCode: string;
  trackingEnabled?: boolean;
  refreshSchedule?: string | null;
  eventStartedAt?: string;
  eventEndedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  captainId: string;
  score: number;
  memberIds: string[];
  completedTaskIds: string[];
  color?: string;
  joinCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description: string;
  points: number;
  position: number;
  completedByTeamIds: string[];
  isXPTask?: boolean;
  xpRequirement?: {
    skill: string;
    amount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  teamId: string;
  eventId: string;
  completedBy: string; // User ID
  completedByUsername?: string;
  completedByDisplayName?: string;
  completedAt: string;
  points: number;
  verified: boolean;
  verificationImageUrl?: string;
  verificationImagePath?: string;
  verificationNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

// Auth API
export const authApi = {
  register: (username: string, email: string, password: string, rsn: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', {
      username,
      email,
      password,
      rsn,
    }),

  login: (username: string, password: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', {
      username,
      password,
    }),

  getProfile: () => apiClient.get<ApiResponse<User>>('/api/auth/me'),

  updateProfile: (data: {
    displayName?: string;
    avatarUrl?: string;
    rsn?: string;
  }) => apiClient.put<ApiResponse<User>>('/api/auth/me', data),

  getUsersByIds: (userIds: string[]) =>
    apiClient.post<ApiResponse<User[]>>('/api/auth/users/batch', { userIds }),

  logout: () => {
    apiClient.setToken(null);
  },
};

// Events API
export const eventsApi = {
  getAll: () => apiClient.get<ApiResponse<Event[]>>('/api/events'),

  getMyEvents: () =>
    apiClient.get<ApiResponse<Event[]>>('/api/events/my-events'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Event>>(`/api/events/${id}`),

  create: (data: { name: string; description: string; boardSize: string }) =>
    apiClient.post<ApiResponse<Event>>('/api/events', data),

  update: (id: string, data: Partial<Event>) =>
    apiClient.put<ApiResponse<Event>>(`/api/events/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/events/${id}`),

  joinWithCode: (joinCode: string) =>
    apiClient.post<ApiResponse<Event>>('/api/events/join', { joinCode }),

  publish: (id: string) =>
    apiClient.post<ApiResponse<Event>>(`/api/events/${id}/publish`, {}),

  setSchedule: (id: string, cronExpression: string | null) =>
    apiClient.post<ApiResponse<Event>>(`/api/events/${id}/schedule`, { cronExpression }),

  getNextScheduleTime: (id: string) =>
    apiClient.get<ApiResponse<{ nextRunTime: string | null; cronExpression: string | null }>>(`/api/events/${id}/schedule/next`),
};

// Teams API
export const teamsApi = {
  getByEvent: (eventId: string) =>
    apiClient.get<ApiResponse<Team[]>>(`/api/teams/event/${eventId}`),

  getMyTeams: () => apiClient.get<ApiResponse<Team[]>>('/api/teams/my-teams'),

  getById: (id: string) => apiClient.get<ApiResponse<Team>>(`/api/teams/${id}`),

  create: (data: { eventId: string; name: string }) =>
    apiClient.post<ApiResponse<Team>>('/api/teams', data),

  update: (
    id: string,
    data: { name?: string; description?: string; color?: string },
  ) => apiClient.put<ApiResponse<Team>>(`/api/teams/${id}`, data),

  addMember: (teamId: string, userId: string) =>
    apiClient.post<ApiResponse<Team>>(`/api/teams/${teamId}/members`, {
      userId,
    }),

  // Join team (as current user)
  joinTeam: (teamId: string) =>
    apiClient.post<ApiResponse<Team>>(`/api/teams/${teamId}/members`, {}),

  // Join team with code
  joinWithCode: (joinCode: string) =>
    apiClient.post<ApiResponse<Team>>('/api/teams/join', { joinCode }),

  removeMember: (teamId: string, userId: string) =>
    apiClient.delete<ApiResponse<Team>>(
      `/api/teams/${teamId}/members/${userId}`,
    ),

  transferCaptain: (teamId: string, newCaptainId: string) =>
    apiClient.post<ApiResponse<Team>>(
      `/api/teams/${teamId}/transfer-captain`,
      { newCaptainId },
    ),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/teams/${id}`),
};

// Tasks API
export const tasksApi = {
  getByEvent: (eventId: string) =>
    apiClient.get<ApiResponse<Task[]>>(`/api/tasks/event/${eventId}`),

  getById: (id: string) => apiClient.get<ApiResponse<Task>>(`/api/tasks/${id}`),

  getCompletions: (taskId: string) =>
    apiClient.get<ApiResponse<TaskCompletion[]>>(
      `/api/tasks/${taskId}/completions`,
    ),

  create: (data: {
    eventId: string;
    title: string;
    description: string;
    points: number;
    position: number;
  }) => apiClient.post<ApiResponse<Task>>('/api/tasks', data),

  update: (id: string, data: Partial<Task>) =>
    apiClient.put<ApiResponse<Task>>(`/api/tasks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/tasks/${id}`),

  complete: (
    taskId: string,
    teamId: string,
    verificationData?: {
      verificationImageUrl?: string;
      verificationImagePath?: string;
      verificationNote?: string;
    },
  ) =>
    apiClient.post<ApiResponse<Task>>(`/api/tasks/${taskId}/complete`, {
      teamId,
      ...verificationData,
    }),

  uncomplete: (taskId: string, teamId: string) =>
    apiClient.post<ApiResponse<Task>>(`/api/tasks/${taskId}/uncomplete`, {
      teamId,
    }),
};

// XP Tracking API
export const trackingApi = {
  updatePlayerData: (eventId: string) =>
    apiClient.post<ApiResponse<{ message: string; info: string; count: number }>>(`/api/tracking/${eventId}/update-players`),

  startTracking: (eventId: string) =>
    apiClient.post<ApiResponse<{ message: string; playersTracked: number; players: string[] }>>(`/api/tracking/${eventId}/start`),

  endTracking: (eventId: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/api/tracking/${eventId}/end`),

  refreshSnapshots: (eventId: string) =>
    apiClient.post<ApiResponse<{ message: string; playersUpdated: number }>>(`/api/tracking/${eventId}/refresh`),

  getProgress: (eventId: string) =>
    apiClient.get<ApiResponse<{
      eventId: string;
      teams: Array<{
        teamId: string;
        members: Array<{
          userId: string;
          rsn: string;
          gains: {
            [skill: string]: {
              baseXP: number;
              currentXP: number;
              gain: number;
            };
          };
        }>;
        totalGains: {
          [skill: string]: number;
        };
      }>;
    }>>(`/api/tracking/${eventId}/progress`),
  checkXPTasks: (eventId: string) =>
    apiClient.post<ApiResponse<{
      message: string;
      completedTasks: Array<{
        taskId: string;
        teamId: string;
        skill: string;
        gained: number;
        required: number;
      }>;
    }>>(`/api/tracking/${eventId}/check-xp-tasks`),};

export default apiClient;
