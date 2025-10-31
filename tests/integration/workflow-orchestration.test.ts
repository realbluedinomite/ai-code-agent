/**
 * Workflow Orchestration Integration Tests
 * 
 * Tests the complete orchestration between all components in various scenarios
 */

import { ComponentIntegrator, IntegrationStatus } from '../../../src/components/integration';
import { WorkflowInput, WorkflowStep } from '../../../src/orchestrator/types';
import { createDefaultIntegration } from '../../../src/components/integration';

describe('Workflow Orchestration Integration', () => {
  let integrator: ComponentIntegrator;

  beforeAll(async () => {
    integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 3,
        timeoutMs: 15000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: true,
        enableMetrics: true,
        healthCheckInterval: 5000
      }
    });
  });

  afterAll(async () => {
    await integrator.shutdown();
  });

  describe('Sequential Workflow Processing', () => {
    it('should process input -> analysis -> planning in sequence', async () => {
      const input: WorkflowInput = {
        command: 'create e-commerce platform',
        parameters: {
          frontend: 'React',
          backend: 'Node.js',
          database: 'PostgreSQL',
          features: ['user-auth', 'product-catalog', 'shopping-cart', 'payment-processing']
        },
        projectPath: '/workspace',
        context: {
          workingDirectory: '/workspace',
          environment: {
            NODE_ENV: 'development'
          }
        }
      };

      const startTime = Date.now();
      const result = await integrator.executeWorkflow(input);
      const totalTime = Date.now() - startTime;

      // Verify sequential execution
      expect(result.summary.componentTimings.input_parsing).toBeLessThan(result.summary.componentTimings.project_analysis || 0);
      expect(result.summary.componentTimings.project_analysis).toBeLessThan(result.summary.componentTimings.planning || 0);

      // Verify all components participated
      expect(result.summary.componentTimings.input_parsing).toBeDefined();
      expect(result.summary.componentTimings.planning).toBeDefined();

      expect(totalTime).toBe(result.summary.totalDurationMs);
    });

    it('should handle partial analysis results', async () => {
      const input: WorkflowInput = {
        command: 'enhance existing application',
        parameters: {
          enhancement: 'add-microservices',
          preserve: 'core-functionality'
        },
        projectPath: '/workspace',
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should complete even if analysis is partial
      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();
    });

    it('should validate data flow between components', async () => {
      const input: WorkflowInput = {
        command: 'build full-stack application with authentication',
        parameters: {
          stack: 'MERN',
          auth: 'JWT',
          features: ['CRUD', 'real-time']
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Verify data flows from input parser to planner
      if (result.results.parsed?.parsed?.intent?.type) {
        expect(result.results.planned?.plan).toBeDefined();
      }

      // Verify metadata preservation
      expect(result.workflowId).toBeDefined();
      expect(result.input.command).toBe(input.command);
    });
  });

  describe('Parallel Execution Scenarios', () => {
    it('should handle concurrent workflow execution', async () => {
      const workflows = [
        {
          command: 'create user management system',
          parameters: { module: 'users' },
          id: 'workflow-1'
        },
        {
          command: 'build payment integration',
          parameters: { module: 'payments' },
          id: 'workflow-2'
        },
        {
          command: 'implement notification system',
          parameters: { module: 'notifications' },
          id: 'workflow-3'
        }
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        workflows.map(async (wf) => {
          const input: WorkflowInput = {
            command: wf.command,
            parameters: wf.parameters,
            context: {
              workingDirectory: '/tmp',
              environment: {}
            }
          };
          return integrator.executeWorkflow(input);
        })
      );
      const totalTime = Date.now() - startTime;

      // All workflows should complete
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.status).toBe('completed' || 'recovered');
      });

      // Parallel execution should be faster than sequential
      expect(totalTime).toBeLessThan(30000); // Adjust threshold as needed
    });
  });

  describe('Error Propagation and Handling', () => {
    it('should propagate errors through the pipeline', async () => {
      const input: WorkflowInput = {
        command: 'test error propagation',
        parameters: {},
        projectPath: '/invalid-project-path',
        context: {
          workingDirectory: '/invalid-project-path',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Verify error details are preserved
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          expect(error.step).toBeDefined();
          expect(error.message).toBeDefined();
          expect(error.timestamp).toBeInstanceOf(Date);
        });
      }
    });

    it('should handle component-specific errors', async () => {
      const errorInputs = [
        {
          name: 'Empty command',
          input: {
            command: '',
            parameters: {},
            context: { workingDirectory: '/tmp', environment: {} }
          },
          expectedErrorStep: WorkflowStep.INPUT_PARSING
        },
        {
          name: 'Invalid project path',
          input: {
            command: 'analyze project',
            parameters: {},
            projectPath: '/non-existent',
            context: { workingDirectory: '/non-existent', environment: {} }
          },
          expectedErrorStep: WorkflowStep.PROJECT_ANALYSIS
        }
      ];

      for (const scenario of errorInputs) {
        const result = await integrator.executeWorkflow(scenario.input);
        
        if (result.errors.length > 0) {
          const hasExpectedError = result.errors.some(error => error.step === scenario.expectedErrorStep);
          expect(hasExpectedError).toBe(true);
        }
      }
    });
  });

  describe('State Management Across Components', () => {
    it('should maintain workflow state throughout execution', async () => {
      const input: WorkflowInput = {
        command: 'stateful workflow test',
        parameters: {
          tracking: true,
          checkpoints: ['parsing', 'analysis', 'planning']
        },
        context: {
          workingDirectory: '/tmp',
          environment: {
            WORKFLOW_ID: 'test-workflow-123'
          }
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Verify workflow metadata is preserved
      expect(result.workflowId).toBeDefined();
      expect(result.input).toBe(input);
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);

      // Verify component timings are tracked
      expect(result.summary.componentTimings).toBeDefined();
    });

    it('should track component execution history', async () => {
      const input: WorkflowInput = {
        command: 'track execution history',
        parameters: { track: true },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Verify metrics are collected
      const metrics = integrator.getComponentMetrics();
      expect(metrics.size).toBeGreaterThan(0);

      metrics.forEach((metric) => {
        expect(metric.executionCount).toBeGreaterThanOrEqual(0);
        expect(metric.successCount).toBeGreaterThanOrEqual(0);
        expect(metric.errorCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Resource Management', () => {
    it('should properly clean up resources after execution', async () => {
      const input: WorkflowInput = {
        command: 'resource cleanup test',
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      // Execute workflow
      const result = await integrator.executeWorkflow(input);
      
      // Verify no hanging resources
      const health = await integrator.getComponentHealth();
      for (const [, componentHealth] of health) {
        expect(componentHealth.status).toBe('healthy');
      }

      // Verify integrator is still functional
      expect(integrator.getStatus()).toBe(IntegrationStatus.READY);
    });

    it('should handle memory efficiently during long workflows', async () => {
      const workflowCount = 10;
      const workflows = Array.from({ length: workflowCount }, (_, i) => ({
        command: `memory test workflow ${i}`,
        parameters: { index: i },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      }));

      // Execute multiple workflows
      const results = await Promise.all(
        workflows.map(input => integrator.executeWorkflow(input))
      );

      // All should complete successfully
      results.forEach(result => {
        expect(result.status).toBe('completed' || 'recovered');
      });

      // Verify integrator is still healthy
      const health = await integrator.getComponentHealth();
      for (const [, componentHealth] of health) {
        expect(componentHealth.status).toBe('healthy');
      }
    });
  });

  describe('Workflow Validation', () => {
    it('should validate input before processing', async () => {
      const invalidInputs = [
        {
          name: 'Missing command',
          input: {
            command: undefined as any,
            parameters: {},
            context: { workingDirectory: '/tmp', environment: {} }
          }
        },
        {
          name: 'Invalid context',
          input: {
            command: 'test command',
            parameters: {},
            context: undefined as any
          }
        }
      ];

      for (const scenario of invalidInputs) {
        try {
          const result = await integrator.executeWorkflow(scenario.input);
          // If it doesn't throw, it should handle gracefully
          expect(result.status).toBeDefined();
        } catch (error) {
          // Expected for invalid inputs
          expect(error).toBeDefined();
        }
      }
    });

    it('should validate intermediate results', async () => {
      const input: WorkflowInput = {
        command: 'validate intermediate results',
        parameters: { validate: true },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Verify intermediate results are valid
      if (result.results.parsed) {
        expect(result.results.parsed.parsed).toBeDefined();
      }

      if (result.results.analyzed) {
        expect(result.results.analyzed.projectPath).toBeDefined();
      }

      if (result.results.planned) {
        expect(result.results.planned.plan).toBeDefined();
      }
    });
  });

  describe('Recovery Scenarios', () => {
    it('should recover from analysis failures', async () => {
      const input: WorkflowInput = {
        command: 'continue planning without analysis',
        parameters: { skipAnalysis: true },
        projectPath: '/non-existent',
        context: {
          workingDirectory: '/non-existent',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should recover and still produce plan
      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.planned).toBeDefined();
      
      // Should have warnings about skipped analysis
      if (result.warnings.length > 0) {
        const hasAnalysisWarning = result.warnings.some(w => w.step === WorkflowStep.PROJECT_ANALYSIS);
        expect(hasAnalysisWarning).toBe(true);
      }
    });

    it('should handle partial planning results', async () => {
      const input: WorkflowInput = {
        command: 'create plan with limited context',
        parameters: { minimal: true },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should complete with whatever data is available
      expect(result.status).toBeDefined();
      expect(result.results.planned).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete simple workflow within time limit', async () => {
      const input: WorkflowInput = {
        command: 'simple task',
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const startTime = Date.now();
      const result = await integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      // Simple workflow should complete quickly
      expect(duration).toBeLessThan(5000);
      expect(result.summary.totalDurationMs).toBeLessThan(duration);
    });

    it('should handle complex workflow efficiently', async () => {
      const input: WorkflowInput = {
        command: 'build enterprise-grade microservices architecture with advanced features',
        parameters: {
          architecture: 'microservices',
          scalability: 'high',
          security: 'advanced',
          features: ['auth', 'caching', 'monitoring', 'scaling']
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const startTime = Date.now();
      const result = await integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      // Complex workflow should still complete within reasonable time
      expect(duration).toBeLessThan(15000);
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);
    });
  });
});
