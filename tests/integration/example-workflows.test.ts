/**
 * Example Workflows Integration Tests
 * 
 * Tests the example workflows and demonstrates complete AI agent functionality
 */

import { ComponentIntegrator, IntegrationStatus, IntegrationUtils } from '../../../src/components/integration';
import { 
  ExampleWorkflows, 
  runAllExamples, 
  runExample, 
  runPerformanceBenchmark 
} from './example-workflows';
import { WorkflowInput } from '../../../src/orchestrator/types';
import { createDefaultIntegration } from '../../../src/components/integration';

describe('Example Workflows Integration', () => {
  let integrator: ComponentIntegrator;
  let examples: ExampleWorkflows;

  beforeAll(async () => {
    integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 3,
        timeoutMs: 20000,
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

    examples = new ExampleWorkflows(integrator);
  });

  afterAll(async () => {
    await integrator.shutdown();
  });

  describe('Individual Example Workflows', () => {
    it('should execute e-commerce platform development workflow', async () => {
      const result = await examples.ecommercePlatformDevelopment();

      // Verify workflow completed successfully
      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify plan includes relevant steps
      if (result.results.planned?.plan?.steps) {
        const stepTitles = result.results.planned.plan.steps.map(s => s.title.toLowerCase());
        expect(stepTitles.some(title => title.includes('frontend') || title.includes('react'))).toBe(true);
        expect(stepTitles.some(title => title.includes('backend') || title.includes('node'))).toBe(true);
      }

      // Verify timing information
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);
      expect(result.summary.componentTimings).toBeDefined();
    }, 30000);

    it('should execute microservices architecture workflow', async () => {
      const result = await examples.microservicesArchitecture();

      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify microservices-related planning
      if (result.results.planned?.plan?.steps) {
        const hasServicesPlanning = result.results.planned.plan.steps.some(step => 
          step.title.toLowerCase().includes('service') || 
          step.description.toLowerCase().includes('microservice')
        );
        expect(hasServicesPlanning).toBe(true);
      }
    }, 30000);

    it('should execute data science pipeline workflow', async () => {
      const result = await examples.dataSciencePipeline();

      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify ML/data science related planning
      if (result.results.planned?.plan?.steps) {
        const hasMLPlanning = result.results.planned.plan.steps.some(step =>
          step.title.toLowerCase().includes('data') ||
          step.title.toLowerCase().includes('model') ||
          step.title.toLowerCase().includes('ml')
        );
        expect(hasMLPlanning).toBe(true);
      }
    }, 30000);

    it('should execute DevOps infrastructure workflow', async () => {
      const result = await examples.devOpsInfrastructure();

      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify DevOps related planning
      if (result.results.planned?.plan?.steps) {
        const hasDevOpsPlanning = result.results.planned.plan.steps.some(step =>
          step.title.toLowerCase().includes('deployment') ||
          step.title.toLowerCase().includes('ci') ||
          step.title.toLowerCase().includes('infrastructure')
        );
        expect(hasDevOpsPlanning).toBe(true);
      }
    }, 30000);

    it('should execute mobile app development workflow', async () => {
      const result = await examples.mobileAppDevelopment();

      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify mobile development related planning
      if (result.results.planned?.plan?.steps) {
        const hasMobilePlanning = result.results.planned.plan.steps.some(step =>
          step.title.toLowerCase().includes('mobile') ||
          step.title.toLowerCase().includes('react native') ||
          step.title.toLowerCase().includes('ios') ||
          step.title.toLowerCase().includes('android')
        );
        expect(hasMobilePlanning).toBe(true);
      }
    }, 30000);

    it('should execute legacy system modernization workflow', async () => {
      const result = await examples.legacySystemModernization();

      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify modernization/refactoring related planning
      if (result.results.planned?.plan?.steps) {
        const hasModernizationPlanning = result.results.planned.plan.steps.some(step =>
          step.title.toLowerCase().includes('migrate') ||
          step.title.toLowerCase().includes('refactor') ||
          step.title.toLowerCase().includes('modernize')
        );
        expect(hasModernizationPlanning).toBe(true);
      }
    }, 30000);

    it('should execute real-time analytics dashboard workflow', async () => {
      const result = await examples.realTimeAnalyticsDashboard();

      expect(result.status).toBe('completed' || 'recovered');
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();

      // Verify analytics/dashboard related planning
      if (result.results.planned?.plan?.steps) {
        const hasAnalyticsPlanning = result.results.planned.plan.steps.some(step =>
          step.title.toLowerCase().includes('dashboard') ||
          step.title.toLowerCase().includes('analytics') ||
          step.title.toLowerCase().includes('real-time')
        );
        expect(hasAnalyticsPlanning).toBe(true);
      }
    }, 30000);
  });

  describe('Integration Utilities Validation', () => {
    it('should validate component compatibility for real workflows', async () => {
      const testCases = [
        {
          name: 'E-commerce Workflow',
          input: {
            command: 'create online marketplace',
            parameters: { type: 'marketplace', features: ['multi-vendor'] },
            context: { workingDirectory: '/tmp', environment: {} }
          }
        },
        {
          name: 'API Development Workflow',
          input: {
            command: 'build REST API for fintech',
            parameters: { domain: 'fintech', security: 'high' },
            context: { workingDirectory: '/tmp', environment: {} }
          }
        },
        {
          name: 'Data Analysis Workflow',
          input: {
            command: 'analyze customer data',
            parameters: { analysis: 'predictive', model: 'ml' },
            context: { workingDirectory: '/tmp', environment: {} }
          }
        }
      ];

      for (const testCase of testCases) {
        const result = await integrator.executeWorkflow(testCase.input);
        
        // Validate using integration utilities
        const compatibility = IntegrationUtils.validateCompatibility(
          result.results.parsed,
          result.results.analyzed,
          result.results.planned
        );

        // Should be compatible (might have warnings but functional)
        expect(compatibility.issues.length).toBeLessThanOrEqual(2);

        // Extract summary
        const summary = IntegrationUtils.extractWorkflowSummary(result);
        expect(summary.workflowId).toBeDefined();
        expect(summary.status).toBeDefined();
        expect(summary.command).toBe(testCase.input.command);
      }
    });

    it('should create and validate test scenarios', () => {
      const scenario = IntegrationUtils.createTestScenario('Test Commerce App', {
        command: 'create commerce application',
        parameters: { type: 'ecommerce' },
        context: { workingDirectory: '/tmp', environment: {} }
      });

      expect(scenario.name).toBe('Test Commerce App');
      expect(scenario.input.command).toBe('create commerce application');
      expect(scenario.expectedStatus).toBe('completed');
      expect(typeof scenario.validateResults).toBe('function');

      // Validate scenario works with mock result
      const mockResult = {
        status: 'completed',
        results: { parsed: {}, planned: {} }
      };

      expect(() => scenario.validateResults(mockResult as any)).not.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    it('should maintain consistent performance across different workflow types', async () => {
      const workflowTypes = [
        {
          name: 'Simple Web App',
          input: {
            command: 'create simple web application',
            parameters: { complexity: 'low' },
            context: { workingDirectory: '/tmp', environment: {} }
          }
        },
        {
          name: 'Complex System',
          input: {
            command: 'design enterprise microservices architecture with advanced features',
            parameters: { complexity: 'high', features: 'all' },
            context: { workingDirectory: '/tmp', environment: {} }
          }
        }
      ];

      const performanceResults: Array<{ type: string; duration: number; status: string }> = [];

      for (const workflow of workflowTypes) {
        const startTime = Date.now();
        const result = await integrator.executeWorkflow(workflow.input);
        const duration = Date.now() - startTime;

        performanceResults.push({
          type: workflow.name,
          duration,
          status: result.status
        });
      }

      // Simple workflows should generally be faster
      const simpleDuration = performanceResults[0].duration;
      const complexDuration = performanceResults[1].duration;

      expect(complexDuration).toBeLessThan(simpleDuration * 3); // Complex should not be >3x slower

      // All should succeed
      performanceResults.forEach(result => {
        expect(result.status).toBe('completed' || 'recovered');
      });
    }, 45000);

    it('should handle repeated execution of same workflow', async () => {
      const input: WorkflowInput = {
        command: 'create repeatable web application',
        parameters: { version: '1.0' },
        context: { workingDirectory: '/tmp', environment: {} }
      };

      const iterations = 3;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const result = await integrator.executeWorkflow(input);
        results.push(result);

        // Brief pause between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All iterations should succeed
      results.forEach(result => {
        expect(result.status).toBe('completed' || 'recovered');
      });

      // Verify integrator is still healthy
      expect(integrator.getStatus()).toBe(IntegrationStatus.READY);

      // Verify metrics are updated
      const metrics = integrator.getComponentMetrics();
      expect(metrics.get('input-parser')?.executionCount).toBeGreaterThanOrEqual(iterations);
    });
  });

  describe('Error Handling in Complex Workflows', () => {
    it('should handle errors in complex e-commerce workflow gracefully', async () => {
      const problematicInput: WorkflowInput = {
        command: 'create e-commerce platform with conflicting requirements',
        parameters: {
          fastDelivery: true,
          highQuality: true,
          lowCost: true,
          unlimited: true
        },
        projectPath: '/non-existent-ecommerce',
        context: {
          workingDirectory: '/non-existent-ecommerce',
          environment: {}
        }
      };

      const result = await examples.ecommercePlatformDevelopment().catch(() => 
        integrator.executeWorkflow(problematicInput)
      );

      // Should handle gracefully even with problematic input
      expect(result.status).toBe('completed' || 'recovered' || 'failed');
      expect(result.workflowId).toBeDefined();
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);
    });

    it('should maintain system stability under error conditions', async () => {
      const errorInputs = [
        {
          command: 'create system with invalid parameters',
          parameters: { invalid: 'conflicting', requirements: ['fast', 'slow'] },
          context: { workingDirectory: '/tmp', environment: {} }
        },
        {
          command: 'analyze non-existent project',
          parameters: {},
          projectPath: '/invalid-path',
          context: { workingDirectory: '/invalid-path', environment: {} }
        }
      ];

      // Execute multiple failing workflows
      const errorResults = await Promise.all(
        errorInputs.map(input => integrator.executeWorkflow(input).catch(() => ({ status: 'error-handled' })))
      );

      // All should be handled gracefully
      errorResults.forEach(result => {
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      });

      // System should still be operational
      expect(integrator.getStatus()).toBe(IntegrationStatus.READY);

      const health = await integrator.getComponentHealth();
      health.forEach(component => {
        expect(component.status).toBe('healthy' || 'degraded' || 'unhealthy');
      });
    });
  });

  describe('Comprehensive Integration Validation', () => {
    it('should validate complete end-to-end workflow with all components', async () => {
      const complexInput: WorkflowInput = {
        command: 'design and plan a comprehensive full-stack application development project',
        parameters: {
          scope: 'enterprise',
          frontend: 'React + TypeScript',
          backend: 'Node.js + GraphQL',
          database: 'PostgreSQL + Redis',
          infrastructure: 'AWS + Docker + Kubernetes',
          features: ['authentication', 'real-time-updates', 'file-upload', 'analytics'],
          requirements: {
            performance: 'high',
            security: 'enterprise-grade',
            scalability: 'horizontal',
            monitoring: 'comprehensive'
          }
        },
        projectPath: '/workspace/complex-project',
        context: {
          workingDirectory: '/workspace/complex-project',
          environment: {
            PROJECT_TYPE: 'enterprise',
            SECURITY_LEVEL: 'high'
          }
        }
      };

      const result = await integrator.executeWorkflow(complexInput);

      // Complete workflow validation
      expect(result.status).toBeDefined();
      expect(result.results.parsed).toBeDefined();
      expect(result.results.planned).toBeDefined();
      expect(result.summary.componentTimings).toBeDefined();

      // Verify data integrity
      expect(result.input).toBe(complexInput);
      expect(result.workflowId).toBeDefined();
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);

      // Verify component integration
      const metrics = integrator.getComponentMetrics();
      expect(metrics.size).toBeGreaterThan(0);
      
      const inputParserMetrics = metrics.get('input-parser');
      const plannerMetrics = metrics.get('planner');
      
      if (inputParserMetrics) {
        expect(inputParserMetrics.executionCount).toBeGreaterThan(0);
      }
      
      if (plannerMetrics) {
        expect(plannerMetrics.executionCount).toBeGreaterThan(0);
      }
    });

    it('should demonstrate complete AI agent workflow integration', async () => {
      // This test demonstrates the full integration
      const demonstrateIntegration = async () => {
        console.log('\n🔬 Demonstrating Complete AI Agent Integration');
        
        // Step 1: Parse complex input
        const input: WorkflowInput = {
          command: 'create modern SaaS application with multi-tenant architecture',
          parameters: {
            architecture: 'multi-tenant',
            frontend: 'React',
            backend: 'Node.js',
            database: 'PostgreSQL',
            features: ['user-management', 'subscription-billing', 'analytics']
          },
          context: { workingDirectory: '/tmp', environment: {} }
        };

        console.log('1. Input:', input.command);

        // Step 2: Execute full workflow
        const result = await integrator.executeWorkflow(input);

        console.log('2. Processing completed');
        console.log('3. Status:', result.status);
        console.log('4. Errors:', result.errors.length);
        console.log('5. Warnings:', result.warnings.length);
        console.log('6. Duration:', result.summary.totalDurationMs, 'ms');

        // Step 3: Validate integration
        const health = await integrator.getComponentHealth();
        const metrics = integrator.getComponentMetrics();

        console.log('7. Component Health:');
        for (const [name, healthData] of health) {
          console.log(`   - ${name}: ${healthData.status}`);
        }

        console.log('8. Component Metrics:');
        for (const [name, metricData] of metrics) {
          console.log(`   - ${name}: ${metricData.executionCount} executions, ${metricData.successCount} success`);
        }

        return result;
      };

      const result = await demonstrateIntegration();

      // Final validation
      expect(result.status).toBe('completed' || 'recovered');
      expect(integrator.getStatus()).toBe(IntegrationStatus.READY);
      expect(result.summary.totalDurationMs).toBeGreaterThan(0);

      console.log('✅ Integration demonstration completed successfully');
    });
  });
});

// Note: These tests are commented out as they would take a long time to run
// Uncomment to actually run the example workflows

/*
describe('Full Example Runners (Disabled by Default)', () => {
  it('should run all example workflows', async () => {
    // This test runs all example workflows - comment in to test
    // await runAllExamples();
    console.log('Example runner test - run manually if needed');
  }, 120000);

  it('should run individual examples', async () => {
    // await runExample('ecommerce');
    console.log('Individual example test - run manually if needed');
  }, 30000);

  it('should run performance benchmark', async () => {
    // const results = await runPerformanceBenchmark();
    console.log('Performance benchmark test - run manually if needed');
  }, 60000);
});
*/
