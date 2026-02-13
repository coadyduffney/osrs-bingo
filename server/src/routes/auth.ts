import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ApiErrorClass, asyncHandler } from '../middleware/errorHandler.js';
import { UserRepository } from '../repositories/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const userRepo = new UserRepository();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);

    // Check if user exists
    const existingByUsername = await userRepo.findByUsername(username);
    const existingByEmail = await userRepo.findByEmail(email);

    if (existingByUsername || existingByEmail) {
      throw new ApiErrorClass(400, 'Username or email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in Firestore
    const newUser = await userRepo.create({
      username,
      email,
      passwordHash,
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' },
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          displayName: newUser.displayName,
          avatarUrl: newUser.avatarUrl,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiErrorClass(400, error.errors[0].message);
    }
    throw error;
  }
}));

// Login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    // Find user in Firestore
    const user = await userRepo.findByUsername(username);
    if (!user) {
      throw new ApiErrorClass(401, 'Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiErrorClass(401, 'Invalid credentials');
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' },
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiErrorClass(400, error.errors[0].message);
    }
    throw error;
  }
}));

// Get current user
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await userRepo.findById(userId);
  
  if (!user) {
    throw new ApiErrorClass(404, 'User not found');
  }

  // Don't send password hash
  const { passwordHash, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

// Update current user profile
router.put('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { displayName, avatarUrl, rsn } = req.body;

  // Validate input
  if (displayName !== undefined && typeof displayName !== 'string') {
    throw new ApiErrorClass(400, 'displayName must be a string');
  }
  if (avatarUrl !== undefined && typeof avatarUrl !== 'string') {
    throw new ApiErrorClass(400, 'avatarUrl must be a string');
  }
  if (rsn !== undefined && typeof rsn !== 'string') {
    throw new ApiErrorClass(400, 'rsn must be a string');
  }

  const updateData: any = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (rsn !== undefined) updateData.rsn = rsn;

  await userRepo.update(userId, updateData);

  // Fetch updated user
  const updatedUser = await userRepo.findById(userId);
  
  if (!updatedUser) {
    throw new ApiErrorClass(404, 'User not found');
  }

  // Don't send password hash
  const { passwordHash, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    data: userWithoutPassword
  });
}));

// Get multiple users by IDs (for fetching team members)
router.post('/users/batch', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds)) {
    throw new ApiErrorClass(400, 'userIds must be an array');
  }

  const users = await Promise.all(
    userIds.map(async (id: string) => {
      const user = await userRepo.findById(id);
      if (user) {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return null;
    })
  );

  res.json({
    success: true,
    data: users.filter(u => u !== null)
  });
}));

export default router;
