import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { Configuration, CreateConfiguration, UpdateConfiguration } from '../entities';
import { ValidationResult, ValidationError } from '../types';
import Joi from 'joi';

const configSchema = Joi.object({
  key: Joi.string().max(255).required(),
  value: Joi.object().optional().allow(null),
  description: Joi.string().max(1000).optional().allow(null),
  category: Joi.string().max(100).optional().allow(null),
  is_public: Joi.boolean().optional(),
  is_system: Joi.boolean().optional(),
});

export class ConfigurationModel extends BaseModel<Configuration, CreateConfiguration, UpdateConfiguration> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'configurations',
      primaryKey: 'id',
      timestamps: true,
      softDelete: false,
    });
  }

  protected validate(data: Partial<CreateConfiguration | UpdateConfiguration>): ValidationResult {
    const { error } = configSchema.validate(data, { abortEarly: false });
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

  protected mapToEntity(row: any): Configuration {
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description,
      category: row.category,
      is_public: row.is_public,
      is_system: row.is_system,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateConfiguration): Record<string, any> {
    return {
      key: data.key,
      value: data.value || null,
      description: data.description || null,
      category: data.category || null,
      is_public: data.is_public || false,
      is_system: data.is_system || false,
    };
  }

  protected mapFromUpdate(data: UpdateConfiguration): Record<string, any> {
    const updateData: Record<string, any> = {};
    if (data.value !== undefined) updateData.value = data.value;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.is_public !== undefined) updateData.is_public = data.is_public;
    if (data.is_system !== undefined) updateData.is_system = data.is_system;
    return updateData;
  }

  async findByKey(key: string): Promise<Configuration | null> {
    return await this.findOne({ key });
  }

  async findByCategory(category: string): Promise<Configuration[]> {
    const result = await this.findMany({ category });
    return result.data;
  }

  async findPublic(): Promise<Configuration[]> {
    const result = await this.findMany({ is_public: true });
    return result.data;
  }

  async findSystem(): Promise<Configuration[]> {
    const result = await this.findMany({ is_system: true });
    return result.data;
  }

  async setValue(key: string, value: any, description?: string): Promise<Configuration> {
    const existing = await this.findByKey(key);
    if (existing) {
      return await this.update(existing.id, { value, description });
    } else {
      return await this.create({ key, value, description });
    }
  }

  async getValue(key: string, defaultValue?: any): Promise<any> {
    const config = await this.findByKey(key);
    return config ? config.value : defaultValue;
  }
}