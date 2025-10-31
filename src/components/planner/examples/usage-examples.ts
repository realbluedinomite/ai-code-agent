/**
 * Example usage of the Planner component
 */

import {
  Planner,
  quickPlan,
  plan,
  PlanningInput,
  ProjectType,
  RiskTolerance,
  QualityLevel,
  PlanningMethodology,
  TaskSize,
  PriorityStrategy,
  CommunicationStyle,
  createIntegratedPlan
} from '../index';

// Example 1: Quick planning for a simple task
async function quickPlanningExample() {
  console.log('=== Quick Planning Example ===\n');

  try {
    const result = await quickPlan(
      "Build a simple React component for user login",
      "web_application"
    );

    if (result.success && result.plan) {
      console.log(`✓ Plan created successfully!`);
      console.log(`  Tasks: ${result.plan.tasks.length}`);
      console.log(`  Estimated Duration: ${result.plan.estimatedDuration} hours`);
      console.log(`  Status: ${result.plan.status}`);
      console.log(`  Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);

      // Show some tasks
      console.log('\n  Sample Tasks:');
      result.plan.tasks.slice(0, 3).forEach(task => {
        console.log(`    - ${task.name} (${task.estimatedHours}h)`);
      });
    }
  } catch (error) {
    console.error('Quick planning failed:', error);
  }

  console.log('\n');
}

// Example 2: Detailed planning with full context
async function detailedPlanningExample() {
  console.log('=== Detailed Planning Example ===\n');

  const input: PlanningInput = {
    description: "Build a comprehensive e-commerce platform with user management, product catalog, shopping cart, and payment processing",
    requirements: [
      "User authentication and authorization (register, login, logout, password reset)",
      "Product catalog with search, filtering, and pagination",
      "Shopping cart with add/remove/update quantities",
      "Checkout process with shipping and billing information",
      "Payment integration with Stripe",
      "Order management (view orders, track shipments)",
      "Admin panel for product and order management",
      "Email notifications for order confirmations",
      "Mobile responsive design",
      "SEO optimization"
    ],
    constraints: [
      "Must be PCI compliant for payment processing",
      "Support minimum 1000 concurrent users",
      "Page load time under 3 seconds",
      "Mobile-first responsive design",
      "Support for multiple payment methods",
      "GDPR compliance for user data",
      "Must work on modern browsers (Chrome, Firefox, Safari, Edge)"
    ],
    context: {
      projectType: ProjectType.WEB_APPLICATION,
      technologyStack: ["React", "TypeScript", "Node.js", "Express", "PostgreSQL", "Redis", "Stripe API"],
      teamSize: 6,
      deadline: new Date("2024-08-31"),
      budget: 50000,
      riskTolerance: RiskTolerance.MEDIUM,
      qualityRequirements: QualityLevel.HIGH
    },
    preferences: {
      methodology: PlanningMethodology.AGILE,
      taskSize: TaskSize.MEDIUM,
      priorityStrategy: PriorityStrategy.RISK_FIRST,
      resourceAllocation: "moderate" as any,
      communicationStyle: CommunicationStyle.COLLABORATIVE
    },
    metadata: {
      clientName: "TechCorp Inc.",
      projectPriority: "high",
      industry: "e-commerce"
    }
  };

  const planner = new Planner({
    enableAIAnalysis: true,
    enableHeuristicAnalysis: true,
    enableAmbiguityDetection: true,
    enableQuestionGeneration: true,
    maxTaskDepth: 3,
    complexityThreshold: 0.7,
    parallelProcessing: true
  });

  try {
    const result = await planner.createExecutionPlan(input);

    if (result.success && result.plan) {
      console.log(`✓ Detailed plan created successfully!`);
      console.log(`  Total Tasks: ${result.plan.tasks.length}`);
      console.log(`  Milestones: ${result.plan.milestones.length}`);
      console.log(`  Dependencies: ${result.plan.dependencies.length}`);
      console.log(`  Identified Risks: ${result.plan.risks.length}`);
      console.log(`  Assumptions: ${result.plan.assumptions.length}`);
      console.log(`  Alternative Plans: ${result.plan.alternatives.length}`);
      console.log(`  Estimated Duration: ${result.plan.estimatedDuration} hours`);
      console.log(`  Processing Time: ${result.metadata.processingTime}ms`);
      console.log(`  Overall Complexity: ${(result.metadata.complexity.overall * 100).toFixed(1)}%`);
      console.log(`  Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);

      // Show complexity breakdown
      console.log('\n  Complexity Breakdown:');
      console.log(`    Cognitive: ${(result.metadata.complexity.cognitive * 100).toFixed(1)}%`);
      console.log(`    Technical: ${(result.metadata.complexity.technical * 100).toFixed(1)}%`);
      console.log(`    Business: ${(result.metadata.complexity.business * 100).toFixed(1)}%`);
      console.log(`    Dependencies: ${(result.metadata.complexity.dependencies * 100).toFixed(1)}%`);

      // Show high-priority risks
      const highRisks = result.plan.risks.filter(r => r.severity === 'high' || r.severity === 'critical');
      if (highRisks.length > 0) {
        console.log('\n  High Priority Risks:');
        highRisks.forEach(risk => {
          console.log(`    ⚠️  ${risk.name} (${risk.severity})`);
          console.log(`       ${risk.description}`);
        });
      }

      // Show alternatives
      console.log('\n  Alternative Approaches:');
      result.plan.alternatives.forEach(alt => {
        console.log(`    ${alt.name}:`);
        console.log(`      Timeline: ${(alt.timeline * 100).toFixed(0)}% of original`);
        console.log(`      Cost: ${(alt.cost * 100).toFixed(0)}% of original`);
      });
    } else {
      console.error('✗ Plan creation failed:');
      result.errors.forEach(error => {
        console.error(`  ${error.code}: ${error.message}`);
      });
    }

    // Show ambiguities and questions
    if (result.ambiguityResult) {
      console.log(`\n  Ambiguity Analysis:`);
      console.log(`    Ambiguities Found: ${result.ambiguityResult.ambiguities.length}`);
      console.log(`    Clarity Score: ${(result.ambiguityResult.clarityScore * 100).toFixed(1)}%`);
      console.log(`    Clarification Questions: ${result.ambiguityResult.questions.length}`);

      if (result.ambiguityResult.questions.length > 0) {
        console.log('\n  Sample Clarification Questions:');
        result.ambiguityResult.questions.slice(0, 3).forEach((question, index) => {
          console.log(`    ${index + 1}. [${question.priority}] ${question.question}`);
        });
      }
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.log('\n  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`    ⚠️  ${warning.type}: ${warning.message}`);
        if (warning.suggestion) {
          console.log(`       → ${warning.suggestion}`);
        }
      });
    }
  } catch (error) {
    console.error('Detailed planning failed:', error);
  }

  console.log('\n');
}

// Example 3: Task breakdown demonstration
async function taskBreakdownExample() {
  console.log('=== Task Breakdown Example ===\n');

  const { TaskBreakdown, Task, TaskCategory, Priority } = require('../index');

  const parentTask: Task = {
    id: 'parent-1',
    name: 'Implement User Authentication System',
    description: 'Complete user authentication system with login, registration, and password reset',
    category: TaskCategory.DEVELOPMENT,
    priority: Priority.HIGH,
    status: 'not_started' as any,
    estimatedHours: 32,
    dependencies: [],
    deliverables: [],
    acceptanceCriteria: [
      'Users can register with email and password',
      'Users can log in securely',
      'Password reset functionality works',
      'Session management is implemented',
      'Security best practices are followed'
    ],
    testCriteria: [
      'All authentication flows tested',
      'Security vulnerabilities addressed',
      'Performance requirements met'
    ],
    risks: [],
    complexityScore: {
      overall: 0.7,
      cognitive: 0.8,
      technical: 0.6,
      business: 0.7,
      uncertainty: 0.5,
      dependencies: 0.4,
      factors: []
    },
    confidence: 0.8,
    prerequisites: [],
    skills: [],
    tools: [],
    subtasks: [],
    metadata: {
      createdBy: 'example',
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1,
      tags: [],
      labels: [],
      customFields: {}
    },
    qualityGates: []
  };

  const breakdown = new TaskBreakdown({
    maxDepth: 2,
    maxSubtasksPerTask: 8,
    minTaskSize: 1,
    maxTaskSize: 16,
    enableAutomaticGrouping: true,
    enableDependencyAnalysis: true,
    granularityPreference: 'medium' as any
  });

  try {
    const subtasks = await breakdown.breakdownTask(parentTask, {
      projectType: 'web_application',
      framework: 'react'
    });

    console.log(`✓ Task breakdown completed!`);
    console.log(`  Original task: ${parentTask.name} (${parentTask.estimatedHours}h)`);
    console.log(`  Generated subtasks: ${subtasks.length}`);

    // Group by category
    const byCategory = subtasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n  Subtasks by Category:');
    Object.entries(byCategory).forEach(([category, tasks]) => {
      const totalHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      console.log(`    ${category}: ${tasks.length} tasks (${totalHours}h total)`);
      tasks.slice(0, 2).forEach(task => {
        console.log(`      - ${task.name} (${task.estimatedHours}h)`);
      });
    });

    // Validate breakdown
    const validation = breakdown.validateBreakdown(subtasks);
    console.log(`\n  Validation: ${validation.valid ? '✓ PASSED' : '✗ FAILED'}`);
    if (!validation.valid) {
      console.log('  Issues:');
      validation.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  } catch (error) {
    console.error('Task breakdown failed:', error);
  }

  console.log('\n');
}

// Example 4: Integration example
async function integrationExample() {
  console.log('=== Integration Example (Mock) ===\n');

  // Mock Input Parser output
  const mockInputParserOutput = {
    parsed: {
      intent: {
        type: 'web_development',
        subType: 'component',
        confidence: 0.9,
        parameters: {
          framework: 'react',
          language: 'typescript'
        }
      },
      description: "Build a responsive user dashboard component with charts and data tables",
      requirements: [
        "Responsive design that works on mobile and desktop",
        "Interactive charts for data visualization",
        "Sortable and filterable data tables",
        "Real-time data updates",
        "Dark/light theme support"
      ],
      constraints: [
        "Must use React with TypeScript",
        "Must be accessible (WCAG 2.1 AA)",
        "Must support IE11+"
      ]
    },
    confidence: 0.9,
    ambiguities: [
      "What chart library should be used?",
      "What data format will be used for updates?"
    ]
  };

  // Mock Project Analyzer output
  const mockProjectAnalyzerOutput = {
    projectPath: "/path/to/react-project",
    totalFiles: 45,
    analyzedFiles: 45,
    errors: [],
    warnings: [
      {
        file: "src/components/Chart.tsx",
        message: "Large component (>300 lines)",
        type: "size_warning",
        line: 1,
        column: 1
      }
    ],
    stats: {
      filesAnalyzed: 45,
      filesWithErrors: 0,
      filesWithWarnings: 1,
      totalSymbols: 120,
      totalDependencies: 28,
      codeLines: 2100,
      commentLines: 180,
      emptyLines: 95
    },
    symbolTable: {
      symbols: new Map(),
      globalSymbols: ['React', 'useState', 'useEffect'],
      modules: new Map()
    },
    dependencyGraph: {
      nodes: new Map(),
      edges: new Map()
    },
    duration: 1500
  };

  try {
    const result = await createIntegratedPlan(
      mockInputParserOutput,
      mockProjectAnalyzerOutput,
      {
        enableAIAnalysis: true,
        enableHeuristicAnalysis: true,
        maxTaskDepth: 2
      }
    );

    if (result.success && result.plan) {
      console.log(`✓ Integrated plan created!`);
      console.log(`  Based on Input Parser confidence: ${(mockInputParserOutput.confidence * 100).toFixed(1)}%`);
      console.log(`  Enhanced with Project Analyzer insights`);
      console.log(`  Tasks generated: ${result.plan.tasks.length}`);
      console.log(`  Enhanced constraints from analysis: ${result.metadata?.customFields?.constraints?.length || 0}`);

      // Show constraints that were added from analysis
      const constraints = result.metadata?.customFields?.constraints || [];
      if (constraints.length > 0) {
        console.log('\n  Added Constraints from Analysis:');
        constraints.forEach((constraint: string) => {
          console.log(`    - ${constraint}`);
        });
      }
    }
  } catch (error) {
    console.error('Integration planning failed:', error);
  }

  console.log('\n');
}

// Example 5: Complexity estimation demonstration
async function complexityEstimationExample() {
  console.log('=== Complexity Estimation Example ===\n');

  const { ComplexityEstimator, Task, TaskCategory } = require('../index');

  const complexTask: Task = {
    id: 'complex-1',
    name: 'Implement Real-time Chat System',
    description: 'Build a real-time chat system with WebSocket connections, message persistence, and user presence',
    category: TaskCategory.DEVELOPMENT,
    priority: 'high' as any,
    status: 'not_started' as any,
    estimatedHours: 48,
    dependencies: ['auth-system', 'database-setup'],
    deliverables: [
      {
        id: 'deliverable-1',
        name: 'WebSocket Server',
        type: 'code',
        format: 'typescript',
        validationCriteria: ['Connection handling', 'Message routing']
      }
    ],
    acceptanceCriteria: [
      'Real-time messaging works smoothly',
      'Message persistence implemented',
      'User presence tracking functional',
      'Scalable architecture'
    ],
    testCriteria: [
      'Load testing with 100+ concurrent users',
      'WebSocket connection resilience',
      'Message delivery verification'
    ],
    risks: [
      {
        id: 'risk-1',
        name: 'WebSocket Scalability',
        description: 'WebSocket connections may not scale as expected',
        probability: 'medium',
        impact: 'major',
        severity: 'high',
        mitigation: 'Use clustering and load balancing',
        contingency: 'Switch to alternative real-time solution',
        status: 'identified'
      }
    ],
    complexityScore: {
      overall: 0.8,
      cognitive: 0.9,
      technical: 0.8,
      business: 0.6,
      uncertainty: 0.7,
      dependencies: 0.7,
      factors: []
    },
    confidence: 0.7,
    prerequisites: [],
    skills: [
      { name: 'WebSocket Programming', level: 'advanced', category: 'programming' as any, required: true },
      { name: 'Real-time Systems', level: 'advanced', category: 'programming' as any, required: true }
    ],
    tools: [
      { name: 'WebSocket Library', category: 'framework' as any, required: true },
      { name: 'Redis', category: 'database' as any, required: true }
    ],
    subtasks: [],
    metadata: {
      createdBy: 'example',
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1,
      tags: ['real-time', 'websocket'],
      labels: [],
      customFields: {}
    },
    qualityGates: []
  };

  const estimator = new ComplexityEstimator({
    aiModel: 'advanced'
  });

  try {
    const estimate = await estimator.estimateTaskComplexity(complexTask);

    console.log(`✓ Complexity estimation completed!`);
    console.log(`  Original Estimate: ${complexTask.estimatedHours}h`);
    console.log(`  AI + Heuristic Estimate: ${estimate.estimatedHours.toFixed(1)}h`);
    console.log(`  Confidence: ${(estimate.confidence * 100).toFixed(1)}%`);

    console.log('\n  Complexity Factors:');
    estimate.factors.forEach(factor => {
      const weightedScore = factor.score * factor.weight;
      console.log(`    ${factor.name}: ${(factor.score * 100).toFixed(0)}% (weight: ${(factor.weight * 100).toFixed(0)}%)`);
      console.log(`      ${factor.reasoning}`);
    });

    console.log('\n  Heuristic Analysis:');
    console.log(`    Algorithm: ${estimate.heuristicAnalysis.algorithm}`);
    console.log(`    Overall Score: ${(estimate.heuristicAnalysis.scoring * 100).toFixed(1)}%`);
    console.log(`    Reasoning: ${estimate.heuristicAnalysis.reasoning}`);

    if (estimate.aiAnalysis) {
      console.log('\n  AI Analysis:');
      console.log(`    Model: ${estimate.aiAnalysis.model}`);
      console.log(`    Confidence: ${(estimate.aiAnalysis.confidence * 100).toFixed(1)}%`);
      console.log(`    Reasoning: ${estimate.aiAnalysis.reasoning}`);
      console.log(`    Similar Tasks Found: ${estimate.aiAnalysis.similarTasks.length}`);
    }
  } catch (error) {
    console.error('Complexity estimation failed:', error);
  }

  console.log('\n');
}

// Run all examples
async function runExamples() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              Planner Component Usage Examples                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  await quickPlanningExample();
  await taskBreakdownExample();
  await detailedPlanningExample();
  await complexityEstimationExample();
  await integrationExample();

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    All Examples Complete!                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

// Export examples for testing
export {
  quickPlanningExample,
  detailedPlanningExample,
  taskBreakdownExample,
  complexityEstimationExample,
  integrationExample,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}