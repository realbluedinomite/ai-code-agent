import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { ParsedRequest, CreateParsedRequest, UpdateParsedRequest, Priority } from '../entities';
import { ValidationResult, ValidationError, ModelOptions } from '../types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';

const parsedRequestCreateSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  request_type: Joi.string().max(100).required(),
  original_text: Joi.string().max(10000).required(),
  parsed_data: Joi.object().optional().allow(null),
  parameters: Joi.object().optional().allow(null),
  context: Joi.object().optional().allow(null),
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  status: Joi.string().max(50).optional(),
});

const parsedRequestUpdateSchema = Joi.object({
  parsed_data: Joi.object().optional().allow(null),
  parameters: Joi.object().optional().allow(null),
  context: Joi.object().optional().allow(null),
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  status: Joi.string().max(50).optional(),
  processed_at: Joi.date().optional().allow(null),
  error_message: Joi.string().max(1000).optional().allow(null),
});

export class ParsedRequestModel extends BaseModel<ParsedRequest, CreateParsedRequest, UpdateParsedRequest> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'parsed_requests',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateParsedRequest | UpdateParsedRequest>): ValidationResult {
    const schema = data && (data as any).id ? parsedRequestUpdateSchema : parsedRequestCreateSchema;
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

  protected mapToEntity(row: any): ParsedRequest {
    return {
      id: row.id,
      session_id: row.session_id,
      request_type: row.request_type,
      original_text: row.original_text,
      parsed_data: row.parsed_data,
      parameters: row.parameters,
      context: row.context,
      priority: row.priority as Priority,
      status: row.status,
      processed_at: row.processed_at,
      error_message: row.error_message,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateParsedRequest): Record<string, any> {
    return {
      session_id: data.session_id,
      request_type: data.request_type,
      original_text: data.original_text,
      parsed_data: data.parsed_data || null,
      parameters: data.parameters || null,
      context: data.context || null,
      priority: data.priority || Priority.MEDIUM,
      status: data.status || 'pending',
    };
  }

  protected mapFromUpdate(data: UpdateParsedRequest): Record<string, any> {
    const updateData: Record<string, any> = {};

    if (data.parsed_data !== undefined) updateData.parsed_data = data.parsed_data;
    if (data.parameters !== undefined) updateData.parameters = data.parameters;
    if (data.context !== undefined) updateData.context = data.context;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.processed_at !== undefined) updateData.processed_at = data.processed_at;
    if (data.error_message !== undefined) updateData.error_message = data.error_message;

    return updateData;
  }

  // ParsedRequest-specific methods
  async findBySessionId(sessionId: string): Promise<ParsedRequest[]> {
    const result = await this.findMany(
      { session_id: sessionId },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByRequestType(requestType: string): Promise<ParsedRequest[]> {
    const result = await this.findMany(
      { request_type: requestType },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findPending(): Promise<ParsedRequest[]> {
    const result = await this.findMany(
      { status: 'pending' },
      { sortBy: 'priority', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findWithPriority(priority: Priority): Promise<ParsedRequest[]> {
    const result = await this.findMany(
      { priority },
      { sortBy: 'created_at', sortOrder: 'ASC' }
    );
    return result.data;
  }

  async markAsProcessed(id: string, resultData: any): Promise<ParsedRequest> {
    return await this.update(id, {
      status: 'completed',
      processed_at: new Date(),
      parsed_data: resultData,
    });
  }

  async markAsFailed(id: string, errorMessage: string): Promise<ParsedRequest> {
    return await this.update(id, {
      status: 'failed',
      processed_at: new Date(),
      error_message: errorMessage,
    });
  }

  async markAsInProgress(id: string): Promise<ParsedRequest> {
    return await this.update(id, {
      status: 'in_progress',
    });
  }

  async findProcessing(): Promise<ParsedRequest[]> {
    const result = await this.findMany(
      { status: 'in_progress' },
      { sortBy: 'updated_at', sortOrder: 'ASC' }
    );
    return result.data;
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    average_processing_time: number;
  }> {
    try {
      const queries = [
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'pending' AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'in_progress' AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'completed' AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = 'failed' AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ avg_time: number }>({
          text: `
            SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000) as avg_time
            FROM ${this.tableName}
            WHERE status = 'completed' 
              AND processed_at IS NOT NULL 
              AND ${this.deletedAtField} IS NULL
          `,
        }),
      ];

      const results = await Promise.all(queries);

      return {
        total: parseInt(results[0].rows[0].count),
        pending: parseInt(results[1].rows[0].count),
        in_progress: parseInt(results[2].rows[0].count),
        completed: parseInt(results[3].rows[0].count),
        failed: parseInt(results[4].rows[0].count),
        average_processing_time: results[5].rows[0].avg_time ? parseFloat(results[5].rows[0].avg_time) : 0,
      };
    } catch (error) {
      logger.error('Failed to get parsed request statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}