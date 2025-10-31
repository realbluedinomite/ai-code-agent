/**
 * Types for Orchestrator component
 */

import { AnalysisResult } from '../components/project-analyzer/types';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Component registry mapping */
  components: {
    inputParser: string;
    projectAnalyzer: string;
    planner: string;
    implementer?: string;
    reviewer?: string;
  };
  
  /** Workflow configuration */
  workflow: {
    maxRetries: number;
    timeoutMs: number;
    enableRecovery: boolean;
    validateIntermediateResults: boolean;
  };
  
  /** Session configuration */
  session: {
    enablePersistence: boolean;
    sessionTimeoutMs: number;
    maxConcurrentSessions: number;
  };
  
  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceTracking: boolean;
    enableWorkflowTracing: boolean;
  };
}

/**
 * Workflow context containing state and data flowing through the pipeline
 */
export interface WorkflowContext {
  /** Unique workflow instance ID */
  workflowId: string;
  
  /** Session ID */
  sessionId: string;
  
  /** Current step in the workflow */
  currentStep: WorkflowStep;
  
  /** Input data from user */
  input: WorkflowInput;
  
  /** Parsed input from Input Parser */
  parsedInput?: any;
  
  /** Analysis results from Project Analyzer */
  analysis?: AnalysisResult;
  
  /** Planning results from Planner */
  planning?: PlannerResult;
  
  /** User approval results */
  userApproval?: UserApprovalResult;
  
  /** Implementation results from Implementer */
  implementation?: any;
  
  /** Review results from Reviewer */
  review?: any;
  
  /** Workflow metadata */
  metadata: {
    startTime: Date;
    lastUpdateTime: Date;
    stepHistory: WorkflowStepHistory[];
    errors: WorkflowError[];
    warnings: WorkflowWarning[];
  };
}

/**
 * Workflow input data
 */
export interface WorkflowInput {
  /** User input text or command */
  command: string;
  
  /** Additional parameters */
  parameters: Record<string, any>;
  
  /** Project context */
  projectPath?: string;
  
  /** Execution context */
  context?: {
    workingDirectory: string;
    environment: Record<string, string>;
    userPreferences?: Record<string, any>;
  };
}

/**
 * Workflow steps
 */
export enum WorkflowStep {
  INPUT_PARSING = 'input_parsing',
  PROJECT_ANALYSIS = 'project_analysis',
  PLANNING = 'planning',
  USER_APPROVAL = 'user_approval',
  IMPLEMENTATION = 'implementation',
  REVIEW = 'review'
}

/**
 * Workflow step history
 */
export interface WorkflowStepHistory {
  step: WorkflowStep;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: WorkflowError;
  durationMs?: number;
}

/**
 * Workflow error
 */
export interface WorkflowError {
  step: WorkflowStep;
  message: string;
  code: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Workflow warning
 */
export interface WorkflowWarning {
  step: WorkflowStep;
  message: string;
  code: string;
  details?: any;
  timestamp: Date;
}

/**
 * Session state
 */
export interface SessionState {
  /** Session ID */
  sessionId: string;
  
  /** Session status */
  status: 'active' | 'idle' | 'expired' | 'terminated';
  
  /** Active workflows */
  activeWorkflows: string[];
  
  /** Session metadata */
  metadata: {
    createdAt: Date;
    lastActivityAt: Date;
    userId?: string;
    workspacePath: string;
  };
}

/**
 * User approval result
 */
export interface UserApprovalResult {
  /** Approval status */
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  
  /** Approval details */
  details: {
    plan: Plan;
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedDuration: string;
    risks: PlanRisk[];
    changes: ApprovalChange[];
  };
  
  /** Approval metadata */
  metadata: {
    requestedAt: Date;
    respondedAt?: Date;
    approver?: string;
    rejectionReason?: string;
    timeoutMs: number;
  };
}

/**
 * Approval change item
 */
export interface ApprovalChange {
  /** Change description */
  description: string;
  
  /** Change type */
  type: 'file_creation' | 'file_modification' | 'file_deletion' | 'code_generation';
  
  /** Affected paths */
  paths: string[];
  
  /** Impact assessment */
  impact: 'low' | 'medium' | 'high';
  
  /** Risk level */
  risk: 'low' | 'medium' | 'high';
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Workflow ID */
  workflowId: string;
  
  /** Final status */
  status: 'completed' | 'failed' | 'cancelled';
  
  /** Final results */
  results: {
    input?: any;
    analysis?: AnalysisResult;
    plan?: PlannerResult;
    userApproval?: UserApprovalResult;
    implementation?: any;
    review?: any;
  };
  
  /** Execution summary */
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDurationMs: number;
  };
  
  /** Errors if any */
  errors: WorkflowError[];
}

/**
 * Planner result
 */
export interface PlannerResult {
  /** Generated plan */
  plan: Plan;
  
  /** Planning metadata */
  metadata: {
    planningTimeMs: number;
    planComplexity: 'simple' | 'moderate' | 'complex';
    confidence: number; // 0-1
  };
}

/**
 * Plan structure
 */
export interface Plan {
  /** Plan ID */
  planId: string;
  
  /** Plan title/description */
  title: string;
  
  /** Plan steps */
  steps: PlanStep[];
  
  /** Dependencies between steps */
  dependencies: PlanDependency[];
  
  /** Estimated effort */
  estimatedEffort?: {
    duration: string;
    complexity: 'low' | 'medium' | 'high';
  };
  
  /** Risk assessment */
  risks?: PlanRisk[];
}

/**
 * Plan step
 */
export interface PlanStep {
  /** Step ID */
  stepId: string;
  
  /** Step title */
  title: string;
  
  /** Step description */
  description: string;
  
  /** Step type */
  type: 'development' | 'analysis' | 'review' | 'testing' | 'documentation';
  
  /** Estimated duration */
  estimatedDuration?: string;
  
  /** Prerequisites */
  prerequisites: string[];
  
  /** Resources needed */
  resources?: string[];
  
  /** Success criteria */
  successCriteria: string[];
}

/**
 * Plan dependency
 */
export interface PlanDependency {
  /** Source step ID */
  from: string;
  
  /** Target step ID */
  to: string;
  
  /** Dependency type */
  type: 'sequential' | 'parallel' | 'conditional';
  
  /** Condition for conditional dependencies */
  condition?: string;
}

/**
 * Plan risk
 */
export interface PlanRisk {
  /** Risk ID */
  riskId: string;
  
  /** Risk description */
  description: string;
  
  /** Risk level */
  level: 'low' | 'medium' | 'high' | 'critical';
  
  /** Mitigation strategy */
  mitigation: string;
  
  /** Affected steps */
  affectedSteps: string[];
}

/**
 * Component interface for orchestrator-managed components
 */
export interface OrchestratorComponent {
  /** Component name */
  name: string;
  
  /** Component version */
  version: string;
  
  /** Initialize component */
  initialize(config: any): Promise<void>;
  
  /** Execute component functionality */
  execute(input: any, context: WorkflowContext): Promise<any>;
  
  /** Cleanup resources */
  cleanup(): Promise<void>;
  
  /** Get component health status */
  healthCheck(): Promise<HealthStatus>;
}

/**
 * Component health status
 */
export interface HealthStatus {
  /** Overall health */
  healthy: boolean;
  
  /** Component status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Last check time */
  lastCheck: Date;
  
  /** Additional metrics */
  metrics?: Record<string, any>;
  
  /** Issues if any */
  issues?: string[];
}