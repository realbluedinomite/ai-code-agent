/**
 * End-to-End Workflow Tests
 * 
 * Tests complete workflows from input to result across the entire AI Code Agent system.
 * These tests verify the full integration of all components working together.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Application } from '../../src';
import { Orchestrator } from '../../src/orchestrator/orchestrator';
import { EventBus } from '../../src/core/event-bus';
import { Logger } from '../../src/core/logger';
import { ConfigManager } from '../../src/core/config';
import { DatabaseClient } from '../../src/database/client';
import { DatabaseTestHelper } from '../utils/test-utils';
import path from 'path';
import fs from 'fs/promises';

describe('End-to-End Workflow Tests', () => {
  let app: Application;
  let orchestrator: Orchestrator;
  let dbClient: DatabaseClient;
  let eventBus: EventBus;
  let logger: Logger;
  let config: ConfigManager;
  const testPort = 34567;
  
  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
    process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
    process.env.TEST_DB_NAME = 'ai_code_agent_e2e_test';
    process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'postgres';
    process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
    process.env.PORT = testPort.toString();

    // Initialize database connection
    dbClient = new DatabaseClient();
    await dbClient.connect();

    // Initialize core components
    eventBus = new EventBus();
    logger = new Logger('E2E-Test');
    config = new ConfigManager();

    // Create test directories
    const testProjectPath = path.join(process.cwd(), 'temp', 'e2e-test-project');
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Create sample project structure
    await createTestProjectStructure(testProjectPath);
  }, 30000);

  afterAll(async () => {
    // Cleanup
    try {
      await dbClient.disconnect();
      const testProjectPath = path.join(process.cwd(), 'temp', 'e2e-test-project');
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await DatabaseTestHelper.cleanAll(dbClient.getPool());
    
    // Create fresh application instance
    app = new Application({
      port: testPort,
      environment: 'test',
    });

    // Initialize orchestrator
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
  });

  describe('Complete Workflow: Feature Request', () => {
    it('should handle a complete feature request workflow', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Add a user authentication system with JWT tokens',
        requirements: [
          'Support login/logout',
          'JWT token management',
          'Password hashing',
          'Session management',
        ],
        technology: 'TypeScript',
        framework: 'Express',
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      // Initialize application
      await app.initialize();
      await orchestrator.initialize();

      // Execute workflow
      const result = await orchestrator.executeWorkflow(workflowInput);

      // Verify workflow completion
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);

      // Verify all workflow steps completed
      const stepNames = result.steps.map(s => s.name);
      expect(stepNames).toContain('input-parsing');
      expect(stepNames).toContain('project-analysis');
      expect(stepNames).toContain('planning');
      expect(stepNames).toContain('implementation');
      expect(stepNames).toContain('review');

      // Verify output artifacts
      expect(result.artifacts).toBeDefined();
      if (result.artifacts.code) {
        expect(result.artifacts.code.length).toBeGreaterThan(0);
      }
      if (result.artifacts.tests) {
        expect(result.artifacts.tests.length).toBeGreaterThan(0);
      }

      // Verify metrics
      expect(result.metrics).toBeDefined();
      expect(result.metrics.duration).toBeGreaterThan(0);
      expect(result.metrics.stepsCompleted).toBeGreaterThan(0);
    }, 60000);

    it('should handle workflow with session persistence', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Add email notification service',
        requirements: ['Send email notifications', 'Template support', 'Rate limiting'],
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      // First execution
      const result1 = await orchestrator.executeWorkflow(workflowInput);
      expect(result1.success).toBe(true);
      expect(result1.sessionId).toBeDefined();

      // Continue with same session
      const followUpInput = {
        type: 'enhancement',
        description: 'Add email templates',
        relatedSessionId: result1.sessionId,
      };

      const result2 = await orchestrator.executeWorkflow(followUpInput, result1.sessionId);
      expect(result2.success).toBe(true);
      expect(result2.sessionId).toBe(result1.sessionId);

      // Verify session was continued
      expect(result2.context).toBeDefined();
      expect(result2.context.previousSteps).toBeDefined();
    }, 45000);
  });

  describe('Complete Workflow: Bug Fix', () => {
    it('should handle a complete bug fix workflow', async () => {
      const bugReport = {
        type: 'bug-fix',
        description: 'Fix memory leak in user session manager',
        severity: 'high',
        reproductionSteps: [
          'Create user session',
          'Perform multiple operations',
          'Observe memory usage',
        ],
        expectedBehavior: 'Memory usage should remain stable',
        actualBehavior: 'Memory usage increases over time',
        affectedComponent: 'session-manager',
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(bugReport);

      expect(result.success).toBe(true);
      expect(result.steps.map(s => s.name)).toContain('bug-analysis');
      expect(result.steps.map(s => s.name)).toContain('root-cause-analysis');
      expect(result.steps.map(s => s.name)).toContain('fix-implementation');
      expect(result.steps.map(s => s.name)).toContain('verification');

      // Verify bug analysis artifacts
      if (result.artifacts.analysis) {
        expect(result.artifacts.analysis.memoryLeaks).toBeDefined();
        expect(result.artifacts.analysis.affectedCode).toBeDefined();
      }

      // Verify fix implementation
      if (result.artifacts.code) {
        expect(result.artifacts.code[0]).toMatch(/fix|resolve|correct/);
      }
    }, 60000);

    it('should verify bug fix with tests', async () => {
      const bugFixWorkflow = {
        type: 'bug-fix',
        description: 'Fix race condition in event handler',
        affectedComponent: 'event-bus',
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(bugFixWorkflow);

      expect(result.success).toBe(true);

      // Verify test generation
      if (result.artifacts.tests) {
        const hasRaceConditionTest = result.artifacts.tests.some((test: any) =>
          test.description?.toLowerCase().includes('race')
        );
        expect(hasRaceConditionTest).toBe(true);
      }
    }, 45000);
  });

  describe('Complete Workflow: Code Refactoring', () => {
    it('should handle code refactoring workflow', async () => {
      const refactorRequest = {
        type: 'refactor',
        description: 'Refactor authentication module for better maintainability',
        scope: 'module',
        targetComponent: 'auth',
        goals: [
          'Reduce complexity',
          'Improve testability',
          'Separate concerns',
          'Enhance error handling',
        ],
        constraints: ['Maintain backward compatibility', 'No breaking changes'],
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(refactorRequest);

      expect(result.success).toBe(true);
      expect(result.steps.map(s => s.name)).toContain('code-analysis');
      expect(result.steps.map(s => s.name)).toContain('refactoring-planning');
      expect(result.steps.map(s => s.name)).toContain('refactor-implementation');
      expect(result.steps.map(s => s.name)).toContain('impact-analysis');
      expect(result.steps.map(s => s.name)).toContain('verification');

      // Verify refactoring goals addressed
      if (result.artifacts.refactoringPlan) {
        expect(result.artifacts.refactoringPlan.goals).toBeDefined();
        expect(result.artifacts.refactoringPlan.goals.length).toBeGreaterThan(0);
      }

      // Verify backward compatibility maintained
      if (result.artifacts.compatibilityReport) {
        expect(result.artifacts.compatibilityReport.breakingChanges).toBeDefined();
        expect(result.artifacts.compatibilityReport.breakingChanges.length).toBe(0);
      }
    }, 60000);

    it('should handle performance optimization workflow', async () => {
      const optimizationRequest = {
        type: 'optimization',
        description: 'Optimize database query performance',
        target: 'database',
        metrics: {
          currentResponseTime: '500ms',
          targetResponseTime: '100ms',
        },
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(optimizationRequest);

      expect(result.success).toBe(true);
      expect(result.steps.map(s => s.name)).toContain('performance-analysis');
      expect(result.steps.map(s => s.name)).toContain('optimization-planning');
      expect(result.steps.map(s => s.name)).toContain('optimization-implementation');
      expect(result.steps.map(s => s.name)).toContain('performance-verification');

      // Verify performance improvements
      if (result.artifacts.performanceReport) {
        expect(result.artifacts.performanceReport.improvements).toBeDefined();
      }
    }, 45000);
  });

  describe('Multi-Component Integration', () => {
    it('should integrate all core components in a single workflow', async () => {
      const complexWorkflow = {
        type: 'feature-request',
        description: 'Implement real-time collaboration system',
        requirements: [
          'WebSocket connections',
          'Real-time sync',
          'Conflict resolution',
          'User presence',
        ],
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(complexWorkflow);

      // Verify core systems integration
      expect(result.context.databaseConnected).toBe(true);
      expect(result.context.eventBusWorking).toBe(true);
      expect(result.context.loggingEnabled).toBe(true);
      expect(result.context.configLoaded).toBe(true);

      // Verify component coordination
      expect(result.steps.length).toBeGreaterThan(5);
      
      // Verify all phases completed
      const phaseNames = result.steps.map(s => s.phase);
      const uniquePhases = [...new Set(phaseNames)];
      expect(uniquePhases).toContain('analysis');
      expect(uniquePhases).toContain('planning');
      expect(uniquePhases).toContain('implementation');
      expect(uniquePhases).toContain('review');
    }, 90000);

    it('should handle concurrent workflow executions', async () => {
      await app.initialize();
      await orchestrator.initialize();

      const workflows = Array.from({ length: 3 }, (_, i) => ({
        type: 'feature-request',
        description: `Feature ${i + 1}`,
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      }));

      // Execute workflows concurrently
      const results = await Promise.all(
        workflows.map(workflow => orchestrator.executeWorkflow(workflow))
      );

      // Verify all completed successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
      });

      // Verify no session conflicts
      const sessionIds = results.map(r => r.sessionId);
      const uniqueSessionIds = [...new Set(sessionIds)];
      expect(uniqueSessionIds.length).toBe(3);
    }, 120000);
  });

  describe('Data Flow Validation', () => {
    it('should maintain data consistency throughout workflow', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Add data validation service',
        requirements: ['Schema validation', 'Type checking', 'Custom rules'],
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Verify data integrity
      expect(result.context.input).toEqual(workflowInput);
      expect(result.sessionId).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);

      // Verify artifacts consistency
      if (result.artifacts) {
        Object.values(result.artifacts).forEach(artifact => {
          if (Array.isArray(artifact)) {
            expect(artifact.length).toBeGreaterThan(0);
          }
        });
      }
    }, 45000);

    it('should properly handle workflow state transitions', async () => {
      const workflowInput = {
        type: 'feature-request',
        description: 'Test state transitions',
        projectPath: path.join(process.cwd(), 'temp', 'e2e-test-project'),
      };

      await app.initialize();
      await orchestrator.initialize();

      const result = await orchestrator.executeWorkflow(workflowInput);

      // Verify state transitions
      const states = result.steps.map(s => s.state);
      const validTransitions = states.every((state, index) => {
        if (index === 0) return state === 'pending' || state === 'running';
        return ['pending', 'running', 'completed', 'failed'].includes(state);
      });
      expect(validTransitions).toBe(true);

      // Verify final state is completed or failed
      const finalState = states[states.length - 1];
      expect(['completed', 'failed']).toContain(finalState);
    }, 30000);
  });
});

/**
 * Helper function to create test project structure
 */
async function createTestProjectStructure(projectPath: string): Promise<void> {
  const dirs = [
    'src',
    'src/components',
    'src/services',
    'src/models',
    'tests',
    'tests/unit',
    'tests/integration',
    'config',
    'docs',
  ];

  const files = {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.2',
        typescript: '^5.2.2',
      },
    }, null, 2),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
      },
    }, null, 2),
    'src/index.ts': 'export const main = () => console.log("Hello World");',
    'src/components/README.md': '# Components\n\nComponent documentation',
    'tests/README.md': '# Tests\n\nTest documentation',
  };

  for (const dir of dirs) {
    await fs.mkdir(path.join(projectPath, dir), { recursive: true });
  }

  for (const [filePath, content] of Object.entries(files)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }
}
