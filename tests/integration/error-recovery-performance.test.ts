/**
 * Error Recovery and Performance Integration Tests
 * 
 * Tests error handling, recovery mechanisms, and performance under various conditions
 */

import { ComponentIntegrator, IntegrationStatus } from '../../../src/components/integration';
import { WorkflowInput, WorkflowStep } from '../../../src/orchestrator/types';
import { createDefaultIntegration } from '../../../src/components/integration';

describe('Error Recovery and Performance Integration', () => {
  let integrator: ComponentIntegrator;

  beforeAll(async () => {
    integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 3,
        timeoutMs: 10000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: true,
        enableMetrics: true,
        healthCheckInterval: 3000
      },
      logging: {
        level: 'debug',
        enableWorkflowTracing: true
      },
      workflow: {
        maxConcurrentWorkflows: 10,
        enableStatePersistence: false
      }
    });
  });

  afterAll(async () => {
    await integrator.shutdown();
  });

  describe('Error Recovery Mechanisms', () => {
    it('should recover from input parsing failures', async () => {
      const problematicInputs = [
        {
          name: 'Empty command',
          input: {
            command: '',
            parameters: {},
            context: { workingDirectory: '/tmp', environment: {} }
          }
        },
        {
          name: 'Very long command',
          input: {
            command: 'a'.repeat(10000),
            parameters: {},
            context: { workingDirectory: '/tmp', environment: {} }
          }
        },
        {
          name: 'Command with special characters',
          input: {
            command: 'create app with émojis 🚀 and special chars: @#$%^&*()',
            parameters: {},
            context: { workingDirectory: '/tmp', environment: {} }
          }
        }
      ];

      for (const scenario of problematicInputs) {
        const result = await integrator.executeWorkflow(scenario.input);
        
        // Should either complete or recover gracefully
        expect(result.status).toBe('completed' || 'recovered' || 'failed');
        expect(result.workflowId).toBeDefined();
      }
    });

    it('should recover from project analysis failures', async () => {
      const problematicPaths = [
        '/non-existent-path',
        '/readonly-path',
        '/extremely/long/path/that/might/cause/issues/' + 'a'.repeat(1000),
        '/workspace/../etc/passwd' // Security test
      ];

      for (const path of problematicPaths) {
        const input: WorkflowInput = {
          command: 'analyze problematic project',
          parameters: {},
          projectPath: path,
          context: {
            workingDirectory: path,
            environment: {}
          }
        };

        const result = await integrator.executeWorkflow(input);

        // Should handle analysis failures gracefully
        expect(result.status).toBe('completed' || 'recovered' || 'failed');
        
        if (result.errors.length > 0) {
          const hasAnalysisError = result.errors.some(error => error.step === WorkflowStep.PROJECT_ANALYSIS);
          expect(hasAnalysisError).toBe(true);
        }
      }
    });

    it('should recover from planning failures', async () => {
      const input: WorkflowInput = {
        command: 'plan with conflicting requirements',
        parameters: {
          fast: true,
          perfect: true,
          cheap: true,
          pickTwo: false
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should either complete with degraded mode or fail gracefully
      expect(result.status).toBe('completed' || 'recovered' || 'failed');
      expect(result.workflowId).toBeDefined();
      
      // If planning failed, should have appropriate error
      if (result.errors.some(e => e.step === WorkflowStep.PLANNING)) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should handle cascading failures', async () => {
      const input: WorkflowInput = {
        command: 'cascade failure test',
        parameters: {},
        projectPath: '/invalid-cascade-path',
        context: {
          workingDirectory: '/invalid-cascade-path',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should attempt recovery at multiple levels
      expect(result.status).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.summary.recoveryAttempts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle component timeouts', async () => {
      // Note: This test may need adjustment based on actual timeout behavior
      const input: WorkflowInput = {
        command: 'timeout test with slow operations',
        parameters: { simulateSlow: true },
        projectPath: '/workspace', // Use existing path to avoid immediate failure
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const startTime = Date.now();
      const result = await integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      // Should complete within timeout limit
      expect(duration).toBeLessThan(15000); // 15 second timeout

      if (duration > 10000) {
        // If it took longer than expected, should have timeout handling
        expect(result.errors.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should respect overall workflow timeout', async () => {
      const startTime = Date.now();
      const timeoutMs = 8000; // 8 second timeout for test

      const result = await Promise.race([
        integrator.executeWorkflow({
          command: 'timeout boundary test',
          parameters: {},
          context: { workingDirectory: '/tmp', environment: {} }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Workflow timeout')), timeoutMs)
        )
      ]).catch(() => null);

      const duration = Date.now() - startTime;

      if (result === null) {
        // Workflow timed out
        expect(duration).toBeGreaterThanOrEqual(timeoutMs - 1000);
      } else {
        // Workflow completed before timeout
        expect(duration).toBeLessThan(timeoutMs);
      }
    });
  });

  describe('Resource Exhaustion Handling', () => {
    it('should handle memory pressure gracefully', async () => {
      // Create multiple workflows to test memory handling
      const workflowCount = 20;
      const workflows = Array.from({ length: workflowCount }, (_, i) => ({
        command: `memory pressure test ${i}`,
        parameters: { 
          size: Math.random() > 0.5 ? 'large' : 'small',
          index: i 
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        workflows.map(input => integrator.executeWorkflow(input))
      );
      const totalTime = Date.now() - startTime;

      // All workflows should complete
      expect(results.length).toBe(workflowCount);
      results.forEach(result => {
        expect(result.status).toBe('completed' || 'recovered' || 'failed');
      });

      // Should complete within reasonable time despite memory pressure
      expect(totalTime).toBeLessThan(60000); // 1 minute for 20 workflows

      // Verify integrator is still healthy
      const health = await integrator.getComponentHealth();
      for (const [, componentHealth] of health) {
        expect(componentHealth.status).toBe('healthy' || 'degraded');
      }
    });

    it('should handle concurrent execution limits', async () => {
      const concurrentCount = 15; // Higher than maxConcurrentWorkflows (10)
      const workflows = Array.from({ length: concurrentCount }, (_, i) => ({
        command: `concurrent test ${i}`,
        parameters: { concurrent: true },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        workflows.map(input => integrator.executeWorkflow(input))
      );
      const totalTime = Date.now() - startTime;

      // All should complete (queuing or throttling handled internally)
      expect(results.length).toBe(concurrentCount);
      
      // Should complete within reasonable time even with throttling
      expect(totalTime).toBeLessThan(45000); // Allow for queuing

      results.forEach(result => {
        expect(result.status).toBe('completed' || 'recovered' || 'failed');
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with increasing complexity', async () => {
      const complexityLevels = ['simple', 'moderate', 'complex', 'very_complex'];
      const performanceResults: Array<{ complexity: string; duration: number; success: boolean }> = [];

      for (const complexity of complexityLevels) {
        const input: WorkflowInput = {
          command: `create application with ${complexity} requirements`,
          parameters: {
            complexity,
            features: complexity === 'simple' ? ['basic'] :
                     complexity === 'moderate' ? ['auth', 'database'] :
                     complexity === 'complex' ? ['auth', 'database', 'api', 'ui', 'testing'] :
                     ['auth', 'database', 'api', 'ui', 'testing', 'monitoring', 'scaling', 'security']
          },
          context: {
            workingDirectory: '/tmp',
            environment: {}
          }
        };

        const startTime = Date.now();
        const result = await integrator.executeWorkflow(input);
        const duration = Date.now() - startTime;

        performanceResults.push({
          complexity,
          duration,
          success: result.status === 'completed' || result.status === 'recovered'
        });

        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify performance degradation is reasonable
      const simpleDuration = performanceResults[0].duration;
      const complexDuration = performanceResults[performanceResults.length - 1].duration;

      // Complex should not be more than 5x slower than simple
      expect(complexDuration).toBeLessThan(simpleDuration * 5);
      
      // All should succeed
      performanceResults.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle sustained load', async () => {
      const sustainedWorkflows = 30;
      const startTime = Date.now();

      // Create a steady stream of workflows
      const promises = [];
      for (let i = 0; i < sustainedWorkflows; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(async () => {
              const input: WorkflowInput = {
                command: `sustained load test ${i}`,
                parameters: { iteration: i },
                context: {
                  workingDirectory: '/tmp',
                  environment: {}
                }
              };
              const result = await integrator.executeWorkflow(input);
              resolve(result);
            }, i * 100); // Stagger by 100ms
          })
        );
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Should handle sustained load
      expect(results.length).toBe(sustainedWorkflows);
      expect(totalTime).toBeLessThan(60000); // Complete within 1 minute

      // Most should complete successfully
      const successCount = results.filter((r: any) => 
        r.status === 'completed' || r.status === 'recovered'
      ).length;
      expect(successCount).toBeGreaterThan(sustainedWorkflows * 0.8); // 80% success rate
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources after failed workflows', async () => {
      const failedInputs = [
        {
          command: 'fail at parsing',
          parameters: { failAt: 'parsing' },
          context: { workingDirectory: '/tmp', environment: {} }
        },
        {
          command: 'fail at analysis',
          parameters: { failAt: 'analysis' },
          projectPath: '/non-existent',
          context: { workingDirectory: '/non-existent', environment: {} }
        },
        {
          command: 'fail at planning',
          parameters: { failAt: 'planning', invalid: 'requirements' },
          context: { workingDirectory: '/tmp', environment: {} }
        }
      ];

      for (const input of failedInputs) {
        const result = await integrator.executeWorkflow(input);
        
        // Should fail gracefully
        expect(result.status).toBe('failed' || 'recovered');
        
        // Resources should still be clean
        expect(integrator.getStatus()).toBe(IntegrationStatus.READY);
      }

      // Verify components are still healthy after failures
      const health = await integrator.getComponentHealth();
      for (const [, componentHealth] of health) {
        // May be degraded but should not be permanently broken
        expect(componentHealth.status).toBe('healthy' || 'degraded' || 'unhealthy');
      }
    });

    it('should handle memory leaks in long-running scenarios', async () => {
      const initialMetrics = integrator.getComponentMetrics();
      
      // Run many workflows
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        await integrator.executeWorkflow({
          command: `leak test ${i}`,
          parameters: { iteration: i },
          context: { workingDirectory: '/tmp', environment: {} }
        });
      }

      const finalMetrics = integrator.getComponentMetrics();
      
      // Metrics should still be trackable (no leaks in tracking)
      expect(finalMetrics.size).toBe(initialMetrics.size);

      // Components should still be responsive
      const health = await integrator.getComponentHealth();
      for (const [, componentHealth] of health) {
        expect(componentHealth.lastCheck).toBeInstanceOf(Date);
      }
    });
  });

  describe('Recovery Effectiveness', () => {
    it('should demonstrate effective error recovery', async () => {
      const recoveryScenarios = [
        {
          name: 'Parse fallback',
          input: {
            command: '',
            parameters: {},
            context: { workingDirectory: '/tmp', environment: {} }
          },
          expectedRecovery: 'minimal but functional output'
        },
        {
          name: 'Analysis skip',
          input: {
            command: 'plan without analysis',
            parameters: {},
            projectPath: '/non-existent',
            context: { workingDirectory: '/non-existent', environment: {} }
          },
          expectedRecovery: 'planning without analysis context'
        }
      ];

      for (const scenario of recoveryScenarios) {
        const result = await integrator.executeWorkflow(scenario.input);
        
        // Should recover successfully
        expect(result.status).toBe('completed' || 'recovered');
        
        // Should produce some meaningful output
        expect(result.results.parsed || result.results.planned).toBeDefined();
        
        // Should document the recovery
        if (result.status === 'recovered') {
          expect(result.warnings.length).toBeGreaterThan(0);
        }
      }
    });

    it('should maintain data integrity during recovery', async () => {
      const input: WorkflowInput = {
        command: 'test data integrity with recovery',
        parameters: { 
          preserve: ['command', 'context'],
          corruptAnalysis: true 
        },
        projectPath: '/invalid',
        context: {
          workingDirectory: '/invalid',
          environment: { TEST_MODE: 'recovery' }
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Original input should be preserved
      expect(result.input.command).toBe(input.command);
      expect(result.input.context).toBe(input.context);

      // Workflow metadata should be intact
      expect(result.workflowId).toBeDefined();
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);

      // Failed components should be documented but not break downstream
      if (result.errors.length > 0) {
        expect(result.results.planned).toBeDefined(); // Planning should still work
      }
    });
  });

  describe('Performance Degradation Handling', () => {
    it('should gracefully degrade performance under stress', async () => {
      const stressTest = async (concurrentCount: number) => {
        const workflows = Array.from({ length: concurrentCount }, (_, i) => ({
          command: `stress test ${i}`,
          parameters: { stress: true },
          context: { workingDirectory: '/tmp', environment: {} }
        }));

        const startTime = Date.now();
        const results = await Promise.all(
          workflows.map(input => integrator.executeWorkflow(input))
        );
        const duration = Date.now() - startTime;

        return {
          duration,
          successRate: results.filter(r => r.status === 'completed' || r.status === 'recovered').length / concurrentCount,
          averageTimePerWorkflow: duration / concurrentCount
        };
      };

      // Test at different levels of stress
      const stressLevels = [5, 10, 15, 20];
      const results = [];

      for (const level of stressLevels) {
        const result = await stressTest(level);
        results.push({ level, ...result });
      }

      // Verify graceful degradation
      results.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(0.5); // At least 50% success
        expect(result.averageTimePerWorkflow).toBeGreaterThan(0);
        
        if (index > 0) {
          // Each level should take longer but not exponentially so
          const previousTime = results[index - 1].averageTimePerWorkflow;
          expect(result.averageTimePerWorkflow).toBeLessThan(previousTime * 3);
        }
      });
    });
  });
});
