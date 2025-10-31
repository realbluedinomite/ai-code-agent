/**
 * Orchestrator Component Test Suite
 * Comprehensive tests for the Orchestrator component with performance benchmarks
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  Orchestrator,
  createOrchestrator,
  ComponentRegistry,
  WorkflowManager,
  SessionManager,
  ErrorHandler,
  ComponentCoordinator,
  OrchestratorConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowStep,
  SessionState
} from '@/orchestrator';
import { mockEventData } from '../fixtures/mock-data';

// Mock dependencies
jest.mock('@/orchestrator/component-registry');
jest.mock('@/orchestrator/workflow-manager');
jest.mock('@/orchestrator/session-manager');
jest.mock('@/orchestrator/error-handler');
jest.mock('@/orchestrator/component-coordinator');
jest.mock('@/orchestrator/implementer');
jest.mock('@/orchestrator/reviewer');

// Performance benchmarking utilities
class PerformanceBenchmark {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryBefore: number = 0;
  private memoryAfter: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.memoryBefore = process.memoryUsage().heapUsed;
  }

  end(): { duration: number; memoryDiff: number } {
    this.endTime = performance.now();
    this.memoryAfter = process.memoryUsage().heapUsed;
    return {
      duration: this.endTime - this.startTime,
      memoryDiff: this.memoryAfter - this.memoryBefore
    };
  }
}

describe('Orchestrator Component Tests', () => {
  let orchestrator: Orchestrator;
  let performanceBenchmarks: PerformanceBenchmark;
  
  const mockConfig: OrchestratorConfig = {
    logging: {
      level: 'info',
      format: 'json',
      enableConsole: true,
      enableFile: false,
      filePath: '/logs/orchestrator.log'
    },
    workflow: {
      maxSteps: 100,
      timeout: 300000, // 5 minutes
      retryAttempts: 3,
      parallelExecution: true,
      stepTimeout: 60000 // 1 minute
    },
    session: {
      maxDuration: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      maxSessions: 10
    },
    components: {
      autoRegister: true,
      healthCheckInterval: 60000, // 1 minute
      maxRetries: 3
    }
  };

  const mockUserRequest = {
    text: 'Create a user authentication system with OAuth2',
    context: {
      projectPath: '/test/project',
      userId: 'user-123',
      sessionId: 'session-456',
      timestamp: new Date()
    },
    metadata: {
      priority: 'high',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  };

  const sampleWorkflowSteps: WorkflowStep[] = [
    {
      id: 'step-1',
      name: 'Parse Input',
      component: 'input-parser',
      action: 'parse',
      status: 'pending',
      estimatedDuration: 5000,
      actualDuration: null,
      dependencies: [],
      result: null,
      error: null
    },
    {
      id: 'step-2',
      name: 'Analyze Project',
      component: 'project-analyzer',
      action: 'analyze',
      status: 'pending',
      estimatedDuration: 10000,
      actualDuration: null,
      dependencies: ['step-1'],
      result: null,
      error: null
    },
    {
      id: 'step-3',
      name: 'Create Plan',
      component: 'planner',
      action: 'plan',
      status: 'pending',
      estimatedDuration: 8000,
      actualDuration: null,
      dependencies: ['step-2'],
      result: null,
      error: null
    },
    {
      id: 'step-4',
      name: 'Implement Changes',
      component: 'implementer',
      action: 'implement',
      status: 'pending',
      estimatedDuration: 60000,
      actualDuration: null,
      dependencies: ['step-3'],
      result: null,
      error: null
    },
    {
      id: 'step-5',
      name: 'Review Implementation',
      component: 'reviewer',
      action: 'review',
      status: 'pending',
      estimatedDuration: 15000,
      actualDuration: null,
      dependencies: ['step-4'],
      result: null,
      error: null
    }
  ];

  const mockWorkflowResult: WorkflowResult = {
    workflowId: 'workflow-123',
    status: 'completed',
    steps: sampleWorkflowSteps.map(step => ({
      ...step,
      status: 'completed',
      actualDuration: step.estimatedDuration
    })),
    output: {
      success: true,
      message: 'User authentication system created successfully',
      artifacts: [
        'src/auth/Login.tsx',
        'src/auth/oauth2.ts',
        'src/components/Button.tsx'
      ],
      metrics: {
        filesCreated: 3,
        linesAdded: 150,
        linesRemoved: 0,
        duration: 95000
      }
    },
    errors: [],
    warnings: [],
    startedAt: new Date(Date.now() - 100000),
    completedAt: new Date(),
    totalDuration: 100000
  };

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    performanceBenchmarks = new PerformanceBenchmark();
    jest.clearAllMocks();
    
    orchestrator = createOrchestrator(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should initialize with valid configuration', () => {
      performanceBenchmarks.start();
      
      expect(orchestrator).toBeDefined();
      expect(orchestrator).toBeInstanceOf(Orchestrator);
      
      const perf = performanceBenchmarks.end();
      expect(perf.duration).toBeLessThan(100); // Should initialize in < 100ms
    });

    test('should initialize with default configuration', () => {
      const defaultOrchestrator = createOrchestrator();
      expect(defaultOrchestrator).toBeDefined();
    });

    test('should validate configuration parameters', () => {
      const invalidConfig = {
        workflow: {
          maxSteps: -1,
          timeout: -1000
        },
        session: {
          maxDuration: -1
        }
      };
      
      expect(() => {
        createOrchestrator(invalidConfig as any);
      }).toThrow();
    });

    test('should handle missing configuration gracefully', () => {
      const undefinedOrchestrator = createOrchestrator(undefined);
      expect(undefinedOrchestrator).toBeDefined();
    });
  });

  describe('Workflow Execution', () => {
    test('should execute complete workflow successfully', async () => {
      const mockWorkflowContext: WorkflowContext = {
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: {
          workflowId: 'workflow-123',
          startedAt: new Date(),
          priority: 'high'
        }
      };

      // Mock the internal methods
      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(mockWorkflowResult);
      (orchestrator as any).sessionManager.createSession = jest.fn()
        .mockResolvedValue('session-456');
      (orchestrator as any).componentCoordinator.executeStep = jest.fn()
        .mockResolvedValue({ success: true });

      performanceBenchmarks.start();
      const result = await orchestrator.executeWorkflow(mockWorkflowContext);
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.steps).toHaveLength(5);
      expect(result.output.success).toBe(true);
      expect(perf.duration).toBeLessThan(150000); // Should execute in < 2.5 minutes
    });

    test('should handle workflow with failures', async () => {
      const failedWorkflowSteps = [
        ...sampleWorkflowSteps.slice(0, 3), // First three steps succeed
        {
          ...sampleWorkflowSteps[3],
          status: 'failed',
          error: new Error('Implementation failed: Permission denied'),
          actualDuration: 30000
        },
        {
          ...sampleWorkflowSteps[4],
          status: 'skipped',
          actualDuration: 0
        }
      ];

      const failedWorkflowResult: WorkflowResult = {
        workflowId: 'workflow-456',
        status: 'partial',
        steps: failedWorkflowSteps,
        output: {
          success: false,
          message: 'Workflow partially completed',
          artifacts: ['src/auth/Login.tsx'],
          metrics: {
            filesCreated: 1,
            linesAdded: 50,
            linesRemoved: 0,
            duration: 65000
          }
        },
        errors: ['Implementation failed: Permission denied'],
        warnings: ['Review step was skipped due to implementation failure'],
        startedAt: new Date(Date.now() - 70000),
        completedAt: new Date(),
        totalDuration: 70000
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(failedWorkflowResult);
      (orchestrator as any).sessionManager.createSession = jest.fn()
        .mockResolvedValue('session-456');
      (orchestrator as any).componentCoordinator.executeStep = jest.fn()
        .mockResolvedValue({ success: false, error: 'Permission denied' });

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-456' }
      });
      
      expect(result.status).toBe('partial');
      expect(result.errors).toHaveLength(1);
      expect(result.output.success).toBe(false);
    });

    test('should handle workflow timeouts', async () => {
      const timeoutWorkflowResult: WorkflowResult = {
        workflowId: 'workflow-timeout',
        status: 'timeout',
        steps: sampleWorkflowSteps.map(step => ({
          ...step,
          status: step.id === 'step-4' ? 'running' : 'completed',
          actualDuration: step.id === 'step-4' ? 300000 : step.estimatedDuration // Timeout at step 4
        })),
        output: {
          success: false,
          message: 'Workflow timed out',
          artifacts: [],
          metrics: {
            filesCreated: 0,
            linesAdded: 0,
            linesRemoved: 0,
            duration: 310000
          }
        },
        errors: ['Workflow execution timeout'],
        warnings: [],
        startedAt: new Date(Date.now() - 320000),
        completedAt: new Date(),
        totalDuration: 320000
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(timeoutWorkflowResult);
      (orchestrator as any).sessionManager.createSession = jest.fn()
        .mockResolvedValue('session-456');

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-timeout' }
      });
      
      expect(result.status).toBe('timeout');
      expect(result.errors).toContain('Workflow execution timeout');
    });
  });

  describe('Component Management', () => {
    test('should register components successfully', async () => {
      const mockComponent = {
        name: 'input-parser',
        version: '1.0.0',
        status: 'registered',
        capabilities: ['parse', 'validate'],
        health: 'healthy'
      };

      (orchestrator as any).componentRegistry.registerComponent = jest.fn()
        .mockResolvedValue(mockComponent);
      (orchestrator as any).componentRegistry.getComponent = jest.fn()
        .mockReturnValue(mockComponent);

      const result = await orchestrator.registerComponent('input-parser', {
        version: '1.0.0',
        capabilities: ['parse', 'validate']
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('input-parser');
      expect((orchestrator as any).componentRegistry.registerComponent).toHaveBeenCalled();
    });

    test('should handle component registration failures', async () => {
      (orchestrator as any).componentRegistry.registerComponent = jest.fn()
        .mockRejectedValue(new Error('Component registration failed'));

      await expect(orchestrator.registerComponent('invalid-component', {}))
        .rejects.toThrow('Component registration failed');
    });

    test('should manage component lifecycle', async () => {
      const mockComponent = {
        name: 'test-component',
        version: '1.0.0',
        status: 'active',
        health: 'healthy'
      };

      (orchestrator as any).componentRegistry.getComponent = jest.fn()
        .mockReturnValue(mockComponent);
      (orchestrator as any).componentRegistry.updateComponentStatus = jest.fn()
        .mockResolvedValue({ ...mockComponent, status: 'stopped' });

      await orchestrator.startComponent('test-component');
      expect((orchestrator as any).componentRegistry.updateComponentStatus)
        .toHaveBeenCalledWith('test-component', 'active');

      await orchestrator.stopComponent('test-component');
      expect((orchestrator as any).componentRegistry.updateComponentStatus)
        .toHaveBeenCalledWith('test-component', 'stopped');
    });

    test('should perform component health checks', async () => {
      const mockHealthyComponent = {
        name: 'healthy-component',
        status: 'active',
        health: 'healthy',
        lastCheck: new Date()
      };

      const mockUnhealthyComponent = {
        name: 'unhealthy-component',
        status: 'active',
        health: 'unhealthy',
        lastCheck: new Date(),
        error: 'Component not responding'
      };

      (orchestrator as any).componentRegistry.getAllComponents = jest.fn()
        .mockReturnValue([mockHealthyComponent, mockUnhealthyComponent]);
      (orchestrator as any).componentCoordinator.healthCheck = jest.fn()
        .mockImplementation((component) => {
          if (component.name === 'unhealthy-component') {
            return { healthy: false, error: 'Component not responding' };
          }
          return { healthy: true };
        });

      const healthStatus = await orchestrator.checkComponentHealth();
      
      expect(healthStatus.healthy).toBe(1);
      expect(healthStatus.unhealthy).toBe(1);
      expect(healthStatus.components).toHaveLength(2);
    });
  });

  describe('Session Management', () => {
    test('should create and manage sessions', async () => {
      const mockSession: SessionState = {
        sessionId: 'session-789',
        userId: 'user-123',
        status: 'active',
        startedAt: new Date(),
        lastActivity: new Date(),
        metadata: {
          requestCount: 1,
          workflowCount: 1
        }
      };

      (orchestrator as any).sessionManager.createSession = jest.fn()
        .mockResolvedValue(mockSession);
      (orchestrator as any).sessionManager.getSession = jest.fn()
        .mockReturnValue(mockSession);
      (orchestrator as any).sessionManager.updateSession = jest.fn()
        .mockResolvedValue({ ...mockSession, lastActivity: new Date() });

      const session = await orchestrator.createSession('user-123', {
        projectPath: '/test/project',
        preferences: {}
      });
      
      expect(session.sessionId).toBe('session-789');
      expect(session.status).toBe('active');
      expect((orchestrator as any).sessionManager.createSession).toHaveBeenCalled();
    });

    test('should handle session cleanup', async () => {
      const expiredSessions = ['session-expired-1', 'session-expired-2'];
      
      (orchestrator as any).sessionManager.getExpiredSessions = jest.fn()
        .mockReturnValue(expiredSessions);
      (orchestrator as any).sessionManager.terminateSession = jest.fn()
        .mockResolvedValue(undefined);

      await orchestrator.cleanupExpiredSessions();
      
      expect((orchestrator as any).sessionManager.getExpiredSessions).toHaveBeenCalled();
      expect((orchestrator as any).sessionManager.terminateSession).toHaveBeenCalledTimes(2);
    });

    test('should handle session limits', async () => {
      const mockSessions = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `session-${i}`,
        status: 'active'
      }));

      (orchestrator as any).sessionManager.getActiveSessions = jest.fn()
        .mockReturnValue(mockSessions);
      (orchestrator as any).sessionManager.createSession = jest.fn()
        .mockRejectedValue(new Error('Maximum sessions reached'));

      await expect(orchestrator.createSession('user-123', {}))
        .rejects.toThrow('Maximum sessions reached');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle component failures gracefully', async () => {
      const workflowWithFailure = {
        ...mockWorkflowResult,
        status: 'failed',
        steps: sampleWorkflowSteps.map(step => ({
          ...step,
          status: step.id === 'step-3' ? 'failed' : 'completed',
          error: step.id === 'step-3' ? new Error('Planner component failed') : null,
          actualDuration: step.estimatedDuration
        })),
        errors: ['Planner component failed'],
        output: {
          success: false,
          message: 'Workflow failed due to planner error',
          artifacts: [],
          metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 25000 }
        }
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(workflowWithFailure);
      (orchestrator as any).errorHandler.handleError = jest.fn()
        .mockResolvedValue({
          recovered: false,
          action: 'mark_as_failed',
          details: 'Component failure could not be recovered'
        });

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-failed' }
      });
      
      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Planner component failed');
      expect((orchestrator as any).errorHandler.handleError).toHaveBeenCalled();
    });

    test('should attempt error recovery', async () => {
      const recoverableWorkflow = {
        ...mockWorkflowResult,
        status: 'recovered',
        steps: sampleWorkflowSteps.map(step => ({
          ...step,
          status: step.id === 'step-4' ? 'retried' : 'completed',
          actualDuration: step.estimatedDuration * 1.2 // Retry took longer
        })),
        output: {
          success: true,
          message: 'Workflow recovered and completed successfully',
          artifacts: ['src/auth/Login.tsx'],
          metrics: { filesCreated: 1, linesAdded: 50, linesRemoved: 0, duration: 120000 }
        },
        warnings: ['Component was restarted during execution']
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(recoverableWorkflow);
      (orchestrator as any).errorHandler.handleError = jest.fn()
        .mockResolvedValue({
          recovered: true,
          action: 'restart_component',
          details: 'Component restarted successfully'
        });

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-recovered' }
      });
      
      expect(result.status).toBe('recovered');
      expect(result.warnings).toContain('Component was restarted during execution');
    });

    test('should handle cascading failures', async () => {
      const cascadeFailureWorkflow = {
        ...mockWorkflowResult,
        status: 'failed',
        steps: sampleWorkflowSteps.map((step, index) => ({
          ...step,
          status: index < 2 ? 'completed' : 'failed',
          error: index >= 2 ? new Error(`Step ${step.name} failed`) : null,
          actualDuration: step.estimatedDuration
        })),
        errors: [
          'Step 3 (Create Plan) failed',
          'Step 4 (Implement Changes) failed',
          'Step 5 (Review Implementation) failed'
        ],
        output: {
          success: false,
          message: 'Cascading failure in workflow',
          artifacts: [],
          metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 20000 }
        }
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(cascadeFailureWorkflow);
      (orchestrator as any).errorHandler.handleError = jest.fn()
        .mockResolvedValue({
          recovered: false,
          action: 'propagate_failure',
          details: 'Cascading failure could not be stopped'
        });

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-cascade' }
      });
      
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should execute simple workflows quickly', async () => {
      const simpleWorkflowSteps = [
        {
          id: 'simple-1',
          name: 'Parse',
          component: 'input-parser',
          action: 'parse',
          status: 'completed',
          estimatedDuration: 1000,
          actualDuration: 800,
          dependencies: [],
          result: { intent: 'ADD_FEATURE' },
          error: null
        }
      ];

      const simpleWorkflowResult: WorkflowResult = {
        workflowId: 'simple-workflow',
        status: 'completed',
        steps: simpleWorkflowSteps,
        output: {
          success: true,
          message: 'Simple workflow completed',
          artifacts: [],
          metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 1000 }
        },
        errors: [],
        warnings: [],
        startedAt: new Date(),
        completedAt: new Date(),
        totalDuration: 1000
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(simpleWorkflowResult);

      performanceBenchmarks.start();
      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: simpleWorkflowSteps,
        metadata: { workflowId: 'simple-workflow' }
      });
      const perf = performanceBenchmarks.end();
      
      expect(result.status).toBe('completed');
      expect(perf.duration).toBeLessThan(5000); // < 5 seconds for simple workflow
      expect(perf.memoryDiff).toBeLessThan(10 * 1024 * 1024); // < 10MB memory
    });

    test('should handle complex workflows efficiently', async () => {
      const complexWorkflowSteps = Array.from({ length: 10 }, (_, i) => ({
        id: `complex-step-${i}`,
        name: `Step ${i}`,
        component: `component-${i}`,
        action: 'execute',
        status: 'completed',
        estimatedDuration: 5000 * (i + 1),
        actualDuration: 5000 * (i + 1),
        dependencies: i > 0 ? [`complex-step-${i - 1}`] : [],
        result: { stepResult: `Result ${i}` },
        error: null
      }));

      const complexWorkflowResult: WorkflowResult = {
        workflowId: 'complex-workflow',
        status: 'completed',
        steps: complexWorkflowSteps,
        output: {
          success: true,
          message: 'Complex workflow completed',
          artifacts: [],
          metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 275000 }
        },
        errors: [],
        warnings: [],
        startedAt: new Date(),
        completedAt: new Date(),
        totalDuration: 275000
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(complexWorkflowResult);

      performanceBenchmarks.start();
      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: complexWorkflowSteps,
        metadata: { workflowId: 'complex-workflow' }
      });
      const perf = performanceBenchmarks.end();
      
      expect(result.steps).toHaveLength(10);
      expect(perf.duration).toBeLessThan(300000); // < 5 minutes for complex workflow
      expect(perf.memoryDiff).toBeLessThan(50 * 1024 * 1024); // < 50MB memory
    });

    test('should handle concurrent workflows', async () => {
      const concurrentContexts = Array.from({ length: 3 }, (_, i) => ({
        request: {
          ...mockUserRequest,
          text: `Request ${i}`
        },
        steps: [
          {
            id: `concurrent-${i}-1`,
            name: 'Parse',
            component: 'input-parser',
            action: 'parse',
            status: 'completed',
            estimatedDuration: 1000,
            actualDuration: 800,
            dependencies: [],
            result: { intent: 'ADD_FEATURE' },
            error: null
          }
        ],
        metadata: { workflowId: `concurrent-workflow-${i}` }
      }));

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue({
          workflowId: 'concurrent-workflow',
          status: 'completed',
          steps: [],
          output: { success: true, message: 'Completed', artifacts: [], metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 2000 } },
          errors: [],
          warnings: [],
          startedAt: new Date(),
          completedAt: new Date(),
          totalDuration: 2000
        });

      performanceBenchmarks.start();
      const results = await Promise.all(
        concurrentContexts.map(context => orchestrator.executeWorkflow(context))
      );
      const perf = performanceBenchmarks.end();
      
      expect(results).toHaveLength(3);
      expect(perf.duration).toBeLessThan(15000); // < 15 seconds for 3 concurrent workflows
    });
  });

  describe('Resource Management', () => {
    test('should monitor resource usage', async () => {
      const resourceMetrics = {
        cpu: 45.2,
        memory: 512 * 1024 * 1024, // 512MB
        disk: 1024 * 1024 * 1024, // 1GB
        network: 10 * 1024 * 1024, // 10MB/s
        activeWorkflows: 3,
        activeSessions: 5
      };

      (orchestrator as any).componentCoordinator.getResourceMetrics = jest.fn()
        .mockResolvedValue(resourceMetrics);

      const metrics = await orchestrator.getResourceMetrics();
      
      expect(metrics.cpu).toBe(45.2);
      expect(metrics.memory).toBe(512 * 1024 * 1024);
      expect(metrics.activeWorkflows).toBe(3);
      expect(metrics.activeSessions).toBe(5);
    });

    test('should handle resource constraints', async () => {
      (orchestrator as any).componentCoordinator.getResourceMetrics = jest.fn()
        .mockResolvedValue({
          cpu: 95.0, // High CPU usage
          memory: 2 * 1024 * 1024 * 1024, // 2GB (high)
          disk: 500 * 1024 * 1024 * 1024, // 500GB
          network: 0,
          activeWorkflows: 8,
          activeSessions: 15
        });

      const metrics = await orchestrator.getResourceMetrics();
      const constraints = orchestrator.checkResourceConstraints(metrics);
      
      expect(constraints.cpu).toBe('high');
      expect(constraints.memory).toBe('high');
      expect(constraints.workflows).toBe('max_reached');
    });

    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many workflow operations
      for (let i = 0; i < 20; i++) {
        (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
          .mockResolvedValue({
            workflowId: `memory-test-${i}`,
            status: 'completed',
            steps: [],
            output: { success: true, message: 'Completed', artifacts: [], metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 1000 } },
            errors: [],
            warnings: [],
            startedAt: new Date(),
            completedAt: new Date(),
            totalDuration: 1000
          });

        await orchestrator.executeWorkflow({
          request: {
            ...mockUserRequest,
            text: `Memory test ${i}`
          },
          steps: [],
          metadata: { workflowId: `memory-test-${i}` }
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Integration with Event System', () => {
    test('should emit workflow started events', async () => {
      const eventSpy = jest.spyOn(orchestrator, 'emit');
      
      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(mockWorkflowResult);

      await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-event-test' }
      });
      
      expect(eventSpy).toHaveBeenCalledWith(
        'workflow:started',
        expect.objectContaining({
          workflowId: 'workflow-event-test',
          request: expect.objectContaining({
            text: expect.any(String)
          }),
          timestamp: expect.any(Date)
        })
      );
    });

    test('should emit workflow completed events', async () => {
      const eventSpy = jest.spyOn(orchestrator, 'emit');
      
      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(mockWorkflowResult);

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-event-test' }
      });
      
      expect(eventSpy).toHaveBeenCalledWith(
        'workflow:completed',
        expect.objectContaining({
          workflowId: result.workflowId,
          result: expect.objectContaining({
            status: expect.any(String),
            output: expect.any(Object)
          }),
          duration: expect.any(Number)
        })
      );
    });

    test('should emit component events', async () => {
      const eventSpy = jest.spyOn(orchestrator, 'emit');
      
      const mockComponent = {
        name: 'test-component',
        version: '1.0.0',
        status: 'registered',
        capabilities: ['test']
      };

      (orchestrator as any).componentRegistry.registerComponent = jest.fn()
        .mockResolvedValue(mockComponent);

      await orchestrator.registerComponent('test-component', {
        version: '1.0.0',
        capabilities: ['test']
      });
      
      expect(eventSpy).toHaveBeenCalledWith(
        'component:registered',
        expect.objectContaining({
          component: expect.objectContaining({
            name: 'test-component'
          })
        })
      );
    });

    test('should emit error events', async () => {
      const eventSpy = jest.spyOn(orchestrator, 'emit');
      
      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockRejectedValue(new Error('Workflow execution failed'));

      await expect(orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: sampleWorkflowSteps,
        metadata: { workflowId: 'workflow-error-test' }
      })).rejects.toThrow();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'workflow:error',
        expect.objectContaining({
          workflowId: 'workflow-error-test',
          error: expect.any(Error)
        })
      );
    });
  });

  describe('Configuration and Settings', () => {
    test('should apply configuration changes dynamically', async () => {
      const newConfig = {
        ...mockConfig,
        logging: {
          level: 'debug',
          format: 'simple',
          enableConsole: false,
          enableFile: true,
          filePath: '/logs/new-orchestrator.log'
        }
      };

      const updateSpy = jest.spyOn(orchestrator as any, 'updateConfig');
      
      orchestrator.updateConfiguration(newConfig);
      
      expect(updateSpy).toHaveBeenCalledWith(newConfig);
    });

    test('should validate configuration updates', async () => {
      const invalidConfig = {
        logging: {
          level: 'invalid-level'
        }
      };

      expect(() => {
        orchestrator.updateConfiguration(invalidConfig as any);
      }).toThrow();
    });

    test('should handle configuration persistence', async () => {
      const persistentConfig = {
        ...mockConfig,
        persistent: true,
        configPath: '/config/orchestrator.json'
      };

      const persistSpy = jest.spyOn(orchestrator as any, 'persistConfig');
      
      orchestrator.updateConfiguration(persistentConfig);
      
      expect(persistSpy).toHaveBeenCalledWith(persistentConfig);
    });
  });

  describe('Advanced Features', () => {
    test('should support workflow templates', async () => {
      const templateSteps = [
        {
          id: 'template-step-1',
          name: 'Template Step',
          component: 'template-component',
          action: 'template-action',
          status: 'pending',
          estimatedDuration: 5000,
          actualDuration: null,
          dependencies: [],
          result: null,
          error: null
        }
      ];

      const templateWorkflowResult: WorkflowResult = {
        workflowId: 'template-workflow',
        status: 'completed',
        steps: templateSteps,
        output: { success: true, message: 'Template workflow completed', artifacts: [], metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 5000 } },
        errors: [],
        warnings: [],
        startedAt: new Date(),
        completedAt: new Date(),
        totalDuration: 5000
      };

      (orchestrator as any).workflowManager.executeFromTemplate = jest.fn()
        .mockResolvedValue(templateWorkflowResult);

      const result = await orchestrator.executeWorkflowTemplate('user-auth-template', {
        parameters: { provider: 'google', features: ['login', 'registration'] }
      });
      
      expect(result.status).toBe('completed');
      expect((orchestrator as any).workflowManager.executeFromTemplate).toHaveBeenCalled();
    });

    test('should support workflow branching', async () => {
      const branchWorkflowSteps = [
        ...sampleWorkflowSteps.slice(0, 2), // Steps 1-2
        {
          id: 'branch-decision',
          name: 'Decision Point',
          component: 'decision-component',
          action: 'decide',
          status: 'completed',
          estimatedDuration: 1000,
          actualDuration: 800,
          dependencies: ['step-2'],
          result: { branch: 'feature-branch' },
          error: null
        },
        {
          id: 'feature-step',
          name: 'Feature Implementation',
          component: 'implementer',
          action: 'implement-feature',
          status: 'completed',
          estimatedDuration: 30000,
          actualDuration: 25000,
          dependencies: ['branch-decision'],
          result: { featureImplemented: true },
          error: null
        }
      ];

      const branchWorkflowResult: WorkflowResult = {
        workflowId: 'branch-workflow',
        status: 'completed',
        steps: branchWorkflowSteps,
        output: { success: true, message: 'Branched workflow completed', artifacts: [], metrics: { filesCreated: 0, linesAdded: 0, linesRemoved: 0, duration: 40000 } },
        errors: [],
        warnings: [],
        startedAt: new Date(),
        completedAt: new Date(),
        totalDuration: 40000
      };

      (orchestrator as any).workflowManager.executeWorkflow = jest.fn()
        .mockResolvedValue(branchWorkflowResult);

      const result = await orchestrator.executeWorkflow({
        request: mockUserRequest,
        steps: branchWorkflowSteps,
        metadata: { workflowId: 'branch-workflow' }
      });
      
      expect(result.status).toBe('completed');
      const decisionStep = result.steps.find(s => s.id === 'branch-decision');
      expect(decisionStep?.result.branch).toBe('feature-branch');
    });

    test('should handle workflow prioritization', async () => {
      const lowPriorityRequest = {
        ...mockUserRequest,
        metadata: {
          ...mockUserRequest.metadata,
          priority: 'low'
        }
      };

      const highPriorityRequest = {
        ...mockUserRequest,
        metadata: {
          ...mockUserRequest.metadata,
          priority: 'high'
        }
      };

      (orchestrator as any).workflowManager.addToQueue = jest.fn()
        .mockResolvedValue(undefined);
      (orchestrator as any).workflowManager.getQueuePosition = jest.fn()
        .mockImplementation((request) => {
          return request.metadata.priority === 'high' ? 1 : 5;
        });

      await orchestrator.enqueueWorkflow(lowPriorityRequest, sampleWorkflowSteps);
      await orchestrator.enqueueWorkflow(highPriorityRequest, sampleWorkflowSteps);

      const lowPriorityPosition = orchestrator.getQueuePosition(lowPriorityRequest);
      const highPriorityPosition = orchestrator.getQueuePosition(highPriorityRequest);

      expect(highPriorityPosition).toBeLessThan(lowPriorityPosition);
    });
  });

  describe('Cleanup and Shutdown', () => {
    test('should cleanup resources on destroy', async () => {
      const cleanupSpy = jest.spyOn(orchestrator as any, 'cleanup');
      const sessionCleanupSpy = jest.spyOn(orchestrator as any, 'sessionManager.cleanup');
      const componentCleanupSpy = jest.spyOn(orchestrator as any, 'componentCoordinator.cleanup');
      
      orchestrator.destroy();
      
      expect(cleanupSpy).toHaveBeenCalled();
      expect(sessionCleanupSpy).toHaveBeenCalled();
      expect(componentCleanupSpy).toHaveBeenCalled();
    });

    test('should gracefully shutdown active workflows', async () => {
      const activeWorkflows = ['workflow-1', 'workflow-2', 'workflow-3'];
      
      (orchestrator as any).workflowManager.getActiveWorkflows = jest.fn()
        .mockReturnValue(activeWorkflows);
      (orchestrator as any).workflowManager.terminateWorkflow = jest.fn()
        .mockResolvedValue(undefined);

      await orchestrator.shutdown();
      
      expect((orchestrator as any).workflowManager.terminateWorkflow).toHaveBeenCalledTimes(3);
    });

    test('should save state before shutdown', async () => {
      const stateSaveSpy = jest.spyOn(orchestrator as any, 'saveState');
      
      await orchestrator.shutdown();
      
      expect(stateSaveSpy).toHaveBeenCalled();
    });
  });
});