import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { email, password, firstName, lastName } = req.body;

  // Check if user exists
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw createError('User already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await UserModel.create({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    role: 'user'
  });

  // Generate token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  logger.info(`User registered: ${email}`);

  res.status(201).json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    },
    message: 'User registered successfully'
  });
}));

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  const { email, password } = req.body;

  // Find user
  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createError('Invalid credentials', 401);
  }

  // Generate token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  logger.info(`User logged in: ${email}`);

  res.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    },
    message: 'Logged in successfully'
  });
}));

// Get current user
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserModel.findById(req.user!.id);
  
  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar
    }
  });
}));

// Refresh token
router.post('/refresh', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserModel.findById(req.user!.id);
  
  if (!user) {
    throw createError('User not found', 404);
  }

  // Generate new token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({
    data: { token },
    message: 'Token refreshed successfully'
  });
}));

// Logout
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  logger.info(`User logged out: ${req.user!.email}`);
  
  res.json({
    message: 'Logged out successfully'
  });
});

export default router;
