/**
 * Error Handler
 * 
 * Centralized error handling and recovery for the orchestrator.
 * Handles error classification, recovery strategies, and error reporting.
 */

import { Logger } from '../core/logger';
import { WorkflowContext, WorkflowError, WorkflowStep } from './types';

export class ErrorHandler {
  private readonly logger = new Logger('ErrorHandler');
  private readonly config: {
    maxRetries: number;
    timeoutMs: number;
    enableRecovery: boolean;
    validateIntermediateResults: boolean;
  };

  // Error patterns and their recovery strategies
  private readonly recoveryStrategies = new Map<string, () => Promise<void>>();
  
  constructor(config: {
    maxRetries: number;
    timeoutMs: number;
    enableRecovery: boolean;
    validateIntermediateResults: boolean;
  }) {
    this.config = config;
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle an error in the workflow
   */
  async handleError(error: Error, context: WorkflowContext | null): Promise<{ 
    recovered: boolean; 
    shouldRetry: boolean;
    strategy?: string;
  }> {
    const errorInfo = this.classifyError(error);
    
    this.logger.error(`Handling error: ${errorInfo.code}`, {
      message: error.message,
      code: errorInfo.code,
      recoverable: errorInfo.recoverable,
      context: context?.workflowId
    });

    // Add error to context if available
    if (context) {
      const workflowError: WorkflowError = {
        step: context.currentStep,
        message: error.message,
        code: errorInfo.code,
        details: {
          stack: error.stack,
          ...errorInfo.details
        },
        timestamp: new Date(),
        recoverable: errorInfo.recoverable
      };

      context.metadata.errors.push(workflowError);
      context.metadata.lastUpdateTime = new Date();
    }

    // Check if error is recoverable
    if (!errorInfo.recoverable || !this.config.enableRecovery) {
      return { 
        recovered: false, 
        shouldRetry: false 
      };
    }

    // Try to recover
    const recoveryResult = await this.attemptRecovery(errorInfo, context);
    
    return {
      recovered: recoveryResult.success,
      shouldRetry: recoveryResult.success && recoveryResult.retryRecommended,
      strategy: recoveryResult.strategy
    };
  }

  /**
   * Check if an error is recoverable
   */
  isRecoverable(error: Error): boolean {
    const errorInfo = this.classifyError(error);
    return errorInfo.recoverable && this.config.enableRecovery;
  }

  /**
   * Get error severity level
   */
  getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const errorInfo = this.classifyError(error);
    return errorInfo.severity;
  }

  /**
   * Get error category
   */
  getErrorCategory(error: Error): 'validation' | 'network' | 'filesystem' | 'component' | 'workflow' | 'unknown' {
    const errorInfo = this.classifyError(error);
    return errorInfo.category;
  }

  /**
   * Create user-friendly error message
   */
  createUserMessage(error: Error, context?: WorkflowContext): string {
    const errorInfo = this.classifyError(error);
    
    const baseMessage = this.getBaseMessageForError(errorInfo);
    const contextInfo = this.getContextInfo(errorInfo, context);
    
    return `${baseMessage}${contextInfo ? `\n${contextInfo}` : ''}`;
  }

  /**
   * Retry error with exponential backoff
   */
  async retryWithBackoff(
    fn: () => Promise<any>, 
    maxRetries: number = this.config.maxRetries,
    baseDelayMs: number = 1000
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break; // Last attempt failed, exit loop
        }
        
        if (!this.isRecoverable(lastError)) {
          throw lastError; // Non-recoverable error, don't retry
        }
        
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(errors: WorkflowError[]): {
    total: number;
    byStep: Record<string, number>;
    byCategory: Record<string, number>;
    recoverable: number;
    unrecoverable: number;
  } {
    const byStep: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let recoverable = 0;
    let unrecoverable = 0;
    
    for (const error of errors) {
      byStep[error.step] = (byStep[error.step] || 0) + 1;
      
      const errorInfo = this.classifyError(new Error(error.message));
      byCategory[errorInfo.category] = (byCategory[errorInfo.category] || 0) + 1;
      
      if (error.recoverable) {
        recoverable++;
      } else {
        unrecoverable++;
      }
    }
    
    return {
      total: errors.length,
      byStep,
      byCategory,
      recoverable,
      unrecoverable
    };
  }

  /**
   * Classify error and determine recovery strategy
   */
  private classifyError(error: Error): {
    code: string;
    category: 'validation' | 'network' | 'filesystem' | 'component' | 'workflow' | 'unknown';
    recoverable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
  } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('timeout') || message.includes('network') || message.includes('connection')) {
      return {
        code: 'NETWORK_ERROR',
        category: 'network',
        recoverable: true,
        severity: 'medium',
        details: { timeout: message.includes('timeout') }
      };
    }

    // File system errors
    if (message.includes('enoent') || message.includes('permission') || message.includes('disk')) {
      return {
        code: 'FILESYSTEM_ERROR',
        category: 'filesystem',
        recoverable: false,
        severity: 'high',
        details: { operation: stack.includes('read') ? 'read' : 'write' }
      };
    }

    // Component errors
    if (message.includes('component') || message.includes('initialization')) {
      return {
        code: 'COMPONENT_ERROR',
        category: 'component',
        recoverable: true,
        severity: 'high',
        details: { componentType: 'orchestrator' }
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        code: 'VALIDATION_ERROR',
        category: 'validation',
        recoverable: false,
        severity: 'medium',
        details: { field: 'unknown' }
      };
    }

    // Workflow errors
    if (message.includes('workflow') || message.includes('step') || message.includes('context')) {
      return {
        code: 'WORKFLOW_ERROR',
        category: 'workflow',
        recoverable: true,
        severity: 'medium',
        details: { workflowPhase: 'execution' }
      };
    }

    // Unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      category: 'unknown',
      recoverable: true,
      severity: 'low',
      details: { originalMessage: error.message }
    };
  }

  /**
   * Attempt to recover from error
   */
  private async attemptRecovery(
    errorInfo: any, 
    context: WorkflowContext | null
  ): Promise<{ success: boolean; strategy?: string; retryRecommended: boolean }> {
    const strategyKey = `${errorInfo.category}_${errorInfo.code}`;
    
    if (this.recoveryStrategies.has(strategyKey)) {
      try {
        this.logger.debug(`Attempting recovery with strategy: ${strategyKey}`);
        await this.recoveryStrategies.get(strategyKey)!();
        
        return {
          success: true,
          strategy: strategyKey,
          retryRecommended: true
        };
      } catch (recoveryError) {
        this.logger.warn(`Recovery strategy ${strategyKey} failed`, recoveryError);
        return {
          success: false,
          strategy: strategyKey,
          retryRecommended: false
        };
      }
    }

    // Default recovery strategy
    return {
      success: false,
      retryRecommended: errorInfo.recoverable
    };
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set('network_NETWORK_ERROR', async () => {
      // Implement network error recovery (e.g., retry with different endpoint)
      this.logger.debug('Applying network error recovery strategy');
    });

    // Component error recovery
    this.recoveryStrategies.set('component_COMPONENT_ERROR', async () => {
      // Implement component error recovery (e.g., reinitialize component)
      this.logger.debug('Applying component error recovery strategy');
    });

    // Workflow error recovery
    this.recoveryStrategies.set('workflow_WORKFLOW_ERROR', async () => {
      // Implement workflow error recovery (e.g., reset workflow state)
      this.logger.debug('Applying workflow error recovery strategy');
    });
  }

  /**
   * Get base message for error type
   */
  private getBaseMessageForError(errorInfo: any): string {
    switch (errorInfo.category) {
      case 'validation':
        return `Validation Error: ${errorInfo.code}`;
      case 'network':
        return `Network Error: ${errorInfo.code}`;
      case 'filesystem':
        return `File System Error: ${errorInfo.code}`;
      case 'component':
        return `Component Error: ${errorInfo.code}`;
      case 'workflow':
        return `Workflow Error: ${errorInfo.code}`;
      default:
        return `Error: ${errorInfo.code}`;
    }
  }

  /**
   * Get context information for error
   */
  private getContextInfo(errorInfo: any, context?: WorkflowContext | null): string {
    if (!context) {
      return '';
    }

    return `Context: Workflow ${context.workflowId}, Step: ${context.currentStep}`;
  }
}