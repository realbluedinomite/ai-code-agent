/**
 * Input Parser
 * Main orchestrator for parsing user input into structured commands using Groq AI
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IntentExtractor
} from './intent-extractor';
import {
  EntityExtractor
} from './entity-extractor';
import {
  ProjectScanner
} from './project-scanner';
import {
  IntentType,
  ParsedRequestData,
  RequestContext,
  ValidationResult,
  ValidationIssue,
  ParserConfig,
  ParserStats,
  ParseRequestEventData,
  ParseCompleteEventData,
  ParseErrorEventData,
  ProjectScanEventData,
  ProjectScanCompleteEventData,
  InputParserError,
  ValidationError,
  ENTITY_CONFIDENCE_THRESHOLD,
  INTENT_CONFIDENCE_THRESHOLD,
  VALIDATION_CONFIDENCE_THRESHOLD
} from './types';
import { eventBus } from '@/core/event-bus';
import { DatabaseConnectionManager } from '@/database/client';
import { ParsedRequestModel } from '@/database/models/parsed-request.model';
import { CreateParsedRequest, ParsedRequest } from '@/database/entities';
import { Priority } from '@/database/types';
import { logger } from '@/core/logger';

export class InputParser {
  private intentExtractor: IntentExtractor;
  private entityExtractor: EntityExtractor;
  private projectScanner: ProjectScanner;
  private databaseService: ParsedRequestModel;
  private config: ParserConfig;
  private stats: ParserStats;

  constructor(
    config: ParserConfig,
    databaseService: ParsedRequestModel,
    projectPath?: string
  ) {
    this.config = {
      modelName: 'mixtral-8x7b-32768',
      maxTokens: 2000,
      temperature: 0.1,
      timeout: 30000,
      maxRetries: 3,
      fallbackEnabled: true,
      validationThreshold: VALIDATION_CONFIDENCE_THRESHOLD,
      entityExtractionEnabled: true,
      projectScanningEnabled: true,
      contextWindowSize: 8192,
      ...config
    };

    this.databaseService = databaseService;
    this.projectScanner = new ProjectScanner(projectPath);

    // Initialize extractors
    this.intentExtractor = new IntentExtractor(this.config);
    this.entityExtractor = new EntityExtractor(this.config);

    // Initialize stats
    this.stats = {
      totalRequests: 0,
      successfulParses: 0,
      failedParses: 0,
      averageConfidence: 0,
      intentDistribution: {} as Record<IntentType, number>,
      averageProcessingTime: 0,
      lastUsed: new Date()
    };

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Parse user input into structured command
   */
  async parseRequest(
    input: string,
    context?: Partial<RequestContext>
  ): Promise<{
    requestId: string;
    result: ParsedRequestData;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      this.stats.totalRequests++;
      this.stats.lastUsed = new Date();

      // Create request context
      const requestContext: RequestContext = {
        timestamp: new Date(),
        source: context?.source || 'cli',
        metadata: context?.metadata || {},
        ...context
      };

      // Emit parse request event
      eventBus.emit<ParseRequestEventData>('parser:request:started', {
        requestId,
        originalText: input,
        context: requestContext
      });

      // Validate input
      const validation = await this.validateInput(input);
      if (!validation.isValid) {
        throw new ValidationError('Input validation failed', { validation });
      }

      // Extract intent
      const intentResult = await this.intentExtractor.extractIntent(input, context);
      
      // Extract entities
      const entities = this.config.entityExtractionEnabled 
        ? await this.entityExtractor.extractEntities(input, context)
        : { files: [], features: [], constraints: [], dependencies: [], codePatterns: [] };

      // Project scanning (if enabled and needed)
      let projectScan = null;
      if (this.config.projectScanningEnabled && this.isProjectScanNeeded(intentResult.intent, entities)) {
        try {
          projectScan = await this.projectScanner.scanProject();
        } catch (error) {
          logger.warn('Project scan failed:', error);
          // Continue without project scan
        }
      }

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(intentResult.confidence, entities);

      // Create parsed request data
      const parsedData: ParsedRequestData = {
        intent: intentResult.intent,
        entities,
        confidence,
        originalText: input,
        parameters: this.extractParameters(input, entities),
        context: requestContext,
        validation: validation
      };

      // Store in database
      const dbRequest = await this.storeParsedRequest(parsedData, requestContext);

      // Update statistics
      this.updateStats(intentResult.intent, confidence, Date.now() - startTime);

      const processingTime = Date.now() - startTime;

      // Emit completion event
      eventBus.emit<ParseCompleteEventData>('parser:request:completed', {
        requestId,
        result: parsedData,
        processingTime
      });

      return {
        requestId,
        result: parsedData,
        processingTime
      };

    } catch (error) {
      this.stats.failedParses++;
      
      // Emit error event
      const requestContext: RequestContext = {
        timestamp: new Date(),
        source: context?.source || 'cli',
        metadata: context?.metadata || {},
        ...context
      };

      eventBus.emit<ParseErrorEventData>('parser:request:failed', {
        requestId,
        error: error as Error,
        originalText: input,
        context: requestContext
      });

      throw new InputParserError(
        `Failed to parse request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { requestId, input, error }
      );
    }
  }

  /**
   * Batch parse multiple requests
   */
  async parseRequestsBatch(
    inputs: string[],
    contexts?: Partial<RequestContext>[]
  ): Promise<Array<{
    input: string;
    success: boolean;
    result?: ParsedRequestData;
    error?: Error;
    processingTime: number;
  }>> {
    const results = await Promise.allSettled(
      inputs.map(async (input, index) => {
        const startTime = Date.now();
        try {
          const context = contexts?.[index];
          const result = await this.parseRequest(input, context);
          return {
            input,
            success: true,
            result: result.result,
            processingTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            input,
            success: false,
            error: error as Error,
            processingTime: Date.now() - startTime
          };
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        input: '',
        success: false,
        error: new Error('Batch processing failed'),
        processingTime: 0
      }
    );
  }

  /**
   * Perform project scan
   */
  async scanProject(
    options?: {
      includeContent?: boolean;
      includeDependencies?: boolean;
      includeConfiguration?: boolean;
      maxDepth?: number;
      excludePatterns?: string[];
    }
  ): Promise<{
    requestId: string;
    result: any;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      // Emit scan event
      eventBus.emit<ProjectScanEventData>('project:scan:started', {
        requestId,
        projectPath: this.projectScanner['rootPath'],
        scanType: 'full'
      });

      const result = await this.projectScanner.scanProject(options);

      const processingTime = Date.now() - startTime;

      // Emit completion event
      eventBus.emit<ProjectScanCompleteEventData>('project:scan:completed', {
        requestId,
        result,
        processingTime
      });

      return {
        requestId,
        result,
        processingTime
      };

    } catch (error) {
      throw new InputParserError(
        `Project scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { requestId, error }
      );
    }
  }

  /**
   * Validate input before processing
   */
  async validateInput(input: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    // Check input length
    if (input.trim().length === 0) {
      issues.push({
        type: 'error',
        field: 'input',
        message: 'Input cannot be empty',
        code: 'EMPTY_INPUT',
        severity: 'high'
      });
    }

    if (input.length > 10000) {
      issues.push({
        type: 'warning',
        field: 'input',
        message: 'Input is very long and may affect parsing quality',
        code: 'LONG_INPUT',
        severity: 'medium'
      });
      suggestions.push('Consider breaking down long requests into smaller parts');
    }

    // Check for suspicious content
    const suspiciousPatterns = [
      /delete\s+all\s+files/i,
      /remove\s+everything/i,
      /format\s+drive/i,
      /rm\s+-rf/i
    ];

    const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(input));
    if (hasSuspiciousContent) {
      issues.push({
        type: 'error',
        field: 'input',
        message: 'Input contains potentially destructive commands',
        code: 'SUSPICIOUS_CONTENT',
        severity: 'critical'
      });
    }

    // Check for very short input
    if (input.trim().length > 0 && input.trim().length < 3) {
      issues.push({
        type: 'warning',
        field: 'input',
        message: 'Input is very short and may lack sufficient context',
        code: 'SHORT_INPUT',
        severity: 'low'
      });
      suggestions.push('Provide more details for better parsing');
    }

    const isValid = !issues.some(issue => issue.severity === 'critical');
    const confidence = this.calculateValidationConfidence(issues);

    return {
      isValid,
      confidence,
      issues,
      suggestions
    };
  }

  /**
   * Extract parameters from input and entities
   */
  private extractParameters(input: string, entities: any): Record<string, any> {
    const parameters: Record<string, any> = {
      inputLength: input.length,
      wordCount: input.split(/\s+/).length,
      hasCodeBlocks: /```/.test(input),
      hasUrls: /https?:\/\//.test(input),
      hasFilePaths: entities.files?.length > 0,
      hasFeatures: entities.features?.length > 0,
      hasConstraints: entities.constraints?.length > 0
    };

    // Add entity-specific parameters
    if (entities.files?.length) {
      parameters.fileCount = entities.files.length;
      parameters.fileTypes = [...new Set(entities.files.map((f: any) => f.type))];
    }

    if (entities.features?.length) {
      parameters.featureCount = entities.features.length;
      parameters.featureTypes = [...new Set(entities.features.map((f: any) => f.type))];
    }

    if (entities.constraints?.length) {
      parameters.constraintCount = entities.constraints.length;
      parameters.severityLevels = [...new Set(entities.constraints.map((c: any) => c.severity))];
    }

    return parameters;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(intentConfidence: number, entities: any): number {
    let totalConfidence = intentConfidence;
    let entityCount = 0;

    // Calculate average entity confidence
    ['files', 'features', 'constraints', 'dependencies', 'codePatterns'].forEach(entityType => {
      if (entities[entityType] && Array.isArray(entities[entityType])) {
        const avgEntityConfidence = entities[entityType].reduce(
          (sum: number, entity: any) => sum + entity.confidence, 0
        ) / entities[entityType].length;
        totalConfidence += avgEntityConfidence;
        entityCount++;
      }
    });

    // Return weighted average (intent gets higher weight)
    if (entityCount === 0) return intentConfidence;
    return (intentConfidence * 2 + totalConfidence) / (entityCount + 2);
  }

  /**
   * Calculate validation confidence
   */
  private calculateValidationConfidence(issues: ValidationIssue[]): number {
    if (issues.length === 0) return 1.0;

    let penalty = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'low': penalty += 0.05; break;
        case 'medium': penalty += 0.15; break;
        case 'high': penalty += 0.3; break;
        case 'critical': penalty += 0.5; break;
      }
    });

    return Math.max(0, 1 - penalty);
  }

  /**
   * Check if project scan is needed based on intent and entities
   */
  private isProjectScanNeeded(intent: IntentType, entities: any): boolean {
    const scanIntents = [
      IntentType.ANALYZE_CODE,
      IntentType.REFACTOR,
      IntentType.FIX_BUG,
      IntentType.OPTIMIZE_CODE
    ];

    return scanIntents.includes(intent) || 
           entities.files?.length > 0 || 
           entities.features?.length > 0 ||
           entities.dependencies?.length > 0;
  }

  /**
   * Store parsed request in database
   */
  private async storeParsedRequest(
    parsedData: ParsedRequestData,
    context: RequestContext
  ): Promise<ParsedRequest> {
    try {
      const createRequest: CreateParsedRequest = {
        session_id: context.sessionId || '',
        request_type: parsedData.intent,
        original_text: parsedData.originalText,
        parsed_data: {
          intent: parsedData.intent,
          entities: parsedData.entities,
          confidence: parsedData.confidence
        },
        parameters: parsedData.parameters,
        context: {
          ...context,
          timestamp: context.timestamp.toISOString()
        },
        priority: this.determinePriority(parsedData.intent, parsedData.entities),
        status: 'completed'
      };

      return await this.databaseService.create(createRequest);
    } catch (error) {
      logger.error('Failed to store parsed request:', error);
      // Don't throw error for storage failure, continue processing
      throw error;
    }
  }

  /**
   * Determine priority based on intent and entities
   */
  private determinePriority(intent: IntentType, entities: any): Priority {
    // High priority intents
    if ([IntentType.FIX_BUG, IntentType.DEPLOY_CODE].includes(intent)) {
      return Priority.HIGH;
    }

    // Check for critical constraints
    const hasCriticalConstraints = entities.constraints?.some(
      (c: any) => c.severity === 'critical'
    );

    if (hasCriticalConstraints) {
      return Priority.CRITICAL;
    }

    // Medium priority for feature additions and refactoring
    if ([IntentType.ADD_FEATURE, IntentType.REFACTOR].includes(intent)) {
      return Priority.MEDIUM;
    }

    // Default to medium
    return Priority.MEDIUM;
  }

  /**
   * Update statistics
   */
  private updateStats(intent: IntentType, confidence: number, processingTime: number): void {
    this.stats.successfulParses++;
    
    // Update intent distribution
    this.stats.intentDistribution[intent] = (this.stats.intentDistribution[intent] || 0) + 1;
    
    // Update average confidence (running average)
    const totalSuccessful = this.stats.successfulParses;
    this.stats.averageConfidence = 
      ((this.stats.averageConfidence * (totalSuccessful - 1)) + confidence) / totalSuccessful;
    
    // Update average processing time (running average)
    this.stats.averageProcessingTime = 
      ((this.stats.averageProcessingTime * (totalSuccessful - 1)) + processingTime) / totalSuccessful;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for system events to update parser state
    eventBus.on('system:start', () => {
      logger.info('Input Parser initialized');
    });

    eventBus.on('system:stop', () => {
      logger.info('Input Parser shutting down');
    });
  }

  /**
   * Get parser statistics
   */
  getStats(): ParserStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulParses: 0,
      failedParses: 0,
      averageConfidence: 0,
      intentDistribution: {} as Record<IntentType, number>,
      averageProcessingTime: 0,
      lastUsed: new Date()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize extractors with new config
    this.intentExtractor = new IntentExtractor(this.config);
    this.entityExtractor = new EntityExtractor(this.config);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {
      timestamp: new Date(),
      config: this.config,
      stats: this.stats
    };

    try {
      // Test intent extractor
      const testIntent = await this.intentExtractor.extractIntent('test input');
      details.intentExtractor = 'working';

      // Test entity extractor
      const testEntities = await this.entityExtractor.extractEntities('test input');
      details.entityExtractor = 'working';

      // Test database connection
      await this.databaseService.query('SELECT 1');
      details.database = 'connected';

      return {
        status: 'healthy',
        details
      };

    } catch (error) {
      details.error = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        details
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Remove event listeners if needed
    eventBus.removeAllListeners('input-parser:*');
    
    // Clear stats
    this.resetStats();
    
    logger.info('Input Parser cleanup completed');
  }
}
