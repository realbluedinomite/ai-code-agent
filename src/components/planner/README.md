# Planner Component

A comprehensive planning system that creates detailed execution plans with task breakdown, complexity estimation, ambiguity detection, and dependency analysis.

## Features

### Core Functionality
- **Task Breakdown**: Intelligently breaks down complex tasks into manageable subtasks
- **Complexity Estimation**: Uses AI and heuristics to estimate effort and identify complexity factors
- **Ambiguity Detection**: Identifies unclear requirements and potential issues
- **Question Generation**: Generates clarification questions to resolve ambiguities
- **Dependency Analysis**: Analyzes task dependencies and identifies circular dependencies
- **Risk Assessment**: Identifies project risks and suggests mitigation strategies

### Advanced Features
- **Project Type Detection**: Automatically detects project type and applies relevant planning templates
- **Technology Stack Integration**: Works with Project Analyzer to incorporate existing codebase insights
- **Multiple Planning Approaches**: Supports Agile, Waterfall, Scrum, and hybrid methodologies
- **Quality Gate Integration**: Supports automated quality checks and manual reviews
- **Alternative Planning**: Generates multiple execution alternatives (MVP, Quality-focused, Incremental)
- **Event System**: Emits events for planning progress and status updates

## Quick Start

### Basic Usage

```typescript
import { createPlanner, quickPlan } from './components/planner';

// Simple planning
const result = await quickPlan(
  "Build a React web application for user management",
  "web_application"
);

console.log(`Created plan with ${result.plan.tasks.length} tasks`);
```

### Advanced Usage

```typescript
import { Planner, PlanningInput } from './components/planner';

// Configure planner
const planner = new Planner({
  enableAIAnalysis: true,
  enableHeuristicAnalysis: true,
  enableAmbiguityDetection: true,
  maxTaskDepth: 3,
  complexityThreshold: 0.7
});

// Detailed planning input
const input: PlanningInput = {
  description: "Build a comprehensive e-commerce platform",
  requirements: [
    "User authentication and authorization",
    "Product catalog with search and filtering",
    "Shopping cart and checkout process",
    "Payment integration",
    "Order management"
  ],
  constraints: [
    "Must be PCI compliant",
    "Support 1000+ concurrent users",
    "Mobile responsive design"
  ],
  context: {
    projectType: ProjectType.WEB_APPLICATION,
    technologyStack: ["React", "Node.js", "PostgreSQL"],
    teamSize: 5,
    deadline: new Date("2024-06-30"),
    riskTolerance: RiskTolerance.MEDIUM,
    qualityRequirements: QualityLevel.HIGH
  },
  preferences: {
    methodology: PlanningMethodology.AGILE,
    taskSize: TaskSize.MEDIUM,
    priorityStrategy: PriorityStrategy.RISK_FIRST,
    communicationStyle: CommunicationStyle.COLLABORATIVE
  }
};

// Create execution plan
const result = await planner.createExecutionPlan(input);

if (result.success) {
  console.log(`Plan created successfully:`);
  console.log(`- ${result.plan.tasks.length} tasks`);
  console.log(`- ${result.plan.milestones.length} milestones`);
  console.log(`- ${result.plan.risks.length} identified risks`);
  console.log(`- ${result.ambiguityResult?.questions.length || 0} clarification questions`);
}
```

## Integration with Input Parser and Project Analyzer

```typescript
import { createIntegratedPlan } from './components/planner/integration';
import { InputParserOutput } from './components/planner/integration';
import { AnalysisResult } from './components/project-analyzer/types';

// Assuming you have outputs from Input Parser and Project Analyzer
const inputParserOutput: InputParserOutput = {
  parsed: {
    intent: {
      type: 'web_development',
      subType: 'component',
      confidence: 0.9,
      parameters: { framework: 'react' }
    },
    description: "Build a user dashboard component",
    requirements: ["Responsive design", "Real-time updates"],
    constraints: ["Must work on mobile devices"]
  },
  confidence: 0.9
};

const projectAnalyzerOutput: AnalysisResult = {
  projectPath: "/path/to/project",
  totalFiles: 150,
  analyzedFiles: 150,
  // ... other analysis data
};

// Create integrated plan
const result = await createIntegratedPlan(
  inputParserOutput,
  projectAnalyzerOutput,
  { enableAIAnalysis: true }
);
```

## API Reference

### Planner Class

#### Constructor
```typescript
new Planner(config?: PlannerConfig)
```

#### Methods
- `createExecutionPlan(input: PlanningInput, existingAnalysis?: any): Promise<PlanningResult>`
- `getConfig(): PlannerConfig`
- `updateConfig(newConfig: Partial<PlannerConfig>): void`

### TaskBreakdown Class

#### Constructor
```typescript
new TaskBreakdown(config: TaskBreakdownConfig)
```

#### Methods
- `breakdownTask(task: Task, context?: any): Promise<Task[]>`
- `validateBreakdown(subtasks: Task[]): { valid: boolean; issues: string[] }`

### ComplexityEstimator Class

#### Constructor
```typescript
new ComplexityEstimator(config?: { aiModel?: string })
```

#### Methods
- `estimateTaskComplexity(task: Task, context?: any): Promise<ComplexityEstimate>`
- `estimateMultipleTasks(tasks: Task[], context?: any): Promise<ComplexityEstimate[]>`
- `updatePatterns(taskCategory: TaskCategory, actualComplexity: number, factors: ComplexityFactor[]): void`

### AmbiguityDetector Class

#### Constructor
```typescript
new AmbiguityDetector()
```

#### Methods
- `detectAmbiguities(input: PlanningInput, tasks?: Task[]): Promise<AmbiguityDetectionResult>`

### QuestionGenerator Class

#### Constructor
```typescript
new QuestionGenerator(config: QuestionGenerationConfig)
```

#### Methods
- `generateQuestions(ambiguities: Ambiguity[], input: PlanningInput, tasks?: Task[]): Promise<ClarificationQuestion[]>`

## Configuration Options

### PlannerConfig
```typescript
interface PlannerConfig {
  enableAIAnalysis?: boolean;           // Enable AI-based complexity analysis
  enableHeuristicAnalysis?: boolean;    // Enable heuristic analysis
  enableAmbiguityDetection?: boolean;   // Enable ambiguity detection
  enableQuestionGeneration?: boolean;   // Enable question generation
  maxTaskDepth?: number;               // Maximum depth for task breakdown (default: 3)
  maxSubtasksPerTask?: number;         // Maximum subtasks per task (default: 10)
  complexityThreshold?: number;        // Complexity threshold (default: 0.7)
  timeoutMs?: number;                  // Processing timeout (default: 30000)
  parallelProcessing?: boolean;        // Enable parallel processing (default: true)
  cacheEnabled?: boolean;              // Enable caching (default: false)
  aiModel?: string;                    // AI model to use (default: 'default')
  confidenceThreshold?: number;        // Minimum confidence for estimates (default: 0.6)
}
```

### TaskBreakdownConfig
```typescript
interface TaskBreakdownConfig {
  maxDepth: number;                    // Maximum breakdown depth
  maxSubtasksPerTask: number;          // Maximum subtasks per task
  minTaskSize: number;                 // Minimum task size in hours
  maxTaskSize: number;                 // Maximum task size in hours
  enableAutomaticGrouping: boolean;    // Enable automatic task grouping
  enableDependencyAnalysis: boolean;   // Enable dependency analysis
  granularityPreference: TaskGranularity; // Task granularity preference
}
```

### QuestionGenerationConfig
```typescript
interface QuestionGenerationConfig {
  maxQuestions: number;               // Maximum questions to generate
  priorityThreshold: QuestionPriority; // Minimum priority for questions
  categoryFilter?: QuestionCategory[]; // Filter by categories
  style?: CommunicationStyle;         // Communication style for questions
  includeContext: boolean;            // Include context in questions
  groupSimilar: boolean;              // Group similar questions
}
```

## Types

### PlanningInput
```typescript
interface PlanningInput {
  description: string;
  requirements?: string[];
  constraints?: string[];
  context?: PlanningContext;
  preferences?: PlanningPreferences;
  metadata?: Record<string, any>;
}
```

### ExecutionPlan
```typescript
interface ExecutionPlan {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  estimatedDuration: number;
  status: PlanStatus;
  tasks: Task[];
  milestones: Milestone[];
  dependencies: TaskDependency[];
  risks: Risk[];
  assumptions: Assumption[];
  alternatives: AlternativePlan[];
  metadata: PlanMetadata;
  validationResults: ValidationResult[];
}
```

### PlanningResult
```typescript
interface PlanningResult {
  success: boolean;
  plan?: ExecutionPlan;
  ambiguityResult?: AmbiguityDetectionResult;
  errors: PlanningError[];
  warnings: PlanningWarning[];
  metadata: PlanningResultMetadata;
}
```

## Project Types

- `WEB_APPLICATION`: Web applications and websites
- `MOBILE_APPLICATION`: Mobile apps (iOS, Android)
- `DESKTOP_APPLICATION`: Desktop applications
- `API_SERVICE`: Backend APIs and services
- `LIBRARY`: Code libraries and packages
- `CLI_TOOL`: Command-line tools
- `DATA_ANALYSIS`: Data analysis projects
- `MACHINE_LEARNING`: ML/AI projects
- `DEVOPS`: DevOps and infrastructure
- `MIGRATION`: Code or data migrations
- `REFACTORING`: Code refactoring projects
- `DOCUMENTATION`: Documentation projects
- `RESEARCH`: Research projects

## Task Categories

- `ANALYSIS`: Research and analysis tasks
- `DESIGN`: Design and architecture tasks
- `DEVELOPMENT`: Coding and implementation
- `TESTING`: Testing and quality assurance
- `DEPLOYMENT`: Deployment and release
- `DOCUMENTATION`: Documentation and communication
- `INTEGRATION`: System integration tasks
- `SECURITY`: Security-related tasks
- `PERFORMANCE`: Performance optimization
- `MAINTENANCE`: Maintenance and updates

## Quality Levels

- `BASIC`: Minimal quality for prototypes
- `STANDARD`: Standard quality for most projects
- `HIGH`: High quality with comprehensive testing
- `ENTERPRISE`: Enterprise-grade quality

## Error Handling

The planner provides comprehensive error handling:

```typescript
try {
  const result = await planner.createExecutionPlan(input);
  
  if (!result.success) {
    console.error('Planning failed:');
    result.errors.forEach(error => {
      console.error(`  ${error.code}: ${error.message}`);
    });
    
    result.warnings.forEach(warning => {
      console.warn(`  ${warning.type}: ${warning.message}`);
    });
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Best Practices

1. **Provide Complete Context**: Include all available context in PlanningInput for better results
2. **Handle Ambiguities**: Review and address ambiguities before execution
3. **Validate Dependencies**: Check for circular dependencies and invalid references
4. **Monitor Risks**: Keep track of identified risks and implement mitigation strategies
5. **Review Estimates**: Validate complexity estimates against historical data
6. **Use Incremental Planning**: Break large projects into smaller phases
7. **Document Assumptions**: Make all assumptions explicit and verifiable

## Examples

See the `/examples` directory for complete usage examples including:
- Basic planning example
- Integration with Input Parser and Project Analyzer
- Custom configuration example
- Alternative planning approaches

## Testing

Run tests with:
```bash
npm test -- --testPathPattern=planner
```

## Contributing

When contributing to the Planner component:

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure compatibility with existing integrations
5. Consider performance implications of changes