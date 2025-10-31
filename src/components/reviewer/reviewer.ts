/**
 * Reviewer Orchestrator - Main Component
 * 
 * Coordinates the complete code review workflow across three layers:
 * Layer 1: StaticAnalyzer - TypeScript compilation, ESLint, syntax validation
 * Layer 2: AIReviewer - AI-powered logic and architecture review using Groq
 * Layer 3: UserApproval - User approval workflow and decision management
 * 
 * Integrates with:
 * - Event bus for notifications and monitoring
 * - Database for persistence and audit trails
 * - All three review components
 */

import { TypedEventBus, eventBus, Events } from '@/core/event-bus';
import { logger } from '@/utils/loggers';
import { DatabaseConnectionManager } from '@/database/client';
import { CodeFileModel } from '@/database/models/code-file.model';
import {
  ReviewConfiguration,
  ReviewSession,
  StaticAnalysisResult,
  AIReviewResult,
  ApprovalDecision,
  ReviewerEventData,
  CodeFile,
  ReviewerComponent,
} from './types';
import { StaticAnalyzer } from './static-analyzer';
import { AIReviewer } from './ai-reviewer';
import { UserApproval } from './user-approval';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewerInitConfig {
  /** Database configuration */
  dbManager: DatabaseConnectionManager;
  /** Event bus instance (optional, uses default) */
  eventBus?: TypedEventBus;
  /** Review configuration */
  reviewConfig: Partial<ReviewConfiguration>;
  /** Static analyzer configuration */
  staticAnalyzerConfig?: any;
  /** AI reviewer configuration */
  aiReviewerConfig?: any;
  /** User approval configuration */
  userApprovalConfig?: any;
}

/**
 * Main Reviewer Component
 * 
 * Orchestrates the complete code review workflow across three layers:
 * 1. Static Analysis (TypeScript, ESLint, syntax validation)
 * 2. AI Review (Logic, architecture, security, performance analysis)
 * 3. User Approval (Decision making, workflow management)
 */
export class Reviewer {
  private eventBus: TypedEventBus;
  private config: ReviewConfiguration;
  private sessionId?: string;
  
  // Component instances
  private staticAnalyzer: StaticAnalyzer;
  private aiReviewer: AIReviewer;
  private userApproval: UserApproval;
  
  // Database models
  private codeFileModel: CodeFileModel;
  
  // Session tracking
  private currentSession?: ReviewSession;
  private sessionStats = {
    files_processed: 0,
    files_approved: 0,
    files_rejected: 0,
    total_issues: 0,
    critical_issues: 0,
    processing_times: {
      static_analysis: [] as number[],
      ai_review: [] as number[],
      user_approval: [] as number[]
    }
  };

  constructor(config: ReviewerInitConfig) {
    this.eventBus = config.eventBus || eventBus;
    this.codeFileModel = new CodeFileModel(config.dbManager);

    // Initialize main configuration
    this.config = {
      enable_static_analysis: true,
      enable_ai_review: true,
      enable_user_approval: true,
      max_file_size_bytes: 1048576, // 1MB
      supported_languages: ['typescript', 'javascript', 'python', 'java', 'csharp', 'cpp'],
      custom_rules: [],
      ai_model_config: {
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 2048,
        system_prompt: 'You are an expert code reviewer...'
      },
      approval_thresholds: {
        auto_approve_score: 90,
        require_approval_score: 70,
        critical_issues_auto_reject: true
      },
      exclude_patterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      include_patterns: ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.cs', '**/*.cpp'],
      ...config.reviewConfig
    };

    // Initialize components
    this.staticAnalyzer = new StaticAnalyzer(
      config.dbManager,
      this.eventBus.namespace('static'),
      config.staticAnalyzerConfig
    );

    this.aiReviewer = new AIReviewer(
      config.dbManager,
      this.eventBus.namespace('ai'),
      config.aiReviewerConfig
    );

    this.userApproval = new UserApproval(
      config.dbManager,
      this.eventBus.namespace('approval'),
      config.userApprovalConfig
    );

    this.setupEventListeners();
    
    logger.info('Reviewer component initialized', {
      session_id: this.sessionId,
      enabled_layers: this.getEnabledLayers(),
      supported_languages: this.config.supported_languages
    });
  }

  /**
   * Start a new review session
   */
  async startReviewSession(options: {
    project_id: string;
    user_id?: string;
    configuration?: Partial<ReviewConfiguration>;
  }): Promise<string> {
    this.sessionId = uuidv4();
    
    // Update configuration if provided
    if (options.configuration) {
      this.config = { ...this.config, ...options.configuration };
    }

    // Create session
    this.currentSession = {
      id: this.sessionId,
      project_id: options.project_id,
      user_id: options.user_id,
      status: 'pending',
      started_at: new Date(),
      files_reviewed: 0,
      files_approved: 0,
      files_rejected: 0,
      total_issues: 0,
      critical_issues: 0,
      processing_stats: {
        static_analysis_time_ms: 0,
        ai_review_time_ms: 0,
        user_review_time_ms: 0,
        total_time_ms: 0
      },
      configuration: this.config
    };

    // Reset stats
    this.resetSessionStats();

    // Emit session started event
    this.eventBus.emit('review:session:started', {
      session_id: this.sessionId,
      project_id: options.project_id,
      user_id: options.user_id,
      configuration: this.config
    });

    logger.info('Review session started', {
      session_id: this.sessionId,
      project_id: options.project_id,
      user_id: options.user_id
    });

    return this.sessionId;
  }

  /**
   * Review a single code file through all layers
   */
  async reviewFile(file: {
    id: string;
    file_path: string;
    content: string;
    language?: string;
  }): Promise<{
    session_id: string;
    file_id: string;
    file_path: string;
    static_analysis?: StaticAnalysisResult;
    ai_review?: AIReviewResult;
    approval_decision?: ApprovalDecision;
    processing_time_ms: number;
    overall_score?: number;
  }> {
    if (!this.currentSession) {
      throw new Error('No active review session. Call startReviewSession first.');
    }

    const startTime = Date.now();
    this.currentSession.status = 'in_progress';

    try {
      logger.info('Starting file review', {
        session_id: this.sessionId,
        file_id: file.id,
        file_path: file.file_path
      });

      // Emit file review started event
      this.eventBus.emit('review:file:started', {
        session_id: this.sessionId!,
        file_id: file.id,
        file_path: file.file_path
      });

      let staticAnalysis: StaticAnalysisResult | undefined;
      let aiReview: AIReviewResult | undefined;
      let approvalDecision: ApprovalDecision | undefined;
      let overallScore: number | undefined;

      // Layer 1: Static Analysis
      if (this.config.enable_static_analysis) {
        try {
          const staticStartTime = Date.now();
          staticAnalysis = await this.staticAnalyzer.analyzeFile(file);
          this.sessionStats.processing_times.static_analysis.push(Date.now() - staticStartTime);
          
          logger.info('Static analysis completed', {
            file_id: file.id,
            issues_count: staticAnalysis.syntax_issues.length + staticAnalysis.type_issues.length + staticAnalysis.best_practice_issues.length
          });
        } catch (error) {
          logger.error('Static analysis failed', {
            file_id: file.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continue with other layers even if static analysis fails
        }
      }

      // Layer 2: AI Review
      if (this.config.enable_ai_review && file.content.length > 0) {
        try {
          const aiStartTime = Date.now();
          const aiRequest = {
            file_id: file.id,
            file_path: file.file_path,
            content: file.content,
            language: file.language || 'typescript',
            context: {
              project_type: 'general',
              language_version: 'latest'
            }
          };
          aiReview = await this.aiReviewer.reviewFile(aiRequest);
          this.sessionStats.processing_times.ai_review.push(Date.now() - aiStartTime);
          
          // Calculate overall score
          if (staticAnalysis && aiReview) {
            overallScore = Math.round((this.calculateStaticScore(staticAnalysis) + aiReview.overall_score) / 2);
          } else if (aiReview) {
            overallScore = aiReview.overall_score;
          } else if (staticAnalysis) {
            overallScore = this.calculateStaticScore(staticAnalysis);
          }

          logger.info('AI review completed', {
            file_id: file.id,
            overall_score: overallScore,
            findings_count: aiReview?.findings.length || 0
          });
        } catch (error) {
          logger.error('AI review failed', {
            file_id: file.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Continue with approval layer even if AI review fails
        }
      }

      // Layer 3: User Approval
      if (this.config.enable_user_approval) {
        try {
          const approvalStartTime = Date.now();
          const approvalRequest = {
            review_id: this.sessionId!,
            file_id: file.id,
            file_path: file.file_path,
            static_analysis: staticAnalysis!,
            ai_review: aiReview,
            reviewer_notes: `Review session ${this.sessionId}`
          };

          approvalDecision = await this.userApproval.processApprovalRequest(approvalRequest);
          this.sessionStats.processing_times.user_approval.push(Date.now() - approvalStartTime);

          logger.info('User approval completed', {
            file_id: file.id,
            decision: approvalDecision.decision
          });
        } catch (error) {
          logger.error('User approval failed', {
            file_id: file.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update session stats
      this.updateSessionStats(staticAnalysis, aiReview, approvalDecision);

      // Emit file review completed event
      this.eventBus.emit('review:file:completed', {
        session_id: this.sessionId!,
        file_id: file.id,
        file_path: file.file_path,
        static_analysis: staticAnalysis,
        ai_review: aiReview,
        approval_decision: approvalDecision,
        overall_score: overallScore,
        processing_time_ms: Date.now() - startTime
      });

      const result = {
        session_id: this.sessionId!,
        file_id: file.id,
        file_path: file.file_path,
        static_analysis: staticAnalysis,
        ai_review: aiReview,
        approval_decision: approvalDecision,
        processing_time_ms: Date.now() - startTime,
        overall_score: overallScore
      };

      logger.info('File review completed', {
        session_id: this.sessionId,
        file_id: file.id,
        processing_time_ms: result.processing_time_ms,
        decision: approvalDecision?.decision
      });

      return result;

    } catch (error) {
      logger.error('File review failed', {
        session_id: this.sessionId,
        file_id: file.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Review multiple files in batch
   */
  async reviewFiles(files: Array<{
    id: string;
    file_path: string;
    content: string;
    language?: string;
  }>): Promise<{
    session_id: string;
    results: Array<{
      file_id: string;
      file_path: string;
      decision?: ApprovalDecision['decision'];
      overall_score?: number;
      issues_count: number;
      processing_time_ms: number;
    }>;
    summary: {
      total_files: number;
      approved: number;
      rejected: number;
      requires_review: number;
      average_score: number;
      total_processing_time_ms: number;
    };
  }> {
    if (!this.currentSession) {
      throw new Error('No active review session. Call startReviewSession first.');
    }

    const sessionStartTime = Date.now();
    const results: Array<{
      file_id: string;
      file_path: string;
      decision?: ApprovalDecision['decision'];
      overall_score?: number;
      issues_count: number;
      processing_time_ms: number;
    }> = [];

    logger.info('Starting batch file review', {
      session_id: this.sessionId,
      file_count: files.length
    });

    // Process files in chunks to avoid overwhelming the system
    const chunkSize = 5;
    const chunks = this.chunkArray(files, chunkSize);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      // Process chunk concurrently
      const chunkPromises = chunk.map(async (file) => {
        try {
          const result = await this.reviewFile(file);
          
          return {
            file_id: file.id,
            file_path: file.file_path,
            decision: result.approval_decision?.decision,
            overall_score: result.overall_score,
            issues_count: (result.static_analysis?.syntax_issues.length || 0) +
                         (result.static_analysis?.type_issues.length || 0) +
                         (result.static_analysis?.best_practice_issues.length || 0) +
                         (result.ai_review?.findings.length || 0),
            processing_time_ms: result.processing_time_ms
          };
        } catch (error) {
          logger.error('Batch file review failed', {
            file_id: file.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          return {
            file_id: file.id,
            file_path: file.file_path,
            processing_time_ms: 0,
            issues_count: 0
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Add delay between chunks to respect rate limits
      if (chunkIndex < chunks.length - 1) {
        await this.delay(1000); // 1 second delay between chunks
      }
    }

    // Calculate summary
    const summary = {
      total_files: files.length,
      approved: results.filter(r => r.decision === 'approved').length,
      rejected: results.filter(r => r.decision === 'rejected').length,
      requires_review: results.filter(r => r.decision === 'requires_manual_review').length,
      average_score: results.filter(r => r.overall_score !== undefined)
        .reduce((sum, r) => sum + (r.overall_score || 0), 0) / results.filter(r => r.overall_score !== undefined).length || 0,
      total_processing_time_ms: Date.now() - sessionStartTime
    };

    logger.info('Batch file review completed', {
      session_id: this.sessionId,
      summary
    });

    return {
      session_id: this.sessionId!,
      results,
      summary
    };
  }

  /**
   * Complete the current review session
   */
  async completeReviewSession(): Promise<ReviewSession> {
    if (!this.currentSession) {
      throw new Error('No active review session to complete');
    }

    // Finalize session
    this.currentSession.completed_at = new Date();
    this.currentSession.status = 'completed';
    this.currentSession.processing_stats.total_time_ms = this.calculateTotalProcessingTime();

    // Emit session completed event
    this.eventBus.emit('review:session:completed', {
      session_id: this.currentSession.id,
      session: this.currentSession
    });

    logger.info('Review session completed', {
      session_id: this.currentSession.id,
      files_reviewed: this.currentSession.files_reviewed,
      files_approved: this.currentSession.files_approved,
      processing_time_ms: this.currentSession.processing_stats.total_time_ms
    });

    return this.currentSession;
  }

  /**
   * Get current session information
   */
  getCurrentSession(): ReviewSession | undefined {
    return this.currentSession;
  }

  /**
   * Get component statistics
   */
  getStats(): {
    session: ReviewSession | undefined;
    component_info: ReviewerComponent[];
    performance_metrics: {
      average_processing_time_ms: number;
      throughput_files_per_minute: number;
      error_rate: number;
    };
    layer_breakdown: {
      static_analysis: {
        enabled: boolean;
        avg_time_ms: number;
        issues_found: number;
      };
      ai_review: {
        enabled: boolean;
        avg_time_ms: number;
        findings_count: number;
      };
      user_approval: {
        enabled: boolean;
        avg_time_ms: number;
        decisions_made: number;
      };
    };
  } {
    return {
      session: this.currentSession,
      component_info: this.getComponentInfo(),
      performance_metrics: this.calculatePerformanceMetrics(),
      layer_breakdown: {
        static_analysis: {
          enabled: this.config.enable_static_analysis,
          avg_time_ms: this.average(this.sessionStats.processing_times.static_analysis),
          issues_found: this.sessionStats.total_issues - this.sessionStats.critical_issues
        },
        ai_review: {
          enabled: this.config.enable_ai_review,
          avg_time_ms: this.average(this.sessionStats.processing_times.ai_review),
          findings_count: this.sessionStats.total_issues
        },
        user_approval: {
          enabled: this.config.enable_user_approval,
          avg_time_ms: this.average(this.sessionStats.processing_times.user_approval),
          decisions_made: this.sessionStats.files_approved + this.sessionStats.files_rejected
        }
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<ReviewConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update underlying components
    this.staticAnalyzer.updateConfig({
      maxFileSize: this.config.max_file_size_bytes,
      supportedExtensions: this.config.supported_languages.map(lang => `.${lang}`),
      customRules: this.config.custom_rules
    });

    this.aiReviewer.updateConfig({
      enableLogicAnalysis: true,
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
      enableArchitectureAnalysis: true,
      enableReadabilityAnalysis: true,
      scoringWeights: {
        logic: 0.25,
        security: 0.25,
        performance: 0.2,
        architecture: 0.15,
        readability: 0.15
      }
    });

    this.userApproval.updateConfig({
      enableAutoApproval: true,
      autoApprovalThreshold: this.config.approval_thresholds.auto_approve_score,
      requireApprovalThreshold: this.config.approval_thresholds.require_approval_score,
      autoRejectCriticalIssues: this.config.approval_thresholds.critical_issues_auto_reject
    });

    logger.info('Reviewer configuration updated', newConfig);
  }

  /**
   * Setup event listeners for component coordination
   */
  private setupEventListeners(): void {
    // Listen for static analysis events
    this.eventBus.on('static:analysis:completed', (data) => {
      logger.debug('Static analysis completed', data);
    });

    this.eventBus.on('static:analysis:error', (data) => {
      logger.warn('Static analysis error', data);
    });

    // Listen for AI review events
    this.eventBus.on('ai:review:completed', (data) => {
      logger.debug('AI review completed', data);
    });

    this.eventBus.on('ai:review:error', (data) => {
      logger.warn('AI review error', data);
    });

    // Listen for approval events
    this.eventBus.on('approval:required', (data) => {
      logger.info('Approval required', data);
    });

    this.eventBus.on('approval:decision:made', (data) => {
      logger.info('Approval decision made', data);
    });
  }

  /**
   * Calculate static analysis score
   */
  private calculateStaticScore(staticAnalysis: StaticAnalysisResult): number {
    let score = 100;
    
    // Penalize syntax errors heavily
    const syntaxErrors = staticAnalysis.syntax_issues.filter(i => i.severity === 'error').length;
    score -= syntaxErrors * 10;
    
    // Penalize type errors
    const typeErrors = staticAnalysis.type_issues.filter(i => i.severity === 'error').length;
    score -= typeErrors * 8;
    
    // Penalize best practice issues
    const bestPracticeErrors = staticAnalysis.best_practice_issues.filter(i => i.severity === 'error').length;
    const bestPracticeWarnings = staticAnalysis.best_practice_issues.filter(i => i.severity === 'warning').length;
    score -= bestPracticeErrors * 5;
    score -= bestPracticeWarnings * 2;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update session statistics
   */
  private updateSessionStats(
    staticAnalysis?: StaticAnalysisResult,
    aiReview?: AIReviewResult,
    approvalDecision?: ApprovalDecision
  ): void {
    this.sessionStats.files_processed++;

    if (staticAnalysis) {
      this.sessionStats.total_issues += 
        staticAnalysis.syntax_issues.length +
        staticAnalysis.type_issues.length +
        staticAnalysis.best_practice_issues.length;
      
      this.sessionStats.critical_issues += 
        staticAnalysis.syntax_issues.filter(i => i.severity === 'error').length +
        staticAnalysis.type_issues.filter(i => i.severity === 'error').length;
    }

    if (aiReview) {
      this.sessionStats.total_issues += aiReview.findings.length;
      this.sessionStats.critical_issues += aiReview.findings.filter(f => f.severity === 'critical').length;
    }

    if (approvalDecision) {
      switch (approvalDecision.decision) {
        case 'approved':
          this.sessionStats.files_approved++;
          break;
        case 'rejected':
          this.sessionStats.files_rejected++;
          break;
        case 'needs_changes':
          this.sessionStats.files_rejected++;
          break;
      }
    }

    // Update current session
    if (this.currentSession) {
      this.currentSession.files_reviewed = this.sessionStats.files_processed;
      this.currentSession.files_approved = this.sessionStats.files_approved;
      this.currentSession.files_rejected = this.sessionStats.files_rejected;
      this.currentSession.total_issues = this.sessionStats.total_issues;
      this.currentSession.critical_issues = this.sessionStats.critical_issues;
      this.currentSession.processing_stats.static_analysis_time_ms = 
        this.sessionStats.processing_times.static_analysis.reduce((sum, time) => sum + time, 0);
      this.currentSession.processing_stats.ai_review_time_ms = 
        this.sessionStats.processing_times.ai_review.reduce((sum, time) => sum + time, 0);
      this.currentSession.processing_stats.user_review_time_ms = 
        this.sessionStats.processing_times.user_approval.reduce((sum, time) => sum + time, 0);
    }
  }

  /**
   * Reset session statistics
   */
  private resetSessionStats(): void {
    this.sessionStats = {
      files_processed: 0,
      files_approved: 0,
      files_rejected: 0,
      total_issues: 0,
      critical_issues: 0,
      processing_times: {
        static_analysis: [],
        ai_review: [],
        user_approval: []
      }
    };
  }

  /**
   * Calculate total processing time
   */
  private calculateTotalProcessingTime(): number {
    return this.sessionStats.processing_times.static_analysis.reduce((sum, time) => sum + time, 0) +
           this.sessionStats.processing_times.ai_review.reduce((sum, time) => sum + time, 0) +
           this.sessionStats.processing_times.user_approval.reduce((sum, time) => sum + time, 0);
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): {
    average_processing_time_ms: number;
    throughput_files_per_minute: number;
    error_rate: number;
  } {
    const totalProcessingTime = this.calculateTotalProcessingTime();
    const averageProcessingTime = this.sessionStats.files_processed > 0 ? 
      totalProcessingTime / this.sessionStats.files_processed : 0;
    
    const throughput = this.sessionStats.files_processed > 0 && totalProcessingTime > 0 ?
      (this.sessionStats.files_processed / (totalProcessingTime / 1000 / 60)) : 0;
    
    const errorRate = this.sessionStats.files_processed > 0 ?
      (this.sessionStats.files_rejected / this.sessionStats.files_processed) * 100 : 0;

    return {
      average_processing_time_ms: Math.round(averageProcessingTime),
      throughput_files_per_minute: Math.round(throughput * 100) / 100,
      error_rate: Math.round(errorRate * 100) / 100
    };
  }

  /**
   * Get component information
   */
  private getComponentInfo(): ReviewerComponent[] {
    return [
      {
        reviewer: 'static-analyzer',
        version: '1.0.0',
        capabilities: ['TypeScript compilation', 'ESLint validation', 'Syntax analysis', 'Code metrics']
      },
      {
        reviewer: 'ai-reviewer',
        version: '1.0.0',
        capabilities: ['Logic analysis', 'Security review', 'Performance analysis', 'Architecture review']
      },
      {
        reviewer: 'user-approval',
        version: '1.0.0',
        capabilities: ['Auto-approval', 'Manual review', 'Batch processing', 'History tracking']
      }
    ];
  }

  /**
   * Get enabled layers
   */
  private getEnabledLayers(): string[] {
    const layers: string[] = [];
    
    if (this.config.enable_static_analysis) layers.push('Static Analysis');
    if (this.config.enable_ai_review) layers.push('AI Review');
    if (this.config.enable_user_approval) layers.push('User Approval');
    
    return layers;
  }

  /**
   * Calculate average of array
   */
  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Dispose of the reviewer and cleanup resources
   */
  async dispose(): Promise<void> {
    // Complete any active session
    if (this.currentSession && this.currentSession.status === 'in_progress') {
      await this.completeReviewSession();
    }

    // Clear caches
    this.aiReviewer.clearCache();

    // Remove event listeners
    this.eventBus.removeAllListeners();

    logger.info('Reviewer component disposed');
  }
}