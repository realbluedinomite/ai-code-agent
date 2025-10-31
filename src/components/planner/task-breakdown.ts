/**
 * TaskBreakdown - Breaks down complex tasks into manageable subtasks
 */

import {
  Task,
  TaskCategory,
  TaskStatus,
  Priority,
  Deliverable,
  Risk,
  ComplexityScore,
  Skill,
  Tool,
  Iteration,
  TaskMetadata,
  TaskTimeline,
  QualityGate,
  TaskBreakdownConfig,
  TaskGranularity,
  ComplexityFactor,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logger';

export class TaskBreakdown {
  private config: TaskBreakdownConfig;

  constructor(config: TaskBreakdownConfig) {
    this.config = config;
  }

  /**
   * Break down a complex task into subtasks
   */
  async breakdownTask(
    task: Task,
    context?: {
      projectType?: string;
      complexity?: ComplexityScore;
      dependencies?: string[];
    }
  ): Promise<Task[]> {
    try {
      logger.debug('Starting task breakdown', { taskId: task.id, taskName: task.name });

      const subtasks: Task[] = [];
      
      // Determine breakdown depth based on task complexity and size
      const breakdownDepth = this.calculateBreakdownDepth(task);
      
      // Generate initial subtasks based on task category
      const initialSubtasks = this.generateSubtasksByCategory(task);
      
      // Refine subtasks based on complexity and dependencies
      const refinedSubtasks = await this.refineSubtasks(initialSubtasks, breakdownDepth, context);
      
      // Apply granularity preferences
      const finalSubtasks = this.applyGranularityPreferences(refinedSubtasks);
      
      // Set up task relationships and dependencies
      this.setupTaskRelationships(finalSubtasks, task.id);
      
      logger.info('Task breakdown completed', { 
        taskId: task.id, 
        originalSubtasks: initialSubtasks.length,
        finalSubtasks: finalSubtasks.length 
      });

      return finalSubtasks;

    } catch (error) {
      logger.error('Task breakdown failed', { error, taskId: task.id });
      throw error;
    }
  }

  /**
   * Generate subtasks based on task category
   */
  private generateSubtasksByCategory(parentTask: Task): Task[] {
    const subtasks: Task[] = [];

    switch (parentTask.category) {
      case TaskCategory.DEVELOPMENT:
        subtasks.push(...this.generateDevelopmentSubtasks(parentTask));
        break;
      case TaskCategory.TESTING:
        subtasks.push(...this.generateTestingSubtasks(parentTask));
        break;
      case TaskCategory.DESIGN:
        subtasks.push(...this.generateDesignSubtasks(parentTask));
        break;
      case TaskCategory.DEPLOYMENT:
        subtasks.push(...this.generateDeploymentSubtasks(parentTask));
        break;
      case TaskCategory.DOCUMENTATION:
        subtasks.push(...this.generateDocumentationSubtasks(parentTask));
        break;
      case TaskCategory.ANALYSIS:
        subtasks.push(...this.generateAnalysisSubtasks(parentTask));
        break;
      case TaskCategory.INTEGRATION:
        subtasks.push(...this.generateIntegrationSubtasks(parentTask));
        break;
      case TaskCategory.SECURITY:
        subtasks.push(...this.generateSecuritySubtasks(parentTask));
        break;
      case TaskCategory.PERFORMANCE:
        subtasks.push(...this.generatePerformanceSubtasks(parentTask));
        break;
      default:
        subtasks.push(...this.generateGenericSubtasks(parentTask));
    }

    return subtasks;
  }

  /**
   * Generate development-specific subtasks
   */
  private generateDevelopmentSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    // Setup and environment
    subtasks.push(this.createSubtask('Setup Development Environment', TaskCategory.CONFIGURATION, 2));
    subtasks.push(this.createSubtask('Review Requirements', TaskCategory.ANALYSIS, 1));
    subtasks.push(this.createSubtask('Create Technical Design', TaskCategory.DESIGN, 4));
    
    // Core development phases
    subtasks.push(this.createSubtask('Implement Core Functionality', TaskCategory.DEVELOPMENT, parentTask.estimatedHours * 0.4));
    subtasks.push(this.createSubtask('Implement Error Handling', TaskCategory.DEVELOPMENT, parentTask.estimatedHours * 0.2));
    subtasks.push(this.createSubtask('Code Review', TaskCategory.DEVELOPMENT, 2));
    subtasks.push(this.createSubtask('Unit Testing', TaskCategory.TESTING, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Integration Testing', TaskCategory.TESTING, parentTask.estimatedHours * 0.2));
    subtasks.push(this.createSubtask('Documentation Update', TaskCategory.DOCUMENTATION, 2));
    
    return subtasks;
  }

  /**
   * Generate testing-specific subtasks
   */
  private generateTestingSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Test Planning', TaskCategory.ANALYSIS, 2));
    subtasks.push(this.createSubtask('Test Case Design', TaskCategory.DESIGN, 4));
    subtasks.push(this.createSubtask('Test Implementation', TaskCategory.DEVELOPMENT, parentTask.estimatedHours * 0.6));
    subtasks.push(this.createSubtask('Test Execution', TaskCategory.TESTING, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Bug Tracking and Reporting', TaskCategory.DOCUMENTATION, 2));
    
    return subtasks;
  }

  /**
   * Generate design-specific subtasks
   */
  private generateDesignSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Requirements Analysis', TaskCategory.ANALYSIS, 3));
    subtasks.push(this.createSubtask('User Research', TaskCategory.ANALYSIS, 4));
    subtasks.push(this.createSubtask('Information Architecture', TaskCategory.DESIGN, 3));
    subtasks.push(this.createSubtask('Wireframing', TaskCategory.DESIGN, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Visual Design', TaskCategory.DESIGN, parentTask.estimatedHours * 0.4));
    subtasks.push(this.createSubtask('Design Review', TaskCategory.ANALYSIS, 2));
    subtasks.push(this.createSubtask('Handoff to Development', TaskCategory.DOCUMENTATION, 1));
    
    return subtasks;
  }

  /**
   * Generate deployment-specific subtasks
   */
  private generateDeploymentSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Environment Preparation', TaskCategory.CONFIGURATION, 3));
    subtasks.push(this.createSubtask('Build and Package', TaskCategory.DEVELOPMENT, 2));
    subtasks.push(this.createSubtask('Deployment Script Preparation', TaskCategory.DEVELOPMENT, 3));
    subtasks.push(this.createSubtask('Staging Deployment', TaskCategory.DEPLOYMENT, 2));
    subtasks.push(this.createSubtask('Smoke Testing', TaskCategory.TESTING, 1));
    subtasks.push(this.createSubtask('Production Deployment', TaskCategory.DEPLOYMENT, 2));
    subtasks.push(this.createSubtask('Post-Deployment Verification', TaskCategory.TESTING, 2));
    subtasks.push(this.createSubtask('Rollback Plan Preparation', TaskCategory.CONFIGURATION, 1));
    
    return subtasks;
  }

  /**
   * Generate documentation-specific subtasks
   */
  private generateDocumentationSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Documentation Planning', TaskCategory.ANALYSIS, 1));
    subtasks.push(this.createSubtask('Content Research', TaskCategory.RESEARCH, 3));
    subtasks.push(this.createSubtask('Draft Creation', TaskCategory.DOCUMENTATION, parentTask.estimatedHours * 0.5));
    subtasks.push(this.createSubtask('Review and Editing', TaskCategory.DOCUMENTATION, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Visual Assets Creation', TaskCategory.DESIGN, 2));
    subtasks.push(this.createSubtask('Format and Publish', TaskCategory.DOCUMENTATION, 2));
    
    return subtasks;
  }

  /**
   * Generate analysis-specific subtasks
   */
  private generateAnalysisSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Data Collection', TaskCategory.RESEARCH, 3));
    subtasks.push(this.createSubtask('Data Processing', TaskCategory.DEVELOPMENT, 4));
    subtasks.push(this.createSubtask('Analysis Execution', TaskCategory.ANALYSIS, parentTask.estimatedHours * 0.6));
    subtasks.push(this.createSubtask('Results Interpretation', TaskCategory.ANALYSIS, 2));
    subtasks.push(this.createSubtask('Report Generation', TaskCategory.DOCUMENTATION, 3));
    
    return subtasks;
  }

  /**
   * Generate integration-specific subtasks
   */
  private generateIntegrationSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Integration Planning', TaskCategory.ANALYSIS, 2));
    subtasks.push(this.createSubtask('API Documentation Review', TaskCategory.ANALYSIS, 2));
    subtasks.push(this.createSubtask('Integration Development', TaskCategory.DEVELOPMENT, parentTask.estimatedHours * 0.6));
    subtasks.push(this.createSubtask('Integration Testing', TaskCategory.TESTING, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Performance Testing', TaskCategory.PERFORMANCE, 2));
    
    return subtasks;
  }

  /**
   * Generate security-specific subtasks
   */
  private generateSecuritySubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Security Assessment', TaskCategory.ANALYSIS, 3));
    subtasks.push(this.createSubtask('Threat Modeling', TaskCategory.ANALYSIS, 4));
    subtasks.push(this.createSubtask('Security Implementation', TaskCategory.SECURITY, parentTask.estimatedHours * 0.5));
    subtasks.push(this.createSubtask('Security Testing', TaskCategory.TESTING, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Security Documentation', TaskCategory.DOCUMENTATION, 2));
    
    return subtasks;
  }

  /**
   * Generate performance-specific subtasks
   */
  private generatePerformanceSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Performance Baseline', TaskCategory.ANALYSIS, 2));
    subtasks.push(this.createSubtask('Performance Profiling', TaskCategory.ANALYSIS, 3));
    subtasks.push(this.createSubtask('Optimization Implementation', TaskCategory.PERFORMANCE, parentTask.estimatedHours * 0.5));
    subtasks.push(this.createSubtask('Performance Testing', TaskCategory.TESTING, parentTask.estimatedHours * 0.3));
    subtasks.push(this.createSubtask('Performance Monitoring Setup', TaskCategory.CONFIGURATION, 2));
    
    return subtasks;
  }

  /**
   * Generate generic subtasks for other categories
   */
  private generateGenericSubtasks(parentTask: Task): Task[] {
    const subtasks: Task[] = [];
    
    subtasks.push(this.createSubtask('Planning and Analysis', TaskCategory.ANALYSIS, Math.min(parentTask.estimatedHours * 0.3, 8)));
    subtasks.push(this.createSubtask('Implementation', TaskCategory.DEVELOPMENT, parentTask.estimatedHours * 0.5));
    subtasks.push(this.createSubtask('Testing and Validation', TaskCategory.TESTING, Math.min(parentTask.estimatedHours * 0.2, 6)));
    subtasks.push(this.createSubtask('Documentation', TaskCategory.DOCUMENTATION, Math.min(parentTask.estimatedHours * 0.1, 4)));
    
    return subtasks;
  }

  /**
   * Create a subtask with default values
   */
  private createSubtask(name: string, category: TaskCategory, estimatedHours: number): Task {
    const taskId = uuidv4();
    
    return {
      id: taskId,
      name,
      description: `${name} for parent task`,
      category,
      priority: Priority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      estimatedHours,
      dependencies: [],
      deliverables: [],
      acceptanceCriteria: [`Complete ${name}`],
      testCriteria: [`Verify ${name} completion`],
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
      skills: [],
      tools: [],
      subtasks: [],
      metadata: {
        createdBy: 'task_breaker',
        createdAt: new Date(),
        lastModified: new Date(),
        version: 1,
        tags: [],
        labels: [],
        customFields: {}
      },
      qualityGates: []
    };
  }

  /**
   * Calculate appropriate breakdown depth based on task characteristics
   */
  private calculateBreakdownDepth(task: Task): number {
    let depth = 1;

    // Base depth on task size
    if (task.estimatedHours > 40) depth += 2;
    else if (task.estimatedHours > 16) depth += 1;
    
    // Adjust based on complexity
    if (task.complexityScore.overall > 0.8) depth += 1;
    
    // Adjust based on dependencies
    if (task.dependencies.length > 5) depth += 1;
    
    // Cap at maximum configured depth
    return Math.min(depth, this.config.maxDepth);
  }

  /**
   * Refine subtasks based on complexity and context
   */
  private async refineSubtasks(
    subtasks: Task[],
    depth: number,
    context?: {
      projectType?: string;
      complexity?: ComplexityScore;
      dependencies?: string[];
    }
  ): Promise<Task[]> {
    // Group related subtasks
    const groupedSubtasks = this.groupRelatedSubtasks(subtasks);
    
    // Further breakdown large subtasks
    if (depth > 1) {
      const finalSubtasks: Task[] = [];
      
      for (const subtask of groupedSubtasks) {
        if (subtask.estimatedHours > 16 && depth > 1) {
          // Further breakdown large subtasks
          const nestedSubtasks = await this.breakdownTask(subtask, context);
          finalSubtasks.push(...nestedSubtasks);
        } else {
          finalSubtasks.push(subtask);
        }
      }
      
      return finalSubtasks;
    }
    
    return groupedSubtasks;
  }

  /**
   * Group related subtasks together
   */
  private groupRelatedSubtasks(subtasks: Task[]): Task[] {
    const grouped: Map<string, Task[]> = new Map();
    
    // Group by category
    subtasks.forEach(subtask => {
      const key = subtask.category;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(subtask);
    });
    
    // Combine related tasks within groups
    const result: Task[] = [];
    for (const [category, tasks] of grouped) {
      if (tasks.length > 1) {
        // Merge related tasks
        const merged = this.mergeRelatedTasks(tasks);
        result.push(merged);
      } else {
        result.push(...tasks);
      }
    }
    
    return result;
  }

  /**
   * Merge related tasks into a single comprehensive task
   */
  private mergeRelatedTasks(tasks: Task[]): Task {
    const mainTask = tasks[0];
    
    // Merge descriptions
    const mergedDescription = tasks
      .map(t => t.description)
      .join('; ');
    
    // Sum estimated hours
    const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    
    // Merge deliverables
    const mergedDeliverables = tasks
      .flatMap(t => t.deliverables);
    
    // Create new merged task
    const mergedTask: Task = {
      ...mainTask,
      description: mergedDescription,
      estimatedHours: totalHours,
      deliverables: mergedDeliverables,
      acceptanceCriteria: tasks.flatMap(t => t.acceptanceCriteria),
      testCriteria: tasks.flatMap(t => t.testCriteria),
      complexityScore: {
        ...mainTask.complexityScore,
        factors: tasks.flatMap(t => t.complexityScore.factors)
      }
    };
    
    return mergedTask;
  }

  /**
   * Apply granularity preferences to adjust task sizing
   */
  private applyGranularityPreferences(subtasks: Task[]): Task[] {
    switch (this.config.granularityPreference) {
      case TaskGranularity.VERY_COARSE:
        return this.groupIntoLargerTasks(subtasks);
      case TaskGranularity.COARSE:
        return this.groupIntoMediumTasks(subtasks);
      case TaskGranularity.MEDIUM:
        return subtasks; // Keep as-is
      case TaskGranularity.FINE:
        return this.splitIntoSmallerTasks(subtasks);
      case TaskGranularity.VERY_FINE:
        return this.splitIntoVerySmallTasks(subtasks);
      default:
        return subtasks;
    }
  }

  /**
   * Group subtasks into larger tasks
   */
  private groupIntoLargerTasks(subtasks: Task[]): Task[] {
    const groups: Map<string, Task[]> = new Map();
    
    // Group by category for aggregation
    subtasks.forEach(subtask => {
      const key = `${subtask.category}_${Math.floor(subtask.estimatedHours / 8)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(subtask);
    });
    
    return Array.from(groups.values()).map(tasks => {
      if (tasks.length === 1) return tasks[0];
      
      return this.mergeRelatedTasks(tasks);
    });
  }

  /**
   * Split tasks into smaller components
   */
  private splitIntoSmallerTasks(subtasks: Task[]): Task[] {
    const result: Task[] = [];
    
    for (const subtask of subtasks) {
      if (subtask.estimatedHours > 4) {
        // Split into 1-2 hour tasks
        const numSplits = Math.ceil(subtask.estimatedHours / 2);
        for (let i = 0; i < numSplits; i++) {
          const splitTask: Task = {
            ...subtask,
            id: uuidv4(),
            name: `${subtask.name} (Part ${i + 1})`,
            estimatedHours: Math.min(2, subtask.estimatedHours / numSplits),
            subtasks: []
          };
          result.push(splitTask);
        }
      } else {
        result.push(subtask);
      }
    }
    
    return result;
  }

  /**
   * Split tasks into very small components
   */
  private splitIntoVerySmallTasks(subtasks: Task[]): Task[] {
    const result: Task[] = [];
    
    for (const subtask of subtasks) {
      if (subtask.estimatedHours > 1) {
        // Split into sub-hour tasks
        const numSplits = Math.ceil(subtask.estimatedHours);
        for (let i = 0; i < numSplits; i++) {
          const splitTask: Task = {
            ...subtask,
            id: uuidv4(),
            name: `${subtask.name} (Step ${i + 1})`,
            estimatedHours: Math.min(1, subtask.estimatedHours / numSplits),
            subtasks: []
          };
          result.push(splitTask);
        }
      } else {
        result.push(subtask);
      }
    }
    
    return result;
  }

  /**
   * Group subtasks into medium-sized tasks
   */
  private groupIntoMediumTasks(subtasks: Task[]): Task[] {
    // Similar to very_coarse but with smaller groupings
    const groups: Map<string, Task[]> = new Map();
    
    subtasks.forEach(subtask => {
      const key = `${subtask.category}_${Math.floor(subtask.estimatedHours / 4)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(subtask);
    });
    
    return Array.from(groups.values()).map(tasks => {
      if (tasks.length === 1) return tasks[0];
      
      return this.mergeRelatedTasks(tasks);
    });
  }

  /**
   * Setup task relationships and dependencies
   */
  private setupTaskRelationships(subtasks: Task[], parentTaskId: string): void {
    // Set up sequential dependencies for tasks of same category
    const categories = [...new Set(subtasks.map(t => t.category))];
    
    for (const category of categories) {
      const categoryTasks = subtasks.filter(t => t.category === category);
      
      for (let i = 1; i < categoryTasks.length; i++) {
        const currentTask = categoryTasks[i];
        const previousTask = categoryTasks[i - 1];
        
        if (!currentTask.dependencies.includes(previousTask.id)) {
          currentTask.dependencies.push(previousTask.id);
        }
      }
    }
    
    // Add parent task dependency to all subtasks
    subtasks.forEach(subtask => {
      if (!subtask.prerequisites.includes(parentTaskId)) {
        subtask.prerequisites.push(parentTaskId);
      }
    });
  }

  /**
   * Validate task breakdown
   */
  validateBreakdown(subtasks: Task[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check minimum task size
    const tooSmallTasks = subtasks.filter(t => t.estimatedHours < this.config.minTaskSize);
    if (tooSmallTasks.length > 0) {
      issues.push(`${tooSmallTasks.length} tasks are below minimum size of ${this.config.minTaskSize} hours`);
    }
    
    // Check maximum task size
    const tooLargeTasks = subtasks.filter(t => t.estimatedHours > this.config.maxTaskSize);
    if (tooLargeTasks.length > 0) {
      issues.push(`${tooLargeTasks.length} tasks exceed maximum size of ${this.config.maxTaskSize} hours`);
    }
    
    // Check for circular dependencies
    const dependencyGraph = this.buildDependencyGraph(subtasks);
    const cycles = this.findCircularDependencies(dependencyGraph);
    if (cycles.length > 0) {
      issues.push(`Circular dependencies detected: ${cycles.map(c => c.join(' -> ')).join(', ')}`);
    }
    
    // Check dependency validity
    subtasks.forEach(task => {
      const invalidDeps = task.dependencies.filter(depId => 
        !subtasks.find(t => t.id === depId)
      );
      if (invalidDeps.length > 0) {
        issues.push(`Task ${task.name} has invalid dependencies: ${invalidDeps.join(', ')}`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Build dependency graph for circular dependency detection
   */
  private buildDependencyGraph(tasks: Task[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    tasks.forEach(task => {
      graph.set(task.id, [...task.dependencies]);
    });
    
    return graph;
  }

  /**
   * Find circular dependencies using DFS
   */
  private findCircularDependencies(graph: Map<string, string[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        this.dfs(node, graph, visited, recursionStack, [], cycles);
      }
    }
    
    return cycles;
  }

  /**
   * Depth-first search for cycle detection
   */
  private dfs(
    node: string,
    graph: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: string[][]
  ): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const neighbors = graph.get(node) || [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfs(neighbor, graph, visited, recursionStack, path, cycles);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        cycles.push([...cycle]);
      }
    }
    
    recursionStack.delete(node);
    path.pop();
  }
}