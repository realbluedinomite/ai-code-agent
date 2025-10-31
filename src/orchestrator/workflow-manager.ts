/**
 * Workflow Manager
 * 
 * Manages workflow execution, state tracking, and lifecycle.
 * Handles workflow context creation, step execution, and result aggregation.
 */

import { Logger } from '../core/logger';
import { 
  WorkflowContext, 
  WorkflowInput, 
  WorkflowStep, 
  WorkflowStepHistory,
  WorkflowResult,
  WorkflowError
} from './types';

export class WorkflowManager {
  private readonly logger = new Logger('WorkflowManager');
  private readonly activeWorkflows = new Map<string, WorkflowContext>();
  private readonly workflowHistory = new Map<string, WorkflowResult>();
  private readonly config: {
    maxRetries: number;
    timeoutMs: number;
    enableRecovery: boolean;
    validateIntermediateResults: boolean;
  };

  constructor(config: {
    maxRetries: number;
    timeoutMs: number;
    enableRecovery: boolean;
    validateIntermediateResults: boolean;
  }) {
    this.config = config;
  }

  /**
   * Initialize the workflow manager
   */
  async initialize(): Promise<void> {
    this.logger.info('WorkflowManager initialized');
  }

  /**
   * Create a new workflow context
   */
  async createContext(input: WorkflowInput, sessionId: string): Promise<WorkflowContext> {
    const workflowId = this.generateWorkflowId();
    
    const context: WorkflowContext = {
      workflowId,
      sessionId,
      currentStep: WorkflowStep.INPUT_PARSING,
      input,
      metadata: {
        startTime: new Date(),
        lastUpdateTime: new Date(),
        stepHistory: [],
        errors: [],
        warnings: []
      }
    };

    this.activeWorkflows.set(workflowId, context);
    this.logger.debug(`Created workflow context: ${workflowId}`);
    
    return context;
  }

  /**
   * Get workflow context by ID
   */
  getWorkflow(workflowId: string): WorkflowContext | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  /**
   * Update workflow context
   */
  updateWorkflow(context: WorkflowContext): void {
    context.metadata.lastUpdateTime = new Date();
    this.activeWorkflows.set(context.workflowId, context);
  }

  /**
   * Complete workflow and move to history
   */
  completeWorkflow(context: WorkflowContext, result: WorkflowResult): void {
    // Remove from active workflows
    this.activeWorkflows.delete(context.workflowId);
    
    // Add to history
    this.workflowHistory.set(context.workflowId, result);
    
    this.logger.debug(`Workflow ${context.workflowId} completed and moved to history`);
  }

  /**
   * Get workflow history
   */
  getWorkflowHistory(limit?: number): WorkflowResult[] {
    const history = Array.from(this.workflowHistory.values());
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get workflow by ID from history
   */
  getWorkflowFromHistory(workflowId: string): WorkflowResult | null {
    return this.workflowHistory.get(workflowId) || null;
  }

  /**
   * Get active workflows count
   */
  getActiveWorkflowsCount(): number {
    return this.activeWorkflows.size;
  }

  /**
   * Get workflow statistics
   */
  getStatistics(): {
    active: number;
    completed: number;
    failed: number;
    total: number;
    averageDuration: number;
  } {
    const completed = this.workflowHistory.filter(w => w.status === 'completed').length;
    const failed = this.workflowHistory.filter(w => w.status === 'failed').length;
    const durations = this.workflowHistory
      .filter(w => w.summary.totalDurationMs > 0)
      .map(w => w.summary.totalDurationMs);
    
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    return {
      active: this.activeWorkflows.size,
      completed,
      failed,
      total: this.workflowHistory.size,
      averageDuration
    };
  }

  /**
   * Add step to workflow history
   */
  addStepToHistory(context: WorkflowContext, step: WorkflowStep, status: 'started' | 'completed' | 'failed'): void {
    const existingIndex = context.metadata.stepHistory.findIndex(s => s.step === step);
    
    if (existingIndex >= 0) {
      // Update existing step
      const existingStep = context.metadata.stepHistory[existingIndex];
      if (status === 'started') {
        existingStep.startTime = new Date();
        existingStep.status = 'running';
      } else if (status === 'completed') {
        existingStep.endTime = new Date();
        existingStep.status = 'completed';
        existingStep.durationMs = existingStep.endTime.getTime() - existingStep.startTime.getTime();
      } else if (status === 'failed') {
        existingStep.endTime = new Date();
        existingStep.status = 'failed';
        existingStep.durationMs = existingStep.endTime.getTime() - existingStep.startTime.getTime();
      }
    } else {
      // Add new step
      const stepHistory: WorkflowStepHistory = {
        step,
        startTime: new Date(),
        status: status === 'started' ? 'running' : status === 'completed' ? 'completed' : 'failed'
      };
      
      if (status !== 'started') {
        stepHistory.endTime = new Date();
        stepHistory.durationMs = stepHistory.endTime.getTime() - stepHistory.startTime.getTime();
      }
      
      context.metadata.stepHistory.push(stepHistory);
    }
    
    this.updateWorkflow(context);
  }

  /**
   * Add error to workflow
   */
  addError(context: WorkflowContext, error: WorkflowError): void {
    context.metadata.errors.push(error);
    this.updateWorkflow(context);
    this.logger.debug(`Added error to workflow ${context.workflowId}: ${error.message}`);
  }

  /**
   * Add warning to workflow
   */
  addWarning(context: WorkflowContext, warning: any): void {
    context.metadata.warnings.push(warning);
    this.updateWorkflow(context);
    this.logger.debug(`Added warning to workflow ${context.workflowId}: ${warning.message}`);
  }

  /**
   * Calculate workflow summary
   */
  calculateSummary(context: WorkflowContext): {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDurationMs: number;
  } {
    const stepHistory = context.metadata.stepHistory;
    const completedSteps = stepHistory.filter(s => s.status === 'completed').length;
    const failedSteps = stepHistory.filter(s => s.status === 'failed').length;
    const totalDuration = stepHistory
      .filter(s => s.durationMs)
      .reduce((sum, step) => sum + (step.durationMs || 0), 0);

    return {
      totalSteps: stepHistory.length,
      completedSteps,
      failedSteps,
      totalDurationMs: totalDuration
    };
  }

  /**
   * Validate workflow context
   */
  validateContext(context: WorkflowContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.workflowId) {
      errors.push('Workflow ID is required');
    }

    if (!context.sessionId) {
      errors.push('Session ID is required');
    }

    if (!context.input) {
      errors.push('Workflow input is required');
    }

    if (!context.input.command) {
      errors.push('Workflow command is required');
    }

    if (context.metadata.errors.length > 0 && !this.config.enableRecovery) {
      errors.push('Workflow has errors and recovery is disabled');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean up expired workflows
   */
  cleanupExpiredWorkflows(): number {
    const now = Date.now();
    const timeoutMs = this.config.timeoutMs;
    let cleanedCount = 0;

    for (const [workflowId, context] of this.activeWorkflows.entries()) {
      const timeSinceUpdate = now - context.metadata.lastUpdateTime.getTime();
      
      if (timeSinceUpdate > timeoutMs) {
        this.activeWorkflows.delete(workflowId);
        cleanedCount++;
        this.logger.debug(`Cleaned up expired workflow: ${workflowId}`);
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired workflows`);
    }

    return cleanedCount;
  }

  /**
   * Get workflow progress percentage
   */
  getProgress(context: WorkflowContext): number {
    const totalSteps = Object.keys(WorkflowStep).length;
    const completedSteps = context.metadata.stepHistory.filter(s => s.status === 'completed').length;
    
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }

  /**
   * Check if workflow can proceed to next step
   */
  canProceedToNextStep(context: WorkflowContext, nextStep: WorkflowStep): { canProceed: boolean; reason?: string } {
    // Check if current step is completed
    if (context.currentStep) {
      const currentStepHistory = context.metadata.stepHistory.find(s => s.step === context.currentStep);
      if (!currentStepHistory || currentStepHistory.status !== 'completed') {
        return {
          canProceed: false,
          reason: `Current step ${context.currentStep} is not completed`
        };
      }
    }

    // Check for unrecovered errors
    const unrecoveredErrors = context.metadata.errors.filter(e => e.recoverable === false);
    if (unrecoveredErrors.length > 0) {
      return {
        canProceed: false,
        reason: 'Workflow has unrecovered errors'
      };
    }

    return { canProceed: true };
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `workflow_${timestamp}_${randomStr}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up WorkflowManager');
    
    // Clear all active workflows
    this.activeWorkflows.clear();
    
    // Clear workflow history
    this.workflowHistory.clear();
    
    this.logger.info('WorkflowManager cleanup complete');
  }
}