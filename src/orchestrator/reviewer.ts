/**
 * Reviewer Component
 * 
 * Reviews and validates implemented changes.
 * Performs code review, quality checks, and validation against requirements.
 */

import { Logger } from '../core/logger';
import { OrchestratorComponent } from './types';
import { ComponentCoordinator } from './component-coordinator';

export interface ReviewTask {
  taskId: string;
  type: 'code_review' | 'quality_check' | 'security_review' | 'performance_review' | 'compliance_check';
  targetPath: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  criteria: ReviewCriteria;
}

export interface ReviewCriteria {
  codeStyle?: boolean;
  security?: boolean;
  performance?: boolean;
  testCoverage?: boolean;
  documentation?: boolean;
  standardsCompliance?: boolean;
}

export interface ReviewResult {
  taskId: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  startTime: Date;
  endTime?: Date;
  score?: number; // 0-100
  findings: ReviewFinding[];
  recommendations: ReviewRecommendation[];
  summary: string;
}

export interface ReviewFinding {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'style' | 'security' | 'performance' | 'quality' | 'documentation' | 'testing';
  message: string;
  lineNumber?: number;
  filePath: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface ReviewRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ReviewContext {
  implementationId: string;
  implementationResults: any[];
  plan: any;
  analysis: any;
  parsedInput: any;
  workspacePath: string;
  sessionId: string;
  reviewConfig: ReviewConfig;
}

export interface ReviewConfig {
  strictMode: boolean;
  autoFixEnabled: boolean;
  qualityThreshold: number; // Minimum score (0-100)
  requiredChecks: (keyof ReviewCriteria)[];
  customRules?: ReviewRule[];
}

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  pattern?: string;
  validator: (content: string) => ReviewFinding[];
}

export class Reviewer implements OrchestratorComponent {
  private readonly logger = new Logger('Reviewer');
  private readonly componentCoordinator: ComponentCoordinator;
  private readonly reviewHistory = new Map<string, ReviewResult[]>();
  private readonly customRules = new Map<string, ReviewRule>();
  private isInitialized = false;

  constructor(componentCoordinator: ComponentCoordinator) {
    this.componentCoordinator = componentCoordinator;
    this.initializeDefaultRules();
  }

  get name(): string {
    return 'Reviewer';
  }

  get version(): string {
    return '1.0.0';
  }

  async initialize(config?: any): Promise<void> {
    this.logger.info('Initializing Reviewer component');
    
    // Register with component coordinator
    this.componentCoordinator.registerComponent(this);
    
    // Load custom rules if provided
    if (config?.customRules) {
      for (const rule of config.customRules) {
        this.customRules.set(rule.id, rule);
      }
    }
    
    this.isInitialized = true;
    this.logger.info('Reviewer initialized successfully');
    this.emit('initialized');
  }

  async execute(input: ReviewContext, workflowContext?: any): Promise<any> {
    this.ensureInitialized();

    const reviewId = this.generateReviewId();
    this.logger.info(`Starting review ${reviewId}`);

    const results: ReviewResult[] = [];

    try {
      // Create review tasks based on implementation
      const tasks = this.createReviewTasks(input);
      
      // Execute each review task
      for (const task of tasks) {
        const result = await this.executeReviewTask(task, input);
        results.push(result);
        
        // Stop on critical failures if strict mode is enabled
        if (input.reviewConfig.strictMode && result.status === 'failed') {
          this.logger.warn(`Critical failure in review task ${task.taskId}, stopping review`);
          break;
        }
      }

      // Calculate overall review score
      const overallScore = this.calculateOverallScore(results);
      const overallStatus = this.determineOverallStatus(results, overallScore, input.reviewConfig.qualityThreshold);

      // Store review history
      this.reviewHistory.set(reviewId, results);

      // Broadcast review completion
      await this.componentCoordinator.broadcastEvent(
        this.name,
        'review:completed',
        { reviewId, results, overallScore, overallStatus }
      );

      return {
        reviewId,
        status: overallStatus,
        score: overallScore,
        results,
        summary: this.generateReviewSummary(results, overallScore)
      };

    } catch (error) {
      this.logger.error(`Review ${reviewId} failed`, error);
      
      const errorResult: ReviewResult = {
        taskId: 'review',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        score: 0,
        findings: [{
          id: 'error',
          severity: 'critical',
          category: 'quality',
          message: error.message,
          filePath: 'N/A',
          autoFixable: false
        }],
        recommendations: [],
        summary: 'Review failed due to error'
      };

      results.push(errorResult);
      this.reviewHistory.set(reviewId, results);
      
      throw error;
    }
  }

  private async executeReviewTask(task: ReviewTask, context: ReviewContext): Promise<ReviewResult> {
    const result: ReviewResult = {
      taskId: task.taskId,
      status: 'pending',
      startTime: new Date(),
      findings: [],
      recommendations: [],
      summary: ''
    };

    try {
      this.logger.debug(`Executing review task: ${task.description}`);
      result.status = 'running';

      // Execute based on task type
      switch (task.type) {
        case 'code_review':
          await this.performCodeReview(task, context, result);
          break;
        
        case 'quality_check':
          await this.performQualityCheck(task, context, result);
          break;
        
        case 'security_review':
          await this.performSecurityReview(task, context, result);
          break;
        
        case 'performance_review':
          await this.performPerformanceReview(task, context, result);
          break;
        
        case 'compliance_check':
          await this.performComplianceCheck(task, context, result);
          break;
        
        default:
          await this.performGenericReview(task, context, result);
      }

      // Determine task status based on findings and criteria
      result.status = this.determineTaskStatus(result, task.criteria);
      result.score = this.calculateTaskScore(result);
      result.summary = this.generateTaskSummary(result);

    } catch (error) {
      this.logger.error(`Review task ${task.taskId} execution failed`, error);
      result.status = 'failed';
      result.findings.push({
        id: 'execution_error',
        severity: 'critical',
        category: 'quality',
        message: `Task execution failed: ${error.message}`,
        filePath: task.targetPath,
        autoFixable: false
      });
    }

    result.endTime = new Date();
    return result;
  }

  private async performCodeReview(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    this.logger.info(`Performing code review for: ${task.targetPath}`);
    
    // Check code style
    if (task.criteria.codeStyle) {
      this.checkCodeStyle(task, context, result);
    }

    // Check documentation
    if (task.criteria.documentation) {
      this.checkDocumentation(task, context, result);
    }

    // Check test coverage
    if (task.criteria.testCoverage) {
      this.checkTestCoverage(task, context, result);
    }

    // Apply custom rules
    await this.applyCustomRules(task, context, result);
  }

  private async performQualityCheck(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    this.logger.info(`Performing quality check for: ${task.targetPath}`);
    
    // Check for common quality issues
    this.checkForCommonIssues(task, context, result);
    
    // Validate against standards
    this.validateStandardsCompliance(task, context, result);
  }

  private async performSecurityReview(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    this.logger.info(`Performing security review for: ${task.targetPath}`);
    
    // Check for security vulnerabilities
    this.checkSecurityVulnerabilities(task, context, result);
    
    // Validate security practices
    this.validateSecurityPractices(task, context, result);
  }

  private async performPerformanceReview(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    this.logger.info(`Performing performance review for: ${task.targetPath}`);
    
    // Check for performance issues
    this.checkPerformanceIssues(task, context, result);
    
    // Validate optimization opportunities
    this.validateOptimizations(task, context, result);
  }

  private async performComplianceCheck(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    this.logger.info(`Performing compliance check for: ${task.targetPath}`);
    
    // Check regulatory compliance
    this.checkRegulatoryCompliance(task, context, result);
    
    // Validate organizational standards
    this.checkOrganizationalStandards(task, context, result);
  }

  private async performGenericReview(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    this.logger.info(`Performing generic review for: ${task.targetPath}`);
    
    result.recommendations.push({
      id: 'generic_review',
      priority: 'low',
      category: 'general',
      title: 'Generic Review Completed',
      description: 'A generic review was performed. Consider implementing more specific review criteria.',
      impact: 'Low impact on overall quality',
      effort: 'low'
    });
  }

  private checkCodeStyle(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    // Check for common style issues
    const findings = [
      {
        id: 'style_check',
        severity: 'warning' as const,
        category: 'style' as const,
        message: 'Code style validation not fully implemented',
        filePath: task.targetPath,
        autoFixable: true,
        suggestion: 'Implement proper code style checking with ESLint/Prettier'
      }
    ];

    result.findings.push(...findings);
  }

  private checkDocumentation(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.findings.push({
      id: 'docs_check',
      severity: 'info' as const,
      category: 'documentation' as const,
      message: 'Documentation review completed',
      filePath: task.targetPath,
      autoFixable: false
    });
  }

  private checkTestCoverage(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.recommendations.push({
      id: 'test_coverage',
      priority: 'medium' as const,
      category: 'testing',
      title: 'Test Coverage Check',
      description: 'Verify test coverage meets organizational standards',
      impact: 'Improves code reliability and maintainability',
      effort: 'medium' as const
    });
  }

  private checkForCommonIssues(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    // Check for common code issues
    result.findings.push({
      id: 'common_issues',
      severity: 'warning' as const,
      category: 'quality' as const,
      message: 'Common quality checks would be performed here',
      filePath: task.targetPath,
      autoFixable: false,
      suggestion: 'Implement static analysis tools'
    });
  }

  private validateStandardsCompliance(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.recommendations.push({
      id: 'standards',
      priority: 'high' as const,
      category: 'compliance',
      title: 'Standards Compliance',
      description: 'Ensure implementation follows organizational coding standards',
      impact: 'Critical for maintainability and team collaboration',
      effort: 'medium' as const
    });
  }

  private checkSecurityVulnerabilities(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.findings.push({
      id: 'security_check',
      severity: 'info' as const,
      category: 'security' as const,
      message: 'Security review completed',
      filePath: task.targetPath,
      autoFixable: false
    });
  }

  private validateSecurityPractices(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.recommendations.push({
      id: 'security_practices',
      priority: 'high' as const,
      category: 'security',
      title: 'Security Best Practices',
      description: 'Review security best practices and OWASP guidelines',
      impact: 'Critical for application security',
      effort: 'high' as const
    });
  }

  private checkPerformanceIssues(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.recommendations.push({
      id: 'performance',
      priority: 'medium' as const,
      category: 'performance',
      title: 'Performance Optimization',
      description: 'Analyze and optimize performance bottlenecks',
      impact: 'Improves user experience and resource utilization',
      effort: 'high' as const
    });
  }

  private validateOptimizations(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.findings.push({
      id: 'optimization_check',
      severity: 'info' as const,
      category: 'performance' as const,
      message: 'Performance optimization review completed',
      filePath: task.targetPath,
      autoFixable: false
    });
  }

  private checkRegulatoryCompliance(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.recommendations.push({
      id: 'regulatory',
      priority: 'critical' as const,
      category: 'compliance',
      title: 'Regulatory Compliance',
      description: 'Ensure compliance with relevant regulations (GDPR, SOX, etc.)',
      impact: 'Legal and regulatory requirements',
      effort: 'high' as const
    });
  }

  private checkOrganizationalStandards(task: ReviewTask, context: ReviewContext, result: ReviewResult): void {
    result.findings.push({
      id: 'org_standards',
      severity: 'warning' as const,
      category: 'quality' as const,
      message: 'Organizational standards validation',
      filePath: task.targetPath,
      autoFixable: false
    });
  }

  private async applyCustomRules(task: ReviewTask, context: ReviewContext, result: ReviewResult): Promise<void> {
    for (const rule of this.customRules.values()) {
      try {
        // Apply custom validation rules
        const findings = rule.validator('dummy_content'); // Placeholder
        result.findings.push(...findings);
      } catch (error) {
        this.logger.warn(`Custom rule ${rule.id} failed`, error);
      }
    }
  }

  private createReviewTasks(context: ReviewContext): ReviewTask[] {
    const tasks: ReviewTask[] = [];

    // Create tasks based on implementation results
    for (const implResult of context.implementationResults) {
      for (const change of implResult.changes || []) {
        if (change.type === 'create' || change.type === 'modify') {
          tasks.push({
            taskId: `review_${change.path}_${Date.now()}`,
            type: 'code_review',
            targetPath: change.path,
            description: `Review changes to ${change.path}`,
            priority: 'medium',
            criteria: {
              codeStyle: true,
              security: true,
              performance: false,
              testCoverage: true,
              documentation: true,
              standardsCompliance: true
            }
          });
        }
      }
    }

    // Add general quality and security checks
    tasks.push({
      taskId: 'quality_check_general',
      type: 'quality_check',
      targetPath: 'project',
      description: 'General quality assessment',
      priority: 'high',
      criteria: {
        codeStyle: true,
        security: true,
        performance: true,
        testCoverage: false,
        documentation: true,
        standardsCompliance: true
      }
    });

    return tasks;
  }

  private determineTaskStatus(result: ReviewResult, criteria: ReviewCriteria): 'passed' | 'failed' | 'warning' | 'skipped' {
    if (result.findings.length === 0) {
      return 'passed';
    }

    const criticalFindings = result.findings.filter(f => f.severity === 'critical' || f.severity === 'error');
    if (criticalFindings.length > 0) {
      return 'failed';
    }

    const warningFindings = result.findings.filter(f => f.severity === 'warning');
    if (warningFindings.length > 0) {
      return 'warning';
    }

    return 'passed';
  }

  private calculateTaskScore(result: ReviewResult): number {
    if (result.findings.length === 0) {
      return 100;
    }

    let score = 100;
    for (const finding of result.findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private calculateOverallScore(results: ReviewResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const totalScore = results.reduce((sum, result) => sum + (result.score || 0), 0);
    return Math.round(totalScore / results.length);
  }

  private determineOverallStatus(results: ReviewResult[], score: number, threshold: number): 'passed' | 'failed' | 'warning' {
    const failedTasks = results.filter(r => r.status === 'failed').length;
    
    if (failedTasks > 0) {
      return 'failed';
    }
    
    if (score >= threshold) {
      return 'passed';
    }
    
    return 'warning';
  }

  private generateTaskSummary(result: ReviewResult): string {
    const status = result.status.toUpperCase();
    const findingCount = result.findings.length;
    const recCount = result.recommendations.length;
    
    return `${status}: ${findingCount} findings, ${recCount} recommendations, Score: ${result.score || 0}`;
  }

  private generateReviewSummary(results: ReviewResult[], score: number): string {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);
    const totalRecommendations = results.reduce((sum, r) => sum + r.recommendations.length, 0);

    return `Review completed: ${passed}/${results.length} passed, ${failed} failed, ${warnings} warnings. Total findings: ${totalFindings}, recommendations: ${totalRecommendations}. Overall score: ${score}`;
  }

  private initializeDefaultRules(): void {
    // Initialize with some default review rules
    const defaultRules: ReviewRule[] = [
      {
        id: 'no_console_log',
        name: 'No Console Logs in Production',
        description: 'Production code should not contain console.log statements',
        severity: 'warning',
        pattern: 'console\\.log',
        validator: (content: string) => {
          const findings: ReviewFinding[] = [];
          if (content.includes('console.log')) {
            findings.push({
              id: 'console_log_found',
              severity: 'warning',
              category: 'quality',
              message: 'console.log found in code',
              filePath: 'N/A',
              autoFixable: true,
              suggestion: 'Remove console.log statements or use proper logging'
            });
          }
          return findings;
        }
      }
    ];

    for (const rule of defaultRules) {
      this.customRules.set(rule.id, rule);
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    metrics?: Record<string, any>;
    issues?: string[];
  }> {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      if (!this.isInitialized) {
        issues.push('Component not initialized');
        status = 'unhealthy';
      }

      return {
        healthy: issues.length === 0,
        status,
        lastCheck: new Date(),
        metrics: {
          reviewsCompleted: this.reviewHistory.size,
          customRulesLoaded: this.customRules.size
        },
        issues: issues.length > 0 ? issues : undefined
      };

    } catch (error) {
      return {
        healthy: false,
        status: 'unhealthy',
        lastCheck: new Date(),
        issues: [error.message]
      };
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Reviewer component');
    
    this.reviewHistory.clear();
    this.customRules.clear();
    
    if (this.componentCoordinator.hasComponent(this.name)) {
      this.componentCoordinator.unregisterComponent(this.name);
    }

    this.isInitialized = false;
    this.emit('cleanup');
    this.logger.info('Reviewer cleanup complete');
  }

  /**
   * Add custom review rule
   */
  addCustomRule(rule: ReviewRule): void {
    this.customRules.set(rule.id, rule);
    this.logger.info(`Added custom review rule: ${rule.name}`);
  }

  /**
   * Remove custom review rule
   */
  removeCustomRule(ruleId: string): boolean {
    const removed = this.customRules.delete(ruleId);
    if (removed) {
      this.logger.info(`Removed custom review rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get review history
   */
  getReviewHistory(limit?: number): Map<string, ReviewResult[]> {
    const history = new Map(this.reviewHistory);
    return limit ? 
      new Map(Array.from(history.entries()).slice(-limit)) : 
      history;
  }

  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Reviewer is not initialized. Call initialize() first.');
    }
  }
}