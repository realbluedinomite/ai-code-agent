import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../shared/types';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: User): { accessToken: string; refreshToken: string; expiresIn: number } => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m'
  });

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const generateResetToken = (): string => {
  return jwt.sign({ type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyResetToken = (token: string): boolean => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.type === 'reset';
  } catch {
    return false;
  }
};