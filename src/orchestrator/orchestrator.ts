/**
 * Main Orchestrator class
 * 
 * Coordinates the workflow between Input Parser, Project Analyzer, and Planner.
 * Provides workflow management, error handling, component initialization, and session management.
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logger';
import { OrchestratorConfig, WorkflowContext, WorkflowResult, WorkflowStep, SessionState } from './types';
import { ComponentRegistry } from './component-registry';
import { WorkflowManager } from './workflow-manager';
import { SessionManager } from './session-manager';
import { ErrorHandler } from './error-handler';
import { ComponentAdapter } from './component-adapter';
import { ComponentCoordinator } from './component-coordinator';
import { Implementer } from './implementer';
import { Reviewer } from './reviewer';
import { OrchestratorComponent } from './types';

export class Orchestrator extends EventEmitter {
  private readonly logger: Logger;
  private readonly config: OrchestratorConfig;
  private readonly componentRegistry: ComponentRegistry;
  private readonly workflowManager: WorkflowManager;
  private readonly sessionManager: SessionManager;
  private readonly errorHandler: ErrorHandler;
  private readonly componentCoordinator: ComponentCoordinator;
  private readonly components: Map<string, OrchestratorComponent> = new Map();
  private implementer?: Implementer;
  private reviewer?: Reviewer;
  private isInitialized = false;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.logger = new Logger('Orchestrator');
    this.componentRegistry = new ComponentRegistry();
    this.workflowManager = new WorkflowManager(this.config.workflow);
    this.sessionManager = new SessionManager(this.config.session);
    this.errorHandler = new ErrorHandler(this.config.workflow);
    this.componentCoordinator = new ComponentCoordinator();
    
    // Enable detailed logging in debug mode
    if (this.config.logging.level === 'debug') {
      this.setMaxListeners(0); // Allow unlimited listeners for debugging
    }
  }

  /**
   * Initialize the orchestrator and all components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Orchestrator is already initialized');
    }

    try {
      this.logger.info('Initializing Orchestrator...');

      // Register built-in components
      await this.registerBuiltInComponents();

      // Initialize components
      await this.initializeComponents();

      // Initialize managers
      await this.sessionManager.initialize();
      await this.workflowManager.initialize();

      this.isInitialized = true;
      this.logger.info('Orchestrator initialized successfully');

      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Orchestrator', error);
      throw error;
    }
  }

  /**
   * Execute a workflow with the given input
   */
  async executeWorkflow(input: any, sessionId?: string): Promise<WorkflowResult> {
    this.ensureInitialized();

    try {
      // Create or get session
      const activeSessionId = sessionId || await this.sessionManager.createSession();
      this.logger.info(`Executing workflow in session ${activeSessionId}`);

      // Create workflow context
      const context = await this.workflowManager.createContext(input, activeSessionId);

      // Emit workflow start event
      this.emit('workflow:start', { context });

      // Execute workflow pipeline
      const result = await this.executeWorkflowPipeline(context);

      // Emit workflow complete event
      this.emit('workflow:complete', { result, context });

      // Update session
      await this.sessionManager.updateSessionActivity(activeSessionId);

      return result;
    } catch (error) {
      this.logger.error('Workflow execution failed', error);
      await this.errorHandler.handleError(error, context || null);
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): SessionState[] {
    this.ensureInitialized();
    return this.sessionManager.getActiveSessions();
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | null {
    this.ensureInitialized();
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    this.ensureInitialized();
    
    await this.sessionManager.terminateSession(sessionId);
    this.logger.info(`Session ${sessionId} terminated`);
    
    this.emit('session:terminated', { sessionId });
  }

  /**
   * Register a component with the orchestrator
   */
  async registerComponent(component: OrchestratorComponent): Promise<void> {
    this.ensureInitialized();
    
    this.components.set(component.name, component);
    await component.initialize(this.config);
    
    this.logger.info(`Component ${component.name} registered`);
    this.emit('component:registered', { component: component.name });
  }

  /**
   * Get component by name
   */
  getComponent(name: string): OrchestratorComponent | undefined {
    return this.components.get(name);
  }

  /**
   * Get orchestrator health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    components: Record<string, any>;
    sessions: any;
  }> {
    this.ensureInitialized();

    const componentHealth: Record<string, any> = {};
    let allHealthy = true;

    // Check component health
    for (const [name, component] of this.components.entries()) {
      try {
        const health = await component.healthCheck();
        componentHealth[name] = health;
        if (!health.healthy) {
          allHealthy = false;
        }
      } catch (error) {
        componentHealth[name] = { healthy: false, error: error.message };
        allHealthy = false;
      }
    }

    // Check session manager health
    const sessionStats = this.sessionManager.getStatistics();

    return {
      healthy: allHealthy,
      components: componentHealth,
      sessions: sessionStats
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Orchestrator...');

    // Cleanup new components
    if (this.implementer) {
      await this.implementer.cleanup();
    }
    if (this.reviewer) {
      await this.reviewer.cleanup();
    }

    // Cleanup component coordinator
    await this.componentCoordinator.cleanup();

    // Cleanup components
    for (const component of this.components.values()) {
      try {
        await component.cleanup();
      } catch (error) {
        this.logger.warn(`Failed to cleanup component ${component.name}`, error);
      }
    }

    // Cleanup managers
    await this.workflowManager.cleanup();
    await this.sessionManager.cleanup();

    this.isInitialized = false;
    this.logger.info('Orchestrator cleanup complete');

    this.emit('cleanup');
  }

  /**
   * Execute the main workflow pipeline
   */
  private async executeWorkflowPipeline(context: WorkflowContext): Promise<WorkflowResult> {
    const workflowId = context.workflowId;
    
    try {
      this.logger.debug(`Starting workflow pipeline ${workflowId}`);

      // Step 1: Input Parsing
      context = await this.executeStep(
        WorkflowStep.INPUT_PARSING,
        context,
        async (ctx) => {
          const inputParser = this.components.get('InputParser');
          if (!inputParser) {
            throw new Error('Input parser not found');
          }
          
          const parsedInput = await (inputParser as any).parseRequest(ctx.input.command, {
            projectPath: ctx.input.context?.workingDirectory,
            sessionId: ctx.sessionId,
            timestamp: new Date(),
            source: 'orchestrator'
          });
          
          return { parsedInput };
        }
      );

      // Step 2: Project Analysis
      context = await this.executeStep(
        WorkflowStep.PROJECT_ANALYSIS,
        context,
        async (ctx) => {
          const projectAnalyzer = this.components.get('ProjectAnalyzer');
          if (!projectAnalyzer) {
            throw new Error('Project analyzer not found');
          }
          
          const analysis = await (projectAnalyzer as any).analyzeProject(ctx.input.context?.workingDirectory || process.cwd());
          return { analysis };
        }
      );

      // Step 3: Planning
      context = await this.executeStep(
        WorkflowStep.PLANNING,
        context,
        async (ctx) => {
          const planner = this.components.get('BasicPlanner');
          if (!planner) {
            throw new Error('Planner not found');
          }
          
          const plan = await planner.execute({
            parsedInput: ctx.parsedInput,
            analysis: ctx.analysis
          }, ctx);
          
          return { planning: plan };
        }
      );

      // Step 4: User Approval (NEW)
      context = await this.executeStep(
        WorkflowStep.USER_APPROVAL, // We need to add this to the enum
        context,
        async (ctx) => {
          const approvalResult = await this.requestUserApproval(ctx);
          return { userApproval: approvalResult };
        }
      );

      // Step 5: Implementation (NEW)
      context = await this.executeStep(
        WorkflowStep.IMPLEMENTATION,
        context,
        async (ctx) => {
          if (!this.implementer) {
            throw new Error('Implementer component not available');
          }

          // Check if user approval was granted
          if (!ctx.userApproval?.granted) {
            throw new Error('Implementation blocked: user approval not granted');
          }

          const implementationContext = {
            plan: ctx.planning?.plan,
            analysis: ctx.analysis,
            parsedInput: ctx.parsedInput,
            workspacePath: ctx.input.context?.workingDirectory || process.cwd(),
            sessionId: ctx.sessionId,
            userApproval: ctx.userApproval
          };

          const implementation = await this.implementer.execute(implementationContext, ctx);
          return { implementation };
        }
      );

      // Step 6: Review (NEW)
      context = await this.executeStep(
        WorkflowStep.REVIEW,
        context,
        async (ctx) => {
          if (!this.reviewer) {
            throw new Error('Reviewer component not available');
          }

          const reviewContext = {
            implementationId: ctx.implementation?.implementationId,
            implementationResults: ctx.implementation?.results || [],
            plan: ctx.planning?.plan,
            analysis: ctx.analysis,
            parsedInput: ctx.parsedInput,
            workspacePath: ctx.input.context?.workingDirectory || process.cwd(),
            sessionId: ctx.sessionId,
            reviewConfig: {
              strictMode: false,
              autoFixEnabled: false,
              qualityThreshold: 70,
              requiredChecks: ['codeStyle', 'security', 'standardsCompliance']
            }
          };

          const review = await this.reviewer.execute(reviewContext, ctx);
          return { review };
        }
      );

      // Build final result
      const result: WorkflowResult = {
        workflowId: context.workflowId,
        status: 'completed',
        results: {
          input: context.input,
          analysis: context.analysis,
          plan: context.planning?.plan,
          implementation: context.implementation,
          review: context.review
        },
        summary: this.workflowManager.calculateSummary(context),
        errors: context.metadata.errors
      };

      this.logger.info(`Workflow ${workflowId} completed successfully`);
      return result;

    } catch (error) {
      // Mark workflow as failed
      const result: WorkflowResult = {
        workflowId: workflowId,
        status: 'failed',
        results: {
          input: context.input,
          analysis: context.analysis,
          plan: context.planning?.plan,
          implementation: context.implementation,
          review: context.review
        },
        summary: this.workflowManager.calculateSummary(context),
        errors: context.metadata.errors
      };

      this.logger.error(`Workflow ${workflowId} failed`, error);
      return result;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep<T>(
    step: WorkflowStep,
    context: WorkflowContext,
    stepExecutor: (context: WorkflowContext) => Promise<T>
  ): Promise<WorkflowContext> {
    this.logger.debug(`Executing step: ${step}`);

    const stepHistory = {
      step,
      startTime: new Date(),
      status: 'running' as const
    };

    try {
      // Add step to history
      context.metadata.stepHistory.push(stepHistory);
      context.currentStep = step;

      // Execute step
      const result = await stepExecutor(context);

      // Update step history
      stepHistory.endTime = new Date();
      stepHistory.status = 'completed';
      stepHistory.result = result;
      stepHistory.durationMs = stepHistory.endTime.getTime() - stepHistory.startTime.getTime();

      // Merge result into context
      context = { ...context, ...result };
      context.metadata.lastUpdateTime = new Date();

      this.logger.debug(`Step ${step} completed in ${stepHistory.durationMs}ms`);
      return context;

    } catch (error) {
      // Update step history with error
      stepHistory.endTime = new Date();
      stepHistory.status = 'failed';
      stepHistory.error = {
        step,
        message: error.message,
        code: error.code || 'STEP_ERROR',
        details: error.details,
        timestamp: new Date(),
        recoverable: this.errorHandler.isRecoverable(error)
      };
      stepHistory.durationMs = stepHistory.endTime.getTime() - stepHistory.startTime.getTime();

      // Add error to context
      context.metadata.errors.push(stepHistory.error!);
      context.metadata.lastUpdateTime = new Date();

      this.logger.error(`Step ${step} failed`, error);

      // Check if error is recoverable
      if (this.errorHandler.isRecoverable(error) && this.config.workflow.enableRecovery) {
        this.logger.info(`Attempting to recover from step ${step} failure`);
        // TODO: Implement recovery logic
      }

      throw error;
    }
  }

  /**
   * Request user approval for the plan
   */
  private async requestUserApproval(context: WorkflowContext): Promise<any> {
    this.logger.info('Requesting user approval for plan');

    // Emit approval request event
    this.emit('approval:requested', { 
      workflowId: context.workflowId,
      plan: context.planning?.plan 
    });

    // Simulate user approval for now
    // In a real implementation, this would:
    // 1. Present the plan to the user
    // 2. Show potential changes and risks
    // 3. Wait for user response
    // 4. Handle approval/rejection/timeout

    try {
      // Simulate approval decision (in real implementation, this would be user input)
      const approvalResult = await this.simulateUserApproval(context);
      
      // Emit approval response event
      this.emit('approval:response', { 
        workflowId: context.workflowId,
        approval: approvalResult 
      });

      return approvalResult;
    } catch (error) {
      this.logger.error('User approval failed', error);
      throw new Error(`User approval failed: ${error.message}`);
    }
  }

  /**
   * Simulate user approval (placeholder for real implementation)
   */
  private async simulateUserApproval(context: WorkflowContext): Promise<any> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const plan = context.planning?.plan;
    if (!plan) {
      throw new Error('No plan available for approval');
    }

    // Generate approval details
    const approvalDetails = {
      plan,
      complexity: plan.estimatedEffort?.complexity || 'moderate',
      estimatedDuration: plan.estimatedEffort?.duration || '1-2 hours',
      risks: plan.risks || [],
      changes: this.generateApprovalChanges(plan)
    };

    // For demonstration, auto-approve simple plans, request approval for complex ones
    const shouldAutoApprove = plan.steps.length <= 3 && 
                             (!plan.risks || plan.risks.length === 0);

    if (shouldAutoApprove) {
      this.logger.info('Plan auto-approved due to simplicity');
      return {
        status: 'approved',
        details: approvalDetails,
        metadata: {
          requestedAt: new Date(),
          respondedAt: new Date(),
          approver: 'system',
          timeoutMs: 30000
        }
      };
    }

    // In real implementation, this would wait for user input
    // For now, we'll simulate a user approval after a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'approved',
          details: approvalDetails,
          metadata: {
            requestedAt: new Date(),
            respondedAt: new Date(),
            approver: 'demo_user',
            timeoutMs: 30000
          }
        });
      }, 2000);
    });
  }

  /**
   * Generate approval changes based on plan
   */
  private generateApprovalChanges(plan: any): any[] {
    const changes = [];

    for (const step of plan.steps) {
      if (step.type === 'development') {
        changes.push({
          description: `Implement ${step.title}`,
          type: 'code_generation',
          paths: [`generated_${step.stepId}.ts`],
          impact: 'medium',
          risk: 'low'
        });
      } else if (step.type === 'documentation') {
        changes.push({
          description: `Create documentation for ${step.title}`,
          type: 'file_creation',
          paths: ['documentation.md'],
          impact: 'low',
          risk: 'low'
        });
      }
    }

    return changes;
  }

  /**
   * Register built-in components with the orchestrator
   */
  private async registerBuiltInComponents(): Promise<void> {
    try {
      // Create basic planner
      const { BasicPlanner } = await import('./basic-planner');

      // Create adapters for existing components to match OrchestratorComponent interface
      const inputParserAdapter = new ComponentAdapter('InputParser', '1.0.0', {
        initialize: async () => {},
        execute: async (input: any, context: any) => {
          // This will be called through the orchestrator's workflow pipeline
          return input;
        },
        cleanup: async () => {},
        healthCheck: async () => ({ healthy: true, status: 'healthy', lastCheck: new Date() })
      });

      const projectAnalyzerAdapter = new ComponentAdapter('ProjectAnalyzer', '1.0.0', {
        initialize: async () => {},
        execute: async (input: any, context: any) => {
          // This will be called through the orchestrator's workflow pipeline
          return input;
        },
        cleanup: async () => {},
        healthCheck: async () => ({ healthy: true, status: 'healthy', lastCheck: new Date() })
      });

      // Register components
      this.components.set('InputParser', inputParserAdapter);
      this.components.set('ProjectAnalyzer', projectAnalyzerAdapter);
      this.components.set('BasicPlanner', new BasicPlanner());
      
      // Initialize new components
      await this.initializeNewComponents();

      this.logger.info('Built-in components registered successfully');
    } catch (error) {
      this.logger.warn('Some built-in components not yet available', error);
    }
  }

  /**
   * Initialize new components (Implementer, Reviewer)
   */
  private async initializeNewComponents(): Promise<void> {
    try {
      // Initialize Implementer
      this.implementer = new Implementer(this.componentCoordinator);
      await this.implementer.initialize(this.config);
      this.components.set('Implementer', this.implementer);

      // Initialize Reviewer
      this.reviewer = new Reviewer(this.componentCoordinator);
      await this.reviewer.initialize(this.config);
      this.components.set('Reviewer', this.reviewer);

      this.logger.info('New components initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize some new components', error);
    }
  }

  /**
   * Initialize all registered components
   */
  private async initializeComponents(): Promise<void> {
    for (const component of this.components.values()) {
      try {
        await component.initialize(this.config);
        this.logger.debug(`Component ${component.name} initialized`);
      } catch (error) {
        this.logger.error(`Failed to initialize component ${component.name}`, error);
        throw error;
      }
    }
  }

  /**
   * Ensure orchestrator is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Orchestrator is not initialized. Call initialize() first.');
    }
  }
}