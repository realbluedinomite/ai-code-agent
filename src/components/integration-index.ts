/**
 * Component Integration Index
 * 
 * Main entry point for all component integration utilities
 */

export { ComponentIntegrator } from './integration';
export { 
  IntegrationStatus,
  ComponentHealth,
  ComponentMetrics,
  IntegrationConfig,
  IntegratedWorkflowResult
} from './integration';

export { createDefaultIntegration } from './integration';
export { IntegrationUtils } from './integration';
export { IntegrationError } from './integration';

// Re-export types from orchestrator
export type {
  WorkflowContext,
  WorkflowInput,
  WorkflowResult,
  WorkflowStep,
  WorkflowError,
  WorkflowWarning,
  PlannerResult,
  Plan,
  PlanStep
} from '../orchestrator/types';

// Example workflows
export { ExampleWorkflows } from '../tests/integration/example-workflows';
export { runAllExamples, runExample, runPerformanceBenchmark } from '../tests/integration/example-workflows';

// Complete demonstration
export { CompleteAIAgentDemonstration, runCompleteDemonstration } from '../tests/integration/complete-demonstration';

/**
 * Quick start guide for using the component integration system
 */
export const QUICK_START = `
# Component Integration Quick Start

## Basic Usage

import { createDefaultIntegration } from './components/integration';

// Initialize integrator
const integrator = await createDefaultIntegration();

// Execute workflow
const result = await integrator.executeWorkflow({
  command: 'create e-commerce platform',
  parameters: { features: ['auth', 'cart', 'checkout'] },
  context: {
    workingDirectory: '/workspace',
    environment: {}
  }
});

console.log('Status:', result.status);
console.log('Plan:', result.results.planned?.plan.title);

// Cleanup
await integrator.shutdown();

## Advanced Usage

import { ComponentIntegrator, IntegrationConfig } from './components/integration';

const config: IntegrationConfig = {
  orchestrator: {
    maxRetries: 3,
    timeoutMs: 30000,
    enableRecovery: true
  },
  monitoring: {
    enableHealthChecks: true,
    enableMetrics: true,
    healthCheckInterval: 30000
  },
  logging: {
    level: 'info',
    enableWorkflowTracing: true
  },
  workflow: {
    maxConcurrentWorkflows: 10,
    enableStatePersistence: false
  }
};

const integrator = new ComponentIntegrator(config);
await integrator.initialize();

// Monitor health
const health = await integrator.getComponentHealth();
health.forEach((data, component) => {
  console.log(\`\${component}: \${data.status}\`);
});

// Get metrics
const metrics = integrator.getComponentMetrics();
metrics.forEach((metric, component) => {
  console.log(\`\${component}: \${metric.executionCount} executions\`);
});

## Error Handling

const result = await integrator.executeWorkflow(input);

if (result.status === 'failed') {
  console.error('Workflow failed:', result.errors);
  
  // Check if recoverable
  if (result.errors.some(e => e.recoverable)) {
    console.log('Workflow may be recoverable');
  }
}

## Running Examples

import { runAllExamples } from './tests/integration/example-workflows';

await runAllExamples();

## Complete Demonstration

import { runCompleteDemonstration } from './tests/integration/complete-demonstration';

await runCompleteDemonstration();
`;

console.log(QUICK_START);
