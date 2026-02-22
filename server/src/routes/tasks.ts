import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ApiErrorClass, asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  TaskRepository,
  EventRepository,
  TaskCompletionRepository,
  UserRepository,
} from '../repositories/index.js';
import { isEventCreatorOrAdmin } from '../utils/permissions.js';
import { notifyTaskCompleted } from '../services/discord.js';
import { db } from '../config/firebase.js';

const router = Router();
const taskRepo = new TaskRepository();
const eventRepo = new EventRepository();
const taskCompletionRepo = new TaskCompletionRepository();
const userRepo = new UserRepository();

// Cache for tasks to reduce Firestore reads
const tasksCache = new Map<string, { data: any; timestamp: number }>();
const TASKS_CACHE_TTL_MS = 60000; // 60 seconds

function getCachedTasks(eventId: string): any | null {
  const cached = tasksCache.get(eventId);
  if (cached && Date.now() - cached.timestamp < TASKS_CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedTasks(eventId: string, data: any): void {
  tasksCache.set(eventId, { data, timestamp: Date.now() });
}

export function invalidateTasksCache(eventId: string): void {
  tasksCache.delete(eventId);
}

// Get tasks for an event
router.get('/event/:eventId', asyncHandler(async (req: Request, res: Response) => {
  console.log(`📋 GET /tasks/event/${req.params.eventId}`);
  
  const eventId = req.params.eventId;
  
  // Check cache first
  const cached = getCachedTasks(eventId);
  if (cached) {
    return res.json(cached);
  }
  
  const eventTasks = await taskRepo.findByEvent(eventId);

  const response = {
    success: true,
    data: eventTasks,
  };
  
  // Cache the response
  setCachedTasks(eventId, response);

  return res.json(response);
}));

// Get single task
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const task = await taskRepo.findById(req.params.id);

  if (!task) {
    throw new ApiErrorClass(404, 'Task not found');
  }

  res.json({
    success: true,
    data: task,
  });
}));

// Get task completions (who completed this task)
router.get('/:id/completions', asyncHandler(async (req: Request, res: Response) => {
  console.log(`📋 GET /tasks/${req.params.id}/completions`);
  const completions = await taskCompletionRepo.findByTask(req.params.id);

  // Batch fetch all users at once instead of N+1 queries
  const uniqueUserIds = [...new Set(completions.map(c => c.completedBy))];
  const users = await Promise.all(
    uniqueUserIds.map(id => userRepo.findById(id))
  );
  
  const userMap = new Map(
    users.filter(u => u !== null).map(u => [u!.id, u!])
  );

  // Enrich completions with user information
  const enrichedCompletions = completions.map(completion => {
    const user = userMap.get(completion.completedBy);
    return {
      ...completion,
      completedByUsername: user?.username || 'Unknown User',
      completedByDisplayName:
        user?.displayName || user?.username || 'Unknown User',
    };
  });

  res.json({
    success: true,
    data: enrichedCompletions,
  });
}));

// Create task (requires auth and event creator)
router.post('/', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, title, description, points, position, isXPTask, xpRequirement } = req.body;

    // Basic validation
    if (!eventId || !title || points === undefined || position === undefined) {
      throw new ApiErrorClass(400, 'Missing required fields');
    }

    // Check if user is the event creator or admin
    const event = await eventRepo.findById(eventId);
    if (!event) {
      throw new ApiErrorClass(404, 'Event not found');
    }

    if (!isEventCreatorOrAdmin(event, req.user?.id || '')) {
      throw new ApiErrorClass(403, 'Only the event creator or admins can add tasks');
    }

    const newTask = await taskRepo.create({
      eventId,
      title,
      description: description || '',
      points,
      position,
      row: 0, // Will be calculated in repository
      col: 0, // Will be calculated in repository
      isXPTask: isXPTask || false,
      xpRequirement: xpRequirement || null,
      verificationRequired: false,
    });

    // Invalidate tasks cache for this event
    invalidateTasksCache(eventId);

    res.status(201).json({
      success: true,
      data: newTask,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiErrorClass(400, error.errors[0].message);
    }
    throw error;
  }
}));

// Uncomplete a task (event creator only)
router.post(
  '/:id/uncomplete',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const task = await taskRepo.findById(req.params.id);

    if (!task) {
      throw new ApiErrorClass(404, 'Task not found');
    }

    // Check if user is the event creator or admin
    const event = await eventRepo.findById(task.eventId);
    if (!event) {
      throw new ApiErrorClass(404, 'Event not found');
    }

    if (!isEventCreatorOrAdmin(event, req.user?.id || '')) {
      throw new ApiErrorClass(403, 'Only the event creator or admins can uncomplete tasks');
    }

    const { teamId } = req.body;
    if (!teamId) {
      throw new ApiErrorClass(400, 'Team ID required');
    }

    if (!task.completedByTeamIds.includes(teamId)) {
      throw new ApiErrorClass(400, 'Task is not completed by this team');
    }

    await taskRepo.uncompleteTask(req.params.id, teamId);

    // Fetch updated task
    const updatedTask = await taskRepo.findById(req.params.id);

    // Emit Socket.IO event to all clients in the event room
    const io = (req.app as any).get('io');
    if (io && updatedTask) {
      io.to(`event-${updatedTask.eventId}`).emit('task-uncompleted', {
        task: updatedTask,
        teamId,
      });
    }

    res.json({
      success: true,
      data: updatedTask,
    });
  }),
);

// Mark task as completed by team
router.post(
  '/:id/complete',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const task = await taskRepo.findById(req.params.id);

    if (!task) {
      throw new ApiErrorClass(404, 'Task not found');
    }

    const { teamId, verificationImageUrl, verificationImagePath, verificationNote } = req.body;
    if (!teamId) {
      throw new ApiErrorClass(400, 'Team ID required');
    }

    if (!req.user?.id) {
      throw new ApiErrorClass(401, 'User not authenticated');
    }

    if (task.completedByTeamIds.includes(teamId)) {
      throw new ApiErrorClass(400, 'Task already completed by this team');
    }

    // Prepare verification data if provided
    const verificationData = (verificationImageUrl || verificationNote) ? {
      imageUrl: verificationImageUrl,
      imagePath: verificationImagePath,
      note: verificationNote,
    } : undefined;

    await taskRepo.markCompleted(req.params.id, teamId, req.user.id, verificationData);

    // Fetch updated task
    const updatedTask = await taskRepo.findById(req.params.id);

    // Get team name and member RSN for Discord notification
    let teamName = 'Unknown Team';
    let memberRSN: string | undefined;
    
    try {
      const teamDoc = await db.collection('teams').doc(teamId).get();
      if (teamDoc.exists) {
        teamName = teamDoc.data()?.name || teamName;
        
        // Get the member who completed the task to find their RSN
        const memberId = req.user?.id;
        if (memberId) {
          const memberDoc = await db.collection('users').doc(memberId).get();
          if (memberDoc.exists) {
            memberRSN = memberDoc.data()?.rsn;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching team for Discord notification:', err);
    }

    // Send Discord notification for task completion
    if (updatedTask) {
      notifyTaskCompleted(
        teamName, 
        updatedTask.title, 
        updatedTask.points, 
        memberRSN,
        verificationImageUrl,
        verificationNote
      );
    }

    // Emit Socket.IO event to all clients in the event room
    const io = (req.app as any).get('io');
    if (io && updatedTask) {
      io.to(`event-${updatedTask.eventId}`).emit('task-completed', {
        task: updatedTask,
        teamId,
        completedBy: req.user.id,
      });
    }

    res.json({
      success: true,
      data: updatedTask,
    });
  }),
);

// Update task (requires auth and event creator)
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  console.log(`[Tasks PUT] Looking for task with ID: ${req.params.id}`);
  const task = await taskRepo.findById(req.params.id);
  console.log(`[Tasks PUT] Task found:`, task ? `Yes (${task.id})` : 'No');

  if (!task) {
    throw new ApiErrorClass(404, 'Task not found');
  }

  // Check if user is the event creator or admin
  const event = await eventRepo.findById(task.eventId);
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  if (!isEventCreatorOrAdmin(event, req.user?.id || '')) {
    throw new ApiErrorClass(403, 'Only the event creator or admins can update tasks');
  }

  const updates = req.body;
  await taskRepo.update(req.params.id, updates);

  // Invalidate tasks cache for this event
  invalidateTasksCache(task.eventId);

  // Fetch updated task
  const updatedTask = await taskRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedTask,
  });
}));

// Delete task (requires auth and event creator)
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await taskRepo.findById(req.params.id);

  if (!task) {
    throw new ApiErrorClass(404, 'Task not found');
  }

  // Check if user is the event creator or admin
  const event = await eventRepo.findById(task.eventId);
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  if (!isEventCreatorOrAdmin(event, req.user?.id || '')) {
    throw new ApiErrorClass(403, 'Only the event creator or admins can delete tasks');
  }

  await taskRepo.delete(req.params.id);

  // Invalidate tasks cache for this event
  invalidateTasksCache(task.eventId);

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
}));

export default router;
