/**
 * Planner Component Test Suite
 * Comprehensive tests for the Planner component with performance benchmarks
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  Planner,
  createPlanner,
  Plan,
  Task,
  TaskBreakdown,
  ComplexityEstimator,
  AmbiguityDetector,
  QuestionGenerator,
  PlanningResult,
  TaskPriority,
  TaskStatus
} from '@/components/planner';
import { mockEventData } from '../fixtures/mock-data';

// Mock dependencies
jest.mock('@/components/planner/task-breakdown');
jest.mock('@/components/planner/complexity-estimator');
jest.mock('@/components/planner/ambiguity-detector');
jest.mock('@/components/planner/question-generator');

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

describe('Planner Component Tests', () => {
  let planner: Planner;
  let performanceBenchmarks: PerformanceBenchmark;
  
  const mockConfig = {
    maxTasksPerPlan: 50,
    complexityThreshold: 0.8,
    maxDepth: 5,
    allowParallelExecution: true,
    riskTolerance: 'medium' as const,
    timeConstraints: {
      softLimit: 24 * 60 * 60 * 1000, // 24 hours
      hardLimit: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };

  const mockParsedRequest = {
    intent: 'ADD_FEATURE' as any,
    entities: {
      features: [
        {
          name: 'User Authentication',
          type: 'functionality',
          description: 'Implement user login and registration',
          confidence: 0.95
        }
      ],
      files: [
        {
          path: 'src/auth/',
          type: 'directory',
          confidence: 0.9
        }
      ],
      constraints: [
        {
          type: 'security',
          description: 'Must use OAuth2',
          severity: 'high' as const,
          confidence: 0.9
        }
      ]
    },
    confidence: 0.92,
    originalText: 'Add user authentication with OAuth2',
    parameters: {},
    context: {
      projectPath: '/test/project',
      projectType: 'web-application',
      timestamp: new Date(),
      source: 'cli' as const,
      metadata: {}
    },
    validation: {
      isValid: true,
      confidence: 0.9,
      issues: []
    }
  };

  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Set up authentication module structure',
      description: 'Create the basic directory structure and files for authentication',
      type: 'setup',
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      estimatedDuration: 30 * 60 * 1000, // 30 minutes
      actualDuration: null,
      dependencies: [],
      assignedTo: null,
      context: {
        filePaths: ['src/auth/'],
        environment: 'development',
        parameters: {}
      },
      validation: {
        isValid: true,
        confidence: 0.9,
        issues: []
      },
      metadata: {
        complexity: 'low',
        risk: 'low',
        expertise: 'basic'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'task-2',
      title: 'Implement OAuth2 integration',
      description: 'Set up OAuth2 provider configuration and integration',
      type: 'implementation',
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
      actualDuration: null,
      dependencies: ['task-1'],
      assignedTo: null,
      context: {
        filePaths: ['src/auth/oauth2/'],
        environment: 'development',
        parameters: { provider: 'google' }
      },
      validation: {
        isValid: true,
        confidence: 0.85,
        issues: []
      },
      metadata: {
        complexity: 'medium',
        risk: 'medium',
        expertise: 'intermediate'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'task-3',
      title: 'Create login component',
      description: 'Build React component for user login interface',
      type: 'implementation',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      estimatedDuration: 60 * 60 * 1000, // 1 hour
      actualDuration: null,
      dependencies: ['task-2'],
      assignedTo: null,
      context: {
        filePaths: ['src/auth/components/Login.tsx'],
        environment: 'development',
        parameters: {}
      },
      validation: {
        isValid: true,
        confidence: 0.9,
        issues: []
      },
      metadata: {
        complexity: 'low',
        risk: 'low',
        expertise: 'basic'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    performanceBenchmarks = new PerformanceBenchmark();
    jest.clearAllMocks();
    
    planner = createPlanner(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should initialize with valid configuration', () => {
      performanceBenchmarks.start();
      
      expect(planner).toBeDefined();
      expect(planner).toBeInstanceOf(Planner);
      
      const perf = performanceBenchmarks.end();
      expect(perf.duration).toBeLessThan(50); // Should initialize in < 50ms
    });

    test('should initialize with default configuration', () => {
      const defaultPlanner = createPlanner();
      expect(defaultPlanner).toBeDefined();
    });

    test('should validate configuration parameters', () => {
      const invalidConfig = {
        maxTasksPerPlan: -1,
        complexityThreshold: 2,
        maxDepth: 0
      };
      
      expect(() => {
        createPlanner(invalidConfig);
      }).toThrow();
    });

    test('should handle missing configuration gracefully', () => {
      const undefinedPlanner = createPlanner(undefined);
      expect(undefinedPlanner).toBeDefined();
    });
  });

  describe('Planning Functionality', () => {
    test('should create a plan from parsed request', async () => {
      const mockPlanningResult: PlanningResult = {
        plan: {
          id: 'plan-1',
          title: 'User Authentication Implementation',
          description: 'Add user authentication with OAuth2 support',
          tasks: sampleTasks,
          totalEstimatedDuration: 3.5 * 60 * 60 * 1000, // 3.5 hours
          totalActualDuration: null,
          priority: TaskPriority.HIGH,
          status: 'planning' as any,
          dependencies: [],
          metadata: {
            complexity: 'medium',
            riskLevel: 'medium',
            stakeholders: ['development-team'],
            technology: ['react', 'oauth2', 'typescript']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        questions: [],
        ambiguities: [],
        complexityScore: 0.6,
        recommendations: [
          'Consider implementing error handling for OAuth2 failures',
          'Add unit tests for authentication components'
        ],
        warnings: [],
        processingTime: 1500
      };

      // Mock the internal methods
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.6);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      performanceBenchmarks.start();
      const result = await planner.createPlan(mockParsedRequest);
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.tasks).toHaveLength(3);
      expect(result.complexityScore).toBe(0.6);
      expect(perf.duration).toBeLessThan(3000); // Should plan in < 3s
    });

    test('should handle complex multi-feature requests', async () => {
      const complexParsedRequest = {
        ...mockParsedRequest,
        entities: {
          ...mockParsedRequest.entities,
          features: [
            {
              name: 'User Authentication',
              type: 'functionality',
              description: 'Complete auth system',
              confidence: 0.95
            },
            {
              name: 'Role-based Access Control',
              type: 'functionality',
              description: 'RBAC system',
              confidence: 0.9
            },
            {
              name: 'Session Management',
              type: 'functionality',
              description: 'Session handling',
              confidence: 0.85
            }
          ]
        }
      };

      const complexTasks: Task[] = [
        ...sampleTasks,
        {
          id: 'task-4',
          title: 'Implement RBAC system',
          description: 'Create role-based access control',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 4 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['task-2'],
          assignedTo: null,
          context: {
            filePaths: ['src/auth/rbac/'],
            environment: 'development',
            parameters: {}
          },
          validation: { isValid: true, confidence: 0.8, issues: [] },
          metadata: { complexity: 'high', risk: 'high', expertise: 'advanced' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockComplexResult: PlanningResult = {
        plan: {
          id: 'plan-2',
          title: 'Comprehensive Authentication System',
          description: 'Complete auth with RBAC and session management',
          tasks: complexTasks,
          totalEstimatedDuration: 7.5 * 60 * 60 * 1000,
          totalActualDuration: null,
          priority: TaskPriority.HIGH,
          status: 'planning' as any,
          dependencies: [],
          metadata: {
            complexity: 'high',
            riskLevel: 'high',
            stakeholders: ['development-team', 'security-team'],
            technology: ['react', 'oauth2', 'typescript', 'rbac']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        questions: [],
        ambiguities: [],
        complexityScore: 0.85,
        recommendations: [
          'Implement comprehensive testing strategy',
          'Consider security audit for RBAC implementation'
        ],
        warnings: [
          'High complexity task requires experienced developer',
          'Multiple dependencies may cause delays'
        ],
        processingTime: 2500
      };

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(complexTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.85);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(complexParsedRequest);
      
      expect(result).toBeDefined();
      expect(result.plan.tasks).toHaveLength(4);
      expect(result.complexityScore).toBeGreaterThan(0.8);
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe('Task Breakdown', () => {
    test('should break down simple tasks correctly', async () => {
      const simpleRequest = {
        ...mockParsedRequest,
        entities: {
          features: [{
            name: 'Simple Feature',
            type: 'functionality',
            description: 'A simple feature to implement',
            confidence: 0.95
          }]
        }
      };

      const mockTasks: Task[] = [
        {
          id: 'simple-task-1',
          title: 'Implement simple feature',
          description: 'Create the feature implementation',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'low', risk: 'low', expertise: 'basic' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(mockTasks);

      const result = await planner.createPlan(simpleRequest);
      
      expect(result.plan.tasks).toHaveLength(1);
      expect(result.plan.tasks[0].type).toBe('implementation');
      expect(result.plan.tasks[0].priority).toBe(TaskPriority.MEDIUM);
    });

    test('should handle dependencies between tasks', async () => {
      const dependentTasks: Task[] = [
        {
          id: 'dep-task-1',
          title: 'Setup environment',
          description: 'Set up development environment',
          type: 'setup',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 30 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'low', risk: 'low', expertise: 'basic' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'dep-task-2',
          title: 'Implement feature',
          description: 'Implement the main feature',
          type: 'implementation',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 2 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['dep-task-1'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(dependentTasks);

      const result = await planner.createPlan(mockParsedRequest);
      
      expect(result.plan.tasks).toHaveLength(2);
      expect(result.plan.tasks[1].dependencies).toContain('dep-task-1');
      
      // Check task ordering respects dependencies
      const setupTask = result.plan.tasks.find(t => t.id === 'dep-task-1');
      const implTask = result.plan.tasks.find(t => t.id === 'dep-task-2');
      expect(setupTask?.estimatedDuration).toBeLessThan(implTask?.estimatedDuration);
    });

    test('should detect circular dependencies', async () => {
      const circularTasks: Task[] = [
        {
          id: 'circular-1',
          title: 'Task 1',
          description: 'First task',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['circular-2'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'circular-2',
          title: 'Task 2',
          description: 'Second task',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['circular-1'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(circularTasks);

      await expect(planner.createPlan(mockParsedRequest)).rejects.toThrow('circular dependency');
    });
  });

  describe('Complexity Estimation', () => {
    test('should estimate low complexity for simple tasks', async () => {
      const simpleRequest = {
        ...mockParsedRequest,
        entities: {
          features: [{
            name: 'Simple CSS change',
            type: 'functionality',
            description: 'Update button styles',
            confidence: 0.95
          }]
        }
      };

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue([{
          ...sampleTasks[0],
          metadata: { ...sampleTasks[0].metadata, complexity: 'low' }
        }]);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.2);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(simpleRequest);
      
      expect(result.complexityScore).toBeLessThan(0.5);
      expect(result.warnings).not.toContain(expect.stringContaining('complexity'));
    });

    test('should estimate high complexity for complex tasks', async () => {
      const complexRequest = {
        ...mockParsedRequest,
        entities: {
          ...mockParsedRequest.entities,
          constraints: [
            ...mockParsedRequest.entities.constraints,
            { type: 'security' as const, description: 'Must be PCI compliant', severity: 'critical' as const, confidence: 0.9 },
            { type: 'performance' as const, description: 'Must handle 10k concurrent users', severity: 'high' as const, confidence: 0.9 }
          ]
        }
      };

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue([{
          ...sampleTasks[0],
          metadata: { ...sampleTasks[0].metadata, complexity: 'high' }
        }]);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.9);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(complexRequest);
      
      expect(result.complexityScore).toBeGreaterThan(0.8);
      expect(result.recommendations).toContain(expect.stringContaining('expert'));
    });
  });

  describe('Ambiguity Detection', () => {
    test('should detect ambiguous requirements', async () => {
      const ambiguousRequest = {
        ...mockParsedRequest,
        originalText: 'Make the system better',
        entities: {
          features: [{
            name: 'Better system',
            type: 'functionality',
            description: 'Make it better somehow',
            confidence: 0.3 // Low confidence indicates ambiguity
          }]
        }
      };

      const mockAmbiguities = [
        {
          type: 'vague-description',
          message: 'The requirement "Make it better" is too vague',
          severity: 'high' as const,
          field: 'features[0].description',
          suggestions: ['Specify what aspects to improve', 'Define measurable criteria']
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue(mockAmbiguities);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([
          {
            question: 'What specific improvements do you want to make?',
            context: 'features[0]',
            importance: 'high'
          }
        ]);

      const result = await planner.createPlan(ambiguousRequest);
      
      expect(result.ambiguities).toHaveLength(1);
      expect(result.questions).toHaveLength(1);
      expect(result.warnings).toContain(expect.stringContaining('ambiguous'));
    });

    test('should handle conflicting requirements', async () => {
      const conflictingRequest = {
        ...mockParsedRequest,
        entities: {
          features: [
            {
              name: 'Fast execution',
              type: 'functionality',
              description: 'Optimize for speed',
              confidence: 0.9
            },
            {
              name: 'Low memory usage',
              type: 'functionality',
              description: 'Minimize memory footprint',
              confidence: 0.9
            }
          ],
          constraints: [
            {
              type: 'performance' as const,
              description: 'Must be extremely fast',
              severity: 'critical' as const,
              confidence: 0.9
            },
            {
              type: 'performance' as const,
              description: 'Must use minimal memory',
              severity: 'critical' as const,
              confidence: 0.9
            }
          ]
        }
      };

      const mockConflicts = [
        {
          type: 'conflicting-requirements',
          message: 'Speed and memory optimization may conflict',
          severity: 'medium' as const,
          fields: ['constraints[0]', 'constraints[1]'],
          suggestions: ['Define priorities', 'Consider trade-offs']
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.7);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue(mockConflicts);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(conflictingRequest);
      
      expect(result.ambiguities).toHaveLength(1);
      expect(result.ambiguities[0].type).toBe('conflicting-requirements');
    });
  });

  describe('Question Generation', () => {
    test('should generate relevant clarifying questions', async () => {
      const unclearRequest = {
        ...mockParsedRequest,
        entities: {
          features: [{
            name: 'API endpoint',
            type: 'functionality',
            description: 'Create an API',
            confidence: 0.4
          }],
          constraints: [
            {
              type: 'security' as const,
              description: 'Must be secure',
              severity: 'high' as const,
              confidence: 0.5
            }
          ]
        }
      };

      const mockQuestions = [
        {
          question: 'What type of API do you want to create?',
          context: 'features[0]',
          importance: 'high'
        },
        {
          question: 'What security measures do you need?',
          context: 'constraints[0]',
          importance: 'high'
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.6);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue(mockQuestions);

      const result = await planner.createPlan(unclearRequest);
      
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].importance).toBe('high');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should plan simple requests quickly', async () => {
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue([sampleTasks[0]]);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.3);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      performanceBenchmarks.start();
      const result = await planner.createPlan(mockParsedRequest);
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(perf.duration).toBeLessThan(1000); // < 1 second for simple planning
      expect(perf.memoryDiff).toBeLessThan(5 * 1024 * 1024); // < 5MB memory
    });

    test('should handle complex planning efficiently', async () => {
      const complexTasks = Array.from({ length: 20 }, (_, i) => ({
        ...sampleTasks[i % sampleTasks.length],
        id: `complex-task-${i}`,
        title: `Complex Task ${i}`,
        dependencies: i > 0 ? [`complex-task-${i - 1}`] : []
      }));

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(complexTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.8);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      performanceBenchmarks.start();
      const result = await planner.createPlan(mockParsedRequest);
      const perf = performanceBenchmarks.end();
      
      expect(result.plan.tasks).toHaveLength(20);
      expect(perf.duration).toBeLessThan(5000); // < 5 seconds for complex planning
      expect(perf.memoryDiff).toBeLessThan(20 * 1024 * 1024); // < 20MB memory
    });

    test('should handle concurrent planning requests', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => ({
        ...mockParsedRequest,
        originalText: `Request ${i}`,
        context: {
          ...mockParsedRequest.context,
          projectPath: `/project-${i}`
        }
      }));

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      performanceBenchmarks.start();
      const results = await Promise.all(
        concurrentRequests.map(request => planner.createPlan(request))
      );
      const perf = performanceBenchmarks.end();
      
      expect(results).toHaveLength(3);
      expect(perf.duration).toBeLessThan(8000); // < 8 seconds for 3 concurrent plans
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid parsed requests', async () => {
      const invalidRequest = {
        intent: null,
        entities: null,
        confidence: 0,
        originalText: '',
        parameters: {},
        context: null,
        validation: { isValid: false, confidence: 0, issues: [] }
      };

      await expect(planner.createPlan(invalidRequest)).rejects.toThrow();
    });

    test('should handle task breakdown failures', async () => {
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockRejectedValue(new Error('Task breakdown failed'));

      await expect(planner.createPlan(mockParsedRequest)).rejects.toThrow('Task breakdown failed');
    });

    test('should handle planning timeout', async () => {
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(resolve, 10000) // Longer than timeout
        ));

      await expect(planner.createPlan(mockParsedRequest)).rejects.toThrow('timeout');
    });

    test('should handle circular dependency detection', async () => {
      const circularTasks: Task[] = [
        {
          id: 'circular-1',
          title: 'Task 1',
          description: 'First task',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['circular-2'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'circular-2',
          title: 'Task 2',
          description: 'Second task',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['circular-3'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'circular-3',
          title: 'Task 3',
          description: 'Third task',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['circular-1'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(circularTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      await expect(planner.createPlan(mockParsedRequest)).rejects.toThrow('circular dependency');
    });
  });

  describe('Plan Validation', () => {
    test('should validate task dependencies', async () => {
      const validTasks: Task[] = [
        {
          id: 'valid-1',
          title: 'Setup',
          description: 'Initial setup',
          type: 'setup',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 30 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'low', risk: 'low', expertise: 'basic' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'valid-2',
          title: 'Implementation',
          description: 'Main implementation',
          type: 'implementation',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 2 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['valid-1'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(validTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(mockParsedRequest);
      
      expect(result.plan).toBeDefined();
      expect(result.plan.tasks).toHaveLength(2);
      
      // Verify dependency order
      const setupTask = result.plan.tasks.find(t => t.id === 'valid-1');
      const implTask = result.plan.tasks.find(t => t.id === 'valid-2');
      expect(setupTask?.dependencies).toHaveLength(0);
      expect(implTask?.dependencies).toContain('valid-1');
    });

    test('should detect missing dependencies', async () => {
      const missingDepTasks: Task[] = [
        {
          id: 'missing-dep-1',
          title: 'Task with missing dependency',
          description: 'Task that depends on non-existent task',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['non-existent-task'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(missingDepTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      await expect(planner.createPlan(mockParsedRequest)).rejects.toThrow('missing dependency');
    });
  });

  describe('Integration with Event System', () => {
    test('should emit planning started events', async () => {
      const eventSpy = jest.spyOn(planner, 'emit');
      
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      await planner.createPlan(mockParsedRequest);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'planning:started',
        expect.objectContaining({
          request: mockParsedRequest,
          timestamp: expect.any(Date)
        })
      );
    });

    test('should emit planning completed events', async () => {
      const eventSpy = jest.spyOn(planner, 'emit');
      
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(sampleTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.5);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(mockParsedRequest);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'planning:completed',
        expect.objectContaining({
          result: expect.objectContaining({
            plan: expect.any(Object)
          }),
          duration: expect.any(Number)
        })
      );
    });

    test('should emit planning error events', async () => {
      const eventSpy = jest.spyOn(planner, 'emit');
      
      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockRejectedValue(new Error('Planning failed'));

      await expect(planner.createPlan(mockParsedRequest)).rejects.toThrow();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'planning:error',
        expect.objectContaining({
          request: mockParsedRequest,
          error: expect.any(Error)
        })
      );
    });
  });

  describe('Resource Management', () => {
    test('should not leak memory during repeated planning', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many planning operations
      for (let i = 0; i < 50; i++) {
        (planner as any).taskBreakdown.breakdownTasks = jest.fn()
          .mockResolvedValue(sampleTasks);
        (planner as any).complexityEstimator.estimateComplexity = jest.fn()
          .mockResolvedValue(0.5);
        (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
          .mockResolvedValue([]);
        (planner as any).questionGenerator.generateQuestions = jest.fn()
          .mockResolvedValue([]);

        await planner.createPlan({
          ...mockParsedRequest,
          originalText: `Planning request ${i}`
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });

    test('should clean up resources properly', async () => {
      const resourceSpy = jest.spyOn(planner as any, 'cleanup');
      
      planner.destroy();
      
      expect(resourceSpy).toHaveBeenCalled();
    });
  });

  describe('Plan Optimization', () => {
    test('should optimize task order for efficiency', async () => {
      const unoptimizedTasks: Task[] = [
        {
          id: 'unopt-3',
          title: 'Task C (long, independent)',
          description: 'Long task that could run in parallel',
          type: 'implementation',
          priority: TaskPriority.LOW,
          status: TaskStatus.PENDING,
          estimatedDuration: 4 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'high', risk: 'medium', expertise: 'advanced' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'unopt-1',
          title: 'Task A (short, setup)',
          description: 'Quick setup task',
          type: 'setup',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 15 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'low', risk: 'low', expertise: 'basic' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'unopt-2',
          title: 'Task B (depends on A)',
          description: 'Task that depends on setup',
          type: 'implementation',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 2 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['unopt-1'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(unoptimizedTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.6);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(mockParsedRequest);
      
      // Tasks should be ordered efficiently
      expect(result.plan.tasks[0].id).toBe('unopt-1'); // Setup first
      expect(result.plan.tasks[1].id).toBe('unopt-2'); // Dependent task second
      expect(result.plan.tasks[2].id).toBe('unopt-3'); // Long parallel task last
    });

    test('should detect parallelizable tasks', async () => {
      const parallelTasks: Task[] = [
        {
          id: 'parallel-1',
          title: 'Frontend Component',
          description: 'Build UI component',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 2 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'low', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'parallel-2',
          title: 'Backend API',
          description: 'Build API endpoint',
          type: 'implementation',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          estimatedDuration: 2 * 60 * 60 * 1000,
          actualDuration: null,
          dependencies: [],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'medium', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'integration-task',
          title: 'Integration',
          description: 'Connect frontend and backend',
          type: 'implementation',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          estimatedDuration: 60 * 60 * 1000,
          actualDuration: null,
          dependencies: ['parallel-1', 'parallel-2'],
          assignedTo: null,
          context: { filePaths: [], environment: 'development', parameters: {} },
          validation: { isValid: true, confidence: 0.9, issues: [] },
          metadata: { complexity: 'medium', risk: 'high', expertise: 'intermediate' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (planner as any).taskBreakdown.breakdownTasks = jest.fn()
        .mockResolvedValue(parallelTasks);
      (planner as any).complexityEstimator.estimateComplexity = jest.fn()
        .mockResolvedValue(0.6);
      (planner as any).ambiguityDetector.detectAmbiguities = jest.fn()
        .mockResolvedValue([]);
      (planner as any).questionGenerator.generateQuestions = jest.fn()
        .mockResolvedValue([]);

      const result = await planner.createPlan(mockParsedRequest);
      
      // First two tasks should be independent and can run in parallel
      expect(result.plan.tasks[0].dependencies).toHaveLength(0);
      expect(result.plan.tasks[1].dependencies).toHaveLength(0);
      expect(result.plan.tasks[2].dependencies).toHaveLength(2);
    });
  });
});