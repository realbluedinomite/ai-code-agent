import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { CodeFile, CreateCodeFile, UpdateCodeFile } from '../entities';
import { ValidationResult, ValidationError, ModelOptions } from '../types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';

const codeFileCreateSchema = Joi.object({
  project_analysis_id: Joi.string().uuid().required(),
  file_path: Joi.string().max(1000).required(),
  file_name: Joi.string().max(255).required(),
  file_type: Joi.string().max(50).optional().allow(null),
  file_size: Joi.number().integer().min(0).optional().allow(null),
  line_count: Joi.number().integer().min(0).optional().allow(null),
  language: Joi.string().max(50).optional().allow(null),
  content_hash: Joi.string().max(64).optional().allow(null),
  content: Joi.string().optional().allow(null),
  metadata: Joi.object().optional().allow(null),
});

const codeFileUpdateSchema = Joi.object({
  file_size: Joi.number().integer().min(0).optional().allow(null),
  line_count: Joi.number().integer().min(0).optional().allow(null),
  content_hash: Joi.string().max(64).optional().allow(null),
  content: Joi.string().optional().allow(null),
  metadata: Joi.object().optional().allow(null),
});

export class CodeFileModel extends BaseModel<CodeFile, CreateCodeFile, UpdateCodeFile> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'code_files',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateCodeFile | UpdateCodeFile>): ValidationResult {
    const schema = data && (data as any).id ? codeFileUpdateSchema : codeFileCreateSchema;
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

  protected mapToEntity(row: any): CodeFile {
    return {
      id: row.id,
      project_analysis_id: row.project_analysis_id,
      file_path: row.file_path,
      file_name: row.file_name,
      file_type: row.file_type,
      file_size: row.file_size,
      line_count: row.line_count,
      language: row.language,
      content_hash: row.content_hash,
      content: row.content,
      metadata: row.metadata,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateCodeFile): Record<string, any> {
    return {
      project_analysis_id: data.project_analysis_id,
      file_path: data.file_path,
      file_name: data.file_name,
      file_type: data.file_type || null,
      file_size: data.file_size || null,
      line_count: data.line_count || null,
      language: data.language || null,
      content_hash: data.content_hash || null,
      content: data.content || null,
      metadata: data.metadata || null,
    };
  }

  protected mapFromUpdate(data: UpdateCodeFile): Record<string, any> {
    const updateData: Record<string, any> = {};

    if (data.file_size !== undefined) updateData.file_size = data.file_size;
    if (data.line_count !== undefined) updateData.line_count = data.line_count;
    if (data.content_hash !== undefined) updateData.content_hash = data.content_hash;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    return updateData;
  }

  // CodeFile-specific methods
  async findByProjectAnalysisId(projectAnalysisId: string): Promise<CodeFile[]> {
    const result = await this.findMany(
      { project_analysis_id: projectAnalysisId },
      { sortBy: 'file_path', sortOrder: 'ASC' }
    );
    return result.data;
  }

  async findByFilePath(projectAnalysisId: string, filePath: string): Promise<CodeFile | null> {
    return await this.findOne({
      project_analysis_id: projectAnalysisId,
      file_path: filePath,
    });
  }

  async findByFileType(fileType: string): Promise<CodeFile[]> {
    const result = await this.findMany(
      { file_type: fileType },
      { sortBy: 'file_path', sortOrder: 'ASC' }
    );
    return result.data;
  }

  async findByLanguage(language: string): Promise<CodeFile[]> {
    const result = await this.findMany(
      { language },
      { sortBy: 'file_path', sortOrder: 'ASC' }
    );
    return result.data;
  }

  async searchFiles(projectAnalysisId: string, searchTerm: string): Promise<CodeFile[]> {
    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      const query = `
        SELECT *
        FROM ${this.tableName}
        WHERE project_analysis_id = $1
          AND (
            LOWER(file_path) LIKE $2
            OR LOWER(file_name) LIKE $2
            OR LOWER(file_type) LIKE $2
          )
          AND ${this.deletedAtField} IS NULL
        ORDER BY file_path ASC
      `;

      const result = await this.dbManager.query<CodeFile>({
        text: query,
        params: [projectAnalysisId, searchPattern],
      });

      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      logger.error('Failed to search code files', {
        projectAnalysisId,
        searchTerm,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getFileStatistics(projectAnalysisId: string): Promise<{
    total_files: number;
    total_size: number;
    total_lines: number;
    file_types: Record<string, number>;
    languages: Record<string, number>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(file_size), 0) as total_size,
          COALESCE(SUM(line_count), 0) as total_lines,
          json_object_agg(file_type, count_per_type) as file_types,
          json_object_agg(language, count_per_language) as languages
        FROM (
          SELECT 
            file_type,
            language,
            COUNT(*) as count_per_type,
            COUNT(*) as count_per_language
          FROM ${this.tableName}
          WHERE project_analysis_id = $1
            AND ${this.deletedAtField} IS NULL
          GROUP BY file_type, language
        ) subquery
      `;

      const result = await this.dbManager.query<{
        total_files: string;
        total_size: string;
        total_lines: string;
        file_types: string;
        languages: string;
      }>({
        text: query,
        params: [projectAnalysisId],
      });

      if (result.rows.length === 0) {
        return {
          total_files: 0,
          total_size: 0,
          total_lines: 0,
          file_types: {},
          languages: {},
        };
      }

      const row = result.rows[0];

      return {
        total_files: parseInt(row.total_files),
        total_size: parseInt(row.total_size),
        total_lines: parseInt(row.total_lines),
        file_types: row.file_types ? JSON.parse(row.file_types) : {},
        languages: row.languages ? JSON.parse(row.languages) : {},
      };
    } catch (error) {
      logger.error('Failed to get file statistics', {
        projectAnalysisId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async updateContent(fileId: string, content: string, contentHash: string): Promise<CodeFile> {
    return await this.update(fileId, {
      content,
      content_hash: contentHash,
    });
  }

  async updateMetadata(fileId: string, metadata: Record<string, any>): Promise<CodeFile> {
    return await this.update(fileId, { metadata });
  }

  async bulkCreate(files: CreateCodeFile[]): Promise<CodeFile[]> {
    const createdFiles: CodeFile[] = [];
    
    for (const file of files) {
      const createdFile = await this.create(file);
      createdFiles.push(createdFile);
    }

    logger.info('Bulk created code files', {
      count: createdFiles.length,
      projectAnalysisId: files[0]?.project_analysis_id,
    });

    return createdFiles;
  }
}