import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { User, CreateUser, UpdateUser } from '../entities';
import { ValidationResult, ValidationError, ModelOptions } from '../types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';
import bcrypt from 'bcryptjs';

const userCreateSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  first_name: Joi.string().max(100).optional().allow(null),
  last_name: Joi.string().max(100).optional().allow(null),
  avatar_url: Joi.string().uri().max(1000).optional().allow(null),
  password_hash: Joi.string().required(),
  role: Joi.string().max(50).optional(),
});

const userUpdateSchema = Joi.object({
  email: Joi.string().email().max(255).optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  first_name: Joi.string().max(100).optional().allow(null),
  last_name: Joi.string().max(100).optional().allow(null),
  avatar_url: Joi.string().uri().max(1000).optional().allow(null),
  is_active: Joi.boolean().optional(),
  preferences: Joi.object().optional().allow(null),
  role: Joi.string().max(50).optional(),
});

export class UserModel extends BaseModel<User, CreateUser, UpdateUser> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'users',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateUser | UpdateUser>): ValidationResult {
    const schema = data && (data as any).id ? userUpdateSchema : userCreateSchema;
    const { error, value } = schema.validate(data, { abortEarly: false });

    const errors: ValidationError[] = [];
    if (error) {
      errors.push(
        ...error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: detail.type,
        }))
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  protected mapToEntity(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      is_active: row.is_active,
      is_verified: row.is_verified,
      last_login: row.last_login,
      preferences: row.preferences,
      role: row.role,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateUser): Record<string, any> {
    return {
      email: data.email,
      username: data.username,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      avatar_url: data.avatar_url || null,
      password_hash: data.password_hash,
      is_active: true,
      is_verified: false,
      last_login: null,
      preferences: null,
      role: data.role || 'user',
    };
  }

  protected mapFromUpdate(data: UpdateUser): Record<string, any> {
    const updateData: Record<string, any> = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.preferences !== undefined) updateData.preferences = data.preferences;
    if (data.role !== undefined) updateData.role = data.role;

    return updateData;
  }

  // User-specific methods
  async findByEmail(email: string): Promise<User | null> {
    return await this.findOne({ email });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.findOne({ username });
  }

  async findActive(): Promise<User[]> {
    const result = await this.findMany(
      { is_active: true },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByRole(role: string): Promise<User[]> {
    const result = await this.findMany(
      { role },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async verifyUser(id: string): Promise<User> {
    return await this.update(id, {
      is_verified: true,
    });
  }

  async activateUser(id: string): Promise<User> {
    return await this.update(id, {
      is_active: true,
    });
  }

  async deactivateUser(id: string): Promise<User> {
    return await this.update(id, {
      is_active: false,
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return await this.update(id, {
      last_login: new Date(),
    });
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<User> {
    return await this.update(id, {
      password_hash: newPasswordHash,
    });
  }

  async updatePreferences(id: string, preferences: Record<string, any>): Promise<User> {
    return await this.update(id, {
      preferences,
    });
  }

  async updateProfile(
    id: string,
    profileData: {
      first_name?: string;
      last_name?: string;
      avatar_url?: string;
    }
  ): Promise<User> {
    return await this.update(id, profileData);
  }

  async changeRole(id: string, role: string): Promise<User> {
    return await this.update(id, { role });
  }

  async verifyEmail(id: string): Promise<User> {
    return await this.update(id, { is_verified: true });
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE (
          LOWER(email) LIKE $1 
          OR LOWER(username) LIKE $1 
          OR LOWER(first_name) LIKE $1 
          OR LOWER(last_name) LIKE $1
        )
        AND ${this.deletedAtField} IS NULL
        ORDER BY username ASC
      `;

      const result = await this.dbManager.query<User>({
        text: query,
        params: [searchPattern],
      });

      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      logger.error('Failed to search users', {
        searchTerm,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getUserStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
    recent_registrations: number;
  }> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const queries = [
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = true AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = false AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_verified = true AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_verified = false AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE created_at >= $1 AND ${this.deletedAtField} IS NULL`,
          params: [sevenDaysAgo],
        }),
      ];

      const results = await Promise.all(queries);

      return {
        total: parseInt(results[0].rows[0].count),
        active: parseInt(results[1].rows[0].count),
        inactive: parseInt(results[2].rows[0].count),
        verified: parseInt(results[3].rows[0].count),
        unverified: parseInt(results[4].rows[0].count),
        recent_registrations: parseInt(results[5].rows[0].count),
      };
    } catch (error) {
      logger.error('Failed to get user statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Static utility methods
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static validatePassword(password: string): ValidationResult {
    const passwordSchema = Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
      });

    const { error } = passwordSchema.validate(password);
    const errors: ValidationError[] = [];

    if (error) {
      errors.push({
        field: 'password',
        message: error.message,
        code: error.type,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateEmail(email: string): ValidationResult {
    const emailSchema = Joi.string().email().max(255);
    const { error } = emailSchema.validate(email);
    const errors: ValidationError[] = [];

    if (error) {
      errors.push({
        field: 'email',
        message: error.message,
        code: error.type,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateUsername(username: string): ValidationResult {
    const usernameSchema = Joi.string().alphanum().min(3).max(30);
    const { error } = usernameSchema.validate(username);
    const errors: ValidationError[] = [];

    if (error) {
      errors.push({
        field: 'username',
        message: error.message,
        code: error.type,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}