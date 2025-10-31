/**
 * Mock Data and Fixtures for Testing
 * 
 * Common mock data, fixtures, and stub responses for testing
 */

import { EventData } from '../../src/core/event-bus';

// =============================================================================
// CONFIG MOCKS
// =============================================================================

export const mockConfigData = {
  development: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    PORT: '3000',
    HOST: 'localhost',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'ai_code_agent_dev',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    JWT_SECRET: 'development-secret-key',
  },
  
  test: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    PORT: '0',
    HOST: 'localhost',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'ai_code_agent_test',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    JWT_SECRET: 'test-secret-key',
  },
  
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    PORT: '80',
    HOST: '0.0.0.0',
    DB_HOST: 'db',
    DB_PORT: '5432',
    DB_NAME: 'ai_code_agent',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    REDIS_HOST: 'redis',
    REDIS_PORT: '6379',
    JWT_SECRET: 'production-secret-key',
  },
};

export const mockConfigValidation = {
  valid: {
    PORT: 3000,
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_NAME: 'test_db',
    JWT_SECRET: 'test-secret-key-with-sufficient-length',
  },
  
  invalid: {
    PORT: 'invalid',
    DB_HOST: null,
    DB_PORT: -1,
    JWT_SECRET: 'short',
  },
};

// =============================================================================
// LOGGER MOCKS
// =============================================================================

export const mockLoggerConfig = {
  basic: {
    service: 'test-service',
    environment: 'test',
    version: '1.0.0',
    transports: [
      {
        type: 'console' as const,
        level: 'info' as const,
        format: 'simple' as const,
      },
    ],
  },
  
  advanced: {
    service: 'test-service',
    environment: 'test',
    version: '1.0.0',
    transports: [
      {
        type: 'console' as const,
        level: 'debug' as const,
        format: 'combined' as const,
      },
      {
        type: 'file' as const,
        level: 'info' as const,
        format: 'json' as const,
        options: {
          filename: 'test.log',
          maxSize: '10m',
          maxFiles: '5d',
        },
      },
    ],
    logToMemory: true,
    maxMemoryLogs: 100,
    enableProfiling: true,
  },
};

export const mockLogEntries = [
  {
    level: 'info',
    message: 'Test log entry 1',
    timestamp: '2025-10-31T00:00:00.000Z',
    service: 'test-service',
    correlationId: 'test-correlation-1',
  },
  {
    level: 'error',
    message: 'Test log entry 2',
    timestamp: '2025-10-31T00:00:01.000Z',
    service: 'test-service',
    correlationId: 'test-correlation-2',
    error: {
      name: 'TestError',
      message: 'Test error message',
      stack: 'TestError: Test error message\n    at test.js:1:1',
    },
  },
  {
    level: 'warn',
    message: 'Test log entry 3',
    timestamp: '2025-10-31T00:00:02.000Z',
    service: 'test-service',
    metadata: { userId: 'test-user-1' },
  },
];

// =============================================================================
// EVENT BUS MOCKS
// =============================================================================

export const mockEventData: Record<string, EventData> = {
  'system:start': {
    timestamp: '2025-10-31T00:00:00.000Z',
    version: '1.0.0',
  },
  
  'system:error': {
    error: 'Test error',
    stack: 'Error: Test error\n    at test.js:1:1',
    timestamp: '2025-10-31T00:00:00.000Z',
  },
  
  'db:connect': {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
  },
  
  'db:disconnect': {
    reason: 'Test disconnection',
  },
  
  'agent:registered': {
    agentId: 'test-agent-1',
    type: 'test-agent',
    capabilities: ['test-capability'],
  },
  
  'agent:task:started': {
    agentId: 'test-agent-1',
    taskId: 'test-task-1',
    taskTitle: 'Test Task',
  },
  
  'task:created': {
    taskId: 'test-task-1',
    title: 'Test Task',
    priority: 'medium',
    assignedTo: null,
  },
  
  'workflow:started': {
    workflowId: 'test-workflow-1',
    name: 'Test Workflow',
    steps: ['step1', 'step2'],
  },
};

export const mockEventListener = {
  id: 'test-listener-1',
  event: 'test:event',
  handler: jest.fn().mockResolvedValue(undefined),
  once: false,
  priority: 0,
};

export const mockEventListeners = [
  {
    id: 'test-listener-1',
    event: 'test:event',
    handler: jest.fn().mockResolvedValue(undefined),
    once: false,
    priority: 0,
  },
  {
    id: 'test-listener-2',
    event: 'test:event',
    handler: jest.fn().mockResolvedValue(undefined),
    once: true,
    priority: 1,
  },
  {
    id: 'test-listener-3',
    event: 'another:event',
    handler: jest.fn().mockResolvedValue(undefined),
    once: false,
    priority: 0,
  },
];

// =============================================================================
// API RESPONSE MOCKS
// =============================================================================

export const mockApiResponses = {
  success: {
    status: 'success',
    data: {},
    message: 'Operation completed successfully',
    timestamp: '2025-10-31T00:00:00.000Z',
  },
  
  error: {
    status: 'error',
    error: 'Operation failed',
    message: 'An error occurred',
    timestamp: '2025-10-31T00:00:00.000Z',
  },
  
  validation: {
    status: 'error',
    error: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: [
      {
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      },
    ],
  },
};

// =============================================================================
// HTTP REQUEST/RESPONSE MOCKS
// =============================================================================

export const mockRequest = {
  method: 'GET',
  url: '/api/test',
  headers: {
    'content-type': 'application/json',
    'user-agent': 'test-agent',
  },
  body: {},
  params: {},
  query: {},
  ip: '127.0.0.1',
  get: jest.fn((header: string) => mockRequest.headers[header.toLowerCase()]),
};

export const mockResponse = {
  statusCode: 200,
  headers: {},
  body: {},
  
  status: jest.fn(function(statusCode: number) {
    this.statusCode = statusCode;
    return this;
  }),
  
  json: jest.fn(function(body: any) {
    this.body = body;
    return this;
  }),
  
  send: jest.fn(function(body: any) {
    this.body = body;
    return this;
  }),
  
  set: jest.fn(function(header: string, value: string) {
    this.headers[header] = value;
    return this;
  }),
  
  get: jest.fn((header: string) => mockResponse.headers[header]),
};

// =============================================================================
// DATABASE MOCKS
// =============================================================================

export const mockDbConnection = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue(mockDbConnection),
  end: jest.fn().mockResolvedValue(undefined),
};

export const mockDbQueryResult = {
  rows: [
    {
      id: 'test-1',
      name: 'Test Record 1',
      created_at: '2025-10-31T00:00:00.000Z',
    },
    {
      id: 'test-2',
      name: 'Test Record 2',
      created_at: '2025-10-31T00:00:01.000Z',
    },
  ],
  rowCount: 2,
};

export const mockDbError = {
  code: '23505',
  message: 'duplicate key value violates unique constraint',
  detail: 'Key (id)=(test-1) already exists.',
};

// =============================================================================
// ASYNC OPERATION MOCKS
// =============================================================================

export const mockAsyncOperation = {
  success: jest.fn().mockResolvedValue({ success: true }),
  failure: jest.fn().mockRejectedValue(new Error('Operation failed')),
  timeout: jest.fn().mockImplementation(() => 
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), 100)
    )
  ),
};

// =============================================================================
// PERFORMANCE MOCKS
// =============================================================================

export const mockPerformanceMarks = {
  start: '2025-10-31T00:00:00.000Z',
  end: '2025-10-31T00:00:00.500Z',
  duration: 500,
};

// =============================================================================
// SECURE DATA MOCKS
// =============================================================================

export const mockSensitiveData = {
  password: 'password123',
  apiKey: 'sk-test123456789',
  jwtSecret: 'my-secret-key',
  dbPassword: 'db-password123',
  redisPassword: 'redis-password123',
};

export const mockRedactedData = {
  password: 'pass...0123',
  apiKey: 'sk-t...6789',
  jwtSecret: 'my-...-key',
  dbPassword: 'db-...0123',
  redisPassword: 'red...0123',
};

// =============================================================================
// VALIDATION MOCKS
// =============================================================================

export const mockValidationErrors = {
  required: 'This field is required',
  email: 'Invalid email format',
  minLength: 'Field must be at least 8 characters',
  maxLength: 'Field must be no more than 100 characters',
  pattern: 'Field does not match required pattern',
  unique: 'This value already exists',
};

export const mockValidationSchemas = {
  user: {
    name: 'string',
    email: 'string',
    age: 'number',
  },
  
  config: {
    port: 'number',
    host: 'string',
    database: 'object',
  },
};

// =============================================================================
// WORKFLOW MOCKS
// =============================================================================

export const mockWorkflowSteps = [
  {
    id: 'step-1',
    name: 'Initialize',
    type: 'initialization',
    status: 'completed',
    duration: 100,
  },
  {
    id: 'step-2',
    name: 'Process',
    type: 'processing',
    status: 'running',
    duration: null,
  },
  {
    id: 'step-3',
    name: 'Complete',
    type: 'finalization',
    status: 'pending',
    duration: null,
  },
];

export const mockWorkflowExecution = {
  id: 'workflow-exec-1',
  workflowId: 'workflow-1',
  status: 'running',
  currentStep: 'step-2',
  startedAt: '2025-10-31T00:00:00.000Z',
  steps: mockWorkflowSteps,
};

// Export default data factory
export const createMockData = {
  user: (overrides = {}) => ({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  }),
  
  agent: (overrides = {}) => ({
    id: 'test-agent-1',
    name: 'Test Agent',
    type: 'test-agent',
    status: 'idle',
    capabilities: ['test-capability'],
    ...overrides,
  }),
  
  task: (overrides = {}) => ({
    id: 'test-task-1',
    title: 'Test Task',
    description: 'A test task',
    status: 'pending',
    priority: 'medium',
    assignedTo: null,
    ...overrides,
  }),
  
  event: (event: string, data = {}) => ({
    event,
    data: { ...mockEventData[event], ...data },
    timestamp: new Date().toISOString(),
  }),
};
