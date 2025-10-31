/**
 * Input Parser Component - Usage Examples
 * 
 * This file demonstrates how to use the Input Parser component in different scenarios.
 */

import {
  InputParser,
  createInputParser,
  initializeInputParser,
  DEFAULT_PARSER_CONFIG,
  getSupportedIntents,
  getSupportedEntityTypes
} from './index';
import { ParsedRequestModel } from '@/database/models/parsed-request.model';

/**
 * Example 1: Basic CLI Usage
 */
export async function basicCliExample() {
  // Initialize database connection (example - in real usage, use actual instance)
  const dbManager = new ParsedRequestModel({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_code_agent',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  // Create parser instance
  const parser = createInputParser(
    {
      groqApiKey: process.env.GROQ_API_KEY!,
      modelName: 'mixtral-8x7b-32768',
      timeout: 30000
    },
    dbManager, // This would be a ParsedRequestModel instance in real usage
    './my-project'
  );

  // Parse a user request
  const result = await parser.parseRequest(
    'Add a user authentication component to the login page',
    {
      source: 'cli',
      userId: 'user-123',
      sessionId: 'session-456'
    }
  );

  console.log('Parsed Request:', {
    intent: result.result.intent,
    confidence: result.result.confidence,
    entities: result.result.entities,
    processingTime: result.processingTime
  });
}

/**
 * Example 2: Web API Usage
 */
export async function webApiExample() {
  // Initialize database connection (example - in real usage, use actual instance)
  const dbManager = new ParsedRequestModel({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_code_agent',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  // Create web-optimized parser
  const parser = await initializeInputParser(
    dbManager as any, // Type assertion for example
    './my-project',
    {
      timeout: 45000,
      maxRetries: 2,
      temperature: 0.1
    }
  );

  // Parse multiple requests in batch
  const requests = [
    'Fix the memory leak in the user service',
    'Refactor the authentication module for better security',
    'Explain how the payment processing works',
    'Add unit tests for the user registration endpoint'
  ];

  const results = await parser.parseRequestsBatch(
    requests,
    requests.map((_, i) => ({
      source: 'api' as const,
      userId: `user-${i}`,
      sessionId: `session-${i}`
    }))
  );

  console.log('Batch Results:', results.map(r => ({
    success: r.success,
    intent: r.result?.intent,
    confidence: r.result?.confidence
  })));
}

/**
 * Example 3: Project Scanning
 */
export async function projectScanningExample() {
  // Initialize database connection (example - in real usage, use actual instance)
  const dbManager = new ParsedRequestModel({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_code_agent',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  const parser = createInputParser(
    {
      groqApiKey: process.env.GROQ_API_KEY!,
      projectScanningEnabled: true
    },
    dbManager,
    './my-project'
  );

  // Scan project structure
  const scanResult = await parser.scanProject({
    includeContent: false,
    includeDependencies: true,
    includeConfiguration: true,
    maxDepth: 3,
    excludePatterns: ['node_modules', '.git', 'dist', 'build']
  });

  console.log('Project Scan Results:', {
    projectName: scanResult.result.projectName,
    projectType: scanResult.result.projectType,
    fileCount: scanResult.result.metrics.totalFiles,
    dependencies: scanResult.result.dependencies.length,
    healthScore: scanResult.result.health.score,
    processingTime: scanResult.processingTime
  });
}

/**
 * Example 4: Intent and Entity Extraction
 */
export async function intentExtractionExample() {
  const testCases = [
    {
      input: 'Add a REST API endpoint for user management with JWT authentication',
      expectedIntent: 'ADD_FEATURE'
    },
    {
      input: 'Fix the null pointer exception in the user service',
      expectedIntent: 'FIX_BUG'
    },
    {
      input: 'Refactor the payment processing logic to use the strategy pattern',
      expectedIntent: 'REFACTOR'
    },
    {
      input: 'Explain how the authentication middleware works',
      expectedIntent: 'EXPLAIN_CODE'
    }
  ];

  for (const testCase of testCases) {
    // This would require setting up the extractors directly
    console.log(`\nTesting: "${testCase.input}"`);
    console.log(`Expected Intent: ${testCase.expectedIntent}`);
    
    // In real usage, you would:
    // const intentResult = await intentExtractor.extractIntent(testCase.input);
    // const entityResult = await entityExtractor.extractEntities(testCase.input);
    
    // console.log('Actual Intent:', intentResult.intent);
    // console.log('Confidence:', intentResult.confidence);
    // console.log('Entities:', entityResult);
  }
}

/**
 * Example 5: Event-Driven Usage
 */
export async function eventDrivenExample() {
  const { eventBus } = await import('@/core/event-bus');

  // Set up event listeners
  eventBus.on('parser:request:started', (data) => {
    console.log(`[Event] Parsing started: ${data.requestId}`);
  });

  eventBus.on('parser:request:completed', (data) => {
    console.log(`[Event] Parsing completed: ${data.requestId} (${data.processingTime}ms)`);
    console.log(`[Event] Intent: ${data.result.intent}, Confidence: ${data.result.confidence}`);
  });

  eventBus.on('parser:request:failed', (data) => {
    console.error(`[Event] Parsing failed: ${data.requestId}`, data.error);
  });

  eventBus.on('project:scan:started', (data) => {
    console.log(`[Event] Project scan started: ${data.requestId}`);
  });

  eventBus.on('project:scan:completed', (data) => {
    console.log(`[Event] Project scan completed: ${data.requestId} (${data.processingTime}ms)`);
  });

  // Initialize and use parser (In real usage, pass actual ParsedRequestModel instance)
  const dbService = new ParsedRequestModel({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ai_code_agent',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });
  
  const parser = await initializeInputParser(
    dbService,
    './my-project'
  );

  // Parse request (events will be triggered automatically)
  await parser.parseRequest('Analyze the codebase for potential security vulnerabilities');
}

/**
 * Example 6: Configuration Validation
 */
export function configurationValidationExample() {
  const { validateParserConfig } = await import('./index');

  const validConfig = {
    groqApiKey: 'your-api-key-here',
    modelName: 'mixtral-8x7b-32768',
    maxTokens: 2000,
    temperature: 0.1,
    timeout: 30000
  };

  const invalidConfig = {
    groqApiKey: '', // Missing API key
    modelName: 'invalid-model', // Invalid model name
    maxTokens: -1, // Invalid value
    temperature: 5.0 // Invalid value
  };

  console.log('Valid config validation:', validateParserConfig(validConfig));
  console.log('Invalid config validation:', validateParserConfig(invalidConfig));
}

/**
 * Example 7: Parser Statistics and Monitoring
 */
export async function parserMonitoringExample() {
  const parser = createInputParser(
    {
      groqApiKey: process.env.GROQ_API_KEY!,
      projectScanningEnabled: true
    },
    new DatabaseConnectionManager({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_code_agent',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    })
  );

  // Parse several requests
  const requests = [
    'Add user authentication',
    'Fix login bug',
    'Refactor database queries',
    'Explain the payment system'
  ];

  for (const request of requests) {
    try {
      await parser.parseRequest(request);
    } catch (error) {
      console.error(`Failed to parse: ${request}`, error);
    }
  }

  // Get parser statistics
  const stats = parser.getStats();
  console.log('Parser Statistics:', {
    totalRequests: stats.totalRequests,
    successfulParses: stats.successfulParses,
    failedParses: stats.failedParses,
    averageConfidence: stats.averageConfidence.toFixed(2),
    averageProcessingTime: `${stats.averageProcessingTime.toFixed(0)}ms`,
    intentDistribution: stats.intentDistribution,
    lastUsed: stats.lastUsed
  });

  // Health check
  const health = await parser.healthCheck();
  console.log('Parser Health:', health);
}

/**
 * Example 8: Custom Error Handling
 */
export async function customErrorHandlingExample() {
  const parser = createInputParser(
    {
      groqApiKey: process.env.GROQ_API_KEY!,
      timeout: 5000, // Short timeout to test error handling
      maxRetries: 1
    },
    new DatabaseConnectionManager({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_code_agent',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    })
  );

  try {
    // This might fail due to short timeout or invalid input
    const result = await parser.parseRequest('some invalid input that might cause issues');
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Parser Error:', {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        details: (error as any).details
      });
    }
  }

  // Clean up
  await parser.cleanup();
}

/**
 * Utility Functions
 */
export function displaySupportedTypes() {
  console.log('Supported Intent Types:');
  console.log(getSupportedIntents());

  console.log('\nSupported Entity Types:');
  console.log(getSupportedEntityTypes());
}

/**
 * Main demonstration function
 */
export async function runExamples() {
  console.log('=== Input Parser Component Examples ===\n');

  try {
    // Basic examples (uncomment to run)
    // await basicCliExample();
    // await webApiExample();
    // await projectScanningExample();
    // await intentExtractionExample();
    // await eventDrivenExample();
    // await configurationValidationExample();
    // await parserMonitoringExample();
    // await customErrorHandlingExample();

    displaySupportedTypes();
    
    console.log('\n=== Examples completed successfully ===');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for use in tests or other modules
export default {
  basicCliExample,
  webApiExample,
  projectScanningExample,
  intentExtractionExample,
  eventDrivenExample,
  configurationValidationExample,
  parserMonitoringExample,
  customErrorHandlingExample,
  displaySupportedTypes,
  runExamples
};
