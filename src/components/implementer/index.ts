/**
 * Implementer Component Index
 * 
 * Main entry point for the code generation and file operations system.
 * Provides a unified interface for all implementer functionality.
 */

export * from './types';
export * from './implementer';
export * from './code-generator';
export * from './file-writer';
export * from './rollback-manager';

// Re-export commonly used types for convenience
export type {
  ImplementationRequest,
  ImplementationResult,
  CodeGenerationRequest,
  CodeGenerationResponse,
  FileOperationRequest,
  RollbackSession,
  RollbackOperation,
  FileSystemOperation,
  CodeFile,
  CodeContext,
  CodeStyle,
  CodeConstraints,
  FileOperationOptions,
  ImplementationProgress,
  ImplementationError,
  ImplementationMetrics,
  RollbackStrategy,
} from './types';

// Re-export main classes
export {
  Implementer,
  CodeGenerator,
  FileWriter,
  RollbackManager,
  CodeGenerationError,
  FileOperationError,
  PermissionError,
  PathValidationError,
  RollbackError,
  SessionNotFoundError,
  InvalidSessionStateError,
  ImplementationError,
  ConfigurationError,
} from './implementer';

export { CodeGenerationError } from './code-generator';
export {
  FileOperationError,
  PermissionError,
  PathValidationError,
} from './file-writer';
export {
  RollbackError,
  SessionNotFoundError,
  InvalidSessionStateError,
} from './rollback-manager';

// Default configuration
export { DEFAULT_CONFIG } from './types';

// Constants
export {
  IMPLEMENTER_EVENTS,
  DEFAULT_CONFIG as IMPLEMENTER_DEFAULT_CONFIG,
} from './types';
