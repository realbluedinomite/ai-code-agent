import { BaseModel } from './base-model';
import { DatabaseConnectionManager } from './client';
import { Session, CreateSession, UpdateSession, SessionStatus } from './entities';
import { ValidationResult, ValidationError, ModelOptions } from './types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';

const sessionCreateSchema = Joi.object({
  user_id: Joi.string().uuid().optional().allow(null),
  session_token: Joi.string().min(10).max(500).required(),
  refresh_token: Joi.string().min(10).max(500).optional().allow(null),
  status: Joi.string().valid(...Object.values(SessionStatus)).optional(),
  ip_address: Joi.string().ip().optional().allow(null),
  user_agent: Joi.string().max(1000).optional().allow(null),
  device_info: Joi.object().optional().allow(null),
  metadata: Joi.object().optional().allow(null),
  expires_at: Joi.date().optional().allow(null),
});

const sessionUpdateSchema = Joi.object({
  session_token: Joi.string().min(10).max(500).optional(),
  refresh_token: Joi.string().min(10).max(500).optional().allow(null),
  status: Joi.string().valid(...Object.values(SessionStatus)).optional(),
  user_agent: Joi.string().max(1000).optional().allow(null),
  device_info: Joi.object().optional().allow(null),
  metadata: Joi.object().optional().allow(null),
  expires_at: Joi.date().optional().allow(null),
  last_accessed: Joi.date().optional().allow(null),
});

export class SessionModel extends BaseModel<Session, CreateSession, UpdateSession> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'sessions',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateSession | UpdateSession>): ValidationResult {
    const schema = data && (data as any).id ? sessionUpdateSchema : sessionCreateSchema;
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

  protected mapToEntity(row: any): Session {
    return {
      id: row.id,
      user_id: row.user_id,
      session_token: row.session_token,
      refresh_token: row.refresh_token,
      status: row.status as SessionStatus,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      device_info: row.device_info,
      metadata: row.metadata,
      expires_at: row.expires_at,
      last_accessed: row.last_accessed,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateSession): Record<string, any> {
    return {
      user_id: data.user_id || null,
      session_token: data.session_token,
      refresh_token: data.refresh_token || null,
      status: data.status || SessionStatus.ACTIVE,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      device_info: data.device_info || null,
      metadata: data.metadata || null,
      expires_at: data.expires_at || null,
    };
  }

  protected mapFromUpdate(data: UpdateSession): Record<string, any> {
    const updateData: Record<string, any> = {};

    if (data.session_token !== undefined) updateData.session_token = data.session_token;
    if (data.refresh_token !== undefined) updateData.refresh_token = data.refresh_token;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.user_agent !== undefined) updateData.user_agent = data.user_agent;
    if (data.device_info !== undefined) updateData.device_info = data.device_info;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;
    if (data.last_accessed !== undefined) updateData.last_accessed = data.last_accessed;

    return updateData;
  }

  // Session-specific methods
  async findByToken(sessionToken: string): Promise<Session | null> {
    return await this.findOne({ session_token: sessionToken });
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return await this.findOne({ refresh_token: refreshToken });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const result = await this.findMany(
      { user_id: userId, status: SessionStatus.ACTIVE },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findExpired(): Promise<Session[]> {
    const now = new Date().toISOString();
    const result = await this.findMany(
      { expires_at: { operator: '<', value: now } },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async updateLastAccessed(id: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET last_accessed = $1, ${this.updatedAtField} = $2
        WHERE ${this.primaryKey} = $3
      `;

      await this.dbManager.query({
        text: query,
        params: [new Date(), new Date(), id],
      });

      logger.debug('Session last accessed updated', { sessionId: id });
    } catch (error) {
      logger.error('Failed to update session last accessed', {
        sessionId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async expireSession(id: string): Promise<Session> {
    return await this.update(id, {
      status: SessionStatus.EXPIRED,
      expires_at: new Date(),
    });
  }

  async terminateSession(id: string): Promise<Session> {
    return await this.update(id, {
      status: SessionStatus.TERMINATED,
    });
  }

  async terminateAllUserSessions(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET status = $1, ${this.updatedAtField} = $2
        WHERE user_id = $3 AND status = $4
      `;

      const result = await this.dbManager.query({
        text: query,
        params: [SessionStatus.TERMINATED, new Date(), userId, SessionStatus.ACTIVE],
      });

      logger.info('Terminated all user sessions', { userId, affectedRows: result.rowCount });
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to terminate user sessions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const query = `
        UPDATE ${this.tableName}
        SET status = $1, ${this.updatedAtField} = $2
        WHERE expires_at < $3 AND status = $4
      `;

      const result = await this.dbManager.query({
        text: query,
        params: [SessionStatus.EXPIRED, now, now, SessionStatus.ACTIVE],
      });

      logger.info('Cleaned up expired sessions', { affectedRows: result.rowCount });
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}