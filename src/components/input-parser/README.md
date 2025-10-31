# Input Parser Component

The Input Parser is a sophisticated component that uses Groq AI to parse user requests into structured commands. It extracts intent, entities, and context from natural language input to enable intelligent code assistance.

## Features

- **Intent Extraction**: Classifies user requests into specific intent types (ADD_FEATURE, FIX_BUG, REFACTOR, EXPLAIN_CODE, etc.)
- **Entity Extraction**: Identifies files, features, constraints, dependencies, and code patterns
- **Project Scanning**: Analyzes project structure, dependencies, and health metrics
- **Request Validation**: Validates input quality and provides suggestions
- **Event Integration**: Full integration with the system's event bus
- **Database Integration**: Stores parsed requests and analysis results
- **Batch Processing**: Supports multiple requests processing
- **Statistics & Monitoring**: Comprehensive statistics and health monitoring

## Architecture

```
src/components/input-parser/
├── types.ts              # Type definitions and interfaces
├── intent-extractor.ts   # Intent extraction using Groq AI
├── entity-extractor.ts   # Entity extraction using Groq AI
├── project-scanner.ts    # Project structure and file analysis
├── input-parser.ts       # Main parser orchestrator
├── index.ts             # Component exports and utilities
├── examples.ts          # Usage examples
└── README.md           # This file
```

## Core Classes

### InputParser
Main orchestrator class that coordinates intent extraction, entity extraction, and project scanning.

**Key Methods:**
- `parseRequest(input, context)` - Parse single request
- `parseRequestsBatch(inputs, contexts)` - Parse multiple requests
- `scanProject(options)` - Perform project analysis
- `getStats()` - Get parsing statistics
- `healthCheck()` - System health status

### IntentExtractor
Extracts user intent from natural language input using Groq AI.

**Supported Intents:**
- `ADD_FEATURE` - Adding new functionality
- `FIX_BUG` - Debugging and fixing errors
- `REFACTOR` - Code restructuring and improvement
- `EXPLAIN_CODE` - Code analysis and explanation
- `ANALYZE_CODE` - Code quality assessment
- `OPTIMIZE_CODE` - Performance optimization
- `DOCUMENT_CODE` - Documentation creation
- `TEST_CODE` - Testing and test generation
- `DEPLOY_CODE` - Deployment and release
- `REVIEW_CODE` - Code review and feedback

### EntityExtractor
Extracts structured entities from user input.

**Entity Types:**
- **Files**: File paths, directories, patterns
- **Features**: Functionality, components, modules
- **Constraints**: Requirements, limitations
- **Dependencies**: Packages, libraries, frameworks
- **CodePatterns**: Algorithms, design patterns

### ProjectScanner
Analyzes project structure, dependencies, and metrics.

**Analysis Features:**
- File structure scanning
- Dependency analysis
- Configuration detection
- Health assessment
- Metrics calculation

## Quick Start

### Basic Usage

```typescript
import { createInputParser } from '@/components/input-parser';
import { DatabaseConnectionManager } from '@/database/client';

const dbManager = new DatabaseConnectionManager({
  host: 'localhost',
  database: 'ai_code_agent',
  user: 'postgres',
  password: 'password'
});

const parser = createInputParser(
  {
    groqApiKey: process.env.GROQ_API_KEY!,
    modelName: 'mixtral-8x7b-32768'
  },
  dbManager,
  './my-project'
);

// Parse a request
const result = await parser.parseRequest(
  'Add user authentication with JWT tokens',
  {
    source: 'cli',
    userId: 'user-123'
  }
);

console.log('Intent:', result.result.intent);
console.log('Confidence:', result.result.confidence);
console.log('Entities:', result.result.entities);
```

### Web API Usage

```typescript
import { initializeInputParser } from '@/components/input-parser';

const parser = await initializeInputParser(
  dbManager,
  './my-project',
  {
    timeout: 45000,
    maxRetries: 2,
    temperature: 0.1
  }
);

// Batch processing
const results = await parser.parseRequestsBatch([
  'Fix the memory leak in user service',
  'Refactor authentication module',
  'Add unit tests for payment endpoint'
]);
```

### Project Scanning

```typescript
// Comprehensive project analysis
const scanResult = await parser.scanProject({
  includeContent: false,
  includeDependencies: true,
  includeConfiguration: true,
  maxDepth: 3
});

console.log('Project:', scanResult.result.projectName);
console.log('Type:', scanResult.result.projectType);
console.log('Files:', scanResult.result.metrics.totalFiles);
console.log('Health Score:', scanResult.result.health.score);
```

## Configuration

### ParserConfig Options

```typescript
interface ParserConfig {
  groqApiKey?: string;           // Groq API key
  modelName: string;             // Model name (default: mixtral-8x7b-32768)
  maxTokens: number;             // Max tokens (default: 2000)
  temperature: number;           // Model temperature (default: 0.1)
  timeout: number;               // Request timeout (default: 30000)
  maxRetries: number;            // Max retries (default: 3)
  fallbackEnabled: boolean;      // Enable fallback methods
  validationThreshold: number;   // Confidence threshold (default: 0.6)
  entityExtractionEnabled: boolean; // Enable entity extraction
  projectScanningEnabled: boolean;  // Enable project scanning
  contextWindowSize: number;     // Context window size
}
```

### Environment Variables

```bash
# Required
GROQ_API_KEY=your_groq_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent
DB_USER=postgres
DB_PASSWORD=password
```

## Event System

The Input Parser integrates with the system's event bus for monitoring and logging.

### Events Emitted

- `parser:request:started` - Parsing started
- `parser:request:completed` - Parsing completed successfully
- `parser:request:failed` - Parsing failed
- `project:scan:started` - Project scan started
- `project:scan:completed` - Project scan completed

### Event Usage

```typescript
import { eventBus } from '@/core/event-bus';

eventBus.on('parser:request:completed', (data) => {
  console.log(`Request ${data.requestId} parsed in ${data.processingTime}ms`);
  console.log(`Intent: ${data.result.intent}, Confidence: ${data.result.confidence}`);
});
```

## Database Integration

Parsed requests and analysis results are automatically stored in the database.

### Stored Entities

- **ParsedRequest**: Original request with extracted data
- **ProjectAnalysis**: Project scan results and metrics
- **Task**: Generated tasks from parsed requests

### Database Schema

The component uses the following database entities:
- `parsed_requests` - Stores parsed user requests
- `project_analyses` - Stores project scan results
- `tasks` - Generated tasks from requests
- `code_files` - Analyzed file information

## Error Handling

The Input Parser provides comprehensive error handling and validation.

### Error Types

- `InputParserError` - General parser errors
- `IntentExtractionError` - Intent extraction failures
- `EntityExtractionError` - Entity extraction failures
- `ProjectScanError` - Project scanning errors
- `ValidationError` - Input validation errors

### Error Handling Example

```typescript
try {
  const result = await parser.parseRequest(input);
} catch (error) {
  if (error.name === 'ValidationError') {
    console.error('Invalid input:', error.errors);
  } else if (error.name === 'IntentExtractionError') {
    console.error('Failed to extract intent:', error.message);
  } else {
    console.error('Parser error:', error);
  }
}
```

## Statistics and Monitoring

### Parser Statistics

```typescript
const stats = parser.getStats();

console.log({
  totalRequests: stats.totalRequests,
  successfulParses: stats.successfulParses,
  failedParses: stats.failedParses,
  averageConfidence: stats.averageConfidence,
  intentDistribution: stats.intentDistribution,
  averageProcessingTime: stats.averageProcessingTime
});
```

### Health Check

```typescript
const health = await parser.healthCheck();

console.log({
  status: health.status,
  details: health.details
});
```

## Best Practices

### 1. Input Quality
- Provide clear, specific requests
- Include relevant context
- Use proper grammar and punctuation

### 2. Configuration Tuning
- Adjust temperature for creativity vs. consistency
- Set appropriate timeouts for your environment
- Configure retry limits based on reliability needs

### 3. Error Handling
- Always handle parsing failures gracefully
- Implement fallback mechanisms
- Monitor parsing statistics

### 4. Performance
- Use batch processing for multiple requests
- Enable project scanning only when needed
- Cache project analysis results when possible

### 5. Security
- Validate API keys and configurations
- Sanitize user input before parsing
- Monitor for suspicious patterns

## Testing

### Unit Tests

```bash
npm run test -- --testPathPattern=input-parser
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

```typescript
import { runExamples } from '@/components/input-parser/examples';

await runExamples();
```

## Troubleshooting

### Common Issues

1. **API Key Missing**
   - Ensure `GROQ_API_KEY` is set
   - Verify API key is valid

2. **Database Connection Failed**
   - Check database configuration
   - Verify database is running

3. **Low Confidence Scores**
   - Improve input quality
   - Add more context
   - Adjust confidence thresholds

4. **Project Scan Fails**
   - Check file permissions
   - Verify project path exists
   - Exclude problematic directories

### Debug Mode

Enable verbose logging:

```typescript
const parser = createInputParser({
  groqApiKey: process.env.GROQ_API_KEY!,
  // Enable debugging options
}, dbManager);

// Check parser health
const health = await parser.healthCheck();
console.log('Debug info:', health.details);
```

## Contributing

When contributing to the Input Parser component:

1. Follow TypeScript strict mode guidelines
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Ensure event integration where appropriate

## API Reference

See the individual class files for detailed API documentation:
- `InputParser` class in `input-parser.ts`
- `IntentExtractor` class in `intent-extractor.ts`
- `EntityExtractor` class in `entity-extractor.ts`
- `ProjectScanner` class in `project-scanner.ts`
