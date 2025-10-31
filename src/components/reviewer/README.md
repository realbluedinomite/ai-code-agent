# Reviewer Component System

A comprehensive code validation system with three layers of analysis, providing static analysis, AI-powered review, and user approval workflows.

## Overview

The Reviewer Component System orchestrates a complete code review workflow through three integrated layers:

1. **StaticAnalyzer (Layer 1)** - TypeScript compilation, ESLint validation, syntax checking, and code metrics
2. **AIReviewer (Layer 2)** - AI-powered logic, architecture, security, and performance analysis using Groq
3. **UserApproval (Layer 3)** - User approval workflow, decision management, and batch processing

## Features

### Static Analysis (Layer 1)
- **TypeScript Compilation**: Full TypeScript type checking and compilation validation
- **ESLint Integration**: Best practices validation with customizable rules
- **Syntax Validation**: Multi-language syntax checking (JavaScript, Python, Java, C#, C++)
- **Code Metrics**: Cyclomatic complexity, maintainability index, Halstead complexity
- **Custom Rules**: Extensible rule system for project-specific requirements
- **Security Checks**: Detection of common security vulnerabilities
- **Performance Analysis**: Identification of performance anti-patterns

### AI Review (Layer 2)
- **Logic Analysis**: Code logic review and optimization suggestions
- **Architecture Review**: Design patterns and architectural improvements
- **Security Analysis**: AI-powered security vulnerability detection
- **Performance Analysis**: Performance bottleneck identification
- **Maintainability Scoring**: Code maintainability and readability assessment
- **Intelligent Recommendations**: Context-aware improvement suggestions
- **Confidence Scoring**: AI confidence levels for each finding

### User Approval (Layer 3)
- **Automatic Approval**: Smart auto-approval based on quality scores
- **Manual Review Workflow**: Structured manual review process
- **Batch Processing**: Efficient batch approval for multiple files
- **Timeout Management**: Automatic cleanup of stale approval requests
- **History Tracking**: Complete audit trail of all approval decisions
- **User Feedback**: Collection and storage of reviewer feedback

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Reviewer Orchestrator                     │
│                  (Main Component)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌────▼────┐ ┌─────▼──────┐
│ StaticAnalyzer│ │AIReviewer│ │UserApproval│
│   (Layer 1)   │ │ (Layer 2)│ │  (Layer 3) │
│               │ │          │ │            │
│ • TypeScript  │ │ • Logic  │ │ • Auto     │
│ • ESLint      │ │ • Security│ │   Approval │
│ • Syntax      │ │ • Perf   │ │ • Manual   │
│ • Metrics     │ │ • Arch   │ │ • Batch    │
└───────────────┘ └──────────┘ └────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Integration Layer                               │
│  • Event Bus    • Database    • Configuration               │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```typescript
import { Reviewer } from '@/components/reviewer';
import { DatabaseConnectionManager } from '@/database/client';

// Initialize database
const dbManager = new DatabaseConnectionManager();
await dbManager.connect();

// Create reviewer
const reviewer = new Reviewer({
  dbManager,
  reviewConfig: {
    enable_static_analysis: true,
    enable_ai_review: true,
    enable_user_approval: true
  }
});
```

## Quick Start

### Complete Review Session

```typescript
import { Reviewer } from '@/components/reviewer';

// Initialize reviewer
const reviewer = new Reviewer({
  dbManager,
  reviewConfig: {
    enable_static_analysis: true,
    enable_ai_review: true,
    enable_user_approval: true
  }
});

// Start review session
const sessionId = await reviewer.startReviewSession({
  project_id: 'my-project',
  user_id: 'reviewer-123'
});

// Review code files
const files = [
  {
    id: 'file-1',
    file_path: 'src/components/Button.tsx',
    content: '...', // Your code content
    language: 'typescript'
  }
];

const results = await reviewer.reviewFiles(files);

// Complete session
const session = await reviewer.completeReviewSession();
```

### Standalone Static Analysis

```typescript
import { StaticAnalyzer } from '@/components/reviewer';

const staticAnalyzer = new StaticAnalyzer(dbManager);

const result = await staticAnalyzer.analyzeFile({
  id: 'test-file',
  file_path: 'example.ts',
  content: 'console.log("Hello World");',
  language: 'typescript'
});

console.log(result);
// {
//   file_id: 'test-file',
//   file_path: 'example.ts',
//   syntax_valid: true,
//   type_check_passed: true,
//   syntax_issues: [],
//   type_issues: [],
//   best_practice_issues: [...],
//   metrics: {...},
//   timestamp: 2024-01-01T00:00:00.000Z
// }
```

### Standalone AI Review

```typescript
import { AIReviewer } from '@/components/reviewer';

const aiReviewer = new AIReviewer(dbManager, {
  groqConfig: {
    apiKey: process.env.GROQ_API_KEY!,
    model: 'llama3-8b-8192'
  }
});

const result = await aiReviewer.reviewFile({
  file_id: 'complex-component',
  file_path: 'UserProfile.tsx',
  content: '...', // Your React component code
  language: 'typescript',
  context: {
    project_type: 'web-application',
    framework: 'React'
  }
});

console.log(result.overall_score); // 0-100
console.log(result.findings); // Array of AI findings
console.log(result.recommendations); // Improvement suggestions
```

### Standalone User Approval

```typescript
import { UserApproval } from '@/components/reviewer';

const userApproval = new UserApproval(dbManager);

// Process approval request
const decision = await userApproval.processApprovalRequest({
  review_id: 'session-123',
  file_id: 'file-456',
  file_path: 'src/example.ts',
  static_analysis: staticResult,
  ai_review: aiResult
});

// Handle manual review decision
if (decision.decision === 'requires_manual_review') {
  const userDecision = await userApproval.processApprovalDecision({
    review_id: decision.review_id,
    file_id: decision.file_id,
    user_id: 'reviewer-789',
    decision: 'approved',
    reasoning: 'Code looks good after review'
  });
}
```

## Configuration

### Reviewer Configuration

```typescript
const reviewConfig: ReviewConfiguration = {
  // Layer enablement
  enable_static_analysis: true,
  enable_ai_review: true,
  enable_user_approval: true,
  
  // File handling
  max_file_size_bytes: 1048576, // 1MB
  supported_languages: ['typescript', 'javascript', 'python'],
  
  // Custom rules
  custom_rules: [
    {
      id: 'no-console',
      name: 'No Console Statements',
      description: 'Avoid console statements in production code',
      severity: 'warning',
      category: 'best-practice',
      enabled: true
    }
  ],
  
  // AI configuration
  ai_model_config: {
    model: 'llama3-8b-8192',
    temperature: 0.1,
    max_tokens: 2048,
    system_prompt: 'You are an expert code reviewer...'
  },
  
  // Approval thresholds
  approval_thresholds: {
    auto_approve_score: 90,
    require_approval_score: 70,
    critical_issues_auto_reject: true
  },
  
  // File filtering
  exclude_patterns: ['node_modules/**', 'dist/**'],
  include_patterns: ['src/**/*.{ts,js}']
};
```

### Custom Validation Rules

```typescript
const customRules: ValidationRule[] = [
  {
    id: 'max-function-length',
    name: 'Maximum Function Length',
    description: 'Functions should not exceed 50 lines',
    severity: 'warning',
    category: 'best-practice',
    enabled: true,
    configuration: {
      maxLength: 50
    }
  },
  {
    id: 'no-magic-numbers',
    name: 'No Magic Numbers',
    description: 'Avoid unexplained numeric constants',
    severity: 'warning',
    category: 'best-practice',
    enabled: true,
    configuration: {
      acceptableNumbers: [0, 1, -1, 100, 1000]
    }
  }
];
```

## API Reference

### Reviewer Class

#### `startReviewSession(options)`
Starts a new review session.

```typescript
const sessionId = await reviewer.startReviewSession({
  project_id: string,
  user_id?: string,
  configuration?: Partial<ReviewConfiguration>
});
```

#### `reviewFile(file)`
Reviews a single file through all enabled layers.

```typescript
const result = await reviewer.reviewFile({
  id: string,
  file_path: string,
  content: string,
  language?: string
});

// Returns:
// {
//   session_id: string,
//   file_id: string,
//   file_path: string,
//   static_analysis?: StaticAnalysisResult,
//   ai_review?: AIReviewResult,
//   approval_decision?: ApprovalDecision,
//   processing_time_ms: number,
//   overall_score?: number
// }
```

#### `reviewFiles(files)`
Reviews multiple files in batch.

```typescript
const batchResults = await reviewer.reviewFiles(files[]);

// Returns:
// {
//   session_id: string,
//   results: Array<{...}>,
//   summary: {
//     total_files: number,
//     approved: number,
//     rejected: number,
//     requires_review: number,
//     average_score: number,
//     total_processing_time_ms: number
//   }
// }
```

#### `completeReviewSession()`
Completes the current review session and returns session summary.

```typescript
const session = await reviewer.completeReviewSession();

// Returns ReviewSession with stats and summary
```

### StaticAnalyzer Class

#### `analyzeFile(file)`
Performs static analysis on a single file.

#### `analyzeFiles(files)`
Performs static analysis on multiple files in batch.

#### `updateConfig(config)`
Updates analyzer configuration.

### AIReviewer Class

#### `reviewFile(request)`
Performs AI review on a single file.

#### `reviewFiles(requests)`
Performs AI review on multiple files in batch.

#### `clearCache()`
Clears the AI review cache.

### UserApproval Class

#### `processApprovalRequest(request)`
Processes an approval request and returns a decision.

#### `processApprovalDecision(decision)`
Processes a user approval decision.

#### `processBatchApproval(requests)`
Processes multiple approval requests in batch.

#### `getPendingApprovals()`
Returns list of pending approval requests.

## Events and Monitoring

The system emits events through the event bus for monitoring and integration:

```typescript
// Session events
eventBus.on('review:session:started', (data) => {...});
eventBus.on('review:session:completed', (data) => {...});

// File review events
eventBus.on('review:file:started', (data) => {...});
eventBus.on('review:file:completed', (data) => {...});

// Layer-specific events
eventBus.on('static:analysis:completed', (data) => {...});
eventBus.on('ai:review:completed', (data) => {...});
eventBus.on('approval:required', (data) => {...});
eventBus.on('approval:decision:made', (data) => {...});
```

## Database Integration

The system integrates with the existing database infrastructure:

### CodeFile Model
```typescript
// Files are stored in the code_files table
const files = await codeFileModel.findByProjectAnalysisId(projectId);
```

### Approval Decisions
```typescript
// Approval decisions can be stored in database
// (Would require approval_decisions table)
```

## Performance Considerations

### Processing Limits
- **File Size**: Maximum configurable file size (default: 1MB)
- **Concurrency**: Configurable batch size (default: 5 files)
- **Rate Limiting**: Built-in delays between batch operations
- **Caching**: AI review results are cached to avoid redundant analysis

### Optimization Tips
1. **Use Batch Processing**: Process multiple files together for efficiency
2. **Configure Exclusions**: Exclude build files and dependencies
3. **Custom Rules**: Only enable necessary validation rules
4. **Cache Management**: Clear cache periodically to manage memory
5. **Monitoring**: Track processing times and error rates

## Error Handling

The system provides comprehensive error handling:

```typescript
try {
  const result = await reviewer.reviewFile(file);
} catch (error) {
  if (error instanceof StaticAnalysisError) {
    // Handle static analysis errors
  } else if (error instanceof AIReviewError) {
    // Handle AI review errors
  } else if (error instanceof UserApprovalError) {
    // Handle user approval errors
  }
}
```

## Examples

See `examples.ts` for comprehensive usage examples:

- Complete reviewer system setup
- Standalone component usage
- Custom configuration and rules
- Error handling and resilience
- Batch processing patterns

## Testing

The system includes comprehensive testing:

```typescript
// Unit tests
import { StaticAnalyzer } from '@/components/reviewer';
import { setupTestDb } from '@/tests/helpers/database-setup';

describe('StaticAnalyzer', () => {
  let staticAnalyzer: StaticAnalyzer;
  let dbManager: DatabaseConnectionManager;

  beforeEach(async () => {
    dbManager = await setupTestDb();
    staticAnalyzer = new StaticAnalyzer(dbManager);
  });

  it('should analyze TypeScript files correctly', async () => {
    const result = await staticAnalyzer.analyzeFile({
      id: 'test',
      file_path: 'test.ts',
      content: 'const x: number = 42;',
      language: 'typescript'
    });

    expect(result.syntax_valid).toBe(true);
    expect(result.type_check_passed).toBe(true);
  });
});
```

## Contributing

When extending the reviewer system:

1. **New Validation Rules**: Implement in `StaticAnalyzer` with proper categorization
2. **AI Analysis**: Extend `AIReviewer` with new analysis types
3. **Approval Logic**: Enhance `UserApproval` with new decision criteria
4. **Event Handling**: Emit appropriate events for monitoring
5. **Error Handling**: Provide meaningful error messages and recovery

## Version Information

- **Version**: 1.0.0
- **Node.js**: >= 16.0.0
- **TypeScript**: >= 4.5.0
- **Dependencies**: 
  - `@types/node`
  - `groq-sdk`
  - `uuid`
  - `joi`

## License

This component is part of the larger codebase and follows the same licensing terms.