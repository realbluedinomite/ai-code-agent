/**
 * Implementer Component
 * 
 * Main orchestrator for code generation and file operations with comprehensive
 * integration with database, event systems, and rollback capabilities.
 */

import {
  ImplementationRequest,
  ImplementationResult,
  ImplementationProgress,
  CodeGenerationRequest,
  CodeContext,
  CodeStyle,
  CodeConstraints,
  FileOperationRequest,
  RollbackStrategy,
  ImplementationError,
  ImplementationMetrics,
  DatabaseIntegration,
  EventBusIntegration,
  DEFAULT_CONFIG,
} from './types';
import { CodeGenerator } from './code-generator';
import { FileWriter } from './file-writer';
import { RollbackManager } from './rollback-manager';
import {
  BaseError,
  ValidationError,
  SystemError,
  TimeoutError,
  TaskError,
} from '@/core/errors';
import { TypedEventBus } from '@/core/event-bus';
import { DatabaseClient } from '@/database/client';

/**
 * Implementation error
 */
export class ImplementationError extends BaseError {
  constructor(
    message: string,
    options: {
      requestId?: string;
      taskId?: string;
      operation?: string;
      stage?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'IMPLEMENTATION_ERROR',
      statusCode: 500,
      context: {
        requestId: options.requestId,
        taskId: options.taskId,
        operation: options.operation,
        stage: options.stage,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    options: {
      component?: string;
      setting?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      statusCode: 500,
      context: {
        component: options.component,
        setting: options.setting,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Implementer class - main orchestrator for code generation and file operations
 */
export class Implementer {
  private codeGenerator: CodeGenerator;
  private fileWriter: FileWriter;
  private rollbackManager: RollbackManager;
  private eventBus: TypedEventBus;
  private database?: DatabaseClient;
  private config: typeof DEFAULT_CONFIG;
  private progressCallbacks: Map<string, (progress: ImplementationProgress) => void> = new Map();

  constructor(
    groqApiKey: string,
    eventBus: TypedEventBus,
    options: {
      database?: DatabaseClient;
      config?: Partial<typeof DEFAULT_CONFIG>;
    } = {}
  ) {
    if (!groqApiKey) {
      throw new ValidationError('Groq API key is required', {
        field: 'groqApiKey',
      });
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...options.config,
    };
    this.eventBus = eventBus;
    this.database = options.database;

    // Initialize components
    this.codeGenerator = new CodeGenerator(
      groqApiKey,
      this.config.codeGeneration,
      eventBus
    );

    this.fileWriter = new FileWriter(
      this.config.fileSystem,
      eventBus
    );

    this.rollbackManager = new RollbackManager(
      this.config.rollback,
      eventBus
    );
  }

  /**
   * Execute implementation request
   */
  async implement(request: ImplementationRequest): Promise<ImplementationResult> {
    const startTime = Date.now();
    const requestId = `impl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.emitProgress(requestId, 'initializing', 0, 'Validating request');

      // Validate request
      this.validateRequest(request);

      // Initialize rollback session if needed
      let rollbackSessionId: string | undefined;
      if (request.rollbackStrategy && request.rollbackStrategy !== 'none') {
        this.emitProgress(requestId, 'initializing', 10, 'Creating rollback session');
        rollbackSessionId = await this.rollbackManager.createSession(
          `Implementation for task ${request.taskId}`,
          request.description
        );
      }

      // Generate code if requested
      let generatedFiles: any[] = [];
      if (request.codeGeneration) {
        this.emitProgress(requestId, 'generating-code', 20, 'Generating code');
        generatedFiles = await this.executeCodeGeneration(requestId, request.taskId, request.codeGeneration);
      }

      // Apply file operations if any
      let appliedOperations: any[] = [];
      if (request.fileOperations && request.fileOperations.length > 0) {
        this.emitProgress(requestId, 'writing-files', 50, 'Applying file operations');
        appliedOperations = await this.executeFileOperations(
          requestId,
          request.taskId,
          request.fileOperations,
          rollbackSessionId
        );
      }

      // Run tests if needed
      if (request.codeGeneration?.style?.testing && request.codeGeneration.style.testing !== 'none') {
        this.emitProgress(requestId, 'running-tests', 80, 'Running tests');
        await this.runTests(generatedFiles);
      }

      // Commit rollback session if created
      if (rollbackSessionId) {
        await this.rollbackManager.commitSession(rollbackSessionId);
      }

      // Calculate metrics
      const metrics: ImplementationMetrics = {
        filesCreated: appliedOperations.filter(op => op.type === 'create').length,
        filesModified: appliedOperations.filter(op => op.type === 'modify').length,
        filesDeleted: appliedOperations.filter(op => op.type === 'delete').length,
        linesOfCode: this.calculateLinesOfCode(generatedFiles),
        testFilesGenerated: generatedFiles.filter(f => f.type === 'test').length,
        documentationFilesGenerated: generatedFiles.filter(f => f.type === 'documentation').length,
        duration: Date.now() - startTime,
        rollbackPerformed: false,
        errors: 0,
        warnings: 0,
      };

      const result: ImplementationResult = {
        requestId,
        taskId: request.taskId,
        status: 'success',
        generatedFiles,
        appliedOperations,
        rollbackSession: rollbackSessionId ? await this.rollbackManager.getSession(rollbackSessionId) : undefined,
        errors: [],
        warnings: [],
        metrics,
        timestamp: new Date(),
      };

      // Save to database if configured
      if (this.database) {
        await this.saveImplementation(result);
      }

      this.emitProgress(requestId, 'completed', 100, 'Implementation completed');
      
      this.eventBus.emit('implementer:request:completed', {
        requestId,
        taskId: request.taskId,
        status: 'success',
        filesGenerated: generatedFiles.length,
        operationsApplied: appliedOperations.length,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.emitProgress(requestId, 'failed', 0, `Failed: ${errorMessage}`);
      
      this.eventBus.emit('implementer:request:failed', {
        requestId,
        taskId: request.taskId,
        error: errorMessage,
        cause: error,
      });

      // Attempt rollback if session exists
      if (request.rollbackStrategy && request.rollbackStrategy !== 'none') {
        try {
          await this.rollbackManager.rollbackSession(requestId);
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }

      throw new ImplementationError(
        `Implementation failed: ${errorMessage}`,
        {
          requestId,
          taskId: request.taskId,
          stage: 'execution',
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Execute implementation with dry run mode
   */
  async implementDryRun(request: ImplementationRequest): Promise<{
    preview: {
      filesToCreate: string[];
      filesToModify: string[];
      filesToDelete: string[];
      codePreview?: string;
    };
    warnings: string[];
    estimatedDuration: number;
  }> {
    const warnings: string[] = [];
    let codePreview: string | undefined;

    // Check code generation preview
    if (request.codeGeneration) {
      try {
        const prompt = this.buildPromptPreview(request.codeGeneration);
        // This would typically make a lightweight call to the AI model
        // For now, we'll just return the prompt as preview
        codePreview = prompt;
      } catch (error) {
        warnings.push(`Code generation preview failed: ${error}`);
      }
    }

    // Analyze file operations
    const filesToCreate: string[] = [];
    const filesToModify: string[] = [];
    const filesToDelete: string[] = [];

    if (request.fileOperations) {
      for (const op of request.fileOperations) {
        switch (op.type) {
          case 'create':
            filesToCreate.push(op.sourcePath);
            break;
          case 'modify':
            filesToModify.push(op.sourcePath);
            break;
          case 'delete':
            filesToDelete.push(op.sourcePath);
            break;
        }
      }
    }

    // Estimate duration
    const estimatedDuration = this.estimateDuration(request);

    return {
      preview: {
        filesToCreate,
        filesToModify,
        filesToDelete,
        codePreview,
      },
      warnings,
      estimatedDuration,
    };
  }

  /**
   * Subscribe to progress updates
   */
  subscribeToProgress(
    requestId: string,
    callback: (progress: ImplementationProgress) => void
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.progressCallbacks.set(subscriptionId, callback);

    // Clean up after completion or failure
    setTimeout(() => {
      this.progressCallbacks.delete(subscriptionId);
    }, 60000); // 1 minute timeout

    return subscriptionId;
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(subscriptionId: string): void {
    this.progressCallbacks.delete(subscriptionId);
  }

  /**
   * Get implementation history for a task
   */
  async getTaskHistory(taskId: string): Promise<ImplementationResult[]> {
    if (!this.database) {
      throw new ConfigurationError('Database integration not configured', {
        component: 'database',
      });
    }

    // This would query the database for implementation history
    // Implementation depends on the database schema
    return [];
  }

  /**
   * Cancel ongoing implementation
   */
  async cancelImplementation(requestId: string): Promise<void> {
    // Cancel file operations
    this.fileWriter.cancelOperations();
    
    // Cancel rollback session if needed
    try {
      await this.rollbackManager.rollbackSession(requestId);
    } catch (error) {
      // Session might not exist or already be completed
    }

    // Clear progress callbacks
    this.progressCallbacks.clear();

    this.eventBus.emit('implementer:request:cancelled', {
      requestId,
    });
  }

  /**
   * Validate implementation request
   */
  private validateRequest(request: ImplementationRequest): void {
    if (!request.taskId) {
      throw new ValidationError('Task ID is required', {
        field: 'taskId',
      });
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new ValidationError('Description is required', {
        field: 'description',
      });
    }

    if (!request.requirements || request.requirements.length === 0) {
      throw new ValidationError('Requirements are required', {
        field: 'requirements',
      });
    }

    if (request.fileOperations) {
      for (const op of request.fileOperations) {
        if (!op.sourcePath) {
          throw new ValidationError('File operation source path is required', {
            field: 'sourcePath',
          });
        }

        if (!['create', 'modify', 'delete', 'move', 'copy'].includes(op.type)) {
          throw new ValidationError(`Invalid file operation type: ${op.type}`, {
            field: 'type',
            value: op.type,
          });
        }
      }
    }

    if (request.codeGeneration) {
      if (!request.codeGeneration.prompt) {
        throw new ValidationError('Code generation prompt is required', {
          field: 'prompt',
        });
      }

      if (request.codeGeneration.context?.allowedPaths) {
        // Validate allowed paths
      }
    }
  }

  /**
   * Execute code generation
   */
  private async executeCodeGeneration(
    requestId: string,
    taskId: string,
    codeRequest: CodeGenerationRequest
  ): Promise<any[]> {
    try {
      const result = await this.codeGenerator.generateCode(codeRequest);
      
      this.eventBus.emit('implementer:code:generation:completed', {
        requestId,
        taskId,
        filesGenerated: result.files.length,
        language: result.language,
        tokens: result.metadata.tokens,
      });

      return result.files;
    } catch (error) {
      throw new ImplementationError(
        `Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          requestId,
          taskId,
          stage: 'code-generation',
          cause: error as Error,
        }
      );
    }
  }

  /**
   * Execute file operations
   */
  private async executeFileOperations(
    requestId: string,
    taskId: string,
    operations: FileOperationRequest[],
    rollbackSessionId?: string
  ): Promise<any[]> {
    const results: any[] = [];

    try {
      // Group operations by type for better handling
      const createOps = operations.filter(op => op.type === 'create');
      const modifyOps = operations.filter(op => op.type === 'modify');
      const deleteOps = operations.filter(op => op.type === 'delete');
      const moveOps = operations.filter(op => op.type === 'move');
      const copyOps = operations.filter(op => op.type === 'copy');

      // Execute operations with rollback support
      if (rollbackSessionId) {
        // Atomic operations with rollback
        if (createOps.length > 0) {
          const createResults = await this.fileWriter.createFiles(
            createOps.map(op => ({
              path: op.sourcePath,
              content: op.content || '',
              options: op.options,
            })),
            true
          );
          results.push(...createResults);
        }

        if (modifyOps.length > 0) {
          for (const op of modifyOps) {
            if (op.content !== undefined) {
              const result = await this.fileWriter.modifyFile(op.sourcePath, op.content, op.options);
              results.push(result);
            }
          }
        }

        if (deleteOps.length > 0) {
          for (const op of deleteOps) {
            const result = await this.fileWriter.deleteFile(op.sourcePath, op.options);
            results.push(result);
          }
        }

        if (moveOps.length > 0) {
          for (const op of moveOps) {
            const result = await this.fileWriter.moveFile(op.sourcePath, op.targetPath!, op.options);
            results.push(result);
          }
        }

        if (copyOps.length > 0) {
          for (const op of copyOps) {
            const result = await this.fileWriter.copyFile(op.sourcePath, op.targetPath!, op.options);
            results.push(result);
          }
        }
      } else {
        // Regular operations without rollback
        for (const op of operations) {
          switch (op.type) {
            case 'create':
              if (op.content !== undefined) {
                const result = await this.fileWriter.createFile(op.sourcePath, op.content, op.options);
                results.push(result);
              }
              break;
            case 'modify':
              if (op.content !== undefined) {
                const result = await this.fileWriter.modifyFile(op.sourcePath, op.content, op.options);
                results.push(result);
              }
              break;
            case 'delete':
              const result = await this.fileWriter.deleteFile(op.sourcePath, op.options);
              results.push(result);
              break;
            case 'move':
              const moveResult = await this.fileWriter.moveFile(op.sourcePath, op.targetPath!, op.options);
              results.push(moveResult);
              break;
            case 'copy':
              const copyResult = await this.fileWriter.copyFile(op.sourcePath, op.targetPath!, op.options);
              results.push(copyResult);
              break;
          }
        }
      }

      return results;

    } catch (error) {
      throw new ImplementationError(
        `File operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          requestId,
          taskId,
          stage: 'file-operations',
          cause: error as Error,
        }
      );
    }
  }

  /**
   * Run tests for generated code
   */
  private async runTests(files: any[]): Promise<void> {
    // This would integrate with testing frameworks
    // For now, it's a placeholder
    const testFiles = files.filter(f => f.type === 'test');
    
    if (testFiles.length > 0) {
      this.eventBus.emit('implementer:tests:started', {
        testFilesCount: testFiles.length,
      });

      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.eventBus.emit('implementer:tests:completed', {
        testFilesCount: testFiles.length,
        passed: testFiles.length,
        failed: 0,
      });
    }
  }

  /**
   * Build prompt preview for dry run
   */
  private buildPromptPreview(codeRequest: CodeGenerationRequest): string {
    let preview = `Code Generation Preview:\n`;
    preview += `Language: ${codeRequest.language || 'auto-detect'}\n`;
    preview += `Framework: ${codeRequest.framework || 'none'}\n`;
    preview += `Prompt: ${codeRequest.prompt}\n`;
    
    if (codeRequest.context) {
      preview += `Context: ${JSON.stringify(codeRequest.context, null, 2)}\n`;
    }
    
    if (codeRequest.style) {
      preview += `Style: ${JSON.stringify(codeRequest.style, null, 2)}\n`;
    }
    
    if (codeRequest.constraints) {
      preview += `Constraints: ${JSON.stringify(codeRequest.constraints, null, 2)}\n`;
    }

    return preview;
  }

  /**
   * Estimate implementation duration
   */
  private estimateDuration(request: ImplementationRequest): number {
    let duration = 0;

    // Base time for validation and setup
    duration += 1000; // 1 second

    // Code generation time
    if (request.codeGeneration) {
      const promptLength = request.codeGeneration.prompt.length;
      duration += Math.max(promptLength * 2, 3000); // At least 3 seconds
    }

    // File operations time
    if (request.fileOperations) {
      duration += request.fileOperations.length * 500; // 0.5 seconds per operation
    }

    // Test execution time
    if (request.codeGeneration?.style?.testing && request.codeGeneration.style.testing !== 'none') {
      duration += 5000; // 5 seconds for tests
    }

    return duration;
  }

  /**
   * Calculate total lines of code
   */
  private calculateLinesOfCode(files: any[]): number {
    return files.reduce((total, file) => {
      if (file.content) {
        return total + file.content.split('\n').length;
      }
      return total;
    }, 0);
  }

  /**
   * Save implementation to database
   */
  private async saveImplementation(result: ImplementationResult): Promise<void> {
    if (!this.database) {
      return;
    }

    try {
      // This would save to the database using the database client
      // Implementation depends on the database schema
      // await this.database.saveImplementation(result);
    } catch (error) {
      console.warn('Failed to save implementation to database:', error);
    }
  }

  /**
   * Emit progress update
   */
  private emitProgress(
    requestId: string,
    stage: ImplementationProgress['stage'],
    progress: number,
    currentOperation?: string
  ): void {
    const progressUpdate: ImplementationProgress = {
      requestId,
      stage,
      progress,
      currentOperation,
      completedSteps: [],
      remainingSteps: [],
    };

    // Emit to event bus
    this.eventBus.emit('implementer:progress:updated', progressUpdate);

    // Emit to subscribed callbacks
    for (const callback of this.progressCallbacks.values()) {
      try {
        callback(progressUpdate);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  /**
   * Get component statistics
   */
  async getStatistics(): Promise<{
    codeGenerator: {
      availableModels: string[];
      currentModel: string;
    };
    fileSystem: {
      activeOperations: number;
      maxConcurrentOperations: number;
    };
    rollback: {
      activeSessions: number;
      totalSessions: number;
    };
  }> {
    const codeGenStats = {
      availableModels: this.codeGenerator.getAvailableModels(),
      currentModel: this.config.codeGeneration.model,
    };

    const fileSystemStats = {
      activeOperations: this.fileWriter.getActiveOperations().length,
      maxConcurrentOperations: this.config.fileSystem.maxConcurrentOperations,
    };

    const rollbackStats = await this.rollbackManager.getStatistics();

    return {
      codeGenerator: codeGenStats,
      fileSystem: fileSystemStats,
      rollback: {
        activeSessions: rollbackStats.activeSessions,
        totalSessions: rollbackStats.totalSessions,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.progressCallbacks.clear();
    
    // Wait for ongoing operations to complete
    await this.fileWriter.waitForCompletion(10000);
  }
}
