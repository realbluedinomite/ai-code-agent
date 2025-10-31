import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { Task, CreateTask, UpdateTask, Priority } from '../entities';
import { ValidationResult, ValidationError, ModelOptions } from '../types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';

const taskCreateSchema = Joi.object({
  parsed_request_id: Joi.string().uuid().required(),
  task_type: Joi.string().max(100).required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().max(2000).optional().allow(null),
  parameters: Joi.object().optional().allow(null),
  status: Joi.string().max(50).optional(),
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  assigned_to: Joi.string().uuid().optional().allow(null),
  estimated_duration: Joi.number().integer().min(0).optional().allow(null),
  due_date: Joi.date().optional().allow(null),
  dependencies: Joi.array().items(Joi.string().uuid()).optional().allow(null),
  max_retries: Joi.number().integer().min(0).max(10).optional(),
});

const taskUpdateSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).optional().allow(null),
  parameters: Joi.object().optional().allow(null),
  status: Joi.string().max(50).optional(),
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  assigned_to: Joi.string().uuid().optional().allow(null),
  estimated_duration: Joi.number().integer().min(0).optional().allow(null),
  actual_duration: Joi.number().integer().min(0).optional().allow(null),
  started_at: Joi.date().optional().allow(null),
  completed_at: Joi.date().optional().allow(null),
  due_date: Joi.date().optional().allow(null),
  dependencies: Joi.array().items(Joi.string().uuid()).optional().allow(null),
  results: Joi.object().optional().allow(null),
  error_message: Joi.string().max(1000).optional().allow(null),
  retry_count: Joi.number().integer().min(0).max(10).optional(),
  max_retries: Joi.number().integer().min(0).max(10).optional(),
});

export class TaskModel extends BaseModel<Task, CreateTask, UpdateTask> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'tasks',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateTask | UpdateTask>): ValidationResult {
    const schema = data && (data as any).id ? taskUpdateSchema : taskCreateSchema;
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

  protected mapToEntity(row: any): Task {
    return {
      id: row.id,
      parsed_request_id: row.parsed_request_id,
      task_type: row.task_type,
      title: row.title,
      description: row.description,
      parameters: row.parameters,
      status: row.status,
      priority: row.priority as Priority,
      assigned_to: row.assigned_to,
      estimated_duration: row.estimated_duration,
      actual_duration: row.actual_duration,
      started_at: row.started_at,
      completed_at: row.completed_at,
      due_date: row.due_date,
      dependencies: row.dependencies,
      results: row.results,
      error_message: row.error_message,
      retry_count: row.retry_count,
      max_retries: row.max_retries,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateTask): Record<string, any> {
    return {
      parsed_request_id: data.parsed_request_id,
      task_type: data.task_type,
      title: data.title,
      description: data.description || null,
      parameters: data.parameters || null,
      status: data.status || 'pending',
      priority: data.priority || Priority.MEDIUM,
      assigned_to: data.assigned_to || null,
      estimated_duration: data.estimated_duration || null,
      due_date: data.due_date || null,
      dependencies: data.dependencies || null,
      max_retries: data.max_retries || 3,
      retry_count: 0,
    };
  }

  protected mapFromUpdate(data: UpdateTask): Record<string, any> {
    const updateData: Record<string, any> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parameters !== undefined) updateData.parameters = data.parameters;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;
    if (data.estimated_duration !== undefined) updateData.estimated_duration = data.estimated_duration;
    if (data.actual_duration !== undefined) updateData.actual_duration = data.actual_duration;
    if (data.started_at !== undefined) updateData.started_at = data.started_at;
    if (data.completed_at !== undefined) updateData.completed_at = data.completed_at;
    if (data.due_date !== undefined) updateData.due_date = data.due_date;
    if (data.dependencies !== undefined) updateData.dependencies = data.dependencies;
    if (data.results !== undefined) updateData.results = data.results;
    if (data.error_message !== undefined) updateData.error_message = data.error_message;
    if (data.retry_count !== undefined) updateData.retry_count = data.retry_count;
    if (data.max_retries !== undefined) updateData.max_retries = data.max_retries;

    return updateData;
  }

  // Task-specific methods
  async findByParsedRequestId(parsedRequestId: string): Promise<Task[]> {
    const result = await this.findMany(
      { parsed_request_id: parsedRequestId },
      { sortBy: 'priority', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByAssignedUser(userId: string): Promise<Task[]> {
    const result = await this.findMany(
      { assigned_to: userId },
      { sortBy: 'priority', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByStatus(status: string): Promise<Task[]> {
    const result = await this.findMany(
      { status },
      { sortBy: 'priority', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findPending(): Promise<Task[]> {
    const result = await this.findMany(
      { status: 'pending' },
      { sortBy: 'priority', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findInProgress(): Promise<Task[]> {
    const result = await this.findMany(
      { status: 'in_progress' },
      { sortBy: 'updated_at', sortOrder: 'ASC' }
    );
    return result.data;
  }

  async findOverdue(): Promise<Task[]> {
    try {
      const now = new Date().toISOString();
      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE due_date < $1
          AND status NOT IN ('completed', 'cancelled')
          AND ${this.deletedAtField} IS NULL
        ORDER BY due_date ASC
      `;

      const result = await this.dbManager.query<Task>({
        text: query,
        params: [now],
      });

      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      logger.error('Failed to find overdue tasks', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async startTask(id: string, assignedTo?: string): Promise<Task> {
    const updateData: UpdateTask = {
      status: 'in_progress',
      started_at: new Date(),
    };

    if (assignedTo) {
      updateData.assigned_to = assignedTo;
    }

    return await this.update(id, updateData);
  }

  async completeTask(id: string, results: any): Promise<Task> {
    const completedAt = new Date();
    
    // Calculate actual duration
    const task = await this.findById(id);
    const actualDuration = task?.started_at 
      ? completedAt.getTime() - task.started_at.getTime()
      : null;

    return await this.update(id, {
      status: 'completed',
      completed_at: completedAt,
      results,
      actual_duration: actualDuration,
      error_message: null,
    });
  }

  async failTask(id: string, errorMessage: string, retry = false): Promise<Task> {
    const task = await this.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const shouldRetry = retry && task.retry_count < task.max_retries;

    if (shouldRetry) {
      return await this.update(id, {
        status: 'pending',
        error_message: errorMessage,
        retry_count: task.retry_count + 1,
        started_at: null,
        completed_at: null,
      });
    } else {
      return await this.update(id, {
        status: 'failed',
        completed_at: new Date(),
        error_message: errorMessage,
      });
    }
  }

  async assignTask(id: string, userId: string): Promise<Task> {
    return await this.update(id, {
      assigned_to: userId,
    });
  }

  async unassignTask(id: string): Promise<Task> {
    return await this.update(id, {
      assigned_to: null,
    });
  }

  async updatePriority(id: string, priority: Priority): Promise<Task> {
    return await this.update(id, { priority });
  }

  async getTaskStatistics(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    overdue: number;
    average_completion_time: number;
  }> {
    try {
      const now = new Date().toISOString();
      
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
        this.dbManager.query<{ count: number }>({
          text: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE due_date < $1 AND status NOT IN ('completed', 'cancelled') AND ${this.deletedAtField} IS NULL`,
          params: [now],
        }),
        this.dbManager.query<{ avg_time: number }>({
          text: `
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_time
            FROM ${this.tableName}
            WHERE status = 'completed'
              AND started_at IS NOT NULL
              AND completed_at IS NOT NULL
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
        overdue: parseInt(results[5].rows[0].count),
        average_completion_time: results[6].rows[0].avg_time ? parseFloat(results[6].rows[0].avg_time) : 0,
      };
    } catch (error) {
      logger.error('Failed to get task statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getRecentTasks(limit = 10): Promise<Task[]> {
    const result = await this.findMany(
      {},
      { sortBy: 'created_at', sortOrder: 'DESC', limit }
    );
    return result.data;
  }
}