/**
 * Component Integration Module
 * 
 * Provides utilities for coordinating and integrating all AI agent components:
 * - Input Parser
 * - Project Analyzer
 * - Planner
 * - Orchestrator
 * 
 * Features:
 * - Component lifecycle management
 * - Workflow coordination
 * - Error handling and recovery
 * - State management across components
 * - Event-driven integration
 */

import { EventEmitter } from 'events';
import { AnalysisResult } from './project-analyzer/types';
import { InputParserOutput } from './input-parser/types';
import { PlanningResult } from './planner/types';
import { 
  WorkflowContext, 
  WorkflowResult, 
  WorkflowStep, 
  WorkflowError, 
  WorkflowWarning,
  WorkflowInput,
  PlannerResult,
  Plan
} from '../orchestrator/types';
import { Orchestrator } from '../orchestrator/orchestrator';
import { createDefaultLogger } from '../core/logger';
import { ConfigManager } from '../core/config';
import { TypedEventBus } from '../core/event-bus';

/**
 * Component integration status
 */
export enum IntegrationStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down'
}

/**
 * Component health information
 */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  errorCount: number;
  issues: string[];
}

/**
 * Component metrics
 */
export interface ComponentMetrics {
  componentName: string;
  executionCount: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  orchestrator: {
    maxRetries: number;
    timeoutMs: number;
    enableRecovery: boolean;
  };
  monitoring: {
    enableHealthChecks: boolean;
    enableMetrics: boolean;
    healthCheckInterval: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableWorkflowTracing: boolean;
  };
  workflow: {
    maxConcurrentWorkflows: number;
    enableStatePersistence: boolean;
  };
}

/**
 * Workflow execution result with component integration
 */
export interface IntegratedWorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'recovered';
  input: WorkflowInput;
  results: {
    parsed?: InputParserOutput;
    analyzed?: AnalysisResult;
    planned?: PlannerResult;
    implementation?: any;
    review?: any;
  };
  componentMetrics: ComponentMetrics[];
  errors: WorkflowError[];
  warnings: WorkflowWarning[];
  summary: {
    totalDurationMs: number;
    componentTimings: Record<string, number>;
    recoveryAttempts: number;
  };
}

/**
 * Main component integration coordinator
 */
export class ComponentIntegrator extends EventEmitter {
  private orchestrator: Orchestrator;
  private config: IntegrationConfig;
  private status: IntegrationStatus;
  private health: Map<string, ComponentHealth>;
  private metrics: Map<string, ComponentMetrics>;
  private configManager: ConfigManager;
  private eventBus: TypedEventBus;
  private logger = createDefaultLogger('component-integrator', 'integration', '1.0.0');

  constructor(config?: Partial<IntegrationConfig>) {
    super();
    
    this.config = this.mergeConfig(config);
    this.status = IntegrationStatus.UNINITIALIZED;
    this.health = new Map();
    this.metrics = new Map();
    
    // Initialize core components
    this.configManager = new ConfigManager();
    this.configManager.loadFromEnvironment('integration');
    
    this.eventBus = new TypedEventBus({ verbose: true });
    this.setupEventHandlers();
    
    // Initialize orchestrator
    this.orchestrator = new Orchestrator({
      workflow: {
        maxRetries: this.config.orchestrator.maxRetries,
        timeoutMs: this.config.orchestrator.timeoutMs,
        enableRecovery: this.config.orchestrator.enableRecovery,
        validateIntermediateResults: true
      },
      logging: {
        level: this.config.logging.level,
        enablePerformanceTracking: true,
        enableWorkflowTracing: this.config.logging.enableWorkflowTracing
      }
    });

    this.logger.info('ComponentIntegrator initialized', { config: this.config });
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    if (this.status !== IntegrationStatus.UNINITIALIZED) {
      throw new Error('Integrator already initialized');
    }

    this.status = IntegrationStatus.INITIALIZING;
    this.logger.info('Starting component initialization');

    try {
      // Initialize core components
      await this.initializeCoreComponents();
      
      // Register component health monitors
      if (this.config.monitoring.enableHealthChecks) {
        this.startHealthChecks();
      }

      // Start metrics collection
      if (this.config.monitoring.enableMetrics) {
        this.startMetricsCollection();
      }

      this.status = IntegrationStatus.READY;
      this.logger.info('Component initialization completed', { 
        status: this.status,
        components: Array.from(this.health.keys())
      });

      this.emit('initialized', { status: this.status });
    } catch (error) {
      this.status = IntegrationStatus.ERROR;
      this.logger.error('Component initialization failed', { error });
      this.emit('error', { error, phase: 'initialization' });
      throw error;
    }
  }

  /**
   * Execute complete workflow with all components
   */
  async executeWorkflow(input: WorkflowInput): Promise<IntegratedWorkflowResult> {
    if (this.status !== IntegrationStatus.READY) {
      throw new Error(`Integrator not ready: ${this.status}`);
    }

    const workflowId = this.generateId('workflow');
    this.logger.info('Starting workflow execution', { workflowId, input: input.command });

    const startTime = Date.now();
    const componentTimings: Record<string, number> = {};
    const componentMetrics: ComponentMetrics[] = [];
    const errors: WorkflowError[] = [];
    const warnings: WorkflowWarning[] = [];

    try {
      // Create workflow context
      const context: WorkflowContext = {
        workflowId,
        sessionId: this.generateId('session'),
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

      // Step 1: Input Parsing
      const parseStartTime = Date.now();
      let parsed: InputParserOutput | undefined;
      try {
        parsed = await this.executeInputParsing(input.command);
        componentTimings['input_parsing'] = Date.now() - parseStartTime;
        this.updateMetrics('input-parser', true);
        this.logger.info('Input parsing completed', { workflowId });
      } catch (error) {
        componentTimings['input_parsing'] = Date.now() - parseStartTime;
        this.updateMetrics('input-parser', false);
        const workflowError = this.createWorkflowError(WorkflowStep.INPUT_PARSING, error);
        errors.push(workflowError);
        
        if (!this.config.orchestrator.enableRecovery) {
          throw error;
        }
      }
      context.parsedInput = parsed;

      // Step 2: Project Analysis
      const analysisStartTime = Date.now();
      let analyzed: AnalysisResult | undefined;
      try {
        analyzed = await this.executeProjectAnalysis(input.projectPath, parsed);
        componentTimings['project_analysis'] = Date.now() - analysisStartTime;
        this.updateMetrics('project-analyzer', true);
        this.logger.info('Project analysis completed', { workflowId });
      } catch (error) {
        componentTimings['project_analysis'] = Date.now() - analysisStartTime;
        this.updateMetrics('project-analyzer', false);
        const workflowError = this.createWorkflowError(WorkflowStep.PROJECT_ANALYSIS, error);
        errors.push(workflowError);
        
        // Continue with degraded mode if recovery is enabled
        if (this.config.orchestrator.enableRecovery) {
          warnings.push({
            step: WorkflowStep.PROJECT_ANALYSIS,
            message: 'Project analysis failed, continuing without analysis',
            code: 'ANALYSIS_SKIPPED',
            details: error,
            timestamp: new Date()
          });
        } else {
          throw error;
        }
      }
      context.analysis = analyzed;

      // Step 3: Planning
      const planningStartTime = Date.now();
      let planned: PlannerResult | undefined;
      try {
        planned = await this.executePlanning(parsed, analyzed);
        componentTimings['planning'] = Date.now() - planningStartTime;
        this.updateMetrics('planner', true);
        this.logger.info('Planning completed', { workflowId });
      } catch (error) {
        componentTimings['planning'] = Date.now() - planningStartTime;
        this.updateMetrics('planner', false);
        const workflowError = this.createWorkflowError(WorkflowStep.PLANNING, error);
        errors.push(workflowError);
        throw error;
      }
      context.planning = planned;

      const result: IntegratedWorkflowResult = {
        workflowId,
        status: errors.length === 0 ? 'completed' : 'recovered',
        input,
        results: {
          parsed,
          analyzed,
          planned
        },
        componentMetrics: Array.from(this.metrics.values()),
        errors,
        warnings,
        summary: {
          totalDurationMs: Date.now() - startTime,
          componentTimings,
          recoveryAttempts: 0
        }
      };

      this.logger.info('Workflow completed', {
        workflowId,
        status: result.status,
        duration: result.summary.totalDurationMs
      });

      this.emit('workflow:completed', result);
      return result;

    } catch (error) {
      const result: IntegratedWorkflowResult = {
        workflowId,
        status: 'failed',
        input,
        results: {},
        componentMetrics: Array.from(this.metrics.values()),
        errors,
        warnings,
        summary: {
          totalDurationMs: Date.now() - startTime,
          componentTimings,
          recoveryAttempts: 0
        }
      };

      this.logger.error('Workflow failed', { workflowId, error });
      this.emit('workflow:failed', result);
      return result;
    }
  }

  /**
   * Execute input parsing component
   */
  private async executeInputParsing(command: string): Promise<InputParserOutput> {
    const { InputParser } = await import('./input-parser/input-parser');
    const parser = new InputParser();
    
    return parser.parse(command);
  }

  /**
   * Execute project analysis component
   */
  private async executeProjectAnalysis(
    projectPath?: string,
    parsed?: InputParserOutput
  ): Promise<AnalysisResult> {
    if (!projectPath) {
      throw new Error('Project path required for analysis');
    }

    const { ProjectAnalyzer } = await import('./project-analyzer/project-analyzer');
    const analyzer = new ProjectAnalyzer();
    
    return analyzer.analyzeProject(projectPath);
  }

  /**
   * Execute planning component
   */
  private async executePlanning(
    parsed?: InputParserOutput,
    analyzed?: AnalysisResult
  ): Promise<PlannerResult> {
    const { Planner } = await import('./planner/planner');
    const planner = new Planner();
    
    const planningInput = {
      description: parsed?.parsed?.description || 'No description',
      requirements: parsed?.parsed?.requirements || [],
      constraints: parsed?.parsed?.constraints || [],
      context: {
        projectType: 'other' as any,
        technologyStack: undefined,
        teamSize: undefined,
        deadline: undefined,
        budget: undefined,
        riskTolerance: 'medium' as any,
        qualityRequirements: 'standard' as any,
        existingCodebase: analyzed
      },
      preferences: {
        methodology: 'hybrid' as any,
        taskSize: 'medium' as any,
        priorityStrategy: 'dependency_first' as any,
        resourceAllocation: 'moderate' as any,
        communicationStyle: 'collaborative' as any
      },
      metadata: {}
    };

    return planner.createExecutionPlan(planningInput, analyzed);
  }

  /**
   * Get component health status
   */
  async getComponentHealth(): Promise<Map<string, ComponentHealth>> {
    return new Map(this.health);
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(): Map<string, ComponentMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get integration status
   */
  getStatus(): IntegrationStatus {
    return this.status;
  }

  /**
   * Shutdown integrator and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.status === IntegrationStatus.SHUTTING_DOWN || this.status === IntegrationStatus.UNINITIALIZED) {
      return;
    }

    this.status = IntegrationStatus.SHUTTING_DOWN;
    this.logger.info('Starting component integrator shutdown');

    try {
      await this.orchestrator.cleanup();
      this.health.clear();
      this.metrics.clear();
      
      this.status = IntegrationStatus.UNINITIALIZED;
      this.logger.info('Component integrator shutdown completed');
      
      this.emit('shutdown');
    } catch (error) {
      this.status = IntegrationStatus.ERROR;
      this.logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Initialize core components
   */
  private async initializeCoreComponents(): Promise<void> {
    const components = ['input-parser', 'project-analyzer', 'planner'];
    
    for (const component of components) {
      const health: ComponentHealth = {
        name: component,
        status: 'healthy',
        lastCheck: new Date(),
        errorCount: 0,
        issues: []
      };
      
      this.health.set(component, health);
      this.metrics.set(component, {
        componentName: component,
        executionCount: 0,
        successCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      });
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        for (const [componentName, health] of this.health) {
          const checkStart = Date.now();
          try {
            await this.performHealthCheck(componentName);
            health.status = 'healthy';
            health.responseTime = Date.now() - checkStart;
            health.lastCheck = new Date();
            health.issues = health.issues.filter(issue => !issue.includes('health check'));
          } catch (error) {
            health.status = 'unhealthy';
            health.responseTime = Date.now() - checkStart;
            health.lastCheck = new Date();
            health.issues.push(`Health check failed: ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.error('Health check error', { error });
      }
    }, this.config.monitoring.healthCheckInterval);
  }

  /**
   * Perform health check for a component
   */
  private async performHealthCheck(componentName: string): Promise<void> {
    switch (componentName) {
      case 'input-parser':
        // Test input parser with simple command
        const { InputParser } = await import('./input-parser/input-parser');
        const parser = new InputParser();
        await parser.parse('test command');
        break;
        
      case 'project-analyzer':
        // Skip actual analysis in health check
        break;
        
      case 'planner':
        // Test planner with minimal input
        const { Planner } = await import('./planner/planner');
        const planner = new Planner();
        await planner.createExecutionPlan({
          description: 'health check',
          requirements: [],
          constraints: [],
          context: {
            projectType: 'other' as any,
            riskTolerance: 'medium' as any,
            qualityRequirements: 'standard' as any
          },
          preferences: {
            methodology: 'hybrid' as any,
            taskSize: 'medium' as any
          } as any,
          metadata: {}
        });
        break;
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Metrics are updated in real-time during execution
    this.logger.debug('Metrics collection started');
  }

  /**
   * Update component metrics
   */
  private updateMetrics(componentName: string, success: boolean): void {
    const metrics = this.metrics.get(componentName);
    if (!metrics) return;

    metrics.executionCount++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }
    
    metrics.lastExecutionTime = new Date();
    this.metrics.set(componentName, metrics);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.eventBus.on('error', (error) => {
      this.logger.error('Event bus error', { error });
      this.status = IntegrationStatus.ERROR;
    });

    this.eventBus.on('warning', (warning) => {
      this.logger.warn('Event bus warning', { warning });
    });
  }

  /**
   * Create workflow error
   */
  private createWorkflowError(step: WorkflowStep, error: any): WorkflowError {
    return {
      step,
      message: error.message || 'Unknown error',
      code: error.code || 'EXECUTION_ERROR',
      details: error,
      timestamp: new Date(),
      recoverable: this.config.orchestrator.enableRecovery
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config?: Partial<IntegrationConfig>): IntegrationConfig {
    const defaults: IntegrationConfig = {
      orchestrator: {
        maxRetries: 3,
        timeoutMs: 30000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: true,
        enableMetrics: true,
        healthCheckInterval: 30000
      },
      logging: {
        level: 'info',
        enableWorkflowTracing: true
      },
      workflow: {
        maxConcurrentWorkflows: 10,
        enableStatePersistence: false
      }
    };

    return {
      ...defaults,
      ...config,
      orchestrator: { ...defaults.orchestrator, ...config?.orchestrator },
      monitoring: { ...defaults.monitoring, ...config?.monitoring },
      logging: { ...defaults.logging, ...config?.logging },
      workflow: { ...defaults.workflow, ...config?.workflow }
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Component integration utilities
 */
export class IntegrationUtils {
  /**
   * Validate component compatibility
   */
  static validateCompatibility(
    parsed?: InputParserOutput,
    analyzed?: AnalysisResult,
    planned?: PlannerResult
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    if (parsed && (!parsed.parsed || !parsed.parsed.intent)) {
      issues.push('Input parser output missing required data');
    }

    if (analyzed && !analyzed.projectPath) {
      issues.push('Project analyzer output missing project path');
    }

    if (planned && !planned.plan) {
      issues.push('Planner output missing plan data');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Extract key information from workflow result
   */
  static extractWorkflowSummary(result: IntegratedWorkflowResult): any {
    return {
      workflowId: result.workflowId,
      status: result.status,
      command: result.input.command,
      intentType: result.results.parsed?.parsed?.intent?.type,
      technologyStack: result.results.analyzed?.dependencyAnalysis?.dependencies.length || 0,
      planSteps: result.results.planned?.plan?.steps?.length || 0,
      totalDurationMs: result.summary.totalDurationMs,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    };
  }

  /**
   * Create integration test scenario
   */
  static createTestScenario(name: string, input: WorkflowInput): any {
    return {
      name,
      input,
      expectedStatus: 'completed' as const,
      validateResults: (result: IntegratedWorkflowResult) => {
        expect(result.status).toBe('completed');
        expect(result.results.parsed).toBeDefined();
        expect(result.results.planned).toBeDefined();
      }
    };
  }
}

/**
 * Default integration instance factory
 */
export async function createDefaultIntegration(
  config?: Partial<IntegrationConfig>
): Promise<ComponentIntegrator> {
  const integrator = new ComponentIntegrator(config);
  await integrator.initialize();
  return integrator;
}

/**
 * Integration error types
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public component?: string
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}
