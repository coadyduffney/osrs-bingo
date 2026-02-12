import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiErrorClass } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new ApiErrorClass(401, 'Access token required');
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      throw new ApiErrorClass(403, 'Invalid or expired token');
    }

    req.user = decoded as { id: string; username: string };
    next();
  });
};

// Export as authMiddleware for consistency
export const authMiddleware = authenticateToken;
