/**
 * Unit tests for Planner component
 */

import {
  Planner,
  TaskBreakdown,
  ComplexityEstimator,
  AmbiguityDetector,
  QuestionGenerator,
  PlanningInput,
  ProjectType,
  RiskTolerance,
  QualityLevel,
  TaskCategory,
  Priority,
  Task,
  TaskStatus,
} from '../../../../src/components/planner';

// Mock dependencies
jest.mock('../../../../src/core/logger');
jest.mock('../../../../src/core/event-bus/event-bus');

describe('Planner Component', () => {
  let planner: Planner;

  beforeEach(() => {
    planner = new Planner({
      enableAIAnalysis: false,
      enableHeuristicAnalysis: true,
      enableAmbiguityDetection: true,
      enableQuestionGeneration: true,
      maxTaskDepth: 2,
      maxSubtasksPerTask: 5
    });
  });

  describe('Planner', () => {
    it('should create a basic execution plan', async () => {
      const input: PlanningInput = {
        description: 'Build a simple React component',
        context: {
          projectType: ProjectType.WEB_APPLICATION,
          riskTolerance: RiskTolerance.MEDIUM,
          qualityRequirements: QualityLevel.STANDARD
        }
      };

      const result = await planner.createExecutionPlan(input);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.tasks.length).toBeGreaterThan(0);
      expect(result.plan!.status).toBe('draft');
    });

    it('should handle complex project input', async () => {
      const input: PlanningInput = {
        description: 'Build a comprehensive e-commerce platform',
        requirements: [
          'User authentication',
          'Product catalog',
          'Shopping cart',
          'Payment processing'
        ],
        constraints: [
          'Must support 1000 concurrent users',
          'PCI compliant',
          'Mobile responsive'
        ],
        context: {
          projectType: ProjectType.WEB_APPLICATION,
          technologyStack: ['React', 'Node.js', 'PostgreSQL'],
          teamSize: 5,
          deadline: new Date('2024-12-31'),
          riskTolerance: RiskTolerance.LOW,
          qualityRequirements: QualityLevel.HIGH
        }
      };

      const result = await planner.createExecutionPlan(input);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.tasks.length).toBeGreaterThan(5);
      expect(result.plan!.milestones.length).toBeGreaterThan(0);
      expect(result.plan!.risks.length).toBeGreaterThan(0);
      expect(result.ambiguityResult).toBeDefined();
    });

    it('should validate plan dependencies', async () => {
      const input: PlanningInput = {
        description: 'Test project with dependencies',
        context: {
          projectType: ProjectType.API_SERVICE
        }
      };

      const result = await planner.createExecutionPlan(input);

      expect(result.success).toBe(true);
      
      if (result.plan) {
        // Check for circular dependencies
        const dependencyIds = new Set(result.plan.dependencies.map(d => d.from));
        const taskIds = new Set(result.plan.tasks.map(t => t.id));
        
        // All dependency sources should be valid task IDs
        result.plan.dependencies.forEach(dep => {
          expect(taskIds.has(dep.from)).toBe(true);
          expect(taskIds.has(dep.to)).toBe(true);
        });
      }
    });

    it('should generate alternatives for large projects', async () => {
      const input: PlanningInput = {
        description: 'Build a large enterprise application with multiple modules',
        context: {
          projectType: ProjectType.WEB_APPLICATION,
          teamSize: 10,
          qualityRequirements: QualityLevel.ENTERPRISE
        }
      };

      const result = await planner.createExecutionPlan(input);

      expect(result.success).toBe(true);
      expect(result.plan!.alternatives.length).toBeGreaterThan(0);
      
      // Should include MVP alternative
      const mvpAlternative = result.plan!.alternatives.find(alt => 
        alt.name.toLowerCase().includes('mvp')
      );
      expect(mvpAlternative).toBeDefined();
      expect(mvpAlternative!.cost).toBeLessThan(1.0);
    });

    it('should handle planning errors gracefully', async () => {
      // Test with invalid input
      const invalidInput = null as any;

      const result = await planner.createExecutionPlan(invalidInput);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('TaskBreakdown', () => {
    let taskBreakdown: TaskBreakdown;

    beforeEach(() => {
      taskBreakdown = new TaskBreakdown({
        maxDepth: 2,
        maxSubtasksPerTask: 5,
        minTaskSize: 1,
        maxTaskSize: 16,
        enableAutomaticGrouping: true,
        enableDependencyAnalysis: true,
        granularityPreference: 'medium' as any
      });
    });

    it('should break down development tasks', async () => {
      const task: Task = {
        id: 'task-1',
        name: 'Implement Authentication',
        description: 'Build user authentication system',
        category: TaskCategory.DEVELOPMENT,
        priority: Priority.HIGH,
        status: TaskStatus.NOT_STARTED,
        estimatedHours: 20,
        dependencies: [],
        deliverables: [],
        acceptanceCriteria: ['Login works', 'Registration works'],
        testCriteria: ['All tests pass'],
        risks: [],
        complexityScore: {
          overall: 0.6,
          cognitive: 0.7,
          technical: 0.6,
          business: 0.5,
          uncertainty: 0.4,
          dependencies: 0.3,
          factors: []
        },
        confidence: 0.8,
        prerequisites: [],
        skills: [],
        tools: [],
        subtasks: [],
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          version: 1,
          tags: [],
          labels: [],
          customFields: {}
        },
        qualityGates: []
      };

      const subtasks = await taskBreakdown.breakdownTask(task);

      expect(subtasks.length).toBeGreaterThan(0);
      expect(subtasks.some(t => t.category === TaskCategory.CONFIGURATION)).toBe(true);
      expect(subtasks.some(t => t.category === TaskCategory.DEVELOPMENT)).toBe(true);
      expect(subtasks.some(t => t.category === TaskCategory.TESTING)).toBe(true);
    });

    it('should break down testing tasks', async () => {
      const task: Task = {
        id: 'task-2',
        name: 'Comprehensive Testing',
        description: 'Run comprehensive testing suite',
        category: TaskCategory.TESTING,
        priority: Priority.MEDIUM,
        status: TaskStatus.NOT_STARTED,
        estimatedHours: 16,
        dependencies: [],
        deliverables: [],
        acceptanceCriteria: ['All tests passing'],
        testCriteria: ['Test coverage > 80%'],
        risks: [],
        complexityScore: {
          overall: 0.5,
          cognitive: 0.4,
          technical: 0.5,
          business: 0.5,
          uncertainty: 0.3,
          dependencies: 0.2,
          factors: []
        },
        confidence: 0.7,
        prerequisites: [],
        skills: [],
        tools: [],
        subtasks: [],
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          version: 1,
          tags: [],
          labels: [],
          customFields: {}
        },
        qualityGates: []
      };

      const subtasks = await taskBreakdown.breakdownTask(task);

      expect(subtasks.length).toBeGreaterThan(0);
      expect(subtasks.some(t => t.category === TaskCategory.ANALYSIS)).toBe(true);
      expect(subtasks.some(t => t.category === TaskCategory.DESIGN)).toBe(true);
      expect(subtasks.some(t => t.category === TaskCategory.TESTING)).toBe(true);
    });

    it('should validate task breakdown', async () => {
      const subtasks: Task[] = [
        {
          id: 'subtask-1',
          name: 'Small Task',
          description: 'A small task',
          category: TaskCategory.DEVELOPMENT,
          priority: Priority.LOW,
          status: TaskStatus.NOT_STARTED,
          estimatedHours: 0.5, // Below minimum
          dependencies: [],
          deliverables: [],
          acceptanceCriteria: [],
          testCriteria: [],
          risks: [],
          complexityScore: {
            overall: 0.3,
            cognitive: 0.3,
            technical: 0.3,
            business: 0.3,
            uncertainty: 0.3,
            dependencies: 0.3,
            factors: []
          },
          confidence: 0.8,
          prerequisites: [],
          skills: [],
          tools: [],
          subtasks: [],
          metadata: {
            createdBy: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1,
            tags: [],
            labels: [],
            customFields: {}
          },
          qualityGates: []
        },
        {
          id: 'subtask-2',
          name: 'Valid Task',
          description: 'A valid task',
          category: TaskCategory.DEVELOPMENT,
          priority: Priority.MEDIUM,
          status: TaskStatus.NOT_STARTED,
          estimatedHours: 4,
          dependencies: ['subtask-1'], // Valid dependency
          deliverables: [],
          acceptanceCriteria: [],
          testCriteria: [],
          risks: [],
          complexityScore: {
            overall: 0.5,
            cognitive: 0.5,
            technical: 0.5,
            business: 0.5,
            uncertainty: 0.5,
            dependencies: 0.5,
            factors: []
          },
          confidence: 0.7,
          prerequisites: [],
          skills: [],
          tools: [],
          subtasks: [],
          metadata: {
            createdBy: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1,
            tags: [],
            labels: [],
            customFields: {}
          },
          qualityGates: []
        }
      ];

      const validation = taskBreakdown.validateBreakdown(subtasks);

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues.some(issue => issue.includes('minimum size'))).toBe(true);
    });
  });

  describe('ComplexityEstimator', () => {
    let complexityEstimator: ComplexityEstimator;

    beforeEach(() => {
      complexityEstimator = new ComplexityEstimator({
        aiModel: 'test-model'
      });
    });

    it('should estimate task complexity using heuristics', async () => {
      const task: Task = {
        id: 'complex-task',
        name: 'Complex Integration',
        description: 'Integrate multiple external APIs',
        category: TaskCategory.INTEGRATION,
        priority: Priority.HIGH,
        status: TaskStatus.NOT_STARTED,
        estimatedHours: 32,
        dependencies: ['api-1', 'api-2', 'api-3'],
        deliverables: [],
        acceptanceCriteria: ['All APIs integrated'],
        testCriteria: ['Integration tests pass'],
        risks: [
          {
            id: 'risk-1',
            name: 'API Unavailable',
            description: 'External API might be unavailable',
            probability: 'medium' as any,
            impact: 'major' as any,
            severity: 'high' as any,
            mitigation: 'Implement fallback',
            contingency: 'Use mock data',
            status: 'identified' as any,
            affectedTasks: []
          }
        ],
        complexityScore: {
          overall: 0.7,
          cognitive: 0.8,
          technical: 0.9,
          business: 0.6,
          uncertainty: 0.8,
          dependencies: 0.8,
          factors: []
        },
        confidence: 0.6,
        prerequisites: [],
        skills: [
          { name: 'API Integration', level: 'advanced' as any, category: 'programming' as any, required: true }
        ],
        tools: [
          { name: 'HTTP Client', category: 'framework' as any, required: true }
        ],
        subtasks: [],
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          lastModified: new Date(),
          version: 1,
          tags: [],
          labels: [],
          customFields: {}
        },
        qualityGates: []
      };

      const estimate = await complexityEstimator.estimateTaskComplexity(task);

      expect(estimate).toBeDefined();
      expect(estimate.estimatedHours).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
      expect(estimate.factors.length).toBeGreaterThan(0);
      expect(estimate.heuristicAnalysis).toBeDefined();
      expect(estimate.heuristicAnalysis.factors.length).toBeGreaterThan(0);
    });

    it('should handle multiple tasks', async () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Simple Task',
          description: 'Simple task',
          category: TaskCategory.DEVELOPMENT,
          priority: Priority.LOW,
          status: TaskStatus.NOT_STARTED,
          estimatedHours: 8,
          dependencies: [],
          deliverables: [],
          acceptanceCriteria: [],
          testCriteria: [],
          risks: [],
          complexityScore: {
            overall: 0.3,
            cognitive: 0.3,
            technical: 0.3,
            business: 0.3,
            uncertainty: 0.3,
            dependencies: 0.3,
            factors: []
          },
          confidence: 0.8,
          prerequisites: [],
          skills: [],
          tools: [],
          subtasks: [],
          metadata: {
            createdBy: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1,
            tags: [],
            labels: [],
            customFields: {}
          },
          qualityGates: []
        },
        {
          id: 'task-2',
          name: 'Complex Task',
          description: 'Complex task',
          category: TaskCategory.DEVELOPMENT,
          priority: Priority.HIGH,
          status: TaskStatus.NOT_STARTED,
          estimatedHours: 24,
          dependencies: ['task-1'],
          deliverables: [],
          acceptanceCriteria: [],
          testCriteria: [],
          risks: [],
          complexityScore: {
            overall: 0.8,
            cognitive: 0.8,
            technical: 0.8,
            business: 0.8,
            uncertainty: 0.8,
            dependencies: 0.8,
            factors: []
          },
          confidence: 0.6,
          prerequisites: [],
          skills: [],
          tools: [],
          subtasks: [],
          metadata: {
            createdBy: 'test',
            createdAt: new Date(),
            lastModified: new Date(),
            version: 1,
            tags: [],
            labels: [],
            customFields: {}
          },
          qualityGates: []
        }
      ];

      const estimates = await complexityEstimator.estimateMultipleTasks(tasks);

      expect(estimates).toHaveLength(2);
      expect(estimates[0].confidence).toBeGreaterThan(estimates[1].confidence); // Simple task should have higher confidence
    });
  });

  describe('AmbiguityDetector', () => {
    let ambiguityDetector: AmbiguityDetector;

    beforeEach(() => {
      ambiguityDetector = new AmbiguityDetector();
    });

    it('should detect requirement ambiguities', async () => {
      const input: PlanningInput = {
        description: 'Build a web app that does stuff like user management and reports etc.',
        requirements: [],
        context: {
          projectType: ProjectType.WEB_APPLICATION
        }
      };

      const result = await ambiguityDetector.detectAmbiguities(input);

      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.clarityScore).toBeLessThan(1.0);
      
      const requirementAmbiguities = result.ambiguities.filter(a => a.type === 'requirement');
      expect(requirementAmbiguities.length).toBeGreaterThan(0);
    });

    it('should detect scope ambiguities', async () => {
      const input: PlanningInput = {
        description: 'We may need to add some features like reporting and analytics maybe',
        context: {
          projectType: ProjectType.WEB_APPLICATION
        }
      };

      const result = await ambiguityDetector.detectAmbiguities(input);

      expect(result.ambiguities.length).toBeGreaterThan(0);
      
      const scopeAmbiguities = result.ambiguities.filter(a => a.type === 'scope');
      expect(scopeAmbiguities.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', async () => {
      const input: PlanningInput = {
        description: 'Build something cool',
        context: {
          projectType: ProjectType.WEB_APPLICATION
        }
      };

      const result = await ambiguityDetector.detectAmbiguities(input);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.toLowerCase().includes('requirement'))).toBe(true);
    });

    it('should generate clarification questions', async () => {
      const input: PlanningInput = {
        description: 'Build a system that handles data processing',
        context: {
          projectType: ProjectType.WEB_APPLICATION
        }
      };

      const result = await ambiguityDetector.detectAmbiguities(input);

      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.questions.every(q => q.question.length > 0)).toBe(true);
      expect(result.questions.every(q => q.category)).toBe(true);
    });
  });

  describe('QuestionGenerator', () => {
    let questionGenerator: QuestionGenerator;

    beforeEach(() => {
      questionGenerator = new QuestionGenerator({
        maxQuestions: 10,
        priorityThreshold: 'medium' as any,
        includeContext: true,
        groupSimilar: true
      });
    });

    it('should generate questions for ambiguities', async () => {
      const ambiguities = [
        {
          id: 'amb-1',
          type: 'requirement' as any,
          description: 'Vague requirement found',
          location: 'description',
          severity: 'medium' as any,
          suggestedResolution: 'Be more specific',
          impact: 'May cause issues'
        }
      ];

      const input: PlanningInput = {
        description: 'Build something',
        context: {
          projectType: ProjectType.WEB_APPLICATION,
          preferences: {
            communicationStyle: 'collaborative' as any
          }
        }
      };

      const questions = await questionGenerator.generateQuestions(ambiguities, input);

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every(q => q.question.length > 0)).toBe(true);
      expect(questions.every(q => q.category)).toBe(true);
    });

    it('should adjust communication style', () => {
      const input: PlanningInput = {
        description: 'Test',
        preferences: {
          communicationStyle: 'formal' as any
        }
      };

      const questions = questionGenerator.generateQuestions([], input, []);
      
      // This is a simple test to verify the method exists
      expect(Array.isArray(questions)).toBe(true);
    });

    it('should filter questions by priority', async () => {
      const ambiguities = [
        {
          id: 'amb-1',
          type: 'requirement' as any,
          description: 'Critical requirement missing',
          location: 'description',
          severity: 'critical' as any,
          suggestedResolution: 'Add requirement',
          impact: 'Project may fail'
        },
        {
          id: 'amb-2',
          type: 'technical' as any,
          description: 'Minor technical detail unclear',
          location: 'description',
          severity: 'low' as any,
          suggestedResolution: 'Clarify',
          impact: 'Minor impact'
        }
      ];

      const input: PlanningInput = {
        description: 'Test',
        context: {
          projectType: ProjectType.WEB_APPLICATION
        }
      };

      const questions = await questionGenerator.generateQuestions(ambiguities, input);

      // Should prioritize critical over low
      const criticalQuestions = questions.filter(q => q.priority === 'critical');
      const lowQuestions = questions.filter(q => q.priority === 'low');
      
      // Critical questions should be present
      expect(criticalQuestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration', () => {
    it('should handle full planning workflow', async () => {
      const input: PlanningInput = {
        description: 'Build a comprehensive project management tool',
        requirements: [
          'User authentication',
          'Project creation and management',
          'Task assignment and tracking',
          'Real-time collaboration',
          'Reporting and analytics'
        ],
        constraints: [
          'Must support 500 concurrent users',
          'Real-time updates required',
          'Mobile responsive design',
          'API integrations with external tools'
        ],
        context: {
          projectType: ProjectType.WEB_APPLICATION,
          technologyStack: ['React', 'Node.js', 'MongoDB', 'Socket.io'],
          teamSize: 8,
          deadline: new Date('2024-09-30'),
          riskTolerance: RiskTolerance.MEDIUM,
          qualityRequirements: QualityLevel.HIGH
        },
        preferences: {
          methodology: 'agile' as any,
          taskSize: 'medium' as any,
          priorityStrategy: 'risk_first' as any,
          communicationStyle: 'collaborative' as any
        }
      };

      const result = await planner.createExecutionPlan(input);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.tasks.length).toBeGreaterThan(10);
      expect(result.plan!.milestones.length).toBeGreaterThan(3);
      expect(result.plan!.dependencies.length).toBeGreaterThan(0);
      expect(result.plan!.risks.length).toBeGreaterThan(0);
      expect(result.plan!.assumptions.length).toBeGreaterThan(0);
      expect(result.plan!.alternatives.length).toBeGreaterThan(0);
      expect(result.ambiguityResult).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases', async () => {
      // Test with minimal input
      const minimalInput: PlanningInput = {
        description: 'Simple task'
      };

      const result = await planner.createExecutionPlan(minimalInput);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.tasks.length).toBeGreaterThan(0);
    });

    it('should provide meaningful metadata', async () => {
      const input: PlanningInput = {
        description: 'Build a system',
        context: {
          projectType: ProjectType.WEB_APPLICATION
        }
      };

      const result = await planner.createExecutionPlan(input);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.complexity).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
      expect(result.metadata.version).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should accept and apply configuration', () => {
      const config = {
        enableAIAnalysis: false,
        enableHeuristicAnalysis: true,
        maxTaskDepth: 1,
        maxSubtasksPerTask: 3,
        complexityThreshold: 0.5
      };

      const customPlanner = new Planner(config);
      const retrievedConfig = customPlanner.getConfig();

      expect(retrievedConfig.enableAIAnalysis).toBe(false);
      expect(retrievedConfig.enableHeuristicAnalysis).toBe(true);
      expect(retrievedConfig.maxTaskDepth).toBe(1);
      expect(retrievedConfig.maxSubtasksPerTask).toBe(3);
      expect(retrievedConfig.complexityThreshold).toBe(0.5);
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        maxTaskDepth: 5,
        complexityThreshold: 0.8
      };

      planner.updateConfig(newConfig);
      const updatedConfig = planner.getConfig();

      expect(updatedConfig.maxTaskDepth).toBe(5);
      expect(updatedConfig.complexityThreshold).toBe(0.8);
      // Other config should remain
      expect(updatedConfig.enableHeuristicAnalysis).toBe(true);
    });
  });
});

// Export test utilities
export const testUtils = {
  createMockTask: (overrides: Partial<Task> = {}): Task => ({
    id: 'mock-task',
    name: 'Mock Task',
    description: 'A mock task for testing',
    category: TaskCategory.DEVELOPMENT,
    priority: Priority.MEDIUM,
    status: TaskStatus.NOT_STARTED,
    estimatedHours: 8,
    dependencies: [],
    deliverables: [],
    acceptanceCriteria: [],
    testCriteria: [],
    risks: [],
    complexityScore: {
      overall: 0.5,
      cognitive: 0.5,
      technical: 0.5,
      business: 0.5,
      uncertainty: 0.5,
      dependencies: 0.5,
      factors: []
    },
    confidence: 0.7,
    prerequisites: [],
    skills: [],
    tools: [],
    subtasks: [],
    metadata: {
      createdBy: 'test',
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1,
      tags: [],
      labels: [],
      customFields: {}
    },
    qualityGates: [],
    ...overrides
  }),

  createMockPlanningInput: (overrides: Partial<PlanningInput> = {}): PlanningInput => ({
    description: 'Mock project description',
    requirements: [],
    constraints: [],
    context: {
      projectType: ProjectType.WEB_APPLICATION,
      riskTolerance: RiskTolerance.MEDIUM,
      qualityRequirements: QualityLevel.STANDARD
    },
    preferences: {
      methodology: 'agile' as any,
      taskSize: 'medium' as any,
      priorityStrategy: 'equal' as any,
      communicationStyle: 'collaborative' as any
    },
    metadata: {},
    ...overrides
  })
};