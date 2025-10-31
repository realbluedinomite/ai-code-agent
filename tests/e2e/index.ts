/**
 * End-to-End Test Suite Index
 * 
 * This file exports all E2E test suites for easy importing and execution.
 * Run all E2E tests with: npm run test:e2e
 */

export { default as endToEndTests } from './test-end-to-end';
export { default as realScenarioTests } from './test-real-scenarios';
export { default as errorHandlingTests } from './test-error-handling';
export { default as performanceTests } from './test-performance';

/**
 * E2E Test Suite Configuration
 */
export const e2eTestConfig = {
  // Test timeouts (in milliseconds)
  timeouts: {
    simple: 30000,
    complex: 90000,
    stress: 300000,
  },
  
  // Performance thresholds
  performance: {
    maxAverageResponseTime: 100, // ms
    maxP95ResponseTime: 200, // ms
    minThroughput: 10, // req/s
    maxMemoryGrowthPercent: 10, // %
    maxErrorRate: 1, // %
  },
  
  // Concurrency settings
  concurrency: {
    normal: 5,
    stress: 50,
    max: 100,
  },
};
