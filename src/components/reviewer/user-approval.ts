/**
 * User Approval Component (Layer 3)
 * 
 * Handles the user approval workflow including:
 * - Approval decision making based on static analysis and AI review results
 * - User feedback collection and storage
 * - Approval history tracking
 * - Batch approval processing
 * - Integration with database for persistence
 */

import { TypedEventBus, eventBus } from '@/core/event-bus';
import { logger } from '@/utils/loggers';
import { DatabaseConnectionManager } from '@/database/client';
import { CodeFileModel } from '@/database/models/code-file.model';
import {
  UserApprovalRequest,
  ApprovalDecision,
  ReviewSession,
  StaticAnalysisResult,
  AIReviewResult,
  ReviewConfiguration,
  ReviewerEventData,
} from './types';
import { v4 as uuidv4 } from 'uuid';

export interface UserApprovalConfig {
  /** Enable automatic approval for high scores */
  enableAutoApproval: boolean;
  /** Automatic approval threshold (0-100) */
  autoApprovalThreshold: number;
  /** Minimum score that requires approval */
  requireApprovalThreshold: number;
  /** Auto-reject files with critical issues */
  autoRejectCriticalIssues: boolean;
  /** Maximum number of issues that can be ignored */
  maxIgnorableIssues: number;
  /** Approval timeout in minutes */
  approvalTimeoutMinutes: number;
  /** Enable batch approval */
  enableBatchApproval: boolean;
  /** Default reviewer metadata */
  defaultReviewerMetadata?: {
    experience_level: 'junior' | 'mid' | 'senior' | 'expert';
    domain_expertise: string[];
  };
  /** Approval notification settings */
  notifications?: {
    enabled: boolean;
    webhooks?: string[];
    email?: string[];
  };
}

/**
 * User Approval - Layer 3 of the Reviewer system
 * 
 * Handles comprehensive user approval workflow including:
 * - Approval decision making based on static analysis and AI review results
 * - User feedback collection and storage
 * - Approval history tracking
 * - Batch approval processing
 * - Integration with database for persistence
 */
export class UserApproval {
  private config: UserApprovalConfig;
  private eventBus: TypedEventBus;
  private codeFileModel: CodeFileModel;
  private approvalRequests: Map<string, UserApprovalRequest> = new Map();
  private approvalHistory: Map<string, ApprovalDecision[]> = new Map();
  private pendingApprovals: Map<string, Date> = new Map();

  constructor(
    dbManager: DatabaseConnectionManager,
    eventBusInstance?: TypedEventBus,
    config?: Partial<UserApprovalConfig>
  ) {
    this.eventBus = eventBusInstance || eventBus;
    this.codeFileModel = new CodeFileModel(dbManager);

    this.config = {
      enableAutoApproval: true,
      autoApprovalThreshold: 90,
      requireApprovalThreshold: 70,
      autoRejectCriticalIssues: true,
      maxIgnorableIssues: 10,
      approvalTimeoutMinutes: 1440, // 24 hours
      enableBatchApproval: true,
      defaultReviewerMetadata: {
        experience_level: 'mid',
        domain_expertise: []
      },
      ...config
    };

    logger.info('User Approval component initialized', {
      auto_approval_enabled: this.config.enableAutoApproval,
      auto_approval_threshold: this.config.autoApprovalThreshold,
      batch_approval_enabled: this.config.enableBatchApproval
    });
  }

  /**
   * Process approval request for a file
   */
  async processApprovalRequest(request: {
    review_id: string;
    file_id: string;
    file_path: string;
    static_analysis: StaticAnalysisResult;
    ai_review?: AIReviewResult;
    reviewer_notes?: string;
    user_id?: string;
    session_id?: string;
  }): Promise<ApprovalDecision> {
    try {
      logger.info('Processing approval request', {
        file_id: request.file_id,
        file_path: request.file_path
      });

      // Create approval request
      const approvalRequest: UserApprovalRequest = {
        review_id: request.review_id,
        file_id: request.file_id,
        file_path: request.file_path,
        static_analysis: request.static_analysis,
        ai_review: request.ai_review,
        reviewer_notes: request.reviewer_notes,
        requires_approval: false,
        auto_approve_threshold: this.config.autoApprovalThreshold
      };

      // Evaluate if approval is required
      const requiresApproval = await this.evaluateApprovalRequirement(approvalRequest);
      approvalRequest.requires_approval = requiresApproval;

      // Store request
      this.approvalRequests.set(request.file_id, approvalRequest);

      // Emit event
      this.eventBus.emit('approval:request:created', {
        review_id: request.review_id,
        file_id: request.file_id,
        file_path: request.file_path,
        requires_approval: requiresApproval
      });

      // Handle based on approval requirement
      if (requiresApproval) {
        // Add to pending approvals
        this.pendingApprovals.set(request.file_id, new Date());
        
        // Emit approval required event
        this.eventBus.emit('approval:required', approvalRequest);

        logger.info('Approval required for file', {
          file_id: request.file_id,
          file_path: request.file_path
        });

        // Return pending decision
        return {
          review_id: request.review_id,
          file_id: request.file_id,
          user_id: request.user_id,
          decision: 'requires_manual_review',
          reasoning: 'Manual review required due to identified issues',
          timestamp: new Date(),
          reviewer_metadata: this.config.defaultReviewerMetadata
        };
      } else {
        // Auto-approve
        const decision = await this.makeApprovalDecision(approvalRequest, 'auto');
        
        // Store decision
        await this.storeApprovalDecision(decision);
        
        logger.info('File auto-approved', {
          file_id: request.file_id,
          file_path: request.file_path,
          decision: decision.decision
        });

        return decision;
      }

    } catch (error) {
      logger.error('Failed to process approval request', {
        file_id: request.file_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Process approval decision from user
   */
  async processApprovalDecision(decision: {
    review_id: string;
    file_id: string;
    user_id?: string;
    decision: 'approved' | 'rejected' | 'needs_changes';
    reasoning?: string;
    requested_changes?: string[];
    approved_issues?: string[];
    reviewer_metadata?: {
      experience_level?: 'junior' | 'mid' | 'senior' | 'expert';
      domain_expertise?: string[];
      time_spent_seconds?: number;
    };
  }): Promise<ApprovalDecision> {
    try {
      // Validate decision
      this.validateApprovalDecision(decision);

      // Create formal approval decision
      const formalDecision: ApprovalDecision = {
        review_id: decision.review_id,
        file_id: decision.file_id,
        user_id: decision.user_id,
        decision: decision.decision,
        reasoning: decision.reasoning,
        requested_changes: decision.requested_changes,
        approved_issues: decision.approved_issues,
        timestamp: new Date(),
        reviewer_metadata: {
          ...this.config.defaultReviewerMetadata,
          ...decision.reviewer_metadata
        }
      };

      // Store decision
      await this.storeApprovalDecision(formalDecision);

      // Remove from pending approvals
      this.pendingApprovals.delete(decision.file_id);

      // Emit event
      this.eventBus.emit('approval:decision:made', formalDecision);

      logger.info('Approval decision processed', {
        file_id: decision.file_id,
        decision: decision.decision,
        user_id: decision.user_id
      });

      return formalDecision;

    } catch (error) {
      logger.error('Failed to process approval decision', {
        file_id: decision.file_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Process batch approval requests
   */
  async processBatchApproval(
    requests: Array<{
      review_id: string;
      file_id: string;
      file_path: string;
      static_analysis: StaticAnalysisResult;
      ai_review?: AIReviewResult;
      reviewer_notes?: string;
    }>,
    session_id?: string
  ): Promise<{
    auto_approved: ApprovalDecision[];
    requires_review: UserApprovalRequest[];
    rejected: ApprovalDecision[];
    processing_stats: {
      total_files: number;
      auto_approved: number;
      requires_review: number;
      rejected: number;
      processing_time_ms: number;
    };
  }> {
    const startTime = Date.now();
    
    logger.info('Starting batch approval processing', {
      file_count: requests.length
    });

    const autoApproved: ApprovalDecision[] = [];
    const requiresReview: UserApprovalRequest[] = [];
    const rejected: ApprovalDecision[] = [];

    // Process all requests
    for (const request of requests) {
      try {
        const approvalRequest: UserApprovalRequest = {
          review_id: request.review_id,
          file_id: request.file_id,
          file_path: request.file_path,
          static_analysis: request.static_analysis,
          ai_review: request.ai_review,
          reviewer_notes: request.reviewer_notes,
          requires_approval: false,
          auto_approve_threshold: this.config.autoApprovalThreshold
        };

        // Evaluate approval requirement
        const requiresApproval = await this.evaluateApprovalRequirement(approvalRequest);
        approvalRequest.requires_approval = requiresApproval;

        if (requiresApproval) {
          // Check if should be auto-rejected
          const shouldReject = await this.shouldAutoReject(approvalRequest);
          
          if (shouldReject) {
            const rejection = await this.makeApprovalDecision(approvalRequest, 'auto');
            rejected.push(rejection);
            await this.storeApprovalDecision(rejection);
          } else {
            requiresReview.push(approvalRequest);
            this.pendingApprovals.set(request.file_id, new Date());
          }
        } else {
          const approval = await this.makeApprovalDecision(approvalRequest, 'auto');
          autoApproved.push(approval);
          await this.storeApprovalDecision(approval);
        }

      } catch (error) {
        logger.error('Failed to process batch approval for file', {
          file_id: request.file_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const processingStats = {
      total_files: requests.length,
      auto_approved: autoApproved.length,
      requires_review: requiresReview.length,
      rejected: rejected.length,
      processing_time_ms: processingTime
    };

    logger.info('Batch approval processing completed', processingStats);

    // Emit batch completion event
    this.eventBus.emit('approval:batch:completed', {
      session_id,
      processing_stats: processingStats
    });

    return {
      auto_approved: autoApproved,
      requires_review: requiresReview,
      rejected,
      processing_stats: processingStats
    };
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): Array<{
    file_id: string;
    file_path: string;
    review_id: string;
    created_at: Date;
    age_minutes: number;
  }> {
    const now = new Date();
    
    return Array.from(this.pendingApprovals.entries())
      .map(([fileId, createdAt]) => {
        const request = this.approvalRequests.get(fileId);
        if (!request) return null;

        const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        
        return {
          file_id: fileId,
          file_path: request.file_path,
          review_id: request.review_id,
          created_at: createdAt,
          age_minutes: ageMinutes
        };
      })
      .filter(Boolean) as Array<{
        file_id: string;
        file_path: string;
        review_id: string;
        created_at: Date;
        age_minutes: number;
      }>;
  }

  /**
   * Get approval history for a file
   */
  getApprovalHistory(fileId: string): ApprovalDecision[] {
    return this.approvalHistory.get(fileId) || [];
  }

  /**
   * Get approval statistics
   */
  getApprovalStats(): {
    pending_approvals: number;
    auto_approved_today: number;
    manual_reviews_today: number;
    rejection_rate: number;
    average_processing_time_seconds: number;
    timeout_risk_count: number;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Count today's activity
    let autoApprovedToday = 0;
    let manualReviewsToday = 0;
    let totalProcessingTime = 0;
    let processingTimeCount = 0;

    for (const decisions of this.approvalHistory.values()) {
      for (const decision of decisions) {
        if (decision.timestamp >= today) {
          if (decision.decision === 'approved' && decision.reasoning?.includes('auto')) {
            autoApprovedToday++;
          } else {
            manualReviewsToday++;
          }
        }

        if (decision.reviewer_metadata?.time_spent_seconds) {
          totalProcessingTime += decision.reviewer_metadata.time_spent_seconds;
          processingTimeCount++;
        }
      }
    }

    // Calculate timeout risk (approvals older than 80% of timeout)
    const timeoutRiskCount = Array.from(this.pendingApprovals.values())
      .filter(createdAt => {
        const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        const timeoutMinutes = this.config.approvalTimeoutMinutes;
        return ageMinutes > (timeoutMinutes * 0.8);
      }).length;

    const totalDecisions = autoApprovedToday + manualReviewsToday;
    const rejectionRate = totalDecisions > 0 ? 
      (rejectedCountToday(this.approvalHistory) / totalDecisions) * 100 : 0;

    const averageProcessingTime = processingTimeCount > 0 ?
      totalProcessingTime / processingTimeCount : 0;

    return {
      pending_approvals: this.pendingApprovals.size,
      auto_approved_today: autoApprovedToday,
      manual_reviews_today: manualReviewsToday,
      rejection_rate: rejectionRate,
      average_processing_time_seconds: averageProcessingTime,
      timeout_risk_count: timeoutRiskCount
    };
  }

  /**
   * Clean up expired approvals
   */
  async cleanupExpiredApprovals(): Promise<{
    cleaned_count: number;
    expired_files: string[];
  }> {
    const now = new Date();
    const timeoutMinutes = this.config.approvalTimeoutMinutes;
    const expiredFiles: string[] = [];

    for (const [fileId, createdAt] of this.pendingApprovals.entries()) {
      const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      if (ageMinutes >= timeoutMinutes) {
        expiredFiles.push(fileId);
        this.pendingApprovals.delete(fileId);
        
        // Create timeout decision
        const request = this.approvalRequests.get(fileId);
        if (request) {
          const timeoutDecision: ApprovalDecision = {
            review_id: request.review_id,
            file_id: fileId,
            decision: 'requires_manual_review',
            reasoning: `Approval request timed out after ${timeoutMinutes} minutes`,
            timestamp: now
          };
          
          await this.storeApprovalDecision(timeoutDecision);
        }
      }
    }

    logger.info('Cleaned up expired approvals', {
      cleaned_count: expiredFiles.length,
      expired_files: expiredFiles
    });

    return {
      cleaned_count: expiredFiles.length,
      expired_files: expiredFiles
    };
  }

  /**
   * Evaluate if approval is required for a request
   */
  private async evaluateApprovalRequirement(request: UserApprovalRequest): Promise<boolean> {
    // Check static analysis issues
    const staticErrors = request.static_analysis.syntax_issues.filter(i => i.severity === 'error').length +
                        request.static_analysis.type_issues.filter(i => i.severity === 'error').length;
    
    if (staticErrors > 0) {
      return true; // Always require approval for static errors
    }

    // Check AI review score
    if (request.ai_review) {
      const aiScore = request.ai_review.overall_score;
      
      if (aiScore < this.config.requireApprovalThreshold) {
        return true; // Below minimum threshold requires approval
      }
      
      if (aiScore >= this.config.autoApprovalThreshold) {
        return false; // Above auto-approval threshold
      }
      
      // Check for critical issues
      const criticalIssues = request.ai_review.findings.filter(f => f.severity === 'critical').length;
      if (criticalIssues > 0 && this.config.autoRejectCriticalIssues) {
        return true; // Critical issues always require approval
      }
    }

    // Check total issue count
    const totalIssues = request.static_analysis.syntax_issues.length +
                       request.static_analysis.type_issues.length +
                       request.static_analysis.best_practice_issues.length +
                       (request.ai_review?.findings.length || 0);
    
    if (totalIssues > this.config.maxIgnorableIssues) {
      return true; // Too many issues for auto-approval
    }

    return false; // Default to no approval required
  }

  /**
   * Check if file should be auto-rejected
   */
  private async shouldAutoReject(request: UserApprovalRequest): Promise<boolean> {
    // Reject if critical static analysis errors
    const criticalStaticErrors = request.static_analysis.syntax_issues.filter(i => i.severity === 'error').length;
    if (criticalStaticErrors > 0 && this.config.autoRejectCriticalIssues) {
      return true;
    }

    // Reject if very low AI score
    if (request.ai_review) {
      const aiScore = request.ai_review.overall_score;
      if (aiScore < 50) { // Very low score threshold
        return true;
      }
      
      // Reject if too many critical AI findings
      const criticalFindings = request.ai_review.findings.filter(f => f.severity === 'critical').length;
      if (criticalFindings >= 3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Make approval decision based on analysis results
   */
  private async makeApprovalDecision(request: UserApprovalRequest, source: 'auto' | 'manual'): Promise<ApprovalDecision> {
    const shouldReject = await this.shouldAutoReject(request);
    
    if (shouldReject) {
      return {
        review_id: request.review_id,
        file_id: request.file_id,
        decision: 'rejected',
        reasoning: 'Auto-rejected due to critical issues',
        timestamp: new Date()
      };
    }

    return {
      review_id: request.review_id,
      file_id: request.file_id,
      decision: 'approved',
      reasoning: source === 'auto' ? 'Auto-approved based on analysis results' : 'Approved by user',
      timestamp: new Date()
    };
  }

  /**
   * Validate approval decision
   */
  private validateApprovalDecision(decision: {
    decision: string;
    approved_issues?: string[];
    requested_changes?: string[];
  }): void {
    if (!['approved', 'rejected', 'needs_changes'].includes(decision.decision)) {
      throw new Error('Invalid approval decision');
    }

    if (decision.decision === 'needs_changes' && !decision.requested_changes?.length) {
      throw new Error('Requested changes must be provided when decision is needs_changes');
    }

    if (decision.approved_issues && decision.approved_issues.length > this.config.maxIgnorableIssues) {
      throw new Error(`Cannot approve more than ${this.config.maxIgnorableIssues} issues`);
    }
  }

  /**
   * Store approval decision in database and memory
   */
  private async storeApprovalDecision(decision: ApprovalDecision): Promise<void> {
    // Store in memory
    if (!this.approvalHistory.has(decision.file_id)) {
      this.approvalHistory.set(decision.file_id, []);
    }
    this.approvalHistory.get(decision.file_id)!.push(decision);

    // TODO: Store in database when audit-log model is available
    // This would require creating an approval_decisions table
    try {
      // await this.dbManager.query({
      //   text: 'INSERT INTO approval_decisions (id, review_id, file_id, user_id, decision, reasoning, approved_issues, timestamp, reviewer_metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      //   params: [
      //     uuidv4(),
      //     decision.review_id,
      //     decision.file_id,
      //     decision.user_id,
      //     decision.decision,
      //     decision.reasoning,
      //     JSON.stringify(decision.approved_issues || []),
      //     decision.timestamp,
      //     JSON.stringify(decision.reviewer_metadata || {})
      //   ]
      // });
      
      logger.debug('Approval decision stored', {
        file_id: decision.file_id,
        decision: decision.decision
      });
    } catch (error) {
      logger.error('Failed to store approval decision in database', {
        file_id: decision.file_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - continue with in-memory storage
    }
  }

  /**
   * Get component statistics
   */
  getStats(): {
    config: UserApprovalConfig;
    current_load: {
      pending_approvals: number;
      total_requests_today: number;
    };
    performance: {
      auto_approval_rate: number;
      average_approval_time_minutes: number;
      timeout_rate: number;
    };
    capabilities: string[];
  } {
    const stats = this.getApprovalStats();
    
    return {
      config: this.config,
      current_load: {
        pending_approvals: stats.pending_approvals,
        total_requests_today: stats.auto_approved_today + stats.manual_reviews_today
      },
      performance: {
        auto_approval_rate: stats.auto_approved_today > 0 ? 
          (stats.auto_approved_today / (stats.auto_approved_today + stats.manual_reviews_today)) * 100 : 0,
        average_approval_time_minutes: stats.average_processing_time_seconds / 60,
        timeout_rate: stats.timeout_risk_count > 0 ?
          (stats.timeout_risk_count / stats.pending_approvals) * 100 : 0
      },
      capabilities: [
        'Automatic approval based on quality scores',
        'Critical issue auto-rejection',
        'Batch approval processing',
        'Approval timeout management',
        'User feedback collection',
        'Approval history tracking'
      ]
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UserApprovalConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}

/**
 * Helper function to count rejected decisions today
 */
function rejectedCountToday(approvalHistory: Map<string, any[]>): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let count = 0;
  for (const decisions of approvalHistory.values()) {
    for (const decision of decisions) {
      if (decision.timestamp >= today && decision.decision === 'rejected') {
        count++;
      }
    }
  }
  
  return count;
}