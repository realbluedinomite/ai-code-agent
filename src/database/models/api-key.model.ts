import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { ApiKey, CreateApiKey, UpdateApiKey } from '../entities';
import { ValidationResult, ValidationError } from '../types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';

const apiKeySchema = Joi.object({
  user_id: Joi.string().uuid().optional().allow(null),
  key_hash: Joi.string().max(255).required(),
  key_name: Joi.string().max(255).required(),
  provider: Joi.string().max(100).optional().allow(null),
  permissions: Joi.array().items(Joi.string()).optional().allow(null),
  expires_at: Joi.date().optional().allow(null),
  is_active: Joi.boolean().optional(),
});

const apiKeyUpdateSchema = Joi.object({
  key_name: Joi.string().max(255).optional(),
  provider: Joi.string().max(100).optional().allow(null),
  permissions: Joi.array().items(Joi.string()).optional().allow(null),
  last_used: Joi.date().optional().allow(null),
  expires_at: Joi.date().optional().allow(null),
  is_active: Joi.boolean().optional(),
});

export class ApiKeyModel extends BaseModel<ApiKey, CreateApiKey, UpdateApiKey> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'api_keys',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateApiKey | UpdateApiKey>): ValidationResult {
    const schema = data && (data as any).id ? apiKeyUpdateSchema : apiKeySchema;
    const { error } = schema.validate(data, { abortEarly: false });
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

  protected mapToEntity(row: any): ApiKey {
    return {
      id: row.id,
      user_id: row.user_id,
      key_hash: row.key_hash,
      key_name: row.key_name,
      provider: row.provider,
      permissions: row.permissions,
      last_used: row.last_used,
      expires_at: row.expires_at,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateApiKey): Record<string, any> {
    return {
      user_id: data.user_id || null,
      key_hash: data.key_hash,
      key_name: data.key_name,
      provider: data.provider || null,
      permissions: data.permissions || null,
      expires_at: data.expires_at || null,
      is_active: data.is_active !== false,
    };
  }

  protected mapFromUpdate(data: UpdateApiKey): Record<string, any> {
    const updateData: Record<string, any> = {};
    if (data.key_name !== undefined) updateData.key_name = data.key_name;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;
    if (data.last_used !== undefined) updateData.last_used = data.last_used;
    if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    return updateData;
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return await this.findOne({ key_hash: keyHash });
  }

  async findByUser(userId: string): Promise<ApiKey[]> {
    const result = await this.findMany(
      { user_id: userId },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByProvider(provider: string): Promise<ApiKey[]> {
    const result = await this.findMany(
      { provider },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findActive(): Promise<ApiKey[]> {
    const result = await this.findMany(
      { is_active: true },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async updateLastUsed(id: string): Promise<ApiKey> {
    return await this.update(id, { last_used: new Date() });
  }

  async deactivate(id: string): Promise<ApiKey> {
    return await this.update(id, { is_active: false });
  }

  async activate(id: string): Promise<ApiKey> {
    return await this.update(id, { is_active: true });
  }

  async isValid(keyHash: string): Promise<boolean> {
    const key = await this.findByHash(keyHash);
    if (!key || !key.is_active) {
      return false;
    }

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return false;
    }

    await this.updateLastUsed(key.id);
    return true;
  }
}