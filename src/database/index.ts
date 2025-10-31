import { DatabaseConnectionManager } from './client';
import { UserModel } from './models/user.model';
import { SessionModel } from './models/session.model';
import { ParsedRequestModel } from './models/parsed-request.model';
import { ProjectAnalysisModel } from './models/project-analysis.model';
import { TaskModel } from './models/task.model';
import { CodeFileModel } from './models/code-file.model';
import { ConfigurationModel } from './models/configuration.model';
import { AuditLogModel } from './models/audit-log.model';
import { ApiKeyModel } from './models/api-key.model';

// Model factory interface
export interface ModelFactory {
  userModel(): UserModel;
  sessionModel(): SessionModel;
  parsedRequestModel(): ParsedRequestModel;
  projectAnalysisModel(): ProjectAnalysisModel;
  taskModel(): TaskModel;
  codeFileModel(): CodeFileModel;
  configurationModel(): ConfigurationModel;
  auditLogModel(): AuditLogModel;
  apiKeyModel(): ApiKeyModel;
}

// Model factory implementation
export class DatabaseModelFactory implements ModelFactory {
  private dbManager: DatabaseConnectionManager;
  private models: Map<string, any> = new Map();

  constructor(dbManager: DatabaseConnectionManager) {
    this.dbManager = dbManager;
  }

  userModel(): UserModel {
    const key = 'user';
    if (!this.models.has(key)) {
      this.models.set(key, new UserModel(this.dbManager));
    }
    return this.models.get(key);
  }

  sessionModel(): SessionModel {
    const key = 'session';
    if (!this.models.has(key)) {
      this.models.set(key, new SessionModel(this.dbManager));
    }
    return this.models.get(key);
  }

  parsedRequestModel(): ParsedRequestModel {
    const key = 'parsedRequest';
    if (!this.models.has(key)) {
      this.models.set(key, new ParsedRequestModel(this.dbManager));
    }
    return this.models.get(key);
  }

  projectAnalysisModel(): ProjectAnalysisModel {
    const key = 'projectAnalysis';
    if (!this.models.has(key)) {
      this.models.set(key, new ProjectAnalysisModel(this.dbManager));
    }
    return this.models.get(key);
  }

  taskModel(): TaskModel {
    const key = 'task';
    if (!this.models.has(key)) {
      this.models.set(key, new TaskModel(this.dbManager));
    }
    return this.models.get(key);
  }

  codeFileModel(): CodeFileModel {
    const key = 'codeFile';
    if (!this.models.has(key)) {
      this.models.set(key, new CodeFileModel(this.dbManager));
    }
    return this.models.get(key);
  }

  configurationModel(): ConfigurationModel {
    const key = 'configuration';
    if (!this.models.has(key)) {
      this.models.set(key, new ConfigurationModel(this.dbManager));
    }
    return this.models.get(key);
  }

  auditLogModel(): AuditLogModel {
    const key = 'auditLog';
    if (!this.models.has(key)) {
      this.models.set(key, new AuditLogModel(this.dbManager));
    }
    return this.models.get(key);
  }

  apiKeyModel(): ApiKeyModel {
    const key = 'apiKey';
    if (!this.models.has(key)) {
      this.models.set(key, new ApiKeyModel(this.dbManager));
    }
    return this.models.get(key);
  }
}

// Model registry for dependency injection
export class ModelRegistry {
  private models: Map<string, any> = new Map();
  private dbManager: DatabaseConnectionManager;

  constructor(dbManager: DatabaseConnectionManager) {
    this.dbManager = dbManager;
  }

  register<T extends BaseModel<any, any, any>>(name: string, modelClass: new (dbManager: DatabaseConnectionManager) => T): void {
    this.models.set(name, new modelClass(this.dbManager));
  }

  get<T extends BaseModel<any, any, any>>(name: string): T | null {
    return this.models.get(name) || null;
  }

  getAll(): Map<string, any> {
    return new Map(this.models);
  }

  clear(): void {
    this.models.clear();
  }
}

// Global model registry (singleton pattern)
let globalModelRegistry: ModelRegistry | null = null;

export async function getModelRegistry(dbManager?: DatabaseConnectionManager): Promise<ModelRegistry> {
  if (!globalModelRegistry) {
    if (!dbManager) {
      throw new Error('Database manager is required to initialize the model registry');
    }
    globalModelRegistry = new ModelRegistry(dbManager);
    
    // Register default models
    globalModelRegistry.register('user', UserModel);
    globalModelRegistry.register('session', SessionModel);
    globalModelRegistry.register('parsedRequest', ParsedRequestModel);
    globalModelRegistry.register('projectAnalysis', ProjectAnalysisModel);
    globalModelRegistry.register('task', TaskModel);
    globalModelRegistry.register('codeFile', CodeFileModel);
    globalModelRegistry.register('configuration', ConfigurationModel);
    globalModelRegistry.register('auditLog', AuditLogModel);
    globalModelRegistry.register('apiKey', ApiKeyModel);
  }

  return globalModelRegistry;
}

export function clearModelRegistry(): void {
  globalModelRegistry = null;
}

// Export all models and factory
export {
  UserModel,
  SessionModel,
  ParsedRequestModel,
  ProjectAnalysisModel,
  TaskModel,
  CodeFileModel,
  ConfigurationModel,
  AuditLogModel,
  ApiKeyModel,
};

// Export types
export type {
  User,
  CreateUser,
  UpdateUser,
  Session,
  CreateSession,
  UpdateSession,
  ParsedRequest,
  CreateParsedRequest,
  UpdateParsedRequest,
  ProjectAnalysis,
  CreateProjectAnalysis,
  UpdateProjectAnalysis,
  Task,
  CreateTask,
  UpdateTask,
  CodeFile,
  CreateCodeFile,
  UpdateCodeFile,
  Configuration,
  CreateConfiguration,
  UpdateConfiguration,
  AuditLog,
  CreateAuditLog,
  ApiKey,
  CreateApiKey,
  UpdateApiKey,
} from './entities';

// Export database types and errors
export {
  BaseEntity,
  BaseCreateEntity,
  BaseUpdateEntity,
  QueryOptions,
  PaginationOptions,
  FilteringOptions,
  PaginationResult,
  QueryResult,
  CreateResult,
  UpdateResult,
  DeleteResult,
  ModelOptions,
  ValidationResult,
  ValidationError,
  DatabaseError,
  ValidationError as CustomValidationError,
  NotFoundError,
  ConflictError,
  EntityStatus,
  SessionStatus,
  AnalysisStatus,
  RequestType,
  Priority,
} from './types';

// Export client
export {
  DatabaseConnectionManager,
  DatabaseConfig,
  QueryConfig,
  QueryResultWithTiming,
  getDatabaseClient,
  initializeDatabase,
  closeDatabaseConnection,
} from './client';

// Export base model
export { BaseModel } from './base-model';