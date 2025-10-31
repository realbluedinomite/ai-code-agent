/**
 * AI Reviewer Component (Layer 2)
 * 
 * Performs intelligent code review using Groq AI including:
 * - Logic analysis and optimization suggestions
 * - Architecture review and patterns detection
 * - Security vulnerability detection
 * - Performance analysis and recommendations
 * - Maintainability and readability scoring
 */

import { TypedEventBus, eventBus } from '@/core/event-bus';
import { logger } from '@/utils/loggers';
import { DatabaseConnectionManager } from '@/database/client';
import { CodeFileModel } from '@/database/models/code-file.model';
import {
  AIReviewRequest,
  AIReviewResult,
  AIReviewFinding,
  ReviewConfiguration,
  ReviewerEventData,
} from './types';
import { GroqAIProvider } from '@/providers/groq-ai-provider';
import { AIProviderError } from '@/providers/ai-provider';

export interface AIReviewerConfig {
  /** Groq API configuration */
  groqConfig: {
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };
  /** Enable specific analysis types */
  enableLogicAnalysis: boolean;
  enableSecurityAnalysis: boolean;
  enablePerformanceAnalysis: boolean;
  enableArchitectureAnalysis: boolean;
  enableReadabilityAnalysis: boolean;
  /** Scoring weights */
  scoringWeights: {
    logic: number;
    security: number;
    performance: number;
    architecture: number;
    readability: number;
  };
  /** Minimum confidence threshold for findings */
  minConfidenceThreshold: number;
  /** Maximum findings per category */
  maxFindingsPerCategory: number;
  /** Analysis context */
  analysisContext?: {
    project_type?: string;
    framework?: string;
    language_version?: string;
    deployment_environment?: string;
  };
}

/**
 * AI Reviewer - Layer 2 of the Reviewer system
 * 
 * Performs comprehensive AI-powered code review using Groq AI including:
 * - Logic analysis and optimization suggestions
 * - Architecture review and patterns detection
 * - Security vulnerability detection
 * - Performance analysis and recommendations
 * - Maintainability and readability scoring
 */
export class AIReviewer {
  private config: AIReviewerConfig;
  private eventBus: TypedEventBus;
  private codeFileModel: CodeFileModel;
  private groqProvider: GroqAIProvider;
  private analysisCache: Map<string, AIReviewResult> = new Map();

  constructor(
    dbManager: DatabaseConnectionManager,
    eventBusInstance?: TypedEventBus,
    config?: Partial<AIReviewerConfig>
  ) {
    this.eventBus = eventBusInstance || eventBus;
    this.codeFileModel = new CodeFileModel(dbManager);

    if (!config?.groqConfig?.apiKey) {
      throw new Error('Groq API key is required for AI Reviewer');
    }

    this.config = {
      enableLogicAnalysis: true,
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
      enableArchitectureAnalysis: true,
      enableReadabilityAnalysis: true,
      minConfidenceThreshold: 0.7,
      maxFindingsPerCategory: 10,
      scoringWeights: {
        logic: 0.25,
        security: 0.25,
        performance: 0.2,
        architecture: 0.15,
        readability: 0.15
      },
      ...config
    };

    // Initialize Groq provider
    this.groqProvider = new GroqAIProvider({
      apiKey: this.config.groqConfig.apiKey,
      defaultModel: this.config.groqConfig.model,
      temperature: this.config.groqConfig.temperature || 0.1,
      maxTokens: this.config.groqConfig.maxTokens || 2048,
      timeout: this.config.groqConfig.timeout || 60000
    });

    logger.info('AI Reviewer initialized', {
      model: this.config.groqConfig.model,
      enabled_analysis_types: this.getEnabledAnalysisTypes()
    });
  }

  /**
   * Review a single code file using AI
   */
  async reviewFile(request: AIReviewRequest): Promise<AIReviewResult> {
    const startTime = Date.now();

    try {
      // Emit event for AI review start
      this.eventBus.emit('ai:review:started', {
        file_id: request.file_id,
        file_path: request.file_path,
        session_id: 'unknown'
      });

      logger.info('Starting AI code review', {
        file_id: request.file_id,
        file_path: request.file_path,
        content_length: request.content.length
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey)!;
        logger.info('Returning cached AI review result', { file_id: request.file_id });
        return cached;
      }

      // Prepare analysis prompt
      const prompt = await this.buildAnalysisPrompt(request);

      // Run AI analysis
      const aiResponse = await this.groqProvider.completeText({
        prompt,
        maxTokens: this.config.groqConfig.maxTokens,
        temperature: this.config.groqConfig.temperature
      });

      // Parse AI response
      const analysisResult = await this.parseAIResponse(aiResponse, request);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(analysisResult);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysisResult);
      const strengths = this.identifyStrengths(analysisResult);
      const weaknesses = this.identifyWeaknesses(analysisResult);

      const result: AIReviewResult = {
        file_id: request.file_id,
        file_path: request.file_path,
        overall_score: overallScore,
        findings: analysisResult,
        summary: this.generateSummary(analysisResult),
        recommendations,
        strengths,
        weaknesses,
        timestamp: new Date(),
        processing_time_ms: Date.now() - startTime
      };

      // Cache result
      this.analysisCache.set(cacheKey, result);

      // Emit success event
      this.eventBus.emit('ai:review:completed', {
        file_id: request.file_id,
        findings_count: analysisResult.length,
        overall_score: overallScore,
        processing_time_ms: Date.now() - startTime
      });

      logger.info('AI review completed', {
        file_id: request.file_id,
        overall_score: overallScore,
        findings_count: analysisResult.length,
        processing_time_ms: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('AI review failed', {
        file_id: request.file_id,
        file_path: request.file_path,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: processingTime
      });

      // Emit error event
      this.eventBus.emit('ai:review:error', {
        file_id: request.file_id,
        file_path: request.file_path,
        error,
        processing_time_ms: processingTime
      });

      throw error;
    }
  }

  /**
   * Review multiple files in batch
   */
  async reviewFiles(requests: AIReviewRequest[]): Promise<AIReviewResult[]> {
    logger.info('Starting batch AI review', { file_count: requests.length });

    const results: AIReviewResult[] = [];
    const errors: Array<{ file_id: string; error: Error }> = [];

    // Process files with limited concurrency to avoid rate limits
    const concurrency = Math.min(requests.length, 3); // Limit to 3 concurrent reviews
    const chunks = this.chunkArray(requests, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (request) => {
        try {
          const result = await this.reviewFile(request);
          return { success: true, result, error: null };
        } catch (error) {
          errors.push({
            file_id: request.file_id,
            error: error instanceof Error ? error : new Error('Unknown error')
          });
          return { success: false, result: null, error };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      for (const chunkResult of chunkResults) {
        if (chunkResult.success && chunkResult.result) {
          results.push(chunkResult.result);
        }
      }

      // Add delay between chunks to respect rate limits
      if (chunks.length > 1) {
        await this.delay(1000); // 1 second delay between chunks
      }
    }

    logger.info('Batch AI review completed', {
      total_files: requests.length,
      successful: results.length,
      failed: errors.length
    });

    if (errors.length > 0) {
      logger.warn('Some files failed AI review', {
        error_count: errors.length,
        errors: errors.map(e => ({ file_id: e.file_id, error: e.error.message }))
      });
    }

    return results;
  }

  /**
   * Build comprehensive analysis prompt for AI
   */
  private async buildAnalysisPrompt(request: AIReviewRequest): Promise<string> {
    const context = this.buildContextString(request.context);
    const analysisTypes = this.getEnabledAnalysisTypes();
    
    const systemPrompt = `You are an expert code reviewer and software architect. Analyze the provided code thoroughly and identify issues, improvements, and opportunities across multiple dimensions.

Analysis Context:
${context}

Enabled Analysis Types:
${analysisTypes.map(type => `- ${type}`).join('\n')}

For each finding you identify, provide:
1. Category (logic, architecture, security, performance, maintainability, readability)
2. Severity (critical, high, medium, low, info)
3. Line number (if applicable)
4. Clear description of the issue
5. Detailed explanation of why it's a problem
6. Specific suggestion for improvement
7. Code example if relevant
8. Confidence score (0-1)

Focus on:
- Security vulnerabilities and unsafe practices
- Performance bottlenecks and optimization opportunities
- Code complexity and maintainability issues
- Architecture and design pattern problems
- Logic errors and edge cases
- Best practices and industry standards

Be specific, actionable, and constructive in your feedback.`;

    const codePrompt = `Please analyze the following ${request.language} code:

File: ${request.file_path}
Language: ${request.language}

\`\`\`${request.language}
${request.content}
\`\`\`

Provide your analysis in the following JSON format:

{
  "findings": [
    {
      "category": "logic|architecture|security|performance|maintainability|readability",
      "severity": "critical|high|medium|low|info",
      "line": 123,
      "message": "Brief description of the issue",
      "explanation": "Detailed explanation of why this is a problem",
      "suggestion": "Specific recommendation for improvement",
      "code_example": "Example of better code (optional)",
      "confidence": 0.95
    }
  ]
}`;

    return `${systemPrompt}\n\n${codePrompt}`;
  }

  /**
   * Build context string for analysis
   */
  private buildContextString(context?: AIReviewRequest['context']): string {
    if (!context) return 'No additional context provided.';

    const contextParts: string[] = [];

    if (context.project_type) {
      contextParts.push(`Project Type: ${context.project_type}`);
    }

    if (context.framework) {
      contextParts.push(`Framework: ${context.framework}`);
    }

    if (context.dependencies) {
      contextParts.push(`Key Dependencies: ${context.dependencies.join(', ')}`);
    }

    if (context.file_dependencies) {
      contextParts.push(`Related Files: ${context.file_dependencies.join(', ')}`);
    }

    return contextParts.length > 0 ? contextParts.join('\n') : 'No additional context provided.';
  }

  /**
   * Get list of enabled analysis types
   */
  private getEnabledAnalysisTypes(): string[] {
    const types: string[] = [];
    
    if (this.config.enableLogicAnalysis) types.push('Logic Analysis');
    if (this.config.enableSecurityAnalysis) types.push('Security Analysis');
    if (this.config.enablePerformanceAnalysis) types.push('Performance Analysis');
    if (this.config.enableArchitectureAnalysis) types.push('Architecture Analysis');
    if (this.config.enableReadabilityAnalysis) types.push('Readability Analysis');
    
    return types;
  }

  /**
   * Parse AI response and extract findings
   */
  private async parseAIResponse(response: string, request: AIReviewRequest): Promise<AIReviewFinding[]> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      const findings = parsedResponse.findings || [];

      // Validate and clean findings
      const validFindings: AIReviewFinding[] = findings
        .filter((finding: any) => this.validateFinding(finding))
        .map((finding: any) => this.normalizeFinding(finding, request));

      // Filter by confidence threshold
      const filteredFindings = validFindings.filter(finding => 
        finding.confidence >= this.config.minConfidenceThreshold
      );

      // Limit findings per category
      const findingsByCategory = new Map<string, AIReviewFinding[]>();
      for (const finding of filteredFindings) {
        const category = finding.category;
        if (!findingsByCategory.has(category)) {
          findingsByCategory.set(category, []);
        }
        
        const categoryFindings = findingsByCategory.get(category)!;
        if (categoryFindings.length < this.config.maxFindingsPerCategory) {
          categoryFindings.push(finding);
        }
      }

      return Array.from(findingsByCategory.values()).flat();

    } catch (error) {
      logger.error('Failed to parse AI response', {
        file_id: request.file_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        response_preview: response.substring(0, 500)
      });

      // Return a fallback finding indicating parsing failure
      return [{
        id: `parse_error_${request.file_id}`,
        category: 'readability',
        severity: 'info',
        message: 'AI analysis completed but response format could not be parsed',
        explanation: 'The AI returned an unexpected response format. Manual review may be needed.',
        confidence: 0.5,
        auto_fixable: false
      }];
    }
  }

  /**
   * Validate AI finding structure
   */
  private validateFinding(finding: any): boolean {
    return (
      finding &&
      typeof finding === 'object' &&
      finding.category &&
      finding.severity &&
      finding.message &&
      finding.explanation &&
      typeof finding.confidence === 'number' &&
      finding.confidence >= 0 &&
      finding.confidence <= 1
    );
  }

  /**
   * Normalize and clean AI finding
   */
  private normalizeFinding(finding: any, request: AIReviewRequest): AIReviewFinding {
    return {
      id: `ai_${request.file_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: this.normalizeCategory(finding.category),
      severity: this.normalizeSeverity(finding.severity),
      line: finding.line,
      message: this.cleanText(finding.message),
      explanation: this.cleanText(finding.explanation),
      suggestion: finding.suggestion ? this.cleanText(finding.suggestion) : undefined,
      code_example: finding.code_example ? this.cleanText(finding.code_example) : undefined,
      references: finding.references || [],
      auto_fixable: Boolean(finding.auto_fixable || false)
    };
  }

  /**
   * Normalize finding category
   */
  private normalizeCategory(category: string): AIReviewFinding['category'] {
    const categoryMap: Record<string, AIReviewFinding['category']> = {
      'logic': 'logic',
      'architecture': 'architecture',
      'security': 'security',
      'performance': 'performance',
      'maintainability': 'maintainability',
      'readability': 'readability'
    };

    return categoryMap[category.toLowerCase()] || 'readability';
  }

  /**
   * Normalize finding severity
   */
  private normalizeSeverity(severity: string): AIReviewFinding['severity'] {
    const severityMap: Record<string, AIReviewFinding['severity']> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'info'
    };

    return severityMap[severity.toLowerCase()] || 'info';
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[^\w\s.,;:!?()[\]{}'"-]/g, '') // Remove special characters except common punctuation
      .trim();
  }

  /**
   * Calculate overall score based on findings and scoring weights
   */
  private calculateOverallScore(findings: AIReviewFinding[]): number {
    const categoryScores: Record<string, { score: number; weight: number }> = {
      logic: { score: 100, weight: this.config.scoringWeights.logic },
      security: { score: 100, weight: this.config.scoringWeights.security },
      performance: { score: 100, weight: this.config.scoringWeights.performance },
      architecture: { score: 100, weight: this.config.scoringWeights.architecture },
      readability: { score: 100, weight: this.config.scoringWeights.readability }
    };

    // Calculate penalty for each finding
    for (const finding of findings) {
      const category = finding.category;
      if (categoryScores[category]) {
        const severityPenalty = this.getSeverityPenalty(finding.severity);
        const confidenceWeight = finding.confidence;
        const penalty = severityPenalty * confidenceWeight;
        
        categoryScores[category].score -= penalty;
      }
    }

    // Calculate weighted average
    let totalScore = 0;
    let totalWeight = 0;

    for (const [category, data] of Object.entries(categoryScores)) {
      const score = Math.max(0, Math.min(100, data.score));
      totalScore += score * data.weight;
      totalWeight += data.weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Get severity penalty score
   */
  private getSeverityPenalty(severity: AIReviewFinding['severity']): number {
    const penalties: Record<AIReviewFinding['severity'], number> = {
      'critical': 25,
      'high': 15,
      'medium': 8,
      'low': 3,
      'info': 1
    };

    return penalties[severity] || 1;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(findings: AIReviewFinding[]): string[] {
    const recommendations: string[] = [];
    const findingsBySeverity = {
      critical: findings.filter(f => f.severity === 'critical'),
      high: findings.filter(f => f.severity === 'high'),
      medium: findings.filter(f => f.severity === 'medium'),
      low: findings.filter(f => f.severity === 'low')
    };

    // Priority recommendations
    if (findingsBySeverity.critical.length > 0) {
      recommendations.push(`Address ${findingsBySeverity.critical.length} critical issues immediately`);
    }

    if (findingsBySeverity.high.length > 0) {
      recommendations.push(`Prioritize fixing ${findingsBySeverity.high.length} high-severity issues`);
    }

    // Category-based recommendations
    const securityIssues = findings.filter(f => f.category === 'security').length;
    if (securityIssues > 0) {
      recommendations.push(`Review and improve security practices (${securityIssues} security issues found)`);
    }

    const performanceIssues = findings.filter(f => f.category === 'performance').length;
    if (performanceIssues > 0) {
      recommendations.push(`Optimize performance bottlenecks (${performanceIssues} performance issues identified)`);
    }

    const readabilityIssues = findings.filter(f => f.category === 'readability').length;
    if (readabilityIssues > 0) {
      recommendations.push(`Improve code readability and documentation (${readabilityIssues} readability issues)`);
    }

    // Auto-fixable issues
    const autoFixableIssues = findings.filter(f => f.auto_fixable).length;
    if (autoFixableIssues > 0) {
      recommendations.push(`Consider using automated fixes for ${autoFixableIssues} issues`);
    }

    return recommendations;
  }

  /**
   * Identify code strengths
   */
  private identifyStrengths(findings: AIReviewFinding[]): string[] {
    const strengths: string[] = [];
    const criticalAndHighFindings = findings.filter(f => 
      f.severity === 'critical' || f.severity === 'high'
    );

    if (criticalAndHighFindings.length === 0) {
      strengths.push('No critical or high-severity issues detected');
    }

    const lowFindingCount = findings.filter(f => f.severity === 'low' || f.severity === 'info').length;
    if (lowFindingCount === 0) {
      strengths.push('Code quality is excellent with minimal issues');
    }

    const categoryCoverage = new Set(findings.map(f => f.category));
    if (categoryCoverage.size >= 4) {
      strengths.push('Comprehensive code analysis performed across multiple dimensions');
    }

    return strengths;
  }

  /**
   * Identify code weaknesses
   */
  private identifyWeaknesses(findings: AIReviewFinding[]): string[] {
    const weaknesses: string[] = [];

    const criticalIssues = findings.filter(f => f.severity === 'critical');
    if (criticalIssues.length > 0) {
      weaknesses.push(`${criticalIssues.length} critical issues require immediate attention`);
    }

    const securityIssues = findings.filter(f => f.category === 'security');
    if (securityIssues.length > 0) {
      weaknesses.push(`Security vulnerabilities present (${securityIssues.length} issues)`);
    }

    const performanceIssues = findings.filter(f => f.category === 'performance');
    if (performanceIssues.length > 0) {
      weaknesses.push(`Performance optimization opportunities identified (${performanceIssues.length} issues)`);
    }

    const maintainabilityIssues = findings.filter(f => f.category === 'maintainability');
    if (maintainabilityIssues.length > 0) {
      weaknesses.push(`Maintainability concerns noted (${maintainabilityIssues.length} issues)`);
    }

    return weaknesses;
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(findings: AIReviewFinding[]): string {
    const totalFindings = findings.length;
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;

    const categories = new Set(findings.map(f => f.category));
    
    let summary = `Analysis found ${totalFindings} issues across ${categories.size} categories.`;
    
    if (criticalCount > 0) {
      summary += ` ${criticalCount} critical issues require immediate attention.`;
    }
    
    if (highCount > 0) {
      summary += ` ${highCount} high-severity issues should be addressed soon.`;
    }
    
    if (mediumCount > 0) {
      summary += ` ${mediumCount} medium-severity issues should be reviewed.`;
    }
    
    if (lowCount > 0) {
      summary += ` ${lowCount} low-severity issues for improvement.`;
    }

    return summary;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIReviewRequest): string {
    const content = request.content;
    const context = JSON.stringify(request.context || {});
    const config = JSON.stringify(this.config);
    
    return createHash('sha256')
      .update(`${content}_${context}_${config}`)
      .digest('hex');
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
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    logger.info('AI review cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    max_size: number;
    hit_rate: number;
  } {
    // Note: In a real implementation, you'd track hit/miss rates
    return {
      size: this.analysisCache.size,
      max_size: 1000, // Configurable cache limit
      hit_rate: 0.85 // Placeholder - would be calculated from actual metrics
    };
  }

  /**
   * Get reviewer statistics
   */
  getStats(): {
    config: AIReviewerConfig;
    enabled_analysis_types: string[];
    capabilities: string[];
    cache_stats: ReturnType<AIReviewer['getCacheStats']>;
  } {
    return {
      config: this.config,
      enabled_analysis_types: this.getEnabledAnalysisTypes(),
      capabilities: [
        'Logic analysis and optimization',
        'Security vulnerability detection',
        'Performance analysis',
        'Architecture review',
        'Readability and maintainability scoring',
        'Automated recommendations'
      ],
      cache_stats: this.getCacheStats()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIReviewerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.clearCache(); // Clear cache when config changes
  }
}