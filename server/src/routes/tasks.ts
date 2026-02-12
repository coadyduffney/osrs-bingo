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

const router = Router();
const taskRepo = new TaskRepository();
const eventRepo = new EventRepository();
const taskCompletionRepo = new TaskCompletionRepository();
const userRepo = new UserRepository();

// Validation schema
const createTaskSchema = z.object({
  eventId: z.string(),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  points: z.number().min(1).max(100),
  position: z.number().min(0),
});

// Get tasks for an event
router.get('/event/:eventId', asyncHandler(async (req: Request, res: Response) => {
  const eventTasks = await taskRepo.findByEvent(req.params.eventId);

  res.json({
    success: true,
    data: eventTasks,
  });
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
  const completions = await taskCompletionRepo.findByTask(req.params.id);

  // Enrich completions with user information
  const enrichedCompletions = await Promise.all(
    completions.map(async (completion) => {
      const user = await userRepo.findById(completion.completedBy);
      return {
        ...completion,
        completedByUsername: user?.username || 'Unknown User',
        completedByDisplayName:
          user?.displayName || user?.username || 'Unknown User',
      };
    }),
  );

  res.json({
    success: true,
    data: enrichedCompletions,
  });
}));

// Create task (requires auth and event creator)
router.post('/', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, title, description, points, position } =
      createTaskSchema.parse(req.body);

    // Check if user is the event creator
    const event = await eventRepo.findById(eventId);
    if (!event) {
      throw new ApiErrorClass(404, 'Event not found');
    }

    if (event.creatorId !== req.user?.id) {
      throw new ApiErrorClass(403, 'Only the event creator can add tasks');
    }

    const newTask = await taskRepo.create({
      eventId,
      title,
      description: description || '',
      points,
      position,
      row: 0, // Will be calculated in repository
      col: 0, // Will be calculated in repository
      verificationRequired: false,
    });

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
  const task = await taskRepo.findById(req.params.id);

  if (!task) {
    throw new ApiErrorClass(404, 'Task not found');
  }

  // Check if user is the event creator
  const event = await eventRepo.findById(task.eventId);
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  if (event.creatorId !== req.user?.id) {
    throw new ApiErrorClass(403, 'Only the event creator can update tasks');
  }

  const updates = req.body;
  await taskRepo.update(req.params.id, updates);

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

  // Check if user is the event creator
  const event = await eventRepo.findById(task.eventId);
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  if (event.creatorId !== req.user?.id) {
    throw new ApiErrorClass(403, 'Only the event creator can delete tasks');
  }

  await taskRepo.delete(req.params.id);

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
}));

export default router;
