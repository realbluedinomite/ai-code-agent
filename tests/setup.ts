/**
 * Jest Test Setup File
 * 
 * This file is run before each test file and sets up the testing environment.
 */

import 'reflect-metadata';
import { config } from '../src/core/config';
import { logger } from '../src/core/logger';
import { eventBus } from '../src/core/event-bus';
import { createCommonSchemas } from '../src/core/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Suppress console logs during tests (can be overridden per test)
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Load test environment configuration
  config.loadFromEnvironment('test');
  
  // Register common schemas
  config.registerSchemas(createCommonSchemas());

  // Clear any existing logs
  logger.clearMemoryLogs();
  
  // Clear event bus stats
  eventBus.clearStats();
});

afterEach(() => {
  // Clear memory logs after each test
  logger.clearMemoryLogs();
  
  // Clear event bus stats after each test
  eventBus.clearStats();
  
  // Clear context
  logger.clearContext();
});

afterAll(async () => {
  // Flush logger
  await logger.flush();
});

// Mock console methods for testing
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Date for consistent testing
const mockDate = new Date('2025-10-31T00:00:00Z');
(global as any).Date = jest.fn(() => mockDate);

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledWithAll(received: any, ...expected: any[]) {
    const pass = received.mock.calls.some((call: any[]) =>
      expected.every((exp, i) => call[i] === exp)
    );
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to have been called with ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to have been called with ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.testUtils = {
  // Generate unique IDs for tests
  generateId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Create test data
  createTestUser: (overrides: any = {}) => ({
    id: global.testUtils.generateId(),
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  }),
  
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create a test event
  createTestEvent: (type: string, data: any = {}) => ({
    id: global.testUtils.generateId(),
    type,
    data,
    timestamp: new Date(),
  }),
};

// TypeScript declarations for global utilities
declare global {
  var testUtils: {
    generateId: () => string;
    createTestUser: (overrides?: any) => any;
    waitFor: (ms: number) => Promise<void>;
    createTestEvent: (type: string, data?: any) => any;
  };
}

export {};
