import { Router, Request, Response } from 'express';
import cron from 'node-cron';
import { z } from 'zod';
import { ApiErrorClass, asyncHandler } from '../middleware/errorHandler.js';
import { EventRepository } from '../repositories/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { getNextRunTime, reloadScheduledJobs } from '../services/scheduler.js';
import { isEventCreatorOrAdmin } from '../utils/permissions.js';

const router = Router();
const eventRepo = new EventRepository();

// Validation schemas
const createEventSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  boardSize: z.enum(['5', '7', '9', '10']).transform((val) => Number(val) as 5 | 7 | 9 | 10)
});

// Get next XP refresh time for an event
router.get('/:id/schedule/next', async (req: Request, res: Response) => {
  try {
    const event = await eventRepo.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.refreshSchedule) {
      return res.json({
        success: true,
        data: { nextRunTime: null, cronExpression: null }
      });
    }

    const nextRunTime = getNextRunTime(event.refreshSchedule);

    return res.json({
      success: true,
      data: { 
        nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
        cronExpression: event.refreshSchedule 
      }
    });
  } catch (error) {
    console.error('Error getting next run time:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all events
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const events = await eventRepo.findAll();

  res.json({
    success: true,
    data: events,
  });
}));

// Get events for current user (protected route)
router.get('/my-events', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const userEvents = await eventRepo.findByCreator(userId);
  
  res.json({
    success: true,
    data: userEvents
  });
}));

// Get single event
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  res.json({
    success: true,
    data: event
  });
}));

// Create event (protected route)
router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { name, description, boardSize } = createEventSchema.parse(req.body);

    const newEvent = await eventRepo.create({
      name,
      description: description || '',
      boardSize,
      creatorId: (req as any).user.id, // Use authenticated user's ID
      status: 'draft',
      trackingEnabled: false,
      settings: {
        allowMultipleCompletions: false,
        requireVerification: false
      }
    });

    res.status(201).json({
      success: true,
      data: newEvent
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiErrorClass(400, error.errors[0].message);
    }
    throw error;
  }
}));

// Update event (protected route - creator only)
router.put('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  const currentUserId = (req as any).user.id;

  // Only creator or admin can update event
  if (!isEventCreatorOrAdmin(event, currentUserId)) {
    throw new ApiErrorClass(403, 'Only the event creator or admins can update this event');
  }

  const updates = req.body;
  await eventRepo.update(req.params.id, updates);
  const updatedEvent = await eventRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedEvent
  });
}));

// Delete event (protected route - creator only)
router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  const currentUserId = (req as any).user.id;

  // Only creator can delete event
  if (event.creatorId !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the event creator can delete this event');
  }

  await eventRepo.delete(req.params.id);

  res.json({
    success: true,
    data: { message: 'Event deleted successfully' }
  });
}));

// Get event by join code (protected route)
router.post('/join', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      throw new ApiErrorClass(400, 'Join code is required');
    }

    // Find event by join code
    const event = await eventRepo.findByJoinCode(joinCode);
    
    if (!event) {
      throw new ApiErrorClass(404, 'Invalid join code');
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    throw error;
  }
}));

// Publish event (change status from draft to active) - protected route
router.post('/:id/publish', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  const currentUserId = (req as any).user.id;

  // Only creator or admin can publish event
  if (!isEventCreatorOrAdmin(event, currentUserId)) {
    throw new ApiErrorClass(403, 'Only the event creator or admins can publish this event');
  }

  // Can only publish draft events
  if (event.status !== 'draft') {
    throw new ApiErrorClass(400, `Cannot publish event with status: ${event.status}`);
  }

  // Update status to active
  await eventRepo.update(req.params.id, { status: 'active' });
  const updatedEvent = await eventRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedEvent
  });
}));

// Set XP refresh schedule (cron expression) - protected route
router.post('/:id/schedule', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { cronExpression } = req.body;

  if (!cronExpression && cronExpression !== null) {
    throw new ApiErrorClass(400, 'cronExpression is required');
  }

  // Allow null/empty to disable scheduling
  if (cronExpression && !cron.validate(cronExpression)) {
    throw new ApiErrorClass(400, 'Invalid cron expression. See https://crontab.guru/ for help');
  }

  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  const currentUserId = (req as any).user.id;

  if (!isEventCreatorOrAdmin(event, currentUserId)) {
    throw new ApiErrorClass(403, 'Only the event creator or admins can set the schedule');
  }

  await eventRepo.update(req.params.id, { 
    refreshSchedule: cronExpression || null 
  });

  console.log(`📅 Schedule updated for event ${req.params.id}: ${cronExpression || 'disabled'}`);

  // Reload scheduler to apply changes immediately
  reloadScheduledJobs();

  const updatedEvent = await eventRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedEvent
  });
}));

// Add event admin (event creator only)
router.post('/:id/admins', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiErrorClass(400, 'userId is required');
  }

  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  const currentUserId = (req as any).user.id;

  // Only event creator can add admins
  if (event.creatorId !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the event creator can add admins');
  }

  // Cannot add creator as admin (they already have full access)
  if (userId === event.creatorId) {
    throw new ApiErrorClass(400, 'Event creator already has full access');
  }

  // Check if already admin
  if (event.adminUserIds?.includes(userId)) {
    throw new ApiErrorClass(400, 'User is already an admin');
  }

  await eventRepo.addAdmin(req.params.id, userId);
  const updatedEvent = await eventRepo.findById(req.params.id);

  // Emit socket event to all clients in the event room
  const io = (req.app as any).get('io');
  if (io && updatedEvent) {
    io.to(`event-${req.params.id}`).emit('admin-added', {
      eventId: req.params.id,
      userId,
      event: updatedEvent,
    });
  }

  res.json({
    success: true,
    data: updatedEvent,
    message: 'Admin added successfully'
  });
}));

// Remove event admin (event creator only)
router.delete('/:id/admins/:userId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const event = await eventRepo.findById(req.params.id);
  
  if (!event) {
    throw new ApiErrorClass(404, 'Event not found');
  }

  const currentUserId = (req as any).user.id;

  // Only event creator can remove admins
  if (event.creatorId !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the event creator can remove admins');
  }

  // Check if user is actually an admin
  if (!event.adminUserIds?.includes(userId)) {
    throw new ApiErrorClass(400, 'User is not an admin');
  }

  await eventRepo.removeAdmin(req.params.id, userId);
  const updatedEvent = await eventRepo.findById(req.params.id);

  // Emit socket event to all clients in the event room
  const io = (req.app as any).get('io');
  if (io && updatedEvent) {
    io.to(`event-${req.params.id}`).emit('admin-removed', {
      eventId: req.params.id,
      userId,
      event: updatedEvent,
    });
  }

  res.json({
    success: true,
    data: updatedEvent,
    message: 'Admin removed successfully'
  });
}));

export default router;
