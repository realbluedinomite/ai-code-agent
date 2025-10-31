/**
 * Test Environment Configuration
 * 
 * Environment-specific test configurations and utilities
 */

// =============================================================================
// TEST DATABASE CONFIGURATION
// =============================================================================

export const testDatabaseConfig = {
  // PostgreSQL Test Database
  postgres: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'ai_code_agent_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    ssl: process.env.TEST_DB_SSL === 'true',
    pool: {
      min: 0,
      max: 5, // Limit connections for tests
    },
  },

  // Redis Test Cache
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    password: process.env.TEST_REDIS_PASSWORD || '',
    database: parseInt(process.env.TEST_REDIS_DB || '1'), // Use different DB for tests
    keyPrefix: 'test:',
  },

  // In-memory fallback (for CI environments without Redis)
  memory: {
    enabled: process.env.USE_MEMORY_CACHE === 'true',
    ttl: 1000, // 1 second for tests
  },
};

// =============================================================================
// TEST SERVER CONFIGURATION
// =============================================================================

export const testServerConfig = {
  // HTTP Server
  http: {
    port: 0, // Use random port for tests
    host: 'localhost',
    timeout: 5000, // 5 seconds for tests
  },

  // WebSocket Server
  ws: {
    port: 0, // Use random port for tests
    path: '/ws',
  },
};

// =============================================================================
// TEST LOGGING CONFIGURATION
// =============================================================================

export const testLoggingConfig = {
  level: process.env.TEST_LOG_LEVEL || 'error', // Minimal logging during tests
  enableMemoryLogs: true,
  maxMemoryLogs: 100,
  enableProfiling: false, // Disable profiling in tests for performance
  transports: [
    {
      type: 'console',
      level: 'error',
      format: 'simple',
    },
  ],
};

// =============================================================================
// EXTERNAL SERVICES CONFIGURATION
// =============================================================================

export const testExternalServicesConfig = {
  // Mock API endpoints for external services
  mockServices: {
    enabled: process.env.USE_MOCK_SERVICES === 'true',
    baseUrl: 'http://localhost:8888', // Mock service URL
    timeout: 1000, // 1 second timeout for tests
  },

  // OpenAI Mock Configuration
  openai: {
    apiKey: process.env.TEST_OPENAI_API_KEY || 'sk-test-mock-key',
    baseUrl: process.env.TEST_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: 5000,
    maxRetries: 1, // Minimal retries for tests
  },

  // Groq Mock Configuration
  groq: {
    apiKey: process.env.TEST_GROQ_API_KEY || 'gsk-test-mock-key',
    baseUrl: process.env.TEST_GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    timeout: 5000,
    maxRetries: 1,
  },
};

// =============================================================================
// SECURITY TEST CONFIGURATION
// =============================================================================

export const testSecurityConfig = {
  // JWT Configuration for tests
  jwt: {
    secret: process.env.TEST_JWT_SECRET || 'test-secret-key-for-jwt-testing-only',
    expiresIn: '1h',
    issuer: 'ai-code-agent-test',
    audience: 'test-audience',
  },

  // Bcrypt Configuration for tests
  bcrypt: {
    rounds: parseInt(process.env.TEST_BCRYPT_ROUNDS || '4'), // Fast for tests
  },

  // Rate Limiting (disabled for tests)
  rateLimit: {
    windowMs: 60000, // 1 minute
    max: 1000, // High limit for tests
    skip: true, // Skip rate limiting in tests
  },
};

// =============================================================================
// FILE SYSTEM TEST CONFIGURATION
// =============================================================================

export const testFileSystemConfig = {
  // Temporary directories for tests
  tempDir: process.env.TEST_TEMP_DIR || '/tmp/ai-code-agent-tests',
  
  // Upload directories for file upload tests
  uploadsDir: process.env.TEST_UPLOADS_DIR || '/tmp/ai-code-agent-uploads',
  
  // Log directories
  logsDir: process.env.TEST_LOGS_DIR || '/tmp/ai-code-agent-logs',

  // File size limits (smaller for tests)
  maxFileSize: parseInt(process.env.TEST_MAX_FILE_SIZE || '1048576'), // 1MB
  allowedMimeTypes: [
    'text/plain',
    'application/json',
    'image/jpeg',
    'image/png',
    'application/pdf',
  ],
};

// =============================================================================
// PERFORMANCE TEST CONFIGURATION
// =============================================================================

export const testPerformanceConfig = {
  // Test timeout settings
  defaultTimeout: parseInt(process.env.TEST_TIMEOUT || '10000'), // 10 seconds
  slowTestThreshold: parseInt(process.env.TEST_SLOW_THRESHOLD || '2000'), // 2 seconds

  // Concurrency settings
  maxConcurrentTests: parseInt(process.env.TEST_MAX_CONCURRENT || '10'),
  
  // Memory limits for tests
  maxMemoryUsage: parseInt(process.env.TEST_MAX_MEMORY || '134217728'), // 128MB

  // Database connection limits
  maxDbConnections: 5,
};

// =============================================================================
// CI/CD SPECIFIC CONFIGURATION
// =============================================================================

export const testCiConfig = {
  // GitHub Actions
  isGitHubActions: process.env.GITHUB_ACTIONS === 'true',
  
  // GitLab CI
  isGitLabCI: process.env.GITLAB_CI === 'true',
  
  // Jenkins
  isJenkins: process.env.JENKINS_URL !== undefined,
  
  // Azure DevOps
  isAzureDevOps: process.env.TF_BUILD !== undefined,
  
  // Local development
  isLocal: !process.env.GITHUB_ACTIONS && !process.env.GITLAB_CI,
};

// =============================================================================
// ENVIRONMENT-SPECIFIC SETTINGS
// =============================================================================

export const testEnvironmentConfig = {
  // Development testing
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Test environment
  isTest: process.env.NODE_ENV === 'test',
  
  // CI environment
  isCI: testCiConfig.isGitHubActions || testCiConfig.isGitLabCI || testCiConfig.isJenkins,
  
  // Coverage collection
  collectCoverage: process.env.COLLECT_COVERAGE === 'true',
  
  // Debug mode
  debug: process.env.TEST_DEBUG === 'true',
};

// =============================================================================
// TEST FIXTURES CONFIGURATION
// =============================================================================

export const testFixturesConfig = {
  // Fixture directories
  fixturesDir: path.join(process.cwd(), 'tests', 'fixtures'),
  mocksDir: path.join(process.cwd(), 'tests', 'mocks'),
  
  // Sample data files
  sampleData: {
    users: 'users.json',
    agents: 'agents.json',
    tasks: 'tasks.json',
    workflows: 'workflows.json',
  },
  
  // Mock responses
  mockResponses: {
    httpStatus: 'http-status.json',
    apiErrors: 'api-errors.json',
    validation: 'validation-errors.json',
  },
};

// =============================================================================
// MONITORING AND METRICS
// =============================================================================

export const testMonitoringConfig = {
  // Enable metrics collection for tests
  enableMetrics: process.env.TEST_METRICS === 'true',
  
  // Metrics collection interval
  metricsInterval: 1000, // 1 second
  
  // Health check endpoints
  healthCheckEndpoint: '/health',
  
  // Metrics endpoint
  metricsEndpoint: '/metrics',
};

// =============================================================================
// E2E TEST CONFIGURATION
// =============================================================================

export const testE2eConfig = {
  // Browser testing
  browser: {
    headless: process.env.HEADLESS_BROWSER !== 'false',
    slowMo: parseInt(process.env.BROWSER_SLOW_MO || '0'),
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
  },

  // Mobile testing
  mobile: {
    device: process.env.MOBILE_DEVICE || 'iPhone 12',
    width: parseInt(process.env.MOBILE_WIDTH || '390'),
    height: parseInt(process.env.MOBILE_HEIGHT || '844'),
  },

  // Screenshot configuration
  screenshots: {
    enabled: process.env.TEST_SCREENSHOTS === 'true',
    dir: process.env.SCREENSHOT_DIR || 'tests/e2e/screenshots',
    onFailure: true,
  },
};

// =============================================================================
// EXPORT CONFIGURATION HELPERS
// =============================================================================

/**
 * Get environment-specific configuration
 */
export function getTestConfig(): TestEnvironmentConfig {
  return {
    database: testDatabaseConfig,
    server: testServerConfig,
    logging: testLoggingConfig,
    externalServices: testExternalServicesConfig,
    security: testSecurityConfig,
    fileSystem: testFileSystemConfig,
    performance: testPerformanceConfig,
    ci: testCiConfig,
    environment: testEnvironmentConfig,
    fixtures: testFixturesConfig,
    monitoring: testMonitoringConfig,
    e2e: testE2eConfig,
  };
}

/**
 * Validate test configuration
 */
export function validateTestConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate database configuration
  if (!testDatabaseConfig.postgres.host) {
    errors.push('TEST_DB_HOST is required');
  }
  
  // Validate required environment variables
  const requiredVars = [
    'TEST_JWT_SECRET',
    'TEST_DB_NAME',
  ];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`${varName} environment variable is required`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Type definitions
export interface TestEnvironmentConfig {
  database: typeof testDatabaseConfig;
  server: typeof testServerConfig;
  logging: typeof testLoggingConfig;
  externalServices: typeof testExternalServicesConfig;
  security: typeof testSecurityConfig;
  fileSystem: typeof testFileSystemConfig;
  performance: typeof testPerformanceConfig;
  ci: typeof testCiConfig;
  environment: typeof testEnvironmentConfig;
  fixtures: typeof testFixturesConfig;
  monitoring: typeof testMonitoringConfig;
  e2e: typeof testE2eConfig;
}

// Import path
import path from 'path';
