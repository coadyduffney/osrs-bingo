import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ApiErrorClass, asyncHandler } from '../middleware/errorHandler.js';
import { TeamRepository } from '../repositories/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const teamRepo = new TeamRepository();

// Validation schemas
const createTeamSchema = z.object({
  eventId: z.string(),
  name: z.string().min(3).max(50)
});

const updateTeamSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional()
});

// Get teams for an event
router.get('/event/:eventId', asyncHandler(async (req: Request, res: Response) => {
  const eventTeams = await teamRepo.findByEvent(req.params.eventId);
  
  res.json({
    success: true,
    data: eventTeams
  });
}));

// Get teams for current user (protected route)
router.get('/my-teams', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const userTeams = await teamRepo.findByMember(userId);
  
  res.json({
    success: true,
    data: userTeams
  });
}));

// Get single team
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const team = await teamRepo.findById(req.params.id);
  
  if (!team) {
    throw new ApiErrorClass(404, 'Team not found');
  }

  res.json({
    success: true,
    data: team
  });
}));

// Create team (protected route)
router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { eventId, name } = createTeamSchema.parse(req.body);

    const newTeam = await teamRepo.create({
      eventId,
      name,
      captainId: (req as any).user.id // Use authenticated user's ID
    });

    res.status(201).json({
      success: true,
      data: newTeam
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiErrorClass(400, error.errors[0].message);
    }
    throw error;
  }
}));

// Add member to team (protected route)
router.post('/:id/members', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const team = await teamRepo.findById(req.params.id);
  
  if (!team) {
    throw new ApiErrorClass(404, 'Team not found');
  }

  // Use authenticated user's ID instead of from body
  const userId = (req as any).user.id;

  if (team.memberIds.includes(userId)) {
    throw new ApiErrorClass(400, 'You are already in this team');
  }

  await teamRepo.addMember(req.params.id, userId);
  const updatedTeam = await teamRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedTeam
  });
}));

// Join team with code (protected route)
router.post('/join', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      throw new ApiErrorClass(400, 'Join code is required');
    }

    // Find team by join code
    const team = await teamRepo.findByJoinCode(joinCode);
    
    if (!team) {
      throw new ApiErrorClass(404, 'Invalid join code');
    }

    const userId = (req as any).user.id;

    if (team.memberIds.includes(userId)) {
      throw new ApiErrorClass(400, 'You are already in this team');
    }

    await teamRepo.addMember(team.id, userId);
    const updatedTeam = await teamRepo.findById(team.id);

    res.json({
      success: true,
      data: updatedTeam
    });
  } catch (error) {
    throw error;
  }
}));

// Update team (protected route - captain only)
router.put('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const team = await teamRepo.findById(req.params.id);
  
  if (!team) {
    throw new ApiErrorClass(404, 'Team not found');
  }

  const currentUserId = (req as any).user.id;

  // Only captain can update team
  if (team.captainId !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the team captain can update team details');
  }

  try {
    const updateData = updateTeamSchema.parse(req.body);
    await teamRepo.update(req.params.id, updateData);
    const updatedTeam = await teamRepo.findById(req.params.id);

    res.json({
      success: true,
      data: updatedTeam
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiErrorClass(400, error.errors[0].message);
    }
    throw error;
  }
}));

// Remove member from team (protected route - captain only)
router.delete('/:id/members/:userId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const team = await teamRepo.findById(req.params.id);
  
  if (!team) {
    throw new ApiErrorClass(404, 'Team not found');
  }

  const currentUserId = (req as any).user.id;
  const userIdToRemove = req.params.userId;

  // Only captain can remove members (or member can remove themselves)
  if (team.captainId !== currentUserId && userIdToRemove !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the team captain can remove members');
  }

  // Cannot remove the captain
  if (userIdToRemove === team.captainId) {
    throw new ApiErrorClass(400, 'Cannot remove the team captain');
  }

  if (!team.memberIds.includes(userIdToRemove)) {
    throw new ApiErrorClass(400, 'User is not a member of this team');
  }

  await teamRepo.removeMember(req.params.id, userIdToRemove);
  const updatedTeam = await teamRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedTeam
  });
}));

// Transfer captain role (protected route - captain only)
router.post('/:id/transfer-captain', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const team = await teamRepo.findById(req.params.id);
  
  if (!team) {
    throw new ApiErrorClass(404, 'Team not found');
  }

  const currentUserId = (req as any).user.id;
  const { newCaptainId } = req.body;

  // Only current captain can transfer role
  if (team.captainId !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the team captain can transfer the captain role');
  }

  // New captain must be provided
  if (!newCaptainId) {
    throw new ApiErrorClass(400, 'New captain ID is required');
  }

  // New captain must be a member of the team
  if (!team.memberIds.includes(newCaptainId)) {
    throw new ApiErrorClass(400, 'New captain must be a member of the team');
  }

  // Cannot transfer to yourself
  if (newCaptainId === currentUserId) {
    throw new ApiErrorClass(400, 'You are already the captain');
  }

  await teamRepo.transferCaptain(req.params.id, newCaptainId);
  const updatedTeam = await teamRepo.findById(req.params.id);

  res.json({
    success: true,
    data: updatedTeam
  });
}));

// Delete team (protected route - captain only)
router.delete('/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const team = await teamRepo.findById(req.params.id);
  
  if (!team) {
    throw new ApiErrorClass(404, 'Team not found');
  }

  const currentUserId = (req as any).user.id;

  // Only captain can delete team
  if (team.captainId !== currentUserId) {
    throw new ApiErrorClass(403, 'Only the team captain can delete this team');
  }

  await teamRepo.delete(req.params.id);

  res.json({
    success: true,
    data: { message: 'Team deleted successfully' }
  });
}));

export default router;
