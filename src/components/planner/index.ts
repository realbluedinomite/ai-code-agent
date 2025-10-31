/**
 * Planner Component - Main entry point and exports
 * 
 * This module provides a comprehensive planning system that can:
 * - Break down complex tasks into manageable subtasks
 * - Estimate complexity using AI and heuristics
 * - Detect ambiguities in requirements
 * - Generate clarification questions
 * - Create comprehensive execution plans with dependencies
 */

export { Planner } from './planner';
export { TaskBreakdown } from './task-breakdown';
export { ComplexityEstimator } from './complexity-estimator';
export { AmbiguityDetector } from './ambiguity-detector';
export { QuestionGenerator } from './question-generator';

// Re-export all types
export * from './types';

// Default export - main Planner class
export { Planner as default } from './planner';

/**
 * Convenience function to create a planner with default configuration
 */
export function createPlanner(config?: import('./types').PlannerConfig): import('./planner').Planner {
  return new (require('./planner').Planner)(config);
}

/**
 * Quick planning function for simple use cases
 */
export async function quickPlan(
  description: string,
  projectType?: string,
  config?: import('./types').PlannerConfig
): Promise<import('./types').PlanningResult> {
  const planner = createPlanner(config);
  
  const input: import('./types').PlanningInput = {
    description,
    context: {
      projectType: projectType as any,
      riskTolerance: 'medium',
      qualityRequirements: 'standard'
    }
  };

  return planner.createExecutionPlan(input);
}

/**
 * Advanced planning function with full context
 */
export async function plan(
  input: import('./types').PlanningInput,
  config?: import('./types').PlannerConfig
): Promise<import('./types').PlanningResult> {
  const planner = createPlanner(config);
  return planner.createExecutionPlan(input);
}