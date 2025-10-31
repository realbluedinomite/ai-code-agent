/**
 * Types and interfaces for the Reviewer component system
 * 
 * This module defines the data structures and interfaces used across
 * the Reviewer, StaticAnalyzer, AIReviewer, and UserApproval components.
 */

export interface CodeFile {
  id: string;
  project_analysis_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  line_count?: number;
  language?: string;
  content_hash?: string;
  content?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'syntax' | 'type' | 'best-practice' | 'security' | 'performance';
  enabled: boolean;
  configuration?: Record<string, any>;
}

export interface SyntaxIssue {
  file_id: string;
  file_path: string;
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  rule_id?: string;
  code?: string;
}

export interface TypeCheckIssue {
  file_id: string;
  file_path: string;
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: string;
  expected_type?: string;
  actual_type?: string;
}

export interface BestPracticeIssue {
  file_id: string;
  file_path: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule_id: string;
  rule_name: string;
  suggestion?: string;
  auto_fixable?: boolean;
}

export interface StaticAnalysisResult {
  file_id: string;
  file_path: string;
  syntax_valid: boolean;
  type_check_passed: boolean;
  syntax_issues: SyntaxIssue[];
  type_issues: TypeCheckIssue[];
  best_practice_issues: BestPracticeIssue[];
  metrics: {
    cyclomatic_complexity?: number;
    cognitive_complexity?: number;
    code_coverage?: number;
    maintainability_index?: number;
    lines_of_code?: number;
  };
  timestamp: Date;
}

export interface AIReviewRequest {
  file_id: string;
  file_path: string;
  content: string;
  language: string;
  context?: {
    project_type?: string;
    framework?: string;
    dependencies?: string[];
    file_dependencies?: string[];
  };
}

export interface AIReviewFinding {
  id: string;
  category: 'logic' | 'architecture' | 'security' | 'performance' | 'maintainability' | 'readability';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  line?: number;
  message: string;
  explanation: string;
  suggestion?: string;
  code_example?: string;
  references?: string[];
  auto_fixable: boolean;
}

export interface AIReviewResult {
  file_id: string;
  file_path: string;
  overall_score: number; // 0-100
  findings: AIReviewFinding[];
  summary: string;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  timestamp: Date;
  processing_time_ms: number;
}

export interface UserApprovalRequest {
  review_id: string;
  file_id: string;
  file_path: string;
  static_analysis: StaticAnalysisResult;
  ai_review?: AIReviewResult;
  reviewer_notes?: string;
  requires_approval: boolean;
  auto_approve_threshold: number; // 0-100
}

export interface ApprovalDecision {
  review_id: string;
  file_id: string;
  user_id?: string;
  decision: 'approved' | 'rejected' | 'needs_changes' | 'requires_manual_review';
  reasoning?: string;
  requested_changes?: string[];
  approved_issues?: string[]; // List of issue IDs that are approved to be ignored
  timestamp: Date;
  reviewer_metadata?: {
    experience_level?: 'junior' | 'mid' | 'senior' | 'expert';
    domain_expertise?: string[];
    time_spent_seconds?: number;
  };
}

export interface ReviewSession {
  id: string;
  project_id: string;
  user_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  started_at: Date;
  completed_at?: Date;
  files_reviewed: number;
  files_approved: number;
  files_rejected: number;
  total_issues: number;
  critical_issues: number;
  processing_stats: {
    static_analysis_time_ms: number;
    ai_review_time_ms: number;
    user_review_time_ms: number;
    total_time_ms: number;
  };
  configuration: ReviewConfiguration;
}

export interface ReviewConfiguration {
  enable_static_analysis: boolean;
  enable_ai_review: boolean;
  enable_user_approval: boolean;
  max_file_size_bytes: number;
  supported_languages: string[];
  custom_rules?: ValidationRule[];
  ai_model_config?: {
    model: string;
    temperature: number;
    max_tokens: number;
    system_prompt: string;
  };
  approval_thresholds: {
    auto_approve_score: number;
    require_approval_score: number;
    critical_issues_auto_reject: boolean;
  };
  exclude_patterns: string[];
  include_patterns: string[];
}

export interface ReviewerEventData {
  session_started: {
    session_id: string;
    project_id: string;
    file_count: number;
  };
  file_analysis_started: {
    session_id: string;
    file_id: string;
    file_path: string;
  };
  file_analysis_completed: {
    session_id: string;
    file_id: string;
    file_path: string;
    static_analysis?: StaticAnalysisResult;
    ai_review?: AIReviewResult;
  };
  static_analysis_completed: {
    file_id: string;
    issues_found: number;
    processing_time_ms: number;
  };
  ai_review_completed: {
    file_id: string;
    findings_count: number;
    overall_score: number;
    processing_time_ms: number;
  };
  approval_required: UserApprovalRequest;
  approval_decision_made: ApprovalDecision;
  session_completed: {
    session_id: string;
    total_files: number;
    approved_files: number;
    rejected_files: number;
    total_issues: number;
    processing_time_ms: number;
  };
  error: {
    session_id?: string;
    file_id?: string;
    component: string;
    error: Error;
    context?: Record<string, any>;
  };
}

export interface ReviewerComponent {
  reviewer: 'static-analyzer' | 'ai-reviewer' | 'user-approval';
  version: string;
  capabilities: string[];
  configuration_schema?: Record<string, any>;
}

export interface ReviewerStats {
  sessions_processed: number;
  files_reviewed: number;
  average_processing_time_ms: number;
  success_rate: number;
  error_rate: number;
  component_usage: {
    static_analyzer: number;
    ai_reviewer: number;
    user_approval: number;
  };
}

// Export utility types
export type ReviewIssue = SyntaxIssue | TypeCheckIssue | BestPracticeIssue | AIReviewFinding;
export type IssueSeverity = 'error' | 'warning' | 'info' | 'critical' | 'high' | 'medium' | 'low';
export type FileLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'cpp' | 'other';

// Configuration validation schemas (for runtime validation)
export const REVIEW_CONFIGURATION_SCHEMA = {
  type: 'object',
  properties: {
    enable_static_analysis: { type: 'boolean', default: true },
    enable_ai_review: { type: 'boolean', default: true },
    enable_user_approval: { type: 'boolean', default: true },
    max_file_size_bytes: { type: 'number', minimum: 1024, default: 1048576 },
    supported_languages: {
      type: 'array',
      items: { type: 'string' },
      default: ['typescript', 'javascript', 'python', 'java', 'csharp', 'cpp']
    },
    custom_rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          severity: { enum: ['error', 'warning', 'info'] },
          category: { enum: ['syntax', 'type', 'best-practice', 'security', 'performance'] },
          enabled: { type: 'boolean' }
        },
        required: ['id', 'name', 'description', 'severity', 'category', 'enabled']
      }
    },
    approval_thresholds: {
      type: 'object',
      properties: {
        auto_approve_score: { type: 'number', minimum: 0, maximum: 100, default: 90 },
        require_approval_score: { type: 'number', minimum: 0, maximum: 100, default: 70 },
        critical_issues_auto_reject: { type: 'boolean', default: true }
      }
    }
  },
  required: ['enable_static_analysis', 'enable_ai_review', 'enable_user_approval']
} as const;