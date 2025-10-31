/**
 * Input Parser Component Index
 * Main entry point for the input parsing system
 */

export * from './types';
export * from './input-parser';
export * from './intent-extractor';
export * from './entity-extractor';
export * from './project-scanner';

import { InputParser } from './input-parser';
import { ParserConfig } from './types';
import { ParsedRequestModel } from '@/database/models/parsed-request.model';
import { eventBus } from '@/core/event-bus';

/**
 * Create and configure an InputParser instance
 */
export function createInputParser(
  config: ParserConfig,
  databaseService: ParsedRequestModel,
  projectPath?: string
): InputParser {
  return new InputParser(config, databaseService, projectPath);
}

/**
 * Default configuration for the InputParser
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  modelName: 'mixtral-8x7b-32768',
  maxTokens: 2000,
  temperature: 0.1,
  timeout: 30000,
  maxRetries: 3,
  fallbackEnabled: true,
  validationThreshold: 0.6,
  entityExtractionEnabled: true,
  projectScanningEnabled: true,
  contextWindowSize: 8192
};

/**
 * Initialize the Input Parser system
 */
export async function initializeInputParser(
  databaseService: ParsedRequestModel,
  projectPath?: string,
  customConfig?: Partial<ParserConfig>
): Promise<InputParser> {
  // Get API key from environment or config
  const groqApiKey = process.env.GROQ_API_KEY || customConfig?.groqApiKey;
  
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  // Merge configurations
  const config: ParserConfig = {
    ...DEFAULT_PARSER_CONFIG,
    groqApiKey,
    ...customConfig
  };

  // Create parser instance
  const parser = createInputParser(config, databaseService, projectPath);

  // Set up event handlers for logging and monitoring
  setupEventHandlers(parser);

  return parser;
}

/**
 * Set up event handlers for the InputParser
 */
function setupEventHandlers(parser: InputParser): void {
  // Log parsing events
  eventBus.on('parser:request:started', (data) => {
    console.log(`[InputParser] Started parsing request: ${data.requestId}`);
  });

  eventBus.on('parser:request:completed', (data) => {
    console.log(`[InputParser] Completed parsing request: ${data.requestId} (${data.processingTime}ms)`);
  });

  eventBus.on('parser:request:failed', (data) => {
    console.error(`[InputParser] Failed to parse request: ${data.requestId}`, data.error);
  });

  // Log project scan events
  eventBus.on('project:scan:started', (data) => {
    console.log(`[InputParser] Started project scan: ${data.requestId}`);
  });

  eventBus.on('project:scan:completed', (data) => {
    console.log(`[InputParser] Completed project scan: ${data.requestId} (${data.processingTime}ms)`);
  });
}

/**
 * Utility function to validate parser configuration
 */
export function validateParserConfig(config: Partial<ParserConfig>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!config.groqApiKey) {
    errors.push('groqApiKey is required');
  }

  // Validate model name
  const validModels = ['mixtral-8x7b-32768', 'llama2-70b-4096', 'gemma-7b-it'];
  if (config.modelName && !validModels.includes(config.modelName)) {
    warnings.push(`Model ${config.modelName} may not be supported. Valid models: ${validModels.join(', ')}`);
  }

  // Validate numeric ranges
  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 32768)) {
    errors.push('maxTokens must be between 1 and 32768');
  }

  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('temperature must be between 0 and 2');
  }

  if (config.timeout && config.timeout < 1000) {
    warnings.push('timeout should be at least 1000ms for reliable operation');
  }

  if (config.maxRetries && config.maxRetries < 0) {
    errors.push('maxRetries cannot be negative');
  }

  if (config.validationThreshold && (config.validationThreshold < 0 || config.validationThreshold > 1)) {
    errors.push('validationThreshold must be between 0 and 1');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get supported intent types
 */
export function getSupportedIntents(): string[] {
  return [
    'ADD_FEATURE',
    'FIX_BUG',
    'REFACTOR',
    'EXPLAIN_CODE',
    'ANALYZE_CODE',
    'OPTIMIZE_CODE',
    'DOCUMENT_CODE',
    'TEST_CODE',
    'DEPLOY_CODE',
    'REVIEW_CODE',
    'UNKNOWN'
  ];
}

/**
 * Get supported entity types
 */
export function getSupportedEntityTypes(): {
  files: string[];
  features: string[];
  constraints: string[];
  dependencies: string[];
  codePatterns: string[];
} {
  return {
    files: ['file', 'directory', 'pattern'],
    features: ['functionality', 'endpoint', 'component', 'module'],
    constraints: ['performance', 'security', 'compatibility', 'style', 'architecture'],
    dependencies: ['package', 'module', 'library', 'framework'],
    codePatterns: ['algorithm', 'pattern', 'anti-pattern', 'best-practice']
  };
}

/**
 * Utility to create a simple CLI parser
 */
export function createSimpleParser(
  groqApiKey: string,
  databaseService: ParsedRequestModel,
  projectPath?: string
): InputParser {
  const config: ParserConfig = {
    ...DEFAULT_PARSER_CONFIG,
    groqApiKey,
    source: 'cli'
  };

  return createInputParser(config, databaseService, projectPath);
}

/**
 * Utility to create a web/API parser
 */
export function createWebParser(
  groqApiKey: string,
  databaseService: ParsedRequestModel,
  projectPath?: string
): InputParser {
  const config: ParserConfig = {
    ...DEFAULT_PARSER_CONFIG,
    groqApiKey,
    source: 'api',
    timeout: 45000, // Slightly longer timeout for web requests
    maxRetries: 2   // Fewer retries for faster response
  };

  return createInputParser(config, databaseService, projectPath);
}