/**
 * E2E Test Utilities
 * 
 * Shared utilities for end-to-end tests including:
 * - Test data generators
 * - Performance measurement helpers
 * - Workflow result validators
 * - Mock data factories
 */

import path from 'path';
import fs from 'fs/promises';
import { performance } from 'perf_hooks';

// ============================================================================
// Test Data Generators
// ============================================================================

export interface WorkflowInput {
  type: 'feature-request' | 'bug-fix' | 'refactor' | 'optimization' | 'technical-debt' | 'migration';
  description: string;
  requirements?: string[];
  constraints?: string[];
  projectPath?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retryCount?: number;
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  sessionId?: string;
  steps: WorkflowStep[];
  artifacts?: Record<string, any>;
  metrics?: WorkflowMetrics;
  error?: WorkflowError;
  warnings?: string[];
  partialResults?: Record<string, number>;
  canRetry?: boolean;
  context?: Record<string, any>;
  timestamp?: Date;
}

export interface WorkflowStep {
  name: string;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  phase?: string;
  critical?: boolean;
}

export interface WorkflowMetrics {
  duration: number;
  stepsCompleted: number;
  memoryUsed?: number;
  cpuTime?: number;
}

export interface WorkflowError {
  code: string;
  message: string;
  stack?: string;
  [key: string]: any;
}

/**
 * Generate realistic workflow input for feature requests
 */
export function generateFeatureRequestInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
  const features = [
    {
      type: 'feature-request',
      description: 'Add user authentication with JWT tokens',
      requirements: [
        'User registration endpoint',
        'Login/logout functionality',
        'JWT token generation and validation',
        'Password hashing with bcrypt',
        'Role-based access control',
      ],
      constraints: [
        'Maintain existing API structure',
        'Support both token and cookie auth',
        'No breaking changes to existing users',
      ],
      priority: 'normal' as const,
    },
    {
      type: 'feature-request',
      description: 'Implement real-time notifications',
      requirements: [
        'WebSocket server setup',
        'Real-time event broadcasting',
        'Notification preferences',
        'Email notifications',
        'Push notification support',
      ],
      constraints: [
        'Support 1000+ concurrent users',
        'Handle network disconnections gracefully',
      ],
      priority: 'high' as const,
    },
    {
      type: 'feature-request',
      description: 'Add comprehensive logging system',
      requirements: [
        'Structured logging',
        'Log levels configuration',
        'External log shipping',
        'Query and filter logs',
        'Log retention policies',
      ],
      priority: 'normal' as const,
    },
    {
      type: 'feature-request',
      description: 'Create data export functionality',
      requirements: [
        'Export to CSV, JSON, XML formats',
        'Scheduled exports',
        'Large dataset handling',
        'Data filtering and selection',
        'Export progress tracking',
      ],
      constraints: [
        'Handle datasets up to 1GB',
        'Maintain data privacy',
      ],
      priority: 'low' as const,
    },
  ];

  const baseFeature = features[Math.floor(Math.random() * features.length)];
  return { ...baseFeature, ...overrides };
}

/**
 * Generate realistic bug fix input
 */
export function generateBugFixInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
  const bugs = [
    {
      type: 'bug-fix',
      description: 'Memory leak in session manager',
      severity: 'high',
      reproductionSteps: [
        'User logs in',
        'User performs multiple actions over time',
        'User logs out',
        'Observe memory usage',
      ],
      expectedBehavior: 'Memory should be released after logout',
      actualBehavior: 'Memory usage continues to grow',
      affectedComponent: 'session-manager',
    },
    {
      type: 'bug-fix',
      description: 'Race condition in concurrent updates',
      severity: 'critical',
      reproductionSteps: [
        'Multiple users update same record simultaneously',
        'Observe data consistency',
      ],
      expectedBehavior: 'Last write wins with proper locking',
      actualBehavior: 'Data corruption occurs',
      affectedComponent: 'data-service',
    },
    {
      type: 'bug-fix',
      description: 'API timeout under load',
      severity: 'medium',
      reproductionSteps: [
        'Send 100+ concurrent requests',
        'Monitor response times',
      ],
      expectedBehavior: 'All requests complete within 2 seconds',
      actualBehavior: 'Requests timeout after 5 seconds',
      affectedComponent: 'api-server',
    },
  ];

  const baseBug = bugs[Math.floor(Math.random() * bugs.length)];
  return { ...baseBug, ...overrides };
}

/**
 * Generate realistic refactoring input
 */
export function generateRefactorInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
  const refactors = [
    {
      type: 'refactor',
      description: 'Migrate from JavaScript to TypeScript',
      currentLanguage: 'JavaScript',
      targetLanguage: 'TypeScript',
      filesCount: 150,
      goals: [
        'Add type safety',
        'Improve IDE support',
        'Enable better refactoring tools',
      ],
      constraints: [
        'Maintain API compatibility',
        'Incremental migration',
        'Zero downtime',
      ],
    },
    {
      type: 'refactor',
      description: 'Improve code architecture and reduce coupling',
      currentArchitecture: 'Monolithic',
      targetArchitecture: 'Modular',
      goals: [
        'Single responsibility principle',
        'Loose coupling between modules',
        'Easy to test in isolation',
      ],
      constraints: [
        'No breaking changes',
        'Maintain performance',
      ],
    },
  ];

  const baseRefactor = refactors[Math.floor(Math.random() * refactors.length)];
  return { ...baseRefactor, ...overrides };
}

/**
 * Generate load test input
 */
export function generateLoadTestInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
  return {
    type: 'feature-request',
    description: 'Load test with concurrent users',
    concurrency: 50,
    duration: 30000, // 30 seconds
    rampUpTime: 5000, // 5 seconds
    ...overrides,
  };
}

// ============================================================================
// Performance Measurement Helpers
// ============================================================================

/**
 * Measure workflow execution time
 */
export async function measureWorkflowExecution(
  workflowFn: () => Promise<WorkflowResult>
): Promise<{ duration: number; result: WorkflowResult }> {
  const startTime = performance.now();
  const result = await workflowFn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  return { duration, result };
}

/**
 * Run multiple workflow executions and collect statistics
 */
export async function measureWorkflowPerformance(
  workflowFn: () => Promise<WorkflowResult>,
  iterations: number = 100
): Promise<{
  iterations: number;
  durations: number[];
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  throughput: number;
  errors: number;
}> {
  const durations: number[] = [];
  let errors = 0;
  const totalStartTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    try {
      const { duration } = await measureWorkflowExecution(workflowFn);
      durations.push(duration);
    } catch (error) {
      errors++;
    }
  }

  const totalDuration = performance.now() - totalStartTime;
  durations.sort((a, b) => a - b);

  return {
    iterations,
    durations,
    average: calculateAverage(durations),
    median: calculateMedian(durations),
    p95: calculatePercentile(durations, 95),
    p99: calculatePercentile(durations, 99),
    min: Math.min(...durations),
    max: Math.max(...durations),
    throughput: iterations / (totalDuration / 1000),
    errors,
  };
}

/**
 * Monitor memory usage during workflow execution
 */
export async function monitorMemoryUsage(
  workflowFn: () => Promise<WorkflowResult>
): Promise<{
  result: WorkflowResult;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: number;
}> {
  const memoryBefore = process.memoryUsage();
  const result = await workflowFn();
  const memoryAfter = process.memoryUsage();
  const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;

  return {
    result,
    memoryBefore,
    memoryAfter,
    memoryDelta,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate workflow result structure
 */
export function validateWorkflowResult(result: any): result is WorkflowResult {
  return (
    result !== null &&
    typeof result === 'object' &&
    typeof result.success === 'boolean' &&
    Array.isArray(result.steps) &&
    result.steps.every((step: any) =>
      typeof step.name === 'string' &&
      ['pending', 'running', 'completed', 'failed', 'skipped'].includes(step.state)
    )
  );
}

/**
 * Validate performance metrics
 */
export function validatePerformanceMetrics(
  metrics: {
    average: number;
    p95: number;
    p99: number;
    throughput: number;
    errors: number;
  },
  thresholds: {
    maxAverage: number;
    maxP95: number;
    maxP99: number;
    minThroughput: number;
    maxErrorRate: number;
  }
): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (metrics.average > thresholds.maxAverage) {
    violations.push(`Average response time ${metrics.average.toFixed(2)}ms exceeds ${thresholds.maxAverage}ms`);
  }

  if (metrics.p95 > thresholds.maxP95) {
    violations.push(`P95 response time ${metrics.p95.toFixed(2)}ms exceeds ${thresholds.maxP95}ms`);
  }

  if (metrics.p99 > thresholds.maxP99) {
    violations.push(`P99 response time ${metrics.p99.toFixed(2)}ms exceeds ${thresholds.maxP99}ms`);
  }

  if (metrics.throughput < thresholds.minThroughput) {
    violations.push(`Throughput ${metrics.throughput.toFixed(2)} req/s below ${thresholds.minThroughput} req/s`);
  }

  const errorRate = (metrics.errors / 100) * 100; // Assuming 100 iterations
  if (errorRate > thresholds.maxErrorRate) {
    violations.push(`Error rate ${errorRate.toFixed(2)}% exceeds ${thresholds.maxErrorRate}%`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Validate that no memory leaks occurred
 */
export function validateNoMemoryLeaks(
  memorySnapshots: NodeJS.MemoryUsage[]
): {
  passed: boolean;
  growth: number;
  growthPercent: number;
} {
  if (memorySnapshots.length < 2) {
    return { passed: true, growth: 0, growthPercent: 0 };
  }

  const first = memorySnapshots[0];
  const last = memorySnapshots[memorySnapshots.length - 1];
  const growth = last.heapUsed - first.heapUsed;
  const growthPercent = (growth / first.heapUsed) * 100;

  // Allow up to 10% growth for legitimate reasons
  const passed = growthPercent < 10;

  return {
    passed,
    growth,
    growthPercent,
  };
}

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Generate mock project structure
 */
export async function createMockProject(
  projectPath: string,
  type: 'express' | 'react' | 'nodejs' | 'api' | 'legacy' = 'express'
): Promise<void> {
  await fs.mkdir(projectPath, { recursive: true });

  const files = getProjectFiles(type);
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectPath, filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }
}

/**
 * Generate large payload for testing
 */
export function generateLargePayload(sizeInBytes: number): string {
  const chunk = 'x'.repeat(1024); // 1KB chunk
  const chunks = Math.floor(sizeInBytes / 1024);
  return chunk.repeat(chunks);
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateAverage(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculatePercentile(numbers: number[], p: number): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function getProjectFiles(type: string): Record<string, string> {
  const baseFiles = {
    'README.md': `# ${type} Project\n\nGenerated for E2E testing`,
    'package.json': JSON.stringify({
      name: `${type}-project`,
      version: '1.0.0',
      scripts: {
        start: 'node index.js',
        test: 'jest',
      },
      dependencies: {
        express: '^4.18.2',
        typescript: '^5.2.2',
      },
    }, null, 2),
  };

  switch (type) {
    case 'express':
      return {
        ...baseFiles,
        'index.js': `
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', type: 'express' });
});

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'Test User' }]);
});

module.exports = app;
        `,
      };

    case 'react':
      return {
        ...baseFiles,
        'src/App.js': `
import React from 'react';

function App() {
  return (
    <div>
      <h1>React App</h1>
    </div>
  );
}

export default App;
        `,
      };

    default:
      return {
        ...baseFiles,
        'index.js': `
console.log('Hello from ${type} project');
        `,
      };
  }
}
