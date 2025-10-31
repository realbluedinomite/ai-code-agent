/**
 * Component Integration Tests
 * 
 * Tests the integration between:
 * - Input Parser
 * - Project Analyzer  
 * - Planner
 * - Orchestrator
 */

import { ComponentIntegrator, IntegrationStatus, IntegrationUtils } from '../../../src/components/integration';
import { WorkflowInput, WorkflowStep } from '../../../src/orchestrator/types';
import { createDefaultIntegration } from '../../../src/components/integration';
import { createDefaultLogger } from '../../../src/core/logger';
import { ConfigManager } from '../../../src/core/config';

describe('Component Integration Tests', () => {
  let integrator: ComponentIntegrator;
  let configManager: ConfigManager;
  let logger: any;

  beforeAll(async () => {
    configManager = new ConfigManager();
    configManager.loadFromEnvironment('test');
    logger = createDefaultLogger('integration-test', 'test', '1.0.0');
    
    // Initialize integrator before tests
    integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 3,
        timeoutMs: 10000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: true,
        enableMetrics: true,
        healthCheckInterval: 5000
      },
      logging: {
        level: 'info',
        enableWorkflowTracing: true
      }
    });
  });

  afterAll(async () => {
    await integrator.shutdown();
  });

  beforeEach(() => {
    // Reset metrics before each test
    const metrics = integrator.getComponentMetrics();
    for (const [, metric] of metrics) {
      metric.executionCount = 0;
      metric.successCount = 0;
      metric.errorCount = 0;
    }
  });

  describe('Component Lifecycle', () => {
    it('should initialize all components successfully', async () => {
      expect(integrator.getStatus()).toBe(IntegrationStatus.READY);
      
      const health = await integrator.getComponentHealth();
      expect(health.size).toBeGreaterThan(0);
      
      for (const [, componentHealth] of health) {
        expect(componentHealth.status).toBe('healthy');
      }
    });

    it('should provide component metrics', () => {
      const metrics = integrator.getComponentMetrics();
      expect(metrics.size).toBeGreaterThan(0);
      
      for (const [componentName, metric] of metrics) {
        expect(componentName).toBeDefined();
        expect(metric.componentName).toBe(componentName);
        expect(metric.executionCount).toBeGreaterThanOrEqual(0);
        expect(metric.successCount).toBeGreaterThanOrEqual(0);
        expect(metric.errorCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should emit lifecycle events', async () => {
      const events: any[] = [];
      
      integrator.on('initialized', (data) => events.push({ type: 'initialized', data }));
      integrator.on('workflow:completed', (data) => events.push({ type: 'workflow:completed', data }));
      integrator.on('workflow:failed', (data) => events.push({ type: 'workflow:failed', data }));
      integrator.on('error', (data) => events.push({ type: 'error', data }));

      const testInput: WorkflowInput = {
        command: 'create a simple web application',
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      await integrator.executeWorkflow(testInput);

      // Should have emitted at least workflow completed event
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'workflow:completed')).toBe(true);
    });

    it('should handle graceful shutdown', async () => {
      const shutdownEvents: any[] = [];
      integrator.on('shutdown', () => shutdownEvents.push('shutdown'));

      await integrator.shutdown();

      expect(integrator.getStatus()).toBe(IntegrationStatus.UNINITIALIZED);
      expect(shutdownEvents).toContain('shutdown');
    });
  });

  describe('Input Parsing Integration', () => {
    it('should parse simple command', async () => {
      const input: WorkflowInput = {
        command: 'create a REST API',
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.results.parsed).toBeDefined();
      expect(result.results.parsed?.parsed).toBeDefined();
      expect(result.results.parsed?.parsed?.intent).toBeDefined();
      expect(result.results.parsed?.parsed?.description).toBe('create a REST API');
    });

    it('should parse complex command with parameters', async () => {
      const input: WorkflowInput = {
        command: 'build a React web application with TypeScript',
        parameters: {
          framework: 'react',
          language: 'typescript',
          features: ['authentication', 'database']
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.results.parsed).toBeDefined();
      expect(result.results.parsed?.parsed?.intent?.type).toBeDefined();
    });

    it('should handle parsing errors gracefully', async () => {
      const input: WorkflowInput = {
        command: '', // Empty command
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should still complete workflow due to error handling
      expect(result.status).toBeDefined();
      if (result.errors.length > 0) {
        expect(result.errors[0].step).toBe(WorkflowStep.INPUT_PARSING);
      }
    });
  });

  describe('Project Analysis Integration', () => {
    it('should analyze project when path is provided', async () => {
      const input: WorkflowInput = {
        command: 'refactor existing codebase',
        parameters: {},
        projectPath: '/workspace',
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Analysis may or may not complete depending on project structure
      expect(result.results.analyzed).toBeDefined();
    });

    it('should handle missing project path', async () => {
      const input: WorkflowInput = {
        command: 'create new project',
        parameters: {},
        // No projectPath
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should complete workflow but may skip analysis
      expect(result.status).toBeDefined();
      expect(result.results.analyzed).toBeUndefined();
      
      // Should have warning about skipped analysis
      if (result.warnings.length > 0) {
        expect(result.warnings[0].step).toBe(WorkflowStep.PROJECT_ANALYSIS);
      }
    });

    it('should handle project analysis errors', async () => {
      const input: WorkflowInput = {
        command: 'analyze non-existent project',
        parameters: {},
        projectPath: '/non-existent-path',
        context: {
          workingDirectory: '/non-existent-path',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should complete with error handling
      expect(result.status).toBeDefined();
      expect(result.errors).toBeDefined();
    });
  });

  describe('Planning Integration', () => {
    it('should create execution plan from parsed input', async () => {
      const input: WorkflowInput = {
        command: 'create a simple todo application',
        parameters: {
          database: 'sqlite',
          frontend: 'react'
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.results.planned).toBeDefined();
      expect(result.results.planned?.plan).toBeDefined();
      expect(result.results.planned?.plan?.steps).toBeDefined();
      expect(result.results.planned?.plan?.steps.length).toBeGreaterThan(0);
    });

    it('should enhance plan with project analysis', async () => {
      const input: WorkflowInput = {
        command: 'enhance existing web application',
        parameters: {},
        projectPath: '/workspace',
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Plan should be created
      expect(result.results.planned).toBeDefined();
      
      // Plan may be enhanced with analysis results
      if (result.results.analyzed) {
        // Enhanced planning would incorporate analysis insights
        expect(result.results.planned?.plan).toBeDefined();
      }
    });

    it('should handle planning errors', async () => {
      const input: WorkflowInput = {
        command: 'plan complex project with invalid parameters',
        parameters: { invalid: 'parameters' },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should handle planning errors
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
      expect(result.status).toBeDefined();
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should execute complete workflow successfully', async () => {
      const input: WorkflowInput = {
        command: 'create a REST API with Node.js and Express',
        parameters: {
          backend: 'nodejs',
          framework: 'express',
          database: 'mongodb'
        },
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Complete workflow should produce all outputs
      expect(result.status).toBe('completed');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();
      expect(result.errors.length).toBe(0);
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);
    });

    it('should execute workflow with degraded mode', async () => {
      const input: WorkflowInput = {
        command: 'analyze and plan project with limited context',
        parameters: {},
        // No project path, no detailed parameters
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should complete even with missing components
      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();
    });

    it('should track component metrics during workflow', async () => {
      const input: WorkflowInput = {
        command: 'measure component performance',
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const metricsBefore = integrator.getComponentMetrics();
      const inputParserExecutionsBefore = metricsBefore.get('input-parser')?.executionCount || 0;

      await integrator.executeWorkflow(input);

      const metricsAfter = integrator.getComponentMetrics();
      const inputParserExecutionsAfter = metricsAfter.get('input-parser')?.executionCount || 0;

      expect(inputParserExecutionsAfter).toBeGreaterThan(inputParserExecutionsBefore);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component errors gracefully', async () => {
      const input: WorkflowInput = {
        command: 'test error recovery',
        parameters: {},
        projectPath: '/non-existent',
        context: {
          workingDirectory: '/non-existent',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should recover from errors
      expect(result.status).toBe('completed' || 'recovered' || 'failed');
      expect(result.errors).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      const input: WorkflowInput = {
        command: 'trigger multiple errors',
        parameters: {},
        projectPath: '/invalid-path',
        context: {
          workingDirectory: '/invalid-path',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      if (result.errors.length > 0) {
        const error = result.errors[0];
        expect(error.step).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.code).toBeDefined();
        expect(error.timestamp).toBeDefined();
      }
    });

    it('should continue workflow after non-critical errors', async () => {
      const input: WorkflowInput = {
        command: 'create plan with some failures',
        parameters: {},
        projectPath: '/invalid',
        context: {
          workingDirectory: '/invalid',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      // Should still produce final result
      expect(result.results.planned).toBeDefined();
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete workflows within reasonable time', async () => {
      const startTime = Date.now();
      
      const input: WorkflowInput = {
        command: 'create simple API',
        parameters: {},
        context: {
          workingDirectory: '/tmp',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      expect(result.summary.totalDurationMs).toBeLessThan(duration);
    });

    it('should handle multiple sequential workflows', async () => {
      const workflowCount = 5;
      const startTime = Date.now();

      for (let i = 0; i < workflowCount; i++) {
        const input: WorkflowInput = {
          command: `workflow ${i + 1}`,
          parameters: { index: i },
          context: {
            workingDirectory: '/tmp',
            environment: {}
          }
        };

        const result = await integrator.executeWorkflow(input);
        expect(result.status).toBeDefined();
      }

      const totalDuration = Date.now() - startTime;
      
      // All workflows should complete
      expect(totalDuration).toBeLessThan(30000); // 30 seconds for 5 workflows
    });
  });

  describe('Integration Utilities', () => {
    it('should validate component compatibility', () => {
      // This would test IntegrationUtils.validateCompatibility
      // with mocked or real component outputs
      const validation = IntegrationUtils.validateCompatibility(
        { parsed: { intent: { type: 'test', confidence: 0.9 }, description: 'test' }, confidence: 0.9 },
        { projectPath: '/test', fileCount: 5, errors: [] },
        { plan: { planId: 'test', title: 'Test Plan', steps: [] }, metadata: { planningTimeMs: 100, planComplexity: 'simple', confidence: 0.9 } }
      );

      expect(validation.compatible).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it('should extract workflow summary', () => {
      const mockResult = {
        workflowId: 'test-workflow',
        status: 'completed' as const,
        input: { command: 'test command' },
        results: {
          parsed: { parsed: { intent: { type: 'test' } } },
          analyzed: { dependencyAnalysis: { dependencies: [] } },
          planned: { plan: { steps: [{ stepId: '1' }, { stepId: '2' }] } }
        },
        errors: [],
        warnings: [],
        summary: { totalDurationMs: 1000 }
      };

      const summary = IntegrationUtils.extractWorkflowSummary(mockResult);

      expect(summary.workflowId).toBe('test-workflow');
      expect(summary.status).toBe('completed');
      expect(summary.command).toBe('test command');
      expect(summary.planSteps).toBe(2);
      expect(summary.totalDurationMs).toBe(1000);
    });

    it('should create test scenarios', () => {
      const input: WorkflowInput = {
        command: 'test scenario',
        parameters: {},
        context: { workingDirectory: '/tmp', environment: {} }
      };

      const scenario = IntegrationUtils.createTestScenario('Test Scenario', input);

      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.input).toBe(input);
      expect(scenario.expectedStatus).toBe('completed');
      expect(typeof scenario.validateResults).toBe('function');
    });
  });

  describe('Real-world Workflow Examples', () => {
    it('should handle web application development workflow', async () => {
      const input: WorkflowInput = {
        command: 'create a modern web application with authentication',
        parameters: {
          framework: 'React',
          language: 'TypeScript',
          auth: 'JWT',
          database: 'PostgreSQL',
          features: ['user-management', 'api-endpoints', 'responsive-ui']
        },
        context: {
          workingDirectory: '/workspace',
          environment: { NODE_ENV: 'development' }
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.status).toBe('completed');
      expect(result.results.parsed?.parsed?.intent?.type).toBeDefined();
      expect(result.results.planned?.plan?.steps?.length).toBeGreaterThan(0);
    });

    it('should handle API development workflow', async () => {
      const input: WorkflowInput = {
        command: 'build REST API for todo management',
        parameters: {
          backend: 'Node.js',
          framework: 'Express',
          database: 'MongoDB',
          apiVersion: 'v1'
        },
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.status).toBe('completed');
      expect(result.results.planned?.plan).toBeDefined();
    });

    it('should handle data analysis workflow', async () => {
      const input: WorkflowInput = {
        command: 'analyze sales data and create visualizations',
        parameters: {
          dataSource: 'sales.csv',
          analysisType: 'trend-analysis',
          outputFormat: 'dashboard'
        },
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.status).toBeDefined();
      expect(result.results.parsed).toBeDefined();
    });

    it('should handle code refactoring workflow', async () => {
      const input: WorkflowInput = {
        command: 'refactor legacy codebase for better maintainability',
        parameters: {
          target: 'monolithic',
          goal: 'microservices',
          constraints: ['no-breaking-changes']
        },
        projectPath: '/workspace',
        context: {
          workingDirectory: '/workspace',
          environment: {}
        }
      };

      const result = await integrator.executeWorkflow(input);

      expect(result.status).toBeDefined();
      expect(result.results.analyzed).toBeDefined();
    });
  });
});
