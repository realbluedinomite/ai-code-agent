import { BaseModel } from '../base-model';
import { DatabaseConnectionManager } from '../client';
import { ProjectAnalysis, CreateProjectAnalysis, UpdateProjectAnalysis } from '../entities';
import { ValidationResult, ValidationError, ModelOptions } from '../types';
import Joi from 'joi';
import { logger } from '@/utils/loggers';

const projectAnalysisCreateSchema = Joi.object({
  parsed_request_id: Joi.string().uuid().required(),
  project_path: Joi.string().max(1000).optional().allow(null),
  project_name: Joi.string().max(255).optional().allow(null),
  project_type: Joi.string().max(100).optional().allow(null),
  analysis_type: Joi.string().max(100).required(),
  results: Joi.object().optional().allow(null),
  recommendations: Joi.object().optional().allow(null),
  file_count: Joi.number().integer().min(0).optional().allow(null),
  line_count: Joi.number().integer().min(0).optional().allow(null),
  complexity_score: Joi.number().min(0).max(100).optional().allow(null),
  quality_metrics: Joi.object().optional().allow(null),
  issues_found: Joi.number().integer().min(0).optional().allow(null),
  warnings_count: Joi.number().integer().min(0).optional().allow(null),
  status: Joi.string().max(50).optional(),
  started_at: Joi.date().optional().allow(null),
  completed_at: Joi.date().optional().allow(null),
  error_message: Joi.string().max(1000).optional().allow(null),
});

const projectAnalysisUpdateSchema = Joi.object({
  project_path: Joi.string().max(1000).optional().allow(null),
  project_name: Joi.string().max(255).optional().allow(null),
  project_type: Joi.string().max(100).optional().allow(null),
  results: Joi.object().optional().allow(null),
  recommendations: Joi.object().optional().allow(null),
  file_count: Joi.number().integer().min(0).optional().allow(null),
  line_count: Joi.number().integer().min(0).optional().allow(null),
  complexity_score: Joi.number().min(0).max(100).optional().allow(null),
  quality_metrics: Joi.object().optional().allow(null),
  issues_found: Joi.number().integer().min(0).optional().allow(null),
  warnings_count: Joi.number().integer().min(0).optional().allow(null),
  status: Joi.string().max(50).optional(),
  started_at: Joi.date().optional().allow(null),
  completed_at: Joi.date().optional().allow(null),
  error_message: Joi.string().max(1000).optional().allow(null),
});

export class ProjectAnalysisModel extends BaseModel<ProjectAnalysis, CreateProjectAnalysis, UpdateProjectAnalysis> {
  constructor(dbManager: DatabaseConnectionManager) {
    super(dbManager, {
      tableName: 'project_analyses',
      primaryKey: 'id',
      timestamps: true,
      softDelete: true,
    });
  }

  protected validate(data: Partial<CreateProjectAnalysis | UpdateProjectAnalysis>): ValidationResult {
    const schema = data && (data as any).id ? projectAnalysisUpdateSchema : projectAnalysisCreateSchema;
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

  protected mapToEntity(row: any): ProjectAnalysis {
    return {
      id: row.id,
      parsed_request_id: row.parsed_request_id,
      project_path: row.project_path,
      project_name: row.project_name,
      project_type: row.project_type,
      analysis_type: row.analysis_type,
      results: row.results,
      recommendations: row.recommendations,
      file_count: row.file_count,
      line_count: row.line_count,
      complexity_score: row.complexity_score,
      quality_metrics: row.quality_metrics,
      issues_found: row.issues_found,
      warnings_count: row.warnings_count,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_ms: row.duration_ms,
      error_message: row.error_message,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  protected mapFromCreate(data: CreateProjectAnalysis): Record<string, any> {
    return {
      parsed_request_id: data.parsed_request_id,
      project_path: data.project_path || null,
      project_name: data.project_name || null,
      project_type: data.project_type || null,
      analysis_type: data.analysis_type,
      results: data.results || null,
      recommendations: data.recommendations || null,
      file_count: data.file_count || null,
      line_count: data.line_count || null,
      complexity_score: data.complexity_score || null,
      quality_metrics: data.quality_metrics || null,
      issues_found: data.issues_found || null,
      warnings_count: data.warnings_count || null,
      status: data.status || 'pending',
      started_at: data.started_at || null,
      completed_at: data.completed_at || null,
      error_message: data.error_message || null,
    };
  }

  protected mapFromUpdate(data: UpdateProjectAnalysis): Record<string, any> {
    const updateData: Record<string, any> = {};

    if (data.project_path !== undefined) updateData.project_path = data.project_path;
    if (data.project_name !== undefined) updateData.project_name = data.project_name;
    if (data.project_type !== undefined) updateData.project_type = data.project_type;
    if (data.results !== undefined) updateData.results = data.results;
    if (data.recommendations !== undefined) updateData.recommendations = data.recommendations;
    if (data.file_count !== undefined) updateData.file_count = data.file_count;
    if (data.line_count !== undefined) updateData.line_count = data.line_count;
    if (data.complexity_score !== undefined) updateData.complexity_score = data.complexity_score;
    if (data.quality_metrics !== undefined) updateData.quality_metrics = data.quality_metrics;
    if (data.issues_found !== undefined) updateData.issues_found = data.issues_found;
    if (data.warnings_count !== undefined) updateData.warnings_count = data.warnings_count;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.started_at !== undefined) updateData.started_at = data.started_at;
    if (data.completed_at !== undefined) updateData.completed_at = data.completed_at;
    if (data.error_message !== undefined) updateData.error_message = data.error_message;

    return updateData;
  }

  // ProjectAnalysis-specific methods
  async findByParsedRequestId(parsedRequestId: string): Promise<ProjectAnalysis[]> {
    const result = await this.findMany(
      { parsed_request_id: parsedRequestId },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByProjectPath(projectPath: string): Promise<ProjectAnalysis[]> {
    const result = await this.findMany(
      { project_path: projectPath },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findByAnalysisType(analysisType: string): Promise<ProjectAnalysis[]> {
    const result = await this.findMany(
      { analysis_type: analysisType },
      { sortBy: 'created_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findCompleted(): Promise<ProjectAnalysis[]> {
    const result = await this.findMany(
      { status: 'completed' },
      { sortBy: 'completed_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async findFailed(): Promise<ProjectAnalysis[]> {
    const result = await this.findMany(
      { status: 'failed' },
      { sortBy: 'updated_at', sortOrder: 'DESC' }
    );
    return result.data;
  }

  async startAnalysis(id: string): Promise<ProjectAnalysis> {
    return await this.update(id, {
      status: 'in_progress',
      started_at: new Date(),
    });
  }

  async completeAnalysis(id: string, results: any, recommendations?: any): Promise<ProjectAnalysis> {
    const completedAt = new Date();
    
    // Calculate duration
    const analysis = await this.findById(id);
    const duration = analysis?.started_at 
      ? completedAt.getTime() - analysis.started_at.getTime()
      : null;

    return await this.update(id, {
      status: 'completed',
      completed_at: completedAt,
      results,
      recommendations: recommendations || null,
      duration_ms: duration,
    });
  }

  async failAnalysis(id: string, errorMessage: string): Promise<ProjectAnalysis> {
    return await this.update(id, {
      status: 'failed',
      completed_at: new Date(),
      error_message: errorMessage,
    });
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    average_duration: number;
    average_complexity_score: number;
    total_issues_found: number;
    total_warnings: number;
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
        this.dbManager.query<{ avg_duration: number }>({
          text: `SELECT AVG(duration_ms) as avg_duration FROM ${this.tableName} WHERE status = 'completed' AND duration_ms IS NOT NULL AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ avg_score: number }>({
          text: `SELECT AVG(complexity_score) as avg_score FROM ${this.tableName} WHERE complexity_score IS NOT NULL AND ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ total: number }>({
          text: `SELECT COALESCE(SUM(issues_found), 0) as total FROM ${this.tableName} WHERE ${this.deletedAtField} IS NULL`,
        }),
        this.dbManager.query<{ total: number }>({
          text: `SELECT COALESCE(SUM(warnings_count), 0) as total FROM ${this.tableName} WHERE ${this.deletedAtField} IS NULL`,
        }),
      ];

      const results = await Promise.all(queries);

      return {
        total: parseInt(results[0].rows[0].count),
        pending: parseInt(results[1].rows[0].count),
        in_progress: parseInt(results[2].rows[0].count),
        completed: parseInt(results[3].rows[0].count),
        failed: parseInt(results[4].rows[0].count),
        average_duration: results[5].rows[0].avg_duration ? parseFloat(results[5].rows[0].avg_duration) : 0,
        average_complexity_score: results[6].rows[0].avg_score ? parseFloat(results[6].rows[0].avg_score) : 0,
        total_issues_found: parseInt(results[7].rows[0].total),
        total_warnings: parseInt(results[8].rows[0].total),
      };
    } catch (error) {
      logger.error('Failed to get project analysis statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getRecentAnalyses(limit = 10): Promise<ProjectAnalysis[]> {
    const result = await this.findMany(
      {},
      { sortBy: 'created_at', sortOrder: 'DESC', limit }
    );
    return result.data;
  }
}