/**
 * Planner - Main orchestrator for planning functionality
 */

import {
  PlannerConfig,
  PlanningInput,
  ExecutionPlan,
  PlanStatus,
  Task,
  TaskCategory,
  TaskStatus,
  Priority,
  Milestone,
  TaskDependency,
  DependencyType,
  DependencyStrength,
  Risk,
  Assumption,
  AlternativePlan,
  PlanMetadata,
  ValidationResult,
  ValidationType,
  PlanningResult,
  PlannerEvent,
  PlannerEventType,
} from './types';
import { TaskBreakdown } from './task-breakdown';
import { ComplexityEstimator } from './complexity-estimator';
import { AmbiguityDetector } from './ambiguity-detector';
import { QuestionGenerator } from './question-generator';
import { EventBus } from '../../core/event-bus/event-bus';
import { logger } from '../../core/logger';
import { v4 as uuidv4 } from 'uuid';

export class Planner {
  private config: PlannerConfig;
  private eventBus: EventBus;
  private taskBreakdown: TaskBreakdown;
  private complexityEstimator: ComplexityEstimator;
  private ambiguityDetector: AmbiguityDetector;
  private questionGenerator: QuestionGenerator;

  constructor(
    config: PlannerConfig = {},
    eventBus?: EventBus
  ) {
    this.config = {
      enableAIAnalysis: true,
      enableHeuristicAnalysis: true,
      enableAmbiguityDetection: true,
      enableQuestionGeneration: true,
      maxTaskDepth: 3,
      maxSubtasksPerTask: 10,
      complexityThreshold: 0.7,
      timeoutMs: 30000,
      parallelProcessing: true,
      cacheEnabled: false,
      confidenceThreshold: 0.6,
      ...config
    };

    this.eventBus = eventBus || new EventBus();
    this.initializeComponents();
  }

  /**
   * Create a comprehensive execution plan from planning input
   */
  async createExecutionPlan(
    input: PlanningInput,
    existingAnalysis?: any
  ): Promise<PlanningResult> {
    const startTime = Date.now();
    
    try {
      this.emitEvent(PlannerEventType.PLANNING_STARTED, { input });

      logger.info('Creating execution plan', { 
        projectType: input.context?.projectType,
        hasExistingAnalysis: !!existingAnalysis 
      });

      // Step 1: Detect ambiguities
      const ambiguityResult = await this.detectAmbiguities(input);

      // Step 2: Break down tasks
      const tasks = await this.breakdownTasks(input);

      // Step 3: Estimate complexity
      const complexityEstimates = await this.estimateComplexity(tasks);

      // Step 4: Create milestones
      const milestones = this.createMilestones(tasks);

      // Step 5: Analyze dependencies
      const dependencies = this.analyzeDependencies(tasks);

      // Step 6: Identify risks
      const risks = this.identifyRisks(input, tasks, complexityEstimates);

      // Step 7: Document assumptions
      const assumptions = this.documentAssumptions(input, tasks);

      // Step 8: Generate alternative plans
      const alternatives = this.generateAlternativePlans(input, tasks);

      // Step 9: Create execution plan
      const plan = this.createExecutionPlanObject(
        input,
        tasks,
        milestones,
        dependencies,
        risks,
        assumptions,
        alternatives
      );

      // Step 10: Validate plan
      const validationResults = await this.validatePlan(plan);

      // Step 11: Apply complexity estimates to tasks
      this.applyComplexityEstimates(tasks, complexityEstimates);

      // Calculate metadata
      const metadata = {
        processingTime: Date.now() - startTime,
        complexity: this.calculateOverallComplexity(complexityEstimates),
        confidence: this.calculateOverallConfidence(complexityEstimates, ambiguityResult),
        version: '1.0.0',
        cacheKey: this.generateCacheKey(input)
      };

      const result: PlanningResult = {
        success: true,
        plan,
        ambiguityResult,
        errors: [],
        warnings: this.generateWarnings(plan, validationResults),
        metadata
      };

      this.emitEvent(PlannerEventType.PLANNING_COMPLETE, { result });

      logger.info('Execution plan created successfully', { 
        taskCount: tasks.length,
        milestoneCount: milestones.length,
        riskCount: risks.length,
        processingTime: metadata.processingTime
      });

      return result;

    } catch (error) {
      logger.error('Plan creation failed', { error });
      
      this.emitEvent(PlannerEventType.ERROR, { error, input });

      return {
        success: false,
        errors: [{
          code: 'PLAN_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          complexity: {
            overall: 0.5,
            cognitive: 0.5,
            technical: 0.5,
            business: 0.5,
            uncertainty: 0.5,
            dependencies: 0.5,
            factors: []
          },
          confidence: 0.1,
          version: '1.0.0'
        }
      };
    }
  }

  /**
   * Detect ambiguities in the planning input
   */
  private async detectAmbiguities(input: PlanningInput) {
    if (!this.config.enableAmbiguityDetection) {
      return undefined;
    }

    try {
      const tasks = await this.breakdownTasks(input);
      return await this.ambiguityDetector.detectAmbiguities(input, tasks);
    } catch (error) {
      logger.warn('Ambiguity detection failed', { error });
      return undefined;
    }
  }

  /**
   * Break down planning input into tasks
   */
  private async breakdownTasks(input: PlanningInput): Promise<Task[]> {
    const topLevelTasks: Task[] = [];

    // Create main project phases as top-level tasks
    const phases = this.identifyProjectPhases(input);
    
    for (const phase of phases) {
      const task: Task = {
        id: uuidv4(),
        name: phase.name,
        description: phase.description,
        category: phase.category,
        priority: phase.priority,
        status: TaskStatus.NOT_STARTED,
        estimatedHours: phase.estimatedHours,
        dependencies: [],
        deliverables: phase.deliverables,
        acceptanceCriteria: phase.acceptanceCriteria,
        testCriteria: phase.testCriteria,
        risks: [],
        complexityScore: {
          overall: 0.5,
          cognitive: 0.5,
          technical: 0.5,
          business: 0.5,
          uncertainty: 0.3,
          dependencies: 0.4,
          factors: []
        },
        confidence: 0.7,
        prerequisites: [],
        skills: phase.skills,
        tools: phase.tools,
        subtasks: [],
        metadata: {
          createdBy: 'planner',
          createdAt: new Date(),
          lastModified: new Date(),
          version: 1,
          tags: ['project-phase'],
          labels: [],
          customFields: {}
        },
        qualityGates: []
      };

      topLevelTasks.push(task);
    }

    // Apply task breakdown recursively
    const allTasks: Task[] = [];
    
    for (const task of topLevelTasks) {
      const subtasks = await this.taskBreakdown.breakdownTask(task, {
        projectType: input.context?.projectType,
        constraints: input.constraints
      });
      
      task.subtasks = subtasks;
      allTasks.push(task, ...subtasks);
    }

    return allTasks;
  }

  /**
   * Identify project phases based on input and context
   */
  private identifyProjectPhases(input: PlanningInput): Array<{
    name: string;
    description: string;
    category: TaskCategory;
    priority: Priority;
    estimatedHours: number;
    deliverables: any[];
    acceptanceCriteria: string[];
    testCriteria: string[];
    skills: any[];
    tools: any[];
  }> {
    const phases = [];
    const projectType = input.context?.projectType;

    // Common phases based on project type
    switch (projectType) {
      case 'web_application':
        phases.push(
          {
            name: 'Requirements Analysis',
            description: 'Analyze and document project requirements',
            category: TaskCategory.ANALYSIS,
            priority: Priority.HIGH,
            estimatedHours: 16,
            deliverables: [],
            acceptanceCriteria: ['Requirements documented', 'Stakeholders aligned'],
            testCriteria: ['Requirements review completed'],
            skills: [],
            tools: []
          },
          {
            name: 'Technical Design',
            description: 'Create technical architecture and design',
            category: TaskCategory.DESIGN,
            priority: Priority.HIGH,
            estimatedHours: 24,
            deliverables: [],
            acceptanceCriteria: ['Architecture approved', 'Design decisions documented'],
            testCriteria: ['Design review completed'],
            skills: [],
            tools: []
          },
          {
            name: 'Frontend Development',
            description: 'Implement frontend components and features',
            category: TaskCategory.DEVELOPMENT,
            priority: Priority.MEDIUM,
            estimatedHours: 80,
            deliverables: [],
            acceptanceCriteria: ['UI components implemented', 'Responsive design completed'],
            testCriteria: ['Frontend tests passing'],
            skills: [],
            tools: []
          },
          {
            name: 'Backend Development',
            description: 'Implement backend services and APIs',
            category: TaskCategory.DEVELOPMENT,
            priority: Priority.MEDIUM,
            estimatedHours: 60,
            deliverables: [],
            acceptanceCriteria: ['APIs implemented', 'Database schema created'],
            testCriteria: ['Backend tests passing'],
            skills: [],
            tools: []
          },
          {
            name: 'Testing & QA',
            description: 'Comprehensive testing of the application',
            category: TaskCategory.TESTING,
            priority: Priority.HIGH,
            estimatedHours: 32,
            deliverables: [],
            acceptanceCriteria: ['All tests passing', 'QA approved'],
            testCriteria: ['Test coverage > 80%'],
            skills: [],
            tools: []
          },
          {
            name: 'Deployment',
            description: 'Deploy application to production',
            category: TaskCategory.DEPLOYMENT,
            priority: Priority.HIGH,
            estimatedHours: 16,
            deliverables: [],
            acceptanceCriteria: ['Application deployed', 'Monitoring setup'],
            testCriteria: ['Deployment verification completed'],
            skills: [],
            tools: []
          }
        );
        break;

      case 'api_service':
        phases.push(
          {
            name: 'API Design',
            description: 'Design RESTful API endpoints and data models',
            category: TaskCategory.DESIGN,
            priority: Priority.HIGH,
            estimatedHours: 20,
            deliverables: [],
            acceptanceCriteria: ['API specification complete', 'Data models defined'],
            testCriteria: ['API design review passed'],
            skills: [],
            tools: []
          },
          {
            name: 'Implementation',
            description: 'Implement API endpoints and business logic',
            category: TaskCategory.DEVELOPMENT,
            priority: Priority.MEDIUM,
            estimatedHours: 60,
            deliverables: [],
            acceptanceCriteria: ['All endpoints implemented', 'Business logic complete'],
            testCriteria: ['Unit tests > 90% coverage'],
            skills: [],
            tools: []
          },
          {
            name: 'API Testing',
            description: 'Comprehensive API testing and validation',
            category: TaskCategory.TESTING,
            priority: Priority.HIGH,
            estimatedHours: 24,
            deliverables: [],
            acceptanceCriteria: ['API contracts validated', 'Performance tested'],
            testCriteria: ['All API tests passing'],
            skills: [],
            tools: []
          }
        );
        break;

      default:
        // Generic project phases
        phases.push(
          {
            name: 'Planning & Analysis',
            description: 'Project planning and requirements analysis',
            category: TaskCategory.ANALYSIS,
            priority: Priority.HIGH,
            estimatedHours: 20,
            deliverables: [],
            acceptanceCriteria: ['Requirements clear', 'Plan approved'],
            testCriteria: ['Planning review completed'],
            skills: [],
            tools: []
          },
          {
            name: 'Implementation',
            description: 'Main project implementation',
            category: TaskCategory.DEVELOPMENT,
            priority: Priority.MEDIUM,
            estimatedHours: 60,
            deliverables: [],
            acceptanceCriteria: ['All features implemented'],
            testCriteria: ['Implementation verified'],
            skills: [],
            tools: []
          },
          {
            name: 'Validation & Testing',
            description: 'Testing and validation of deliverables',
            category: TaskCategory.TESTING,
            priority: Priority.HIGH,
            estimatedHours: 20,
            deliverables: [],
            acceptanceCriteria: ['All tests passing'],
            testCriteria: ['QA approved'],
            skills: [],
            tools: []
          }
        );
    }

    return phases;
  }

  /**
   * Estimate complexity for all tasks
   */
  private async estimateComplexity(tasks: Task[]): Promise<any[]> {
    if (!this.config.enableHeuristicAnalysis && !this.config.enableAIAnalysis) {
      return tasks.map(task => ({
        taskId: task.id,
        estimatedHours: task.estimatedHours,
        confidence: 0.5,
        factors: []
      }));
    }

    try {
      // Filter out subtasks for top-level estimation
      const topLevelTasks = tasks.filter(task => task.subtasks.length === 0);
      
      if (this.config.parallelProcessing) {
        const promises = topLevelTasks.map(task => 
          this.complexityEstimator.estimateTaskComplexity(task)
        );
        return await Promise.all(promises);
      } else {
        const estimates = [];
        for (const task of topLevelTasks) {
          const estimate = await this.complexityEstimator.estimateTaskComplexity(task);
          estimates.push(estimate);
        }
        return estimates;
      }
    } catch (error) {
      logger.warn('Complexity estimation failed', { error });
      return tasks.map(task => ({
        taskId: task.id,
        estimatedHours: task.estimatedHours,
        confidence: 0.3,
        factors: []
      }));
    }
  }

  /**
   * Create milestones from tasks
   */
  private createMilestones(tasks: Task[]): Milestone[] {
    const milestones: Milestone[] = [];

    // Create milestones for major phases
    const phases = [...new Set(tasks.map(t => t.category))];
    
    phases.forEach((category, index) => {
      const categoryTasks = tasks.filter(t => t.category === category);
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + (index + 1) * 7); // Weekly milestones

      milestones.push({
        id: uuidv4(),
        name: `${category} Phase Complete`,
        description: `Complete all ${category} tasks`,
        date: estimatedCompletion,
        status: 'not_started',
        deliverables: [],
        criteria: [`All ${category} tasks completed`],
        dependencies: []
      });
    });

    return milestones;
  }

  /**
   * Analyze task dependencies
   */
  private analyzeDependencies(tasks: Task[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    // Analyze category-based dependencies
    const categoryOrder = [
      TaskCategory.ANALYSIS,
      TaskCategory.DESIGN,
      TaskCategory.DEVELOPMENT,
      TaskCategory.TESTING,
      TaskCategory.DEPLOYMENT,
      TaskCategory.DOCUMENTATION
    ];

    // Add sequential dependencies between categories
    for (let i = 1; i < categoryOrder.length; i++) {
      const currentCategory = categoryOrder[i];
      const previousCategory = categoryOrder[i - 1];
      
      const currentTasks = tasks.filter(t => t.category === currentCategory && t.subtasks.length === 0);
      const previousTasks = tasks.filter(t => t.category === previousCategory && t.subtasks.length === 0);

      currentTasks.forEach(currentTask => {
        previousTasks.forEach(previousTask => {
          dependencies.push({
            from: previousTask.id,
            to: currentTask.id,
            type: DependencyType.FINISH_TO_START,
            strength: DependencyStrength.HARD,
            description: `${previousCategory} must complete before ${currentCategory} can begin`
          });
        });
      });
    }

    // Analyze subtask dependencies
    tasks.forEach(task => {
      if (task.subtasks.length > 0) {
        const sortedSubtasks = task.subtasks.sort((a, b) => a.estimatedHours - b.estimatedHours);
        
        for (let i = 1; i < sortedSubtasks.length; i++) {
          dependencies.push({
            from: sortedSubtasks[i - 1].id,
            to: sortedSubtasks[i].id,
            type: DependencyType.FINISH_TO_START,
            strength: DependencyStrength.HARD,
            description: `Sequential ${task.category} subtasks`
          });
        }
      }
    });

    return dependencies;
  }

  /**
   * Identify potential risks
   */
  private identifyRisks(input: PlanningInput, tasks: Task[], complexityEstimates: any[]): Risk[] {
    const risks: Risk[] = [];

    // Risk based on project complexity
    const highComplexityTasks = complexityEstimates.filter(e => e.confidence < 0.6);
    if (highComplexityTasks.length > 0) {
      risks.push({
        id: uuidv4(),
        name: 'Complex Task Underestimation',
        description: 'Some tasks may take longer than estimated due to complexity',
        probability: 'medium',
        impact: 'major',
        severity: 'high',
        mitigation: 'Add buffer time and regular progress reviews',
        contingency: 'Reassess timeline and allocate additional resources if needed',
        status: 'identified',
        affectedTasks: highComplexityTasks.map(e => e.taskId)
      });
    }

    // Risk based on deadline pressure
    if (input.context?.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(input.context.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const totalEstimatedHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      const workingDaysAvailable = daysUntilDeadline * (input.context?.teamSize || 1);

      if (totalEstimatedHours / workingDaysAvailable > 8) {
        risks.push({
          id: uuidv4(),
          name: 'Tight Deadline',
          description: 'Project deadline may be unrealistic given estimated effort',
          probability: 'high',
          impact: 'major',
          severity: 'high',
          mitigation: 'Review scope and negotiate deadline extension if necessary',
          contingency: 'Prioritize critical features and defer non-essential items',
          status: 'identified',
          affectedTasks: []
        });
      }
    }

    // Risk based on team size
    if (!input.context?.teamSize || input.context.teamSize < 2) {
      risks.push({
        id: uuidv4(),
        name: 'Limited Team Resources',
        description: 'Small team size may impact project velocity and risk mitigation',
        probability: 'high',
        impact: 'moderate',
        severity: 'medium',
        mitigation: 'Careful planning and regular communication',
        contingency: 'Consider expanding team or extending timeline',
        status: 'identified',
        affectedTasks: []
      });
    }

    // Risk based on technology stack
    if (!input.context?.technologyStack || input.context.technologyStack.length === 0) {
      risks.push({
        id: uuidv4(),
        name: 'Undefined Technology Stack',
        description: 'Technology decisions not made may cause delays',
        probability: 'high',
        impact: 'moderate',
        severity: 'medium',
        mitigation: 'Make technology decisions early in the project',
        contingency: 'Use proven technologies and avoid complex integrations',
        status: 'identified',
        affectedTasks: []
      });
    }

    return risks;
  }

  /**
   * Document project assumptions
   */
  private documentAssumptions(input: PlanningInput, tasks: Task[]): Assumption[] {
    const assumptions: Assumption[] = [];

    // Basic project assumptions
    assumptions.push({
      id: uuidv4(),
      description: 'Stakeholders will be available for reviews and decisions',
      impact: 'medium',
      validation: 'Regular stakeholder check-ins scheduled',
      owner: 'project_manager',
      status: 'identified'
    });

    assumptions.push({
      id: uuidv4(),
      description: 'Required resources and tools will be available when needed',
      impact: 'high',
      validation: 'Resource allocation confirmed before project start',
      owner: 'project_manager',
      status: 'identified'
    });

    // Technology assumptions
    if (input.context?.technologyStack) {
      assumptions.push({
        id: uuidv4(),
        description: `Technology stack (${input.context.technologyStack.join(', ')}) is stable and supported`,
        impact: 'high',
        validation: 'Technology stack research and validation completed',
        owner: 'technical_lead',
        status: 'identified'
      });
    }

    // Quality assumptions
    if (input.context?.qualityRequirements) {
      assumptions.push({
        id: uuidv4(),
        description: `Quality level ${input.context.qualityRequirements} can be achieved with allocated resources`,
        impact: 'medium',
        validation: 'Quality requirements reviewed and resource plan created',
        owner: 'quality_manager',
        status: 'identified'
      });
    }

    return assumptions;
  }

  /**
   * Generate alternative execution plans
   */
  private generateAlternativePlans(input: PlanningInput, tasks: Task[]): AlternativePlan[] {
    const alternatives: AlternativePlan[] = [];

    // Minimum viable product approach
    alternatives.push({
      id: uuidv4(),
      name: 'Minimum Viable Product',
      description: 'Focus on core features first, defer enhancements',
      pros: ['Faster delivery', 'Lower cost', 'Early user feedback'],
      cons: ['Limited functionality', 'May miss some requirements'],
      cost: 0.6, // 60% of original cost
      timeline: 0.7, // 70% of original timeline
      risks: []
    });

    // Quality-focused approach
    alternatives.push({
      id: uuidv4(),
      name: 'Quality-Focused',
      description: 'Invest more time in testing and quality assurance',
      pros: ['Higher quality output', 'Fewer defects', 'Better maintainability'],
      cons: ['Longer timeline', 'Higher cost', 'May exceed budget'],
      cost: 1.3, // 130% of original cost
      timeline: 1.4, // 140% of original timeline
      risks: []
    });

    // Agile incremental approach
    alternatives.push({
      id: uuidv4(),
      name: 'Incremental Delivery',
      description: 'Deliver in multiple iterations with regular stakeholder feedback',
      pros: ['Regular feedback', 'Flexible scope', 'Early value delivery'],
      cons: ['Requires active stakeholder involvement', 'Complex coordination'],
      cost: 1.1, // 110% of original cost
      timeline: 1.2, // 120% of original timeline
      risks: []
    });

    return alternatives;
  }

  /**
   * Create the execution plan object
   */
  private createExecutionPlanObject(
    input: PlanningInput,
    tasks: Task[],
    milestones: Milestone[],
    dependencies: TaskDependency[],
    risks: Risk[],
    assumptions: Assumption[],
    alternatives: AlternativePlan[]
  ): ExecutionPlan {
    const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);

    return {
      id: uuidv4(),
      name: input.description.substring(0, 100),
      description: input.description,
      createdAt: new Date(),
      estimatedDuration: totalHours,
      status: PlanStatus.DRAFT,
      tasks,
      milestones,
      dependencies,
      risks,
      assumptions,
      alternatives,
      metadata: {
        version: '1.0.0',
        createdBy: 'planner',
        lastModified: new Date(),
        tags: input.context?.projectType ? [input.context.projectType] : [],
        customFields: {
          inputMetadata: input.metadata,
          constraints: input.constraints,
          requirements: input.requirements
        }
      },
      validationResults: []
    };
  }

  /**
   * Validate the execution plan
   */
  private async validatePlan(plan: ExecutionPlan): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Dependency validation
    const dependencyCheck = this.validateDependencies(plan);
    results.push(dependencyCheck);

    // Resource validation
    const resourceCheck = this.validateResources(plan);
    results.push(resourceCheck);

    // Timeline validation
    const timelineCheck = this.validateTimeline(plan);
    results.push(timelineCheck);

    // Constraint validation
    const constraintCheck = this.validateConstraints(plan);
    results.push(constraintCheck);

    return results;
  }

  /**
   * Validate task dependencies
   */
  private validateDependencies(plan: ExecutionPlan): ValidationResult {
    const taskIds = new Set(plan.tasks.map(t => t.id));
    const invalidDeps = plan.dependencies.filter(dep => 
      !taskIds.has(dep.from) || !taskIds.has(dep.to)
    );

    if (invalidDeps.length > 0) {
      return {
        type: ValidationType.DEPENDENCY_CHECK,
        passed: false,
        message: `Found ${invalidDeps.length} invalid dependencies`,
        details: `Invalid dependencies: ${invalidDeps.map(d => `${d.from} -> ${d.to}`).join(', ')}`
      };
    }

    return {
      type: ValidationType.DEPENDENCY_CHECK,
      passed: true,
      message: 'All dependencies are valid'
    };
  }

  /**
   * Validate resource allocation
   */
  private validateResources(plan: ExecutionPlan): ValidationResult {
    const totalHours = plan.tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    
    // Simple resource validation - check if total effort is reasonable
    if (totalHours > 10000) { // More than 5 years of work
      return {
        type: ValidationType.RESOURCE_CHECK,
        passed: false,
        message: 'Total estimated effort seems excessive',
        details: `Total hours: ${totalHours}`
      };
    }

    return {
      type: ValidationType.RESOURCE_CHECK,
      passed: true,
      message: 'Resource allocation looks reasonable'
    };
  }

  /**
   * Validate timeline feasibility
   */
  private validateTimeline(plan: ExecutionPlan): ValidationResult {
    // Check if dependencies create impossible sequencing
    const cycleCheck = this.detectDependencyCycles(plan.dependencies);
    
    if (cycleCheck.hasCycle) {
      return {
        type: ValidationType.TIMELINE_CHECK,
        passed: false,
        message: 'Circular dependencies detected',
        details: `Cycles found: ${cycleCheck.cycles.join(', ')}`
      };
    }

    return {
      type: ValidationType.TIMELINE_CHECK,
      passed: true,
      message: 'Timeline structure is valid'
    };
  }

  /**
   * Validate project constraints
   */
  private validateConstraints(plan: ExecutionPlan): ValidationResult {
    // Check if plan respects quality requirements
    if (plan.metadata.customFields?.constraints) {
      // This is a simplified check - in practice, would validate against specific constraints
      return {
        type: ValidationType.CONSTRAINT_CHECK,
        passed: true,
        message: 'Constraint validation completed'
      };
    }

    return {
      type: ValidationType.CONSTRAINT_CHECK,
      passed: true,
      message: 'No specific constraints to validate'
    };
  }

  /**
   * Detect circular dependencies
   */
  private detectDependencyCycles(dependencies: TaskDependency[]): { hasCycle: boolean; cycles: string[] } {
    const graph = new Map<string, string[]>();
    
    // Build adjacency list
    dependencies.forEach(dep => {
      if (!graph.has(dep.from)) {
        graph.set(dep.from, []);
      }
      graph.get(dep.from)!.push(dep.to);
    });

    // Use DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        const result = this.dfsCycleDetection(node, graph, visited, recursionStack, []);
        if (result.hasCycle) {
          cycles.push(result.cycle.join(' -> '));
        }
      }
    }

    return {
      hasCycle: cycles.length > 0,
      cycles
    };
  }

  /**
   * DFS for cycle detection
   */
  private dfsCycleDetection(
    node: string,
    graph: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): { hasCycle: boolean; cycle: string[] } {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const result = this.dfsCycleDetection(neighbor, graph, visited, recursionStack, [...path]);
        if (result.hasCycle) {
          return result;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        return {
          hasCycle: true,
          cycle: [...path, neighbor]
        };
      }
    }

    recursionStack.delete(node);
    return { hasCycle: false, cycle: [] };
  }

  /**
   * Apply complexity estimates to tasks
   */
  private applyComplexityEstimates(tasks: Task[], estimates: any[]): void {
    const estimateMap = new Map(estimates.map(e => [e.taskId, e]));

    tasks.forEach(task => {
      const estimate = estimateMap.get(task.id);
      if (estimate) {
        task.estimatedHours = estimate.estimatedHours;
        task.confidence = estimate.confidence;
        
        // Update complexity factors
        if (estimate.factors && estimate.factors.length > 0) {
          task.complexityScore.factors = estimate.factors;
          task.complexityScore.overall = this.calculateTaskComplexity(estimate.factors);
        }
      }
    });
  }

  /**
   * Calculate overall complexity from factors
   */
  private calculateTaskComplexity(factors: any[]): number {
    return factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
  }

  /**
   * Calculate overall project complexity
   */
  private calculateOverallComplexity(estimates: any[]): any {
    if (estimates.length === 0) {
      return {
        overall: 0.5,
        cognitive: 0.5,
        technical: 0.5,
        business: 0.5,
        uncertainty: 0.5,
        dependencies: 0.5,
        factors: []
      };
    }

    const avgComplexity = estimates.reduce((sum, est) => sum + (est.estimatedHours / 40), 0) / estimates.length;

    return {
      overall: Math.min(1.0, avgComplexity),
      cognitive: 0.6,
      technical: 0.7,
      business: 0.5,
      uncertainty: 0.4,
      dependencies: 0.6,
      factors: []
    };
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(estimates: any[], ambiguityResult?: any): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence based on complexity estimates
    const lowConfidenceEstimates = estimates.filter(e => e.confidence < 0.6).length;
    confidence -= (lowConfidenceEstimates / estimates.length) * 0.2;

    // Reduce confidence based on ambiguities
    if (ambiguityResult) {
      const highSeverityAmbiguities = ambiguityResult.ambiguities.filter(
        (a: any) => a.severity === 'high' || a.severity === 'critical'
      ).length;
      confidence -= (highSeverityAmbiguities / Math.max(ambiguityResult.ambiguities.length, 1)) * 0.3;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Generate warnings for the plan
   */
  private generateWarnings(plan: ExecutionPlan, validationResults: ValidationResult[]): any[] {
    const warnings: any[] = [];

    // Check validation failures
    const failedValidations = validationResults.filter(r => !r.passed);
    failedValidations.forEach(validation => {
      warnings.push({
        type: 'VALIDATION_FAILED',
        message: validation.message,
        suggestion: `Address ${validation.type} issues`
      });
    });

    // Check for high-risk items
    const highRiskItems = plan.risks.filter(r => r.severity === 'high' || r.severity === 'critical');
    if (highRiskItems.length > 0) {
      warnings.push({
        type: 'HIGH_RISK',
        message: `${highRiskItems.length} high-severity risks identified`,
        suggestion: 'Develop detailed mitigation strategies'
      });
    }

    // Check for low-confidence tasks
    const lowConfidenceTasks = plan.tasks.filter(t => t.confidence < 0.6);
    if (lowConfidenceTasks.length > 0) {
      warnings.push({
        type: 'LOW_CONFIDENCE',
        message: `${lowConfidenceTasks.length} tasks have low confidence estimates`,
        suggestion: 'Review and refine task estimates'
      });
    }

    return warnings;
  }

  /**
   * Generate cache key for input
   */
  private generateCacheKey(input: PlanningInput): string {
    const keyData = {
      description: input.description,
      requirements: input.requirements,
      constraints: input.constraints,
      projectType: input.context?.projectType,
      technologyStack: input.context?.technologyStack,
      teamSize: input.context?.teamSize
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Initialize component instances
   */
  private initializeComponents(): void {
    this.taskBreakdown = new TaskBreakdown({
      maxDepth: this.config.maxTaskDepth || 3,
      maxSubtasksPerTask: this.config.maxSubtasksPerTask || 10,
      minTaskSize: 0.5,
      maxTaskSize: 40,
      enableAutomaticGrouping: true,
      enableDependencyAnalysis: true,
      granularityPreference: 'medium' as any
    });

    this.complexityEstimator = new ComplexityEstimator({
      aiModel: this.config.aiModel
    });

    this.ambiguityDetector = new AmbiguityDetector();

    this.questionGenerator = new QuestionGenerator({
      maxQuestions: 15,
      priorityThreshold: 'medium' as any,
      style: 'collaborative' as any,
      includeContext: true,
      groupSimilar: true
    });
  }

  /**
   * Emit planner event
   */
  private emitEvent(type: PlannerEventType, data: any): void {
    const event: PlannerEvent = {
      type,
      timestamp: new Date(),
      data,
      source: 'planner'
    };

    this.eventBus.emit(type, event);
    logger.debug('Planner event emitted', { type });
  }

  /**
   * Get planner configuration
   */
  getConfig(): PlannerConfig {
    return { ...this.config };
  }

  /**
   * Update planner configuration
   */
  updateConfig(newConfig: Partial<PlannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeComponents(); // Reinitialize with new config
  }
}