import { User, UserRole, ApiResponse } from '../../shared/types';
import { CustomError } from '../middleware/errorHandler';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { logger } from '../utils/logger';

export class UserService {
  private users: Map<string, User> = new Map();

  constructor() {
    // Initialize with some mock data
    this.seedMockData();
  }

  private seedMockData(): void {
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        permissions: [
          { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'posts', actions: ['create', 'read', 'update', 'delete'] }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        permissions: [
          { resource: 'posts', actions: ['create', 'read', 'update'] }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockUsers.forEach(user => {
      this.users.set(user.id, user);
    });
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }): Promise<ApiResponse<User>> {
    try {
      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(
        user => user.email === userData.email
      );

      if (existingUser) {
        throw new CustomError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const newUser: User = {
        id: this.generateId(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || UserRole.USER,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.users.set(newUser.id, newUser);

      logger.info('User created', { userId: newUser.id, email: newUser.email });

      return {
        success: true,
        data: newUser,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      logger.error('Error creating user', { error, email: userData.email });
      throw error;
    }
  }

  async authenticateUser(email: string, password: string): Promise<ApiResponse<{ user: User; tokens: any }>> {
    try {
      const user = Array.from(this.users.values()).find(u => u.email === email);

      if (!user) {
        throw new CustomError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        throw new CustomError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
      }

      // In a real app, you'd verify the password here
      const isValidPassword = true; // Simplified for mock

      if (!isValidPassword) {
        throw new CustomError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Update last login
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();

      // Generate tokens
      const tokens = generateToken(user);

      logger.info('User authenticated', { userId: user.id, email: user.email });

      return {
        success: true,
        data: { user, tokens },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      logger.error('Error authenticating user', { error, email });
      throw error;
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const user = this.users.get(id);

      if (!user) {
        throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
      }

      return {
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      logger.error('Error getting user', { error, userId: id });
      throw error;
    }
  }

  async getAllUsers(): Promise<ApiResponse<User[]>> {
    try {
      const users = Array.from(this.users.values());

      return {
        success: true,
        data: users,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      logger.error('Error getting users', { error });
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const user = this.users.get(id);

      if (!user) {
        throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
      }

      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date()
      };

      this.users.set(id, updatedUser);

      logger.info('User updated', { userId: id });

      return {
        success: true,
        data: updatedUser,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      logger.error('Error updating user', { error, userId: id });
      throw error;
    }
  }

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    try {
      const user = this.users.get(id);

      if (!user) {
        throw new CustomError('User not found', 404, 'USER_NOT_FOUND');
      }

      this.users.delete(id);

      logger.info('User deleted', { userId: id });

      return {
        success: true,
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: this.generateRequestId(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      logger.error('Error deleting user', { error, userId: id });
      throw error;
    }
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}