import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { AuditLog, CreateAuditLog } from '../entities';
import { ValidationResult, ValidationError } from '../types';
import Joi from 'joi';

const auditLogSchema = Joi.object({
  entity_type: Joi.string().max(100).required(),
  entity_id: Joi.string().uuid().optional().allow(null),
  action: Joi.string().max(50).required(),
  user_id: Joi.string().uuid().optional().allow(null),
  old_values: Joi.object().optional().allow(null),
  new_values: Joi.object().optional().allow(null),
  metadata: Joi.object().optional().allow(null),
  ip_address: Joi.string().ip().optional().allow(null),
  user_agent: Joi.string().max(500).optional().allow(null),
});

export class AuditLogModel extends BaseModel<AuditLog, CreateAuditLog> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'audit_logs',
      primaryKey: 'id',
      timestamps: true,
      softDelete: false,
    });
  }

  protected validate(data: Partial<CreateAuditLog>): ValidationResult {
    const { error } = auditLogSchema.validate(data, { abortEarly: false });
    const errors: ValidationError[] = [];
    
    if (error) {
      errors.push(...error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type,
      })));
    }

    return { isValid: errors.length === 0, errors };
  }

  protected mapToEntity(row: any): AuditLog {
    return {
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      user_id: row.user_id,
      old_values: row.old_values,
      new_values: row.new_values,
      metadata: row.metadata,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: new Date(row.created_at),
    };
  }

  protected mapFromCreate(data: CreateAuditLog): Record<string, any> {
    return {
      entity_type: data.entity_type,
      entity_id: data.entity_id || null,
      action: data.action,
      user_id: data.user_id || null,
      old_values: data.old_values || null,
      new_values: data.new_values || null,
      metadata: data.metadata || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
    };
  }

  protected mapFromUpdate(): Record<string, any> {
    return {}; // Audit logs should not be updated
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const result = await this.findMany(
      { entity_type: entityType, entity_id: entityId },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByUser(userId: string): Promise<AuditLog[]> {
    const result = await this.findMany(
      { user_id: userId },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByAction(action: string): Promise<AuditLog[]> {
    const result = await this.findMany(
      { action },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    const result = await this.findMany(
      {},
      { sortBy: 'created_at', sortOrder: 'DESC', limit }
    );
    return result.data;
  }
}