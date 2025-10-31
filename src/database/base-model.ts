import { QueryResult } from 'pg';
import { DatabaseConnectionManager } from './client';
import {
  BaseEntity,
  BaseCreateEntity,
  BaseUpdateEntity,
  QueryOptions,
  PaginationResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  ValidationResult,
  ValidationError,
  NotFoundError,
  ValidationError as CustomValidationError,
  ModelOptions,
} from './types';
import { EntityType, EntityCreateMap, EntityUpdateMap, EntityMap } from './entities';
import { logger } from '@/utils/loggers';

export abstract class BaseModel<T extends BaseEntity, C extends BaseCreateEntity, U extends BaseUpdateEntity = BaseUpdateEntity> {
  protected dbManager: DatabaseConnectionManager;
  protected tableName: string;
  protected primaryKey: string = 'id';
  protected timestamps: boolean = true;
  protected createdAtField: string = 'created_at';
  protected updatedAtField: string = 'updated_at';
  protected softDelete: boolean = false;
  protected deletedAtField: string = 'deleted_at';

  constructor(
    dbManager: DatabaseConnectionManager,
    options: ModelOptions
  ) {
    this.dbManager = dbManager;
    this.tableName = options.tableName;
    this.primaryKey = options.primaryKey || 'id';
    this.timestamps = options.timestamps !== false;
    this.createdAtField = options.createdAtField || 'created_at';
    this.updatedAtField = options.updatedAtField || 'updated_at';
    this.softDelete = options.softDelete || false;
    this.deletedAtField = options.deletedAtField || 'deleted_at';
  }

  // Abstract methods that must be implemented by child classes
  protected abstract validate(data: Partial<C | U>): ValidationResult;
  protected abstract mapToEntity(row: any): T;
  protected abstract mapFromCreate(data: C): Record<string, any>;
  protected abstract mapFromUpdate(data: U): Record<string, any>;

  // Core CRUD operations
  async create(data: C): Promise<T> {
    const validation = this.validate(data);
    if (!validation.isValid) {
      throw new CustomValidationError('Validation failed', validation.errors);
    }

    const now = new Date();
    const entityData = {
      ...this.mapFromCreate(data),
      [this.primaryKey]: crypto.randomUUID(),
      ...(this.timestamps && { [this.createdAtField]: now, [this.updatedAtField]: now }),
    };

    try {
      const fields = Object.keys(entityData);
      const values = Object.values(entityData);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await this.dbManager.query<T>({
        text: query,
        params: values,
      });

      if (result.rows.length === 0) {
        throw new Error('No rows returned after insert');
      }

      logger.debug('Entity created', {
        table: this.tableName,
        id: entityData[this.primaryKey],
      });

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create entity', {
        table: this.tableName,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: entityData,
      });
      throw error;
    }
  }

  async findById(id: string, includeDeleted = false): Promise<T | null> {
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const params = [id];

      if (this.softDelete && !includeDeleted) {
        query += ` AND ${this.deletedAtField} IS NULL`;
      }

      const result = await this.dbManager.query<T>({
        text: query,
        params,
      });

      return result.rows.length > 0 ? this.mapToEntity(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find entity by ID', {
        table: this.tableName,
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findOne(filters: Record<string, any>, includeDeleted = false): Promise<T | null> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (conditions.length === 0) {
        throw new Error('No filters provided');
      }

      if (this.softDelete && !includeDeleted) {
        conditions.push(`${this.deletedAtField} IS NULL`);
      }

      const query = `
        SELECT * FROM ${this.tableName}
        WHERE ${conditions.join(' AND ')}
        LIMIT 1
      `;

      const result = await this.dbManager.query<T>({
        text: query,
        params,
      });

      return result.rows.length > 0 ? this.mapToEntity(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find one entity', {
        table: this.tableName,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findMany(
    filters: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<PaginationResult<T>> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (this.softDelete && !options.includeDeleted) {
        conditions.push(`${this.deletedAtField} IS NULL`);
      }

      // Build WHERE clause
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const sortBy = options.sortBy || this.primaryKey;
      const sortOrder = options.sortOrder || 'DESC';
      const orderByClause = `ORDER BY ${sortBy} ${sortOrder}`;

      // Build pagination
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100); // Max 100 records per page
      const offset = options.offset || (page - 1) * limit;
      
      const limitClause = `LIMIT ${limit} OFFSET ${offset}`;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        ${whereClause}
      `;

      const countResult = await this.dbManager.query<{ total: number }>({
        text: countQuery,
        params,
      });

      const total = parseInt(countResult.rows[0].total);

      // Get data
      const dataQuery = `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ${orderByClause}
        ${limitClause}
      `;

      const result = await this.dbManager.query<T>({
        text: dataQuery,
        params,
      });

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      logger.debug('Found multiple entities', {
        table: this.tableName,
        total,
        page,
        limit,
      });

      return {
        data: result.rows.map(row => this.mapToEntity(row)),
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error) {
      logger.error('Failed to find multiple entities', {
        table: this.tableName,
        filters,
        options,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async update(id: string, data: U): Promise<T> {
    // Check if entity exists
    const existingEntity = await this.findById(id);
    if (!existingEntity) {
      throw new NotFoundError(this.tableName, id);
    }

    // Validate update data
    const validation = this.validate({ ...existingEntity, ...data });
    if (!validation.isValid) {
      throw new CustomValidationError('Validation failed', validation.errors);
    }

    const updateData = {
      ...this.mapFromUpdate(data),
      ...(this.timestamps && { [this.updatedAtField]: new Date() }),
    };

    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, ${this.updatedAtField} = $${values.length + 2}
        WHERE ${this.primaryKey} = $1
        RETURNING *
      `;

      const params = [id, ...values, new Date()];

      const result = await this.dbManager.query<T>({
        text: query,
        params,
      });

      if (result.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      logger.debug('Entity updated', {
        table: this.tableName,
        id,
      });

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update entity', {
        table: this.tableName,
        id,
        data: updateData,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async delete(id: string, hardDelete = false): Promise<DeleteResult> {
    // Check if entity exists
    const existingEntity = await this.findById(id, true);
    if (!existingEntity) {
      throw new NotFoundError(this.tableName, id);
    }

    try {
      if (this.softDelete && !hardDelete) {
        // Soft delete - set deleted_at timestamp
        const query = `
          UPDATE ${this.tableName}
          SET ${this.deletedAtField} = $2, ${this.updatedAtField} = $3
          WHERE ${this.primaryKey} = $1
        `;

        const result = await this.dbManager.query({
          text: query,
          params: [id, new Date(), new Date()],
        });

        logger.debug('Entity soft deleted', {
          table: this.tableName,
          id,
        });

        return { affectedRows: result.rowCount || 0 };
      } else {
        // Hard delete
        const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        
        const result = await this.dbManager.query({
          text: query,
          params: [id],
        });

        logger.debug('Entity hard deleted', {
          table: this.tableName,
          id,
        });

        return { affectedRows: result.rowCount || 0 };
      }
    } catch (error) {
      logger.error('Failed to delete entity', {
        table: this.tableName,
        id,
        hardDelete,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async restore(id: string): Promise<T> {
    if (!this.softDelete) {
      throw new Error('Restore is only available for soft deletable entities');
    }

    // Check if entity exists in deleted state
    const existingEntity = await this.findById(id, true);
    if (!existingEntity) {
      throw new NotFoundError(this.tableName, id);
    }

    try {
      const query = `
        UPDATE ${this.tableName}
        SET ${this.deletedAtField} = NULL, ${this.updatedAtField} = $2
        WHERE ${this.primaryKey} = $1 AND ${this.deletedAtField} IS NOT NULL
        RETURNING *
      `;

      const result = await this.dbManager.query<T>({
        text: query,
        params: [id, new Date()],
      });

      if (result.rows.length === 0) {
        throw new Error('Entity is not deleted or could not be restored');
      }

      logger.debug('Entity restored', {
        table: this.tableName,
        id,
      });

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      logger.error('Failed to restore entity', {
        table: this.tableName,
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Utility methods
  async exists(filters: Record<string, any>): Promise<boolean> {
    const result = await this.findOne(filters);
    return result !== null;
  }

  async count(filters: Record<string, any> = {}): Promise<number> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (this.softDelete) {
        conditions.push(`${this.deletedAtField} IS NULL`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        ${whereClause}
      `;

      const result = await this.dbManager.query<{ count: number }>({
        text: query,
        params,
      });

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to count entities', {
        table: this.tableName,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Transaction support
  async createInTransaction(transaction: any, data: C): Promise<T> {
    const validation = this.validate(data);
    if (!validation.isValid) {
      throw new CustomValidationError('Validation failed', validation.errors);
    }

    const now = new Date();
    const entityData = {
      ...this.mapFromCreate(data),
      [this.primaryKey]: crypto.randomUUID(),
      ...(this.timestamps && { [this.createdAtField]: now, [this.updatedAtField]: now }),
    };

    const fields = Object.keys(entityData);
    const values = Object.values(entityData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await transaction.query({
      text: query,
      params: values,
    });

    return this.mapToEntity(result.rows[0]);
  }

  async updateInTransaction(transaction: any, id: string, data: U): Promise<T> {
    const updateData = {
      ...this.mapFromUpdate(data),
      ...(this.timestamps && { [this.updatedAtField]: new Date() }),
    };

    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, ${this.updatedAtField} = $${values.length + 2}
      WHERE ${this.primaryKey} = $1
      RETURNING *
    `;

    const params = [id, ...values, new Date()];

    const result = await transaction.query({
      text: query,
      params,
    });

    if (result.rows.length === 0) {
      throw new NotFoundError(this.tableName, id);
    }

    return this.mapToEntity(result.rows[0]);
  }

  // Get table name
  getTableName(): string {
    return this.tableName;
  }

  // Get primary key
  getPrimaryKey(): string {
    return this.primaryKey;
  }
}