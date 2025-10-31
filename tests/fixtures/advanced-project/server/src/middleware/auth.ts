import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../shared/types';

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'ACCESS_TOKEN_REQUIRED', message: 'Access token is required' }
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User & { userId: string };
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
};

export const requirePermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    const hasPermission = req.user.permissions.some(
      permission => 
        permission.resource === resource && 
        permission.actions.includes(action)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: `Permission required: ${action} on ${resource}` 
        }
      });
      return;
    }

    next();
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_ROLE', 
          message: `Required role: ${roles.join(' or ')}` 
        }
      });
      return;
    }

    next();
  };
};