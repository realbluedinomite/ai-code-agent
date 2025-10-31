/**
 * Performance and Stress Tests
 * 
 * Tests system performance characteristics and stress limits:
 * - Response time under various loads
 * - Memory usage patterns
 * - Throughput benchmarks
 * - Concurrency limits
 * - Resource utilization
 * - Scalability testing
 * - Long-running stability
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { Application } from '../../src';
import { Orchestrator } from '../../src/orchestrator/orchestrator';
import { Logger } from '../../src/core/logger';
import { EventBus } from '../../src/core/event-bus';
import { ConfigManager } from '../../src/core/config';
import { DatabaseClient } from '../../src/database/client';
import path from 'path';
import { performance } from 'perf_hooks';

describe('Performance and Stress Tests', () => {
  let app: Application;
  let orchestrator: Orchestrator;
  let logger: Logger;
  let eventBus: EventBus;
  let config: ConfigManager;
  let dbClient: DatabaseClient;
  const testPort = 34570;

  // Performance tracking
  const performanceMetrics: {
    responseTimes: number[];
    memoryUsage: NodeJS.MemoryUsage[];
    throughput: number[];
    errorRate: number[];
  } = {
    responseTimes: [],
    memoryUsage: [],
    throughput: [],
    errorRate: [],
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = testPort.toString();
    process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
    process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
    process.env.TEST_DB_NAME = 'ai_code_agent_perf_test';
    process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'postgres';
    process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';

    logger = new Logger('Performance-Test');
    eventBus = new EventBus();
    config = new ConfigManager();
    dbClient = new DatabaseClient();

    try {
      await dbClient.connect();
    } catch (error) {
      console.warn('Database connection failed, continuing without DB:', error);
    }
  }, 30000);

  afterAll(async () => {
    try {
      await dbClient.disconnect();
    } catch (error) {
      console.warn('DB disconnect error:', error);
    }
  });

  beforeEach(() => {
    app = new Application({
      port: testPort,
      environment: 'test',
    });

    orchestrator = new Orchestrator({
      workflow: {
        enabled: true,
        timeout: 30000,
        maxRetries: 3,
      },
      session: {
        ttl: 3600,
        maxSessions: 1000,
      },
      logging: {
        level: 'warn', // Reduce logging overhead during performance tests
      },
    });

    // Clear metrics
    Object.keys(performanceMetrics).forEach(key => {
      performanceMetrics[key as keyof typeof performanceMetrics] = [];
    });
  });

  afterEach(async () => {
    if (app) {
      await app.stop().catch(() => {});
    }
  });

  describe('Response Time Benchmarks', () => {
    it('should maintain < 100ms response time for simple workflows', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Simple feature request',
        requirements: ['Basic functionality'],
        projectPath: path.join(process.cwd(), 'temp', 'perf-simple-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const iterations = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await orchestrator.executeWorkflow(workflowInput);
        const endTime = performance.now();
        
        responseTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = percentile(responseTimes, 95);
      const p99ResponseTime = percentile(responseTimes, 99);

      console.log(`Response Time Stats (${iterations} iterations):`);
      console.log(`Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Max: ${maxResponseTime.toFixed(2)}ms`);
      console.log(`P95: ${p95ResponseTime.toFixed(2)}ms`);
      console.log(`P99: ${p99ResponseTime.toFixed(2)}ms`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(100);
      expect(p95ResponseTime).toBeLessThan(200);
      expect(p99ResponseTime).toBeLessThan(500);

      // Store metrics
      performanceMetrics.responseTimes.push(...responseTimes);
    }, 120000);

    it('should maintain < 2000ms response time for complex workflows', async () => {
      const complexWorkflowInput = {
        type: 'feature-request',
        description: 'Complex feature with multiple components',
        requirements: [
          'Database integration',
          'External API calls',
          'File processing',
          'Multiple validations',
          'Complex business logic',
        ],
        projectPath: path.join(process.cwd(), 'temp', 'perf-complex-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      // Mock complex workflow to simulate realistic processing time
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(async () => {
        // Simulate complex processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          steps: [
            { name: 'input-parsing', duration: 50 },
            { name: 'project-analysis', duration: 200 },
            { name: 'planning', duration: 150 },
            { name: 'implementation', duration: 300 },
            { name: 'review', duration: 100 },
          ],
          artifacts: {
            code: [{ path: 'file1.ts', content: 'x'.repeat(1000) }],
            tests: [{ path: 'file1.test.ts', content: 'y'.repeat(500) }],
          },
        };
      });

      const iterations = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await orchestrator.executeWorkflow(complexWorkflowInput);
        const endTime = performance.now();
        
        responseTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const p95ResponseTime = percentile(responseTimes, 95);

      console.log(`Complex Workflow Response Time Stats (${iterations} iterations):`);
      console.log(`Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`P95: ${p95ResponseTime.toFixed(2)}ms`);

      // Performance assertions for complex workflows
      expect(avgResponseTime).toBeLessThan(2000);
      expect(p95ResponseTime).toBeLessThan(3000);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 120000);

    it('should handle concurrent requests with minimal degradation', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Concurrent request test',
        projectPath: path.join(process.cwd(), 'temp', 'perf-concurrent-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const concurrencyLevels = [1, 5, 10, 20, 50];
      const results: Record<number, number[]> = {};

      for (const concurrency of concurrencyLevels) {
        const iterations = 100;
        const responseTimes: number[] = [];
        const startTime = performance.now();

        // Execute requests in batches
        const batches = Math.ceil(iterations / concurrency);
        for (let i = 0; i < batches; i++) {
          const batch = Array.from({ length: Math.min(concurrency, iterations - i * concurrency) });
          
          const batchPromises = batch.map(async () => {
            const start = performance.now();
            await orchestrator.executeWorkflow(workflowInput);
            const end = performance.now();
            return end - start;
          });

          const batchResults = await Promise.all(batchPromises);
          responseTimes.push(...batchResults);
        }

        const totalTime = performance.now() - startTime;
        const throughput = iterations / (totalTime / 1000); // requests per second

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        results[concurrency] = responseTimes;

        console.log(`Concurrency ${concurrency}:`);
        console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);

        // Performance should degrade gracefully
        if (concurrency > 1) {
          const baselineTime = results[1].reduce((a, b) => a + b, 0) / results[1].length;
          const degradation = (avgResponseTime / baselineTime - 1) * 100;
          expect(degradation).toBeLessThan(200); // Allow 200% degradation
        }
      }
    }, 300000);
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during extended operation', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Memory leak test',
        projectPath: path.join(process.cwd(), 'temp', 'memory-leak-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [];

      // Run many workflows
      const iterations = 500;
      for (let i = 0; i < iterations; i++) {
        await orchestrator.executeWorkflow(workflowInput);
        
        // Take memory snapshot every 50 iterations
        if (i % 50 === 0) {
          const currentMemory = process.memoryUsage();
          memorySnapshots.push(currentMemory);
        }
      }

      // Calculate memory growth
      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthPercent = (heapGrowth / initialMemory.heapUsed) * 100;

      console.log('Memory Usage Over Time:');
      console.log(`Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Heap Growth: ${(heapGrowth / 1024 / 1024).toFixed(2)} MB (${heapGrowthPercent.toFixed(2)}%)`);

      // Memory growth should be minimal (less than 10% over 500 iterations)
      expect(heapGrowthPercent).toBeLessThan(10);

      // Store metrics
      performanceMetrics.memoryUsage.push(...memorySnapshots);
    }, 180000);

    it('should handle large payload processing efficiently', async () => {
      const largeWorkflowInput = {
        type: 'feature-request',
        description: 'Large payload test',
        payload: generateLargePayload(5 * 1024 * 1024), // 5MB payload
        projectPath: path.join(process.cwd(), 'temp', 'large-payload-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const result = await orchestrator.executeWorkflow(largeWorkflowInput);

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      const processingTime = endTime - startTime;
      const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

      console.log('Large Payload Processing:');
      console.log(`Payload Size: ${(largeWorkflowInput.payload.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Processing Time: ${processingTime.toFixed(2)}ms`);
      console.log(`Memory Used: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`);

      // Should process large payload efficiently
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds
      expect(result.success).toBe(true);
    }, 30000);

    it('should manage session memory effectively', async () => {
      const numSessions = 100;
      const sessionIds: string[] = [];

      await app.initialize();
      await orchestrator.initialize();

      // Create many sessions
      for (let i = 0; i < numSessions; i++) {
        const workflowInput = {
          type: 'feature-request',
          description: `Session test ${i}`,
          projectPath: path.join(process.cwd(), 'temp', 'session-test'),
        };

        const result = await orchestrator.executeWorkflow(workflowInput);
        if (result.sessionId) {
          sessionIds.push(result.sessionId);
        }
      }

      const memoryAfterSessions = process.memoryUsage();

      // Cleanup sessions
      for (const sessionId of sessionIds) {
        try {
          await orchestrator.sessionManager?.endSession(sessionId);
        } catch (error) {
          // Session might already be expired
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const memoryAfterCleanup = process.memoryUsage();
      const memoryFreed = memoryAfterSessions.heapUsed - memoryAfterCleanup.heapUsed;

      console.log('Session Memory Management:');
      console.log(`Sessions Created: ${numSessions}`);
      console.log(`Memory After Sessions: ${(memoryAfterSessions.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory After Cleanup: ${(memoryAfterCleanup.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory Freed: ${(memoryFreed / 1024 / 1024).toFixed(2)} MB`);

      // Should free significant memory after session cleanup
      expect(memoryFreed).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Throughput Benchmarks', () => {
    it('should maintain minimum throughput under normal load', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Throughput test',
        projectPath: path.join(process.cwd(), 'temp', 'throughput-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      // Run throughput test for 30 seconds
      const testDuration = 30000; // 30 seconds
      const startTime = performance.now();
      let completedRequests = 0;
      const errors: Error[] = [];

      while (performance.now() - startTime < testDuration) {
        try {
          await orchestrator.executeWorkflow(workflowInput);
          completedRequests++;
        } catch (error) {
          errors.push(error as Error);
        }
      }

      const actualDuration = performance.now() - startTime;
      const throughput = completedRequests / (actualDuration / 1000); // requests per second
      const errorRate = (errors.length / completedRequests) * 100;

      console.log('Throughput Test Results:');
      console.log(`Duration: ${(actualDuration / 1000).toFixed(2)}s`);
      console.log(`Completed Requests: ${completedRequests}`);
      console.log(`Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`Error Rate: ${errorRate.toFixed(2)}%`);

      // Should maintain reasonable throughput
      expect(throughput).toBeGreaterThan(10); // At least 10 req/s
      expect(errorRate).toBeLessThan(1); // Less than 1% error rate

      // Store metrics
      performanceMetrics.throughput.push(throughput);
      performanceMetrics.errorRate.push(errorRate);
    }, 60000);

    it('should handle burst traffic spikes', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Burst traffic test',
        projectPath: path.join(process.cwd(), 'temp', 'burst-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      // Normal traffic rate
      const normalRate = 5; // requests per second
      const burstSize = 50;
      const burstDuration = 2000; // 2 seconds

      const results: {
        period: string;
        completed: number;
        errors: number;
        duration: number;
      }[] = [];

      // Test periods: before burst, during burst, after burst
      const periods = [
        { name: 'Normal', duration: 5000 },
        { name: 'Burst', duration: burstDuration },
        { name: 'Recovery', duration: 5000 },
      ];

      for (const period of periods) {
        const periodStart = performance.now();
        let completed = 0;
        let errors = 0;

        if (period.name === 'Burst') {
          // Burst: send all requests immediately
          const promises = Array.from({ length: burstSize }, () =>
            orchestrator.executeWorkflow(workflowInput)
              .then(() => completed++)
              .catch(() => errors++)
          );
          await Promise.all(promises);
        } else {
          // Normal rate limiting
          const interval = 1000 / normalRate;
          while (performance.now() - periodStart < period.duration) {
            await orchestrator.executeWorkflow(workflowInput)
              .then(() => completed++)
              .catch(() => errors++);
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }

        const actualDuration = performance.now() - periodStart;
        results.push({
          period: period.name,
          completed,
          errors,
          duration: actualDuration,
        });
      }

      console.log('Burst Traffic Test Results:');
      results.forEach(result => {
        const rate = result.completed / (result.duration / 1000);
        console.log(`${result.period}:`);
        console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);
        console.log(`  Completed: ${result.completed}`);
        console.log(`  Rate: ${rate.toFixed(2)} req/s`);
        console.log(`  Errors: ${result.errors}`);
      });

      // Burst should be handled without system failure
      const burstResult = results.find(r => r.period === 'Burst');
      expect(burstResult?.completed).toBeGreaterThan(0);
      expect(burstResult?.errors).toBeLessThan(burstResult?.completed * 0.5); // Less than 50% error rate during burst
    }, 90000);
  });

  describe('Scalability Tests', () => {
    it('should scale linearly up to resource limits', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Scalability test',
        projectPath: path.join(process.cwd(), 'temp', 'scalability-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const workerCounts = [1, 2, 4, 8];
      const results: {
        workers: number;
        throughput: number;
        avgResponseTime: number;
      }[] = [];

      for (const workers of workerCounts) {
        const iterations = 200;
        const responseTimes: number[] = [];
        const startTime = performance.now();

        // Run with specified number of workers
        const workerPromises = Array.from({ length: workers }, async () => {
          for (let i = 0; i < Math.ceil(iterations / workers); i++) {
            const start = performance.now();
            try {
              await orchestrator.executeWorkflow(workflowInput);
            } finally {
              const end = performance.now();
              responseTimes.push(end - start);
            }
          }
        });

        await Promise.all(workerPromises);

        const totalTime = performance.now() - startTime;
        const throughput = iterations / (totalTime / 1000);
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        results.push({ workers, throughput, avgResponseTime });

        console.log(`Workers: ${workers}, Throughput: ${throughput.toFixed(2)} req/s, Avg Response: ${avgResponseTime.toFixed(2)}ms`);
      }

      // Calculate scalability efficiency
      const baselineThroughput = results[0].throughput;
      for (let i = 1; i < results.length; i++) {
        const expectedThroughput = baselineThroughput * results[i].workers;
        const actualThroughput = results[i].throughput;
        const efficiency = (actualThroughput / expectedThroughput) * 100;

        console.log(`Scalability (${results[i].workers} workers): ${efficiency.toFixed(2)}% efficiency`);

        // Should maintain reasonable efficiency (at least 60%)
        expect(efficiency).toBeGreaterThan(60);
      }
    }, 300000);

    it('should handle maximum concurrent sessions', async () => {
      const maxSessions = 500;
      const sessionIds: string[] = [];
      const errors: string[] = [];

      await app.initialize();
      await orchestrator.initialize();

      // Create maximum sessions
      for (let i = 0; i < maxSessions; i++) {
        try {
          const workflowInput = {
            type: 'feature-request',
            description: `Session test ${i}`,
            projectPath: path.join(process.cwd(), 'temp', 'max-sessions-test'),
          };

          const result = await orchestrator.executeWorkflow(workflowInput);
          if (result.sessionId) {
            sessionIds.push(result.sessionId);
          }
        } catch (error) {
          errors.push(`Session ${i} failed: ${(error as Error).message}`);
        }
      }

      const successRate = (sessionIds.length / maxSessions) * 100;

      console.log('Max Sessions Test:');
      console.log(`Attempted: ${maxSessions}`);
      console.log(`Successful: ${sessionIds.length}`);
      console.log(`Failed: ${errors.length}`);
      console.log(`Success Rate: ${successRate.toFixed(2)}%`);

      // Should handle most sessions successfully
      expect(successRate).toBeGreaterThan(90);

      // Verify session cleanup
      for (const sessionId of sessionIds) {
        try {
          await orchestrator.sessionManager?.endSession(sessionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }, 120000);
  });

  describe('Long-Running Stability', () => {
    it('should remain stable during extended operation', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Stability test',
        projectPath: path.join(process.cwd(), 'temp', 'stability-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const testDuration = 60000; // 1 minute
      const interval = 1000; // 1 second
      const startTime = performance.now();
      const stabilityMetrics: {
        time: number;
        responseTime: number;
        memory: number;
      }[] = [];

      let iteration = 0;
      while (performance.now() - startTime < testDuration) {
        const stepStart = performance.now();
        
        try {
          await orchestrator.executeWorkflow(workflowInput);
          const stepEnd = performance.now();
          
          stabilityMetrics.push({
            time: performance.now() - startTime,
            responseTime: stepEnd - stepStart,
            memory: process.memoryUsage().heapUsed,
          });
        } catch (error) {
          console.error(`Iteration ${iteration} failed:`, error);
        }

        iteration++;
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      // Analyze stability
      const responseTimes = stabilityMetrics.map(m => m.responseTime);
      const memories = stabilityMetrics.map(m => m.memory);

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const responseTimeVariance = calculateVariance(responseTimes);
      const memoryGrowth = memories[memories.length - 1] - memories[0];

      console.log('Long-Running Stability Test:');
      console.log(`Duration: ${(testDuration / 1000).toFixed(2)}s`);
      console.log(`Iterations: ${iteration}`);
      console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Response Time Variance: ${responseTimeVariance.toFixed(2)}ms²`);
      console.log(`Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`);

      // Should maintain stable performance
      expect(responseTimeVariance).toBeLessThan(avgResponseTime * 0.5); // Variance < 50% of mean
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    }, 120000);
  });

  describe('Resource Utilization', () => {
    it('should utilize CPU efficiently under load', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'CPU utilization test',
        projectPath: path.join(process.cwd(), 'temp', 'cpu-util-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      // Mock CPU-intensive workflow
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(async () => {
        // CPU-intensive calculation
        const start = Date.now();
        while (Date.now() - start < 100) {
          Math.sqrt(Math.random() * 1000000);
        }
        return {
          success: true,
          steps: [],
          artifacts: {},
        };
      });

      const startCpuUsage = process.cpuUsage();
      const startTime = performance.now();

      // Run CPU-intensive workflows
      const iterations = 50;
      await Promise.all(
        Array.from({ length: iterations }, () =>
          orchestrator.executeWorkflow(workflowInput)
        )
      );

      const endTime = performance.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);

      const cpuUserTime = endCpuUsage.user / 1000; // Convert to ms
      const cpuSystemTime = endCpuUsage.system / 1000;
      const totalCpuTime = cpuUserTime + cpuSystemTime;
      const wallTime = endTime - startTime;
      const cpuUtilization = (totalCpuTime / wallTime) * 100;

      console.log('CPU Utilization Test:');
      console.log(`Wall Time: ${wallTime.toFixed(2)}ms`);
      console.log(`CPU User Time: ${cpuUserTime.toFixed(2)}ms`);
      console.log(`CPU System Time: ${cpuSystemTime.toFixed(2)}ms`);
      console.log(`CPU Utilization: ${cpuUtilization.toFixed(2)}%`);

      // Should utilize CPU efficiently
      expect(cpuUtilization).toBeGreaterThan(50);
      expect(cpuUtilization).toBeLessThan(95); // Not overloaded

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 60000);

    it('should manage I/O operations efficiently', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'I/O efficiency test',
        requiresFileOperations: true,
        projectPath: path.join(process.cwd(), 'temp', 'io-efficiency-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      // Mock file operations
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(async () => {
        // Simulate I/O operations
        const fs = require('fs/promises');
        
        // Write operation
        await fs.writeFile('/tmp/test-file.txt', 'x'.repeat(10000));
        
        // Read operation
        await fs.readFile('/tmp/test-file.txt', 'utf8');
        
        // Cleanup
        await fs.unlink('/tmp/test-file.txt');

        return {
          success: true,
          steps: [],
          artifacts: {},
        };
      });

      const startTime = performance.now();
      const iterations = 100;

      const responseTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const stepStart = performance.now();
        await orchestrator.executeWorkflow(workflowInput);
        responseTimes.push(performance.now() - stepStart);
      }

      const totalTime = performance.now() - startTime;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const throughput = iterations / (totalTime / 1000);

      console.log('I/O Efficiency Test:');
      console.log(`Iterations: ${iterations}`);
      console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} ops/s`);

      // Should handle I/O efficiently
      expect(avgResponseTime).toBeLessThan(1000); // Less than 1 second per operation
      expect(throughput).toBeGreaterThan(10); // At least 10 ops/s

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 120000);
  });
});

/**
 * Generate large payload for testing
 */
function generateLargePayload(sizeInBytes: number): string {
  return 'x'.repeat(sizeInBytes);
}

/**
 * Calculate percentile from array
 */
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate variance
 */
function calculateVariance(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
}
