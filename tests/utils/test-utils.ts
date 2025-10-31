/**
 * Test Utilities and Helpers
 * 
 * Common utilities and helper functions for testing
 */

import { EventEmitter } from 'events';

// =============================================================================
// MOCK HELPERS
// =============================================================================

/**
 * Create a mock with spy capabilities
 */
export function createMock<T = any>(partial: Partial<T> = {}): T {
  const mock = partial as T;
  return mock;
}

/**
 * Create an async mock function
 */
export function createAsyncMock<T = (...args: any[]) => Promise<any>>() {
  return jest.fn().mockImplementation(async (...args: any[]) => {
    return Promise.resolve();
  });
}

/**
 * Create a mock EventEmitter with spy methods
 */
export function createMockEventEmitter(): jest.Mocked<EventEmitter> {
  const emitter = new EventEmitter() as jest.Mocked<EventEmitter>;
  
  emitter.on = jest.fn();
  emitter.off = jest.fn();
  emitter.emit = jest.fn();
  emitter.once = jest.fn();
  emitter.removeListener = jest.fn();
  emitter.removeAllListeners = jest.fn();
  emitter.setMaxListeners = jest.fn();
  emitter.getMaxListeners = jest.fn();
  emitter.listeners = jest.fn();
  emitter.rawListeners = jest.fn();
  emitter.addListener = jest.fn();
  emitter.eventNames = jest.fn();
  emitter.listenerCount = jest.fn();
  
  return emitter;
}

// =============================================================================
// TEST DATA HELPERS
// =============================================================================

/**
 * Generate random test data
 */
export class TestDataFactory {
  private counter = 0;

  nextId(): string {
    return `test-${Date.now()}-${++this.counter}`;
  }

  createUser(overrides: any = {}) {
    return {
      id: this.nextId(),
      name: 'Test User',
      email: `test-${this.counter}@example.com`,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createAgent(overrides: any = {}) {
    return {
      id: this.nextId(),
      name: 'Test Agent',
      type: 'test-agent',
      status: 'idle',
      capabilities: ['test-capability'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createTask(overrides: any = {}) {
    return {
      id: this.nextId(),
      title: 'Test Task',
      description: 'A test task',
      status: 'pending',
      priority: 'medium',
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createWorkflow(overrides: any = {}) {
    return {
      id: this.nextId(),
      name: 'Test Workflow',
      status: 'draft',
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  createEvent(overrides: any = {}) {
    return {
      id: this.nextId(),
      type: 'test-event',
      data: {},
      timestamp: new Date(),
      source: 'test-source',
      ...overrides,
    };
  }

  createConfiguration(overrides: any = {}) {
    return {
      key: `test-key-${this.counter}`,
      value: 'test-value',
      type: 'string',
      ...overrides,
    };
  }
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that a function throws an error
 */
export async function expectToThrow(fn: () => any, expectedError?: string | RegExp): Promise<Error> {
  let actualError: Error | undefined;
  
  try {
    await fn();
  } catch (error) {
    actualError = error as Error;
  }

  expect(actualError).toBeDefined();
  
  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(actualError!.message).toContain(expectedError);
    } else {
      expect(actualError!.message).toMatch(expectedError);
    }
  }

  return actualError!;
}

/**
 * Assert that a function does not throw
 */
export async function expectNotToThrow(fn: () => any): Promise<void> {
  await expect(fn).not.toThrow();
}

/**
 * Assert that a value is within a range
 */
export function expectWithinRange(value: number, min: number, max: number): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * Assert that an array has the expected length and items
 */
export function expectArrayToMatch<T>(actual: T[], expected: T[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((item, index) => {
    expect(actual[index]).toMatchObject(item);
  });
}

// =============================================================================
// TIME HELPERS
// =============================================================================

/**
 * Mock timer helpers
 */
export class TimerMock {
  private timeouts: NodeJS.Timeout[] = [];
  private intervals: NodeJS.Timeout[] = [];

  clearAll(): void {
    this.timeouts.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.timeouts = [];
    this.intervals = [];
    
    jest.clearAllTimers();
  }

  advanceTime(ms: number): void {
    jest.advanceTimersByTime(ms);
  }

  runAllTimers(): void {
    jest.runAllTimers();
  }

  runOnlyPendingTimers(): void {
    jest.runOnlyPendingTimers();
  }

  mockDate(date?: Date): void {
    const mockDate = date || new Date('2025-10-31T00:00:00Z');
    (global as any).Date = jest.fn(() => mockDate);
  }
}

// =============================================================================
// FILE HELPERS
// =============================================================================

/**
 * Create a temporary file for testing
 */
export function createTempFile(content: string, extension: string = '.txt'): string {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const tempDir = path.join(os.tmpdir(), 'jest-tests');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filename = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
  const filepath = path.join(tempDir, filename);
  
  fs.writeFileSync(filepath, content);
  return filepath;
}

/**
 * Create a temporary directory for testing
 */
export function createTempDir(): string {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  
  const tempDir = path.join(os.tmpdir(), 'jest-tests');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const dir = path.join(tempDir, `dir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  fs.mkdirSync(dir);
  return dir;
}

// =============================================================================
// DATABASE HELPERS
// =============================================================================

/**
 * Database test helpers
 */
export class DatabaseTestHelper {
  /**
   * Clean all tables in the database
   */
  static async cleanAll(connection: any): Promise<void> {
    // This would need to be implemented based on your database setup
    // Example implementation would truncate all tables
    console.log('Cleaning database...');
  }

  /**
   * Create test data in database
   */
  static async seed(connection: any, data: any): Promise<void> {
    // This would need to be implemented based on your database setup
    console.log('Seeding database with test data...');
  }

  /**
   * Rollback test data
   */
  static async rollback(connection: any): Promise<void> {
    // This would need to be implemented based on your database setup
    console.log('Rolling back test data...');
  }
}

// =============================================================================
// EVENT HELPERS
// =============================================================================

/**
 * Event test helpers
 */
export class EventTestHelper {
  private emittedEvents: Array<{ event: string; data: any }> = [];

  /**
   * Capture emitted events
   */
  captureEvents(eventBus: any): () => void {
    const originalEmit = eventBus.emit.bind(eventBus);
    const originalEmitAsync = eventBus.emitAsync.bind(eventBus);

    eventBus.emit = ((event: string, data: any) => {
      this.emittedEvents.push({ event, data });
      return originalEmit(event, data);
    }) as typeof originalEmit;

    eventBus.emitAsync = ((event: string, data: any) => {
      this.emittedEvents.push({ event, data });
      return originalEmitAsync(event, data);
    }) as typeof originalEmitAsync;

    return () => {
      eventBus.emit = originalEmit;
      eventBus.emitAsync = originalEmitAsync;
    };
  }

  /**
   * Get captured events
   */
  getEvents(): Array<{ event: string; data: any }> {
    return [...this.emittedEvents];
  }

  /**
   * Get events by name
   */
  getEventsByName(eventName: string): Array<{ event: string; data: any }> {
    return this.emittedEvents.filter(e => e.event === eventName);
  }

  /**
   * Clear captured events
   */
  clear(): void {
    this.emittedEvents = [];
  }
}

// =============================================================================
// EXPORT DEFAULT INSTANCE
// =============================================================================

export const testDataFactory = new TestDataFactory();
export const timerMock = new TimerMock();

// Export commonly used types
export type MockEvent = {
  event: string;
  data: any;
  timestamp: Date;
};

export type TestUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TestAgent = {
  id: string;
  name: string;
  type: string;
  status: string;
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type TestTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
};
