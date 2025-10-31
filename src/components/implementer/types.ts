/**
 * Implementer Component Types
 * 
 * Defines all types and interfaces for the code generation and file operations system.
 */

import { BaseEntity } from '@/database/types';
import { LogLevel } from '@/core/logger';

// Core operation types
export type FileOperation = 'create' | 'modify' | 'delete' | 'move' | 'copy';

export interface FileOperationOptions {
  backup?: boolean;
  atomic?: boolean;
  permissions?: string;
  encoding?: BufferEncoding;
}

export interface FileContent {
  path: string;
  content: string;
  encoding?: BufferEncoding;
  metadata?: Record<string, any>;
}

// Code generation types
export interface CodeGenerationRequest {
  prompt: string;
  context?: CodeContext;
  language?: string;
  framework?: string;
  style?: CodeStyle;
  constraints?: CodeConstraints;
}

export interface CodeContext {
  projectPath?: string;
  existingFiles?: string[];
  dependencies?: string[];
  architecture?: string;
  patterns?: string[];
  businessLogic?: string;
  technicalRequirements?: string;
  apiContracts?: string[];
  databaseSchema?: string;
}

export interface CodeStyle {
  naming: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
  comments: 'none' | 'minimal' | 'standard' | 'detailed';
  formatting: 'compact' | 'standard' | 'verbose';
  errorHandling: 'none' | 'basic' | 'comprehensive';
  testing: 'none' | 'basic' | 'comprehensive';
}

export interface CodeConstraints {
  maxLines?: number;
  maxComplexity?: number;
  requiredPatterns?: string[];
  prohibitedPatterns?: string[];
  securityRequirements?: string[];
  performanceRequirements?: string[];
}

export interface CodeGenerationResponse {
  code: string;
  language: string;
  files: CodeFile[];
  explanations: string[];
  tests?: CodeFile[];
  documentation?: CodeFile[];
  metadata: {
    model: string;
    tokens: number;
    confidence: number;
    duration: number;
  };
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
  type: 'source' | 'test' | 'config' | 'documentation' | 'other';
  description?: string;
  dependencies?: string[];
  exports?: string[];
  imports?: string[];
}

// File system operation types
export interface FileSystemOperation {
  id: string;
  type: FileOperation;
  sourcePath: string;
  targetPath?: string;
  content?: string;
  options: FileOperationOptions;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  checksum?: string;
  timestamp: Date;
  error?: string;
}

export interface FileSystemSnapshot {
  id: string;
  timestamp: Date;
  operations: FileSystemOperation[];
  checksum: string;
  metadata: Record<string, any>;
}

// Rollback operation types
export interface RollbackOperation {
  id: string;
  type: 'create' | 'modify' | 'delete' | 'move';
  targetPath: string;
  originalContent?: string;
  newContent?: string;
  backupPath?: string;
  timestamp: Date;
}

export interface RollbackSession {
  id: string;
  name: string;
  description?: string;
  operations: RollbackOperation[];
  status: 'active' | 'committed' | 'rolled-back' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

// Implementer execution types
export interface ImplementationRequest {
  taskId: string;
  description: string;
  requirements: string[];
  codeGeneration?: CodeGenerationRequest;
  fileOperations?: FileOperationRequest[];
  dependencies?: string[];
  rollbackStrategy?: RollbackStrategy;
  parallelExecution?: boolean;
  dryRun?: boolean;
}

export interface FileOperationRequest {
  type: FileOperation;
  sourcePath: string;
  targetPath?: string;
  content?: string;
  options?: FileOperationOptions;
}

export type RollbackStrategy = 'none' | 'manual' | 'automatic' | 'snapshot';

export interface ImplementationResult {
  requestId: string;
  taskId: string;
  status: 'success' | 'partial' | 'failed' | 'rolled-back';
  generatedFiles: CodeFile[];
  appliedOperations: FileSystemOperation[];
  rollbackSession?: RollbackSession;
  errors: ImplementationError[];
  warnings: string[];
  metrics: ImplementationMetrics;
  timestamp: Date;
}

export interface ImplementationError {
  code: string;
  message: string;
  operation?: FileOperation;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface ImplementationMetrics {
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  linesOfCode: number;
  testFilesGenerated: number;
  documentationFilesGenerated: number;
  duration: number;
  rollbackPerformed: boolean;
  errors: number;
  warnings: number;
}

// Configuration types
export interface ImplementerConfig {
  codeGeneration: {
    provider: 'groq' | 'openai' | 'anthropic';
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
    retries: number;
  };
  fileSystem: {
    defaultEncoding: BufferEncoding;
    backupDirectory: string;
    atomicWrites: boolean;
    preservePermissions: boolean;
    maxConcurrentOperations: number;
  };
  rollback: {
    maxSessions: number;
    maxSessionAge: number; // in hours
    backupRetention: number; // number of backups to keep
    autoCleanup: boolean;
  };
  logging: {
    level: LogLevel;
    enableFileLogging: boolean;
    enableConsoleLogging: boolean;
    logFilePath?: string;
  };
  security: {
    allowedPaths: string[];
    deniedPaths: string[];
    requireConfirmation: boolean;
    maxFileSize: number; // in bytes
  };
}

// Event types
export interface ImplementerEventData {
  requestId: string;
  taskId: string;
  operation?: string;
  file?: string;
  status: string;
  error?: Error;
  metadata?: Record<string, any>;
}

// Progress tracking types
export interface ImplementationProgress {
  requestId: string;
  stage: 'initializing' | 'generating-code' | 'writing-files' | 'running-tests' | 'completed' | 'failed' | 'rolled-back';
  progress: number; // 0-100
  currentOperation?: string;
  estimatedTimeRemaining?: number;
  completedSteps: string[];
  remainingSteps: string[];
}

// Integration types
export interface DatabaseIntegration {
  saveImplementation(result: ImplementationResult): Promise<void>;
  getImplementation(requestId: string): Promise<ImplementationResult | null>;
  getTaskImplementations(taskId: string): Promise<ImplementationResult[]>;
}

export interface EventBusIntegration {
  emit(event: string, data: ImplementerEventData): void;
  on(event: string, handler: (data: ImplementerEventData) => void): string;
  off(listenerId: string): void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface AsyncIterableIterator<T> {
  next(): Promise<IteratorResult<T>>;
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

// Constants
export const DEFAULT_CONFIG: ImplementerConfig = {
  codeGeneration: {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 30000,
    retries: 3,
  },
  fileSystem: {
    defaultEncoding: 'utf8',
    backupDirectory: '.backups',
    atomicWrites: true,
    preservePermissions: true,
    maxConcurrentOperations: 5,
  },
  rollback: {
    maxSessions: 10,
    maxSessionAge: 24,
    backupRetention: 5,
    autoCleanup: true,
  },
  logging: {
    level: LogLevel.INFO,
    enableFileLogging: true,
    enableConsoleLogging: true,
  },
  security: {
    allowedPaths: [],
    deniedPaths: ['/etc', '/var', '/root', '/.ssh', '/.aws'],
    requireConfirmation: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
};

export const IMPLEMENTER_EVENTS = {
  REQUEST_STARTED: 'implementer:request:started',
  REQUEST_COMPLETED: 'implementer:request:completed',
  REQUEST_FAILED: 'implementer:request:failed',
  CODE_GENERATION_STARTED: 'implementer:code:generation:started',
  CODE_GENERATION_COMPLETED: 'implementer:code:generation:completed',
  CODE_GENERATION_FAILED: 'implementer:code:generation:failed',
  FILE_OPERATION_STARTED: 'implementer:file:operation:started',
  FILE_OPERATION_COMPLETED: 'implementer:file:operation:completed',
  FILE_OPERATION_FAILED: 'implementer:file:operation:failed',
  ROLLBACK_STARTED: 'implementer:rollback:started',
  ROLLBACK_COMPLETED: 'implementer:rollback:completed',
  ROLLBACK_FAILED: 'implementer:rollback:failed',
  PROGRESS_UPDATED: 'implementer:progress:updated',
} as const;
