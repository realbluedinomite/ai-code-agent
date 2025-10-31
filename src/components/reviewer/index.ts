/**
 * Reviewer Component System
 * 
 * A comprehensive code validation system with three layers:
 * 1. StaticAnalyzer - TypeScript compilation, ESLint, syntax validation
 * 2. AIReviewer - AI-powered review using Groq for logic, security, performance analysis
 * 3. UserApproval - User approval workflow and decision management
 * 
 * @example
 * ```typescript
 * import { Reviewer, ReviewerInitConfig } from '@/components/reviewer';
 * import { DatabaseConnectionManager } from '@/database/client';
 * 
 * // Initialize reviewer
 * const reviewer = new Reviewer({
 *   dbManager: new DatabaseConnectionManager(),
 *   reviewConfig: {
 *     enable_static_analysis: true,
 *     enable_ai_review: true,
 *     enable_user_approval: true
 *   }
 * });
 * 
 * // Start review session
 * const sessionId = await reviewer.startReviewSession({
 *   project_id: 'project-123',
 *   user_id: 'user-456'
 * });
 * 
 * // Review files
 * const files = await loadCodeFiles();
 * const results = await reviewer.reviewFiles(files);
 * 
 * // Complete session
 * const session = await reviewer.completeReviewSession();
 * ```
 */

// Export main components
export { Reviewer } from './reviewer';
export { StaticAnalyzer } from './static-analyzer';
export { AIReviewer } from './ai-reviewer';
export { UserApproval } from './user-approval';

// Export types
export * from './types';

// Re-export types for convenience
export type {
  CodeFile,
  StaticAnalysisResult,
  AIReviewResult,
  ApprovalDecision,
  ReviewSession,
  ReviewConfiguration,
  ValidationRule,
  SyntaxIssue,
  TypeCheckIssue,
  BestPracticeIssue,
  AIReviewFinding,
  UserApprovalRequest,
  ReviewerEventData,
  ReviewerComponent,
  ReviewerStats,
  ReviewIssue,
  IssueSeverity,
  FileLanguage
} from './types';

// Configuration interfaces
export interface ReviewerInitConfig {
  dbManager: DatabaseConnectionManager;
  eventBus?: TypedEventBus;
  reviewConfig?: Partial<ReviewConfiguration>;
  staticAnalyzerConfig?: any;
  aiReviewerConfig?: any;
  userApprovalConfig?: any;
}

export interface StaticAnalyzerConfig {
  enableTypeScript: boolean;
  enableESLint: boolean;
  eslintConfigPath?: string;
  tsConfigPath?: string;
  maxFileSize: number;
  supportedExtensions: string[];
  customRules?: ValidationRule[];
  eslintRules?: Record<string, any>;
  tsCompilerOptions?: Record<string, any>;
}

export interface AIReviewerConfig {
  groqConfig: {
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };
  enableLogicAnalysis: boolean;
  enableSecurityAnalysis: boolean;
  enablePerformanceAnalysis: boolean;
  enableArchitectureAnalysis: boolean;
  enableReadabilityAnalysis: boolean;
  scoringWeights: {
    logic: number;
    security: number;
    performance: number;
    architecture: number;
    readability: number;
  };
  minConfidenceThreshold: number;
  maxFindingsPerCategory: number;
  analysisContext?: {
    project_type?: string;
    framework?: string;
    language_version?: string;
    deployment_environment?: string;
  };
}

export interface UserApprovalConfig {
  enableAutoApproval: boolean;
  autoApprovalThreshold: number;
  requireApprovalThreshold: number;
  autoRejectCriticalIssues: boolean;
  maxIgnorableIssues: number;
  approvalTimeoutMinutes: number;
  enableBatchApproval: boolean;
  defaultReviewerMetadata?: {
    experience_level: 'junior' | 'mid' | 'senior' | 'expert';
    domain_expertise: string[];
  };
  notifications?: {
    enabled: boolean;
    webhooks?: string[];
    email?: string[];
  };
}

// Utility functions
export function createReviewer(config: ReviewerInitConfig): Reviewer {
  return new Reviewer(config);
}

export function createStaticAnalyzer(
  dbManager: DatabaseConnectionManager,
  config?: Partial<StaticAnalyzerConfig>
): StaticAnalyzer {
  return new StaticAnalyzer(dbManager, undefined, config);
}

export function createAIReviewer(
  dbManager: DatabaseConnectionManager,
  config: AIReviewerConfig
): AIReviewer {
  return new AIReviewer(dbManager, undefined, config);
}

export function createUserApproval(
  dbManager: DatabaseConnectionManager,
  config?: Partial<UserApprovalConfig>
): UserApproval {
  return new UserApproval(dbManager, undefined, config);
}

// Version information
export const VERSION = '1.0.0';
export const COMPONENT_INFO = {
  name: 'Reviewer Component System',
  version: VERSION,
  description: 'Comprehensive code validation system with static analysis, AI review, and user approval',
  layers: [
    {
      name: 'StaticAnalyzer',
      description: 'TypeScript compilation, ESLint validation, syntax checking',
      version: VERSION
    },
    {
      name: 'AIReviewer', 
      description: 'AI-powered code review using Groq for logic, security, performance analysis',
      version: VERSION
    },
    {
      name: 'UserApproval',
      description: 'User approval workflow and decision management',
      version: VERSION
    }
  ]
} as const;

// Event type helpers
export const ReviewerEvents = {
  // Session events
  SESSION_STARTED: 'review:session:started',
  SESSION_COMPLETED: 'review:session:completed',
  SESSION_FAILED: 'review:session:failed',
  
  // File review events
  FILE_REVIEW_STARTED: 'review:file:started',
  FILE_REVIEW_COMPLETED: 'review:file:completed',
  FILE_REVIEW_FAILED: 'review:file:failed',
  
  // Layer-specific events
  STATIC_ANALYSIS_STARTED: 'static:analysis:started',
  STATIC_ANALYSIS_COMPLETED: 'static:analysis:completed',
  STATIC_ANALYSIS_ERROR: 'static:analysis:error',
  
  AI_REVIEW_STARTED: 'ai:review:started',
  AI_REVIEW_COMPLETED: 'ai:review:completed',
  AI_REVIEW_ERROR: 'ai:review:error',
  
  APPROVAL_REQUEST_CREATED: 'approval:request:created',
  APPROVAL_REQUIRED: 'approval:required',
  APPROVAL_DECISION_MADE: 'approval:decision:made',
  APPROVAL_BATCH_COMPLETED: 'approval:batch:completed'
} as const;

// Configuration validation
export function validateReviewConfiguration(config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.enable_static_analysis && !config.enable_ai_review && !config.enable_user_approval) {
    errors.push('At least one review layer must be enabled');
  }
  
  if (config.auto_approve_threshold !== undefined && 
      (config.auto_approve_threshold < 0 || config.auto_approve_threshold > 100)) {
    errors.push('Auto-approve threshold must be between 0 and 100');
  }
  
  if (config.require_approval_threshold !== undefined && 
      (config.require_approval_threshold < 0 || config.require_approval_threshold > 100)) {
    errors.push('Require approval threshold must be between 0 and 100');
  }
  
  if (config.max_file_size_bytes !== undefined && config.max_file_size_bytes < 1024) {
    errors.push('Max file size must be at least 1024 bytes');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Constants
export const DEFAULT_CONFIGURATION = {
  enable_static_analysis: true,
  enable_ai_review: true,
  enable_user_approval: true,
  max_file_size_bytes: 1048576, // 1MB
  supported_languages: ['typescript', 'javascript', 'python', 'java', 'csharp', 'cpp'],
  approval_thresholds: {
    auto_approve_score: 90,
    require_approval_score: 70,
    critical_issues_auto_reject: true
  },
  exclude_patterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
  include_patterns: ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.cs', '**/*.cpp']
} as const;

// Error classes
export class ReviewerError extends Error {
  constructor(
    message: string,
    public code: string,
    public component?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReviewerError';
  }
}

export class StaticAnalysisError extends ReviewerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'STATIC_ANALYSIS_ERROR', 'StaticAnalyzer', context);
    this.name = 'StaticAnalysisError';
  }
}

export class AIReviewError extends ReviewerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AI_REVIEW_ERROR', 'AIReviewer', context);
    this.name = 'AIReviewError';
  }
}

export class UserApprovalError extends ReviewerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'USER_APPROVAL_ERROR', 'UserApproval', context);
    this.name = 'UserApprovalError';
  }
}