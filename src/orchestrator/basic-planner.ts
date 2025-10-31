/**
 * Basic Planner Component
 * 
 * Creates execution plans based on parsed input and project analysis.
 * Simple implementation that can be enhanced in future phases.
 */

import { Logger } from '../core/logger';
import { OrchestratorComponent, WorkflowContext } from '../orchestrator/types';
import { AnalysisResult } from '../components/project-analyzer/types';

export interface BasicPlanningInput {
  parsedInput: any; // ParsedRequestData from InputParser
  analysis?: AnalysisResult;
}

export interface BasicPlannerResult {
  plan: BasicPlan;
  metadata: {
    planningTimeMs: number;
    complexity: 'simple' | 'moderate' | 'complex';
    confidence: number;
  };
}

export interface BasicPlan {
  planId: string;
  title: string;
  description: string;
  steps: BasicPlanStep[];
  estimatedEffort?: {
    duration: string;
    complexity: 'low' | 'medium' | 'high';
  };
  metadata: Record<string, any>;
}

export interface BasicPlanStep {
  stepId: string;
  title: string;
  description: string;
  type: 'analysis' | 'development' | 'review' | 'planning' | 'documentation';
  estimatedDuration?: string;
  prerequisites: string[];
  successCriteria: string[];
}

/**
 * Basic Planner component implementation
 */
export class BasicPlanner implements OrchestratorComponent {
  private readonly logger = new Logger('BasicPlanner');
  private isInitialized = false;
  private config: any = {};

  async initialize(config: any): Promise<void> {
    this.config = config;
    this.isInitialized = true;
    this.logger.info('BasicPlanner initialized');
  }

  async execute(input: BasicPlanningInput, context: WorkflowContext): Promise<BasicPlannerResult> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      this.logger.debug('Creating basic plan');

      const plan = await this.createBasicPlan(input.parsedInput, input.analysis);
      const planningTime = Date.now() - startTime;

      const metadata = {
        planningTimeMs: planningTime,
        complexity: this.assessComplexity(plan),
        confidence: 0.8 // Basic confidence for simple planner
      };

      this.logger.info(`Basic plan created in ${planningTime}ms`);

      return {
        plan,
        metadata
      };

    } catch (error) {
      this.logger.error('Failed to create basic plan', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.logger.info('BasicPlanner cleaned up');
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    lastCheck: Date;
    metrics?: Record<string, any>;
  }> {
    const healthy = this.isInitialized;
    return {
      healthy,
      status: healthy ? 'healthy' : 'unhealthy',
      lastCheck: new Date(),
      metrics: {
        initialized: this.isInitialized
      }
    };
  }

  get name(): string {
    return 'BasicPlanner';
  }

  get version(): string {
    return '1.0.0';
  }

  /**
   * Create a basic execution plan
   */
  private async createBasicPlan(parsedInput: any, analysis?: AnalysisResult): Promise<BasicPlan> {
    const planId = this.generatePlanId();
    const intent = parsedInput?.intent || 'UNKNOWN';
    
    let title = 'Basic Execution Plan';
    let description = 'Generated plan based on user input and project analysis';
    const steps: BasicPlanStep[] = [];

    // Create steps based on intent type
    switch (intent) {
      case 'ANALYZE_CODE':
        title = 'Code Analysis Plan';
        description = 'Comprehensive analysis of codebase structure and quality';
        steps.push(
          {
            stepId: 'analyze-structure',
            title: 'Analyze Project Structure',
            description: 'Examine project organization and file structure',
            type: 'analysis',
            estimatedDuration: '5-10 minutes',
            prerequisites: [],
            successCriteria: ['Project structure analyzed', 'Key areas identified']
          },
          {
            stepId: 'analyze-quality',
            title: 'Analyze Code Quality',
            description: 'Review code quality metrics and patterns',
            type: 'analysis',
            estimatedDuration: '10-15 minutes',
            prerequisites: ['analyze-structure'],
            successCriteria: ['Quality metrics collected', 'Areas for improvement identified']
          },
          {
            stepId: 'generate-report',
            title: 'Generate Analysis Report',
            description: 'Create comprehensive analysis report',
            type: 'documentation',
            estimatedDuration: '5-10 minutes',
            prerequisites: ['analyze-quality'],
            successCriteria: ['Report generated', 'Recommendations provided']
          }
        );
        break;

      case 'ADD_FEATURE':
        title = 'Feature Development Plan';
        description = 'Step-by-step plan for adding new functionality';
        steps.push(
          {
            stepId: 'define-requirements',
            title: 'Define Feature Requirements',
            description: 'Clearly define what the feature should accomplish',
            type: 'planning',
            estimatedDuration: '10-15 minutes',
            prerequisites: [],
            successCriteria: ['Requirements documented', 'Scope defined']
          },
          {
            stepId: 'design-implementation',
            title: 'Design Implementation',
            description: 'Design the technical approach for the feature',
            type: 'development',
            estimatedDuration: '15-20 minutes',
            prerequisites: ['define-requirements'],
            successCriteria: ['Implementation design completed', 'Technical approach defined']
          },
          {
            stepId: 'implement-feature',
            title: 'Implement Feature',
            description: 'Write the code for the new feature',
            type: 'development',
            estimatedDuration: '30-60 minutes',
            prerequisites: ['design-implementation'],
            successCriteria: ['Feature implemented', 'Code tested']
          }
        );
        break;

      case 'FIX_BUG':
        title = 'Bug Fix Plan';
        description = 'Systematic approach to identifying and fixing the issue';
        steps.push(
          {
            stepId: 'reproduce-issue',
            title: 'Reproduce the Issue',
            description: 'Confirm the bug exists and understand the conditions',
            type: 'analysis',
            estimatedDuration: '10-15 minutes',
            prerequisites: [],
            successCriteria: ['Bug reproduced', 'Conditions documented']
          },
          {
            stepId: 'identify-root-cause',
            title: 'Identify Root Cause',
            description: 'Find the underlying cause of the bug',
            type: 'analysis',
            estimatedDuration: '15-30 minutes',
            prerequisites: ['reproduce-issue'],
            successCriteria: ['Root cause identified', 'Fix strategy determined']
          },
          {
            stepId: 'implement-fix',
            title: 'Implement Fix',
            description: 'Apply the solution to fix the bug',
            type: 'development',
            estimatedDuration: '20-40 minutes',
            prerequisites: ['identify-root-cause'],
            successCriteria: ['Fix implemented', 'Bug resolved']
          }
        );
        break;

      default:
        title = 'General Task Plan';
        description = 'Generic plan for handling the requested task';
        steps.push(
          {
            stepId: 'understand-task',
            title: 'Understand Task Requirements',
            description: 'Clarify what needs to be accomplished',
            type: 'analysis',
            estimatedDuration: '5-10 minutes',
            prerequisites: [],
            successCriteria: ['Task requirements understood', 'Approach defined']
          },
          {
            stepId: 'execute-task',
            title: 'Execute Task',
            description: 'Perform the necessary work to complete the task',
            type: 'development',
            estimatedDuration: '30-60 minutes',
            prerequisites: ['understand-task'],
            successCriteria: ['Task completed', 'Requirements met']
          }
        );
    }

    // Add analysis-based enhancements if available
    if (analysis) {
      this.enhancePlanWithAnalysis(steps, analysis);
    }

    return {
      planId,
      title,
      description,
      steps,
      estimatedEffort: {
        duration: this.estimateTotalDuration(steps),
        complexity: steps.length > 4 ? 'high' : steps.length > 2 ? 'medium' : 'low'
      },
      metadata: {
        createdAt: new Date(),
        baseIntent: intent,
        hasAnalysis: !!analysis,
        stepCount: steps.length
      }
    };
  }

  /**
   * Enhance plan with analysis insights
   */
  private enhancePlanWithAnalysis(steps: BasicPlanStep[], analysis: AnalysisResult): void {
    // Add complexity assessment step for large projects
    if (analysis.fileCount > 50) {
      steps.unshift({
        stepId: 'project-assessment',
        title: 'Project Assessment',
        description: 'Initial assessment of large project structure',
        type: 'analysis',
        estimatedDuration: '5-10 minutes',
        prerequisites: [],
        successCriteria: ['Project scope understood', 'Approach tailored']
      });
    }

    // Add dependency analysis step if relevant
    if (analysis.dependencyCount > 10) {
      const dependencyStepIndex = steps.findIndex(s => s.stepId === 'analyze-structure');
      if (dependencyStepIndex >= 0) {
        steps.splice(dependencyStepIndex + 1, 0, {
          stepId: 'analyze-dependencies',
          title: 'Analyze Dependencies',
          description: 'Review project dependencies and their relationships',
          type: 'analysis',
          estimatedDuration: '8-12 minutes',
          prerequisites: ['analyze-structure'],
          successCriteria: ['Dependencies analyzed', 'Impact assessed']
        });
      }
    }
  }

  /**
   * Assess plan complexity
   */
  private assessComplexity(plan: BasicPlan): 'simple' | 'moderate' | 'complex' {
    const stepCount = plan.steps.length;
    
    if (stepCount <= 2) {
      return 'simple';
    } else if (stepCount <= 4) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * Estimate total duration
   */
  private estimateTotalDuration(steps: BasicPlanStep[]): string {
    const totalMinutes = steps.reduce((total, step) => {
      const duration = step.estimatedDuration || '15 minutes';
      const minutes = parseInt(duration.match(/\d+/)?.[0] || '15');
      return total + minutes;
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    }
  }

  /**
   * Generate unique plan ID
   */
  private generatePlanId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `basic_plan_${timestamp}_${randomStr}`;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('BasicPlanner is not initialized');
    }
  }
}