# Implementer Component

A comprehensive code generation and file operations system with AI-powered capabilities, safe file system operations, and robust rollback functionality.

## Overview

The Implementer component provides a complete solution for:

- **AI-powered code generation** using Groq with context awareness
- **Safe file system operations** with atomic writes and backups
- **Transaction-like rollback capabilities** for recovering from failures
- **Database integration** for storing implementation history
- **Event system integration** for monitoring and progress tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Implementer (Main Orchestrator)          │
│  - Coordinates code generation and file operations          │
│  - Manages rollback sessions                                │
│  - Integrates with database and event systems               │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
    ┌─────▼───┐  ┌────▼────┐  ┌───▼────┐
    │CodeGen  │  │FileWrtr │  │RbckMgr │
    │         │  │         │  │        │
    │ - Groq  │  │ - Atomic│  │ - Snap │
    │ - Models│  │ - Backup│  │ - Trans│
    └─────────┘  └─────────┘  └────────┘
```

## Components

### 1. Implementer (Main Orchestrator)

The main class that coordinates all operations and provides the primary interface.

**Features:**
- Orchestrates code generation and file operations
- Manages rollback sessions
- Integrates with database and event systems
- Provides progress tracking and monitoring
- Supports dry-run mode for testing

**Basic Usage:**

```typescript
import { Implementer, TypedEventBus } from '@/components/implementer';
import { DatabaseClient } from '@/database/client';

// Initialize event bus and database
const eventBus = new TypedEventBus();
const database = new DatabaseClient(config);

// Create implementer instance
const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus, {
  database,
  config: {
    codeGeneration: {
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      maxTokens: 2048,
    },
    fileSystem: {
      atomicWrites: true,
      backupDirectory: '.backups',
    },
  },
});

// Execute implementation
const result = await implementer.implement({
  taskId: 'task_123',
  description: 'Create user authentication module',
  requirements: [
    'Create login functionality',
    'Add password validation',
    'Implement JWT tokens',
  ],
  codeGeneration: {
    prompt: 'Create a user authentication module with login, registration, and JWT token handling',
    language: 'typescript',
    framework: 'express',
    style: {
      naming: 'camelCase',
      comments: 'standard',
      errorHandling: 'comprehensive',
      testing: 'comprehensive',
    },
    constraints: {
      maxLines: 500,
      requiredPatterns: ['async/await', 'try/catch'],
    },
  },
  fileOperations: [
    {
      type: 'create',
      sourcePath: 'src/auth/login.ts',
      content: '...', // Generated code will be inserted here
    },
  ],
  rollbackStrategy: 'automatic',
});

console.log('Implementation completed:', result.status);
console.log('Files created:', result.metrics.filesCreated);
```

### 2. CodeGenerator

Handles AI-powered code generation using Groq API.

**Features:**
- Multiple AI models support
- Context-aware generation
- Streaming support
- Documentation and test generation
- Confidence scoring

**Example:**

```typescript
import { CodeGenerator } from '@/components/implementer';

const codeGen = new CodeGenerator(apiKey, {
  model: 'mixtral-8x7b-32768',
  temperature: 0.7,
}, eventBus);

// Generate code
const result = await codeGen.generateCode({
  prompt: 'Create a React component for user profiles',
  language: 'typescript',
  framework: 'react',
  context: {
    projectPath: '/path/to/project',
    existingFiles: ['src/components/Header.tsx'],
    dependencies: ['react', 'typescript'],
  },
  style: {
    naming: 'camelCase',
    comments: 'detailed',
    errorHandling: 'comprehensive',
    testing: 'comprehensive',
  },
});

console.log('Generated files:', result.files);
console.log('Language detected:', result.language);
console.log('Confidence:', result.metadata.confidence);
```

**Streaming Support:**

```typescript
const stream = codeGen.generateCodeStream(request);

for await (const chunk of stream) {
  process.stdout.write(chunk); // Stream code as it's generated
}

const finalResult = await stream.next(); // Get complete result
```

### 3. FileWriter

Provides safe file system operations with atomic writes and backup support.

**Features:**
- Atomic file operations
- Automatic backups
- Permission management
- Path validation for security
- Concurrent operation support

**Basic Operations:**

```typescript
import { FileWriter } from '@/components/implementer';

const fileWriter = new FileWriter({
  atomicWrites: true,
  backupDirectory: '.backups',
  defaultEncoding: 'utf8',
}, eventBus);

// Create file
const operation = await fileWriter.createFile(
  'src/utils/helper.ts',
  'export const helper = () => { return "test"; };',
  { permissions: '755' }
);

// Modify file
const modOp = await fileWriter.modifyFile(
  'src/utils/helper.ts',
  'export const helper = () => { return "updated test"; };',
  { backup: true }
);

// Delete file
const delOp = await fileWriter.deleteFile('src/utils/old.ts');

// Atomic operations (all succeed or all fail)
const atomicOps = await fileWriter.performAtomicOperation('create', [
  { path: 'src/a.ts', content: 'console.log("a");' },
  { path: 'src/b.ts', content: 'console.log("b");' },
  { path: 'src/c.ts', content: 'console.log("c");' },
]);
```

**Security Features:**

```typescript
const secureWriter = new FileWriter({
  security: {
    allowedPaths: ['/workspace/src', '/workspace/tests'],
    deniedPaths: ['/etc', '/var', '/root'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    requireConfirmation: true,
  },
}, eventBus);
```

### 4. RollbackManager

Provides transaction-like operations with comprehensive rollback capabilities.

**Features:**
- Session-based rollback tracking
- Automatic backup creation
- Snapshot support
- Export/import functionality
- Cleanup and retention policies

**Basic Usage:**

```typescript
import { RollbackManager } from '@/components/implementer';

const rollbackMgr = new RollbackManager({
  maxSessions: 10,
  maxSessionAge: 24, // hours
  backupRetention: 5,
}, eventBus);

// Create rollback session
const session = await rollbackMgr.createSession(
  'Feature implementation',
  'Adding user management functionality'
);

// Track operations
await rollbackMgr.addOperation(session.id, {
  type: 'create',
  targetPath: 'src/users/controller.ts',
  originalContent: '...',
});

// Create backups automatically
await rollbackMgr.createBackup(session.id, 'src/users/model.ts');

// Commit session (finalize changes)
await rollbackMgr.commitSession(session.id);

// Rollback if needed
await rollbackMgr.rollbackSession(session.id);

// Force rollback (even committed sessions)
await rollbackMgr.forceRollback(session.id);
```

**Snapshot Support:**

```typescript
// Create snapshot before major changes
const snapshot = await rollbackMgr.createSnapshot(session.id, [
  'src/app.ts',
  'src/config.ts',
  'src/routes.ts',
]);

// Restore from snapshot if needed
await rollbackMgr.restoreFromSnapshot(session.id, snapshot.id);
```

## Configuration

### Code Generation Settings

```typescript
const codeGenConfig = {
  provider: 'groq',
  model: 'mixtral-8x7b-32768',
  temperature: 0.7,
  maxTokens: 2048,
  timeout: 30000,
  retries: 3,
};
```

### File System Settings

```typescript
const fileSystemConfig = {
  defaultEncoding: 'utf8',
  backupDirectory: '.backups',
  atomicWrites: true,
  preservePermissions: true,
  maxConcurrentOperations: 5,
};
```

### Rollback Settings

```typescript
const rollbackConfig = {
  maxSessions: 10,
  maxSessionAge: 24, // hours
  backupRetention: 5,
  autoCleanup: true,
};
```

### Security Settings

```typescript
const securityConfig = {
  allowedPaths: [],
  deniedPaths: ['/etc', '/var', '/root', '/.ssh'],
  requireConfirmation: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};
```

## Events

The component emits various events for monitoring and integration:

```typescript
// Code generation events
eventBus.on('implementer:code:generation:started', (data) => {
  console.log('Code generation started:', data);
});

eventBus.on('implementer:code:generation:completed', (data) => {
  console.log('Code generation completed:', data);
});

// File operation events
eventBus.on('implementer:file:operation:started', (data) => {
  console.log('File operation started:', data);
});

eventBus.on('implementer:file:operation:completed', (data) => {
  console.log('File operation completed:', data);
});

// Rollback events
eventBus.on('implementer:rollback:started', (data) => {
  console.log('Rollback started:', data);
});

// Progress tracking
eventBus.on('implementer:progress:updated', (data) => {
  console.log(`Progress: ${data.progress}% - ${data.currentOperation}`);
});
```

## Progress Tracking

Monitor implementation progress in real-time:

```typescript
// Subscribe to progress updates
const subscriptionId = implementer.subscribeToProgress(requestId, (progress) => {
  console.log(`Stage: ${progress.stage}`);
  console.log(`Progress: ${progress.progress}%`);
  console.log(`Current: ${progress.currentOperation}`);
  console.log(`Estimated remaining: ${progress.estimatedTimeRemaining}ms`);
});

// Unsubscribe when done
implementer.unsubscribeFromProgress(subscriptionId);
```

## Database Integration

Store and retrieve implementation history:

```typescript
// Get implementation history for a task
const history = await implementer.getTaskHistory('task_123');
console.log('Previous implementations:', history);

// Implementations are automatically saved if database is configured
```

## Error Handling

Comprehensive error handling with specific error types:

```typescript
try {
  const result = await implementer.implement(request);
} catch (error) {
  if (error instanceof CodeGenerationError) {
    console.error('Code generation failed:', error.message);
    console.error('Prompt:', error.context.prompt);
  } else if (error instanceof FileOperationError) {
    console.error('File operation failed:', error.message);
    console.error('File path:', error.context.filePath);
  } else if (error instanceof RollbackError) {
    console.error('Rollback failed:', error.message);
    console.error('Session ID:', error.context.sessionId);
  } else if (error instanceof ImplementationError) {
    console.error('Implementation failed:', error.message);
    console.error('Stage:', error.context.stage);
  }
}
```

## Dry Run Mode

Test implementations without making actual changes:

```typescript
const preview = await implementer.implementDryRun(request);
console.log('Files to create:', preview.preview.filesToCreate);
console.log('Files to modify:', preview.preview.filesToModify);
console.log('Files to delete:', preview.preview.filesToDelete);
console.log('Estimated duration:', preview.estimatedDuration, 'ms');
console.log('Warnings:', preview.warnings);
```

## Best Practices

### 1. Always Use Rollback Strategy

```typescript
// Good: Includes rollback strategy
const result = await implementer.implement({
  ...request,
  rollbackStrategy: 'automatic',
});

// Avoid: No rollback protection
const result = await implementer.implement({
  ...request,
  rollbackStrategy: 'none',
});
```

### 2. Validate Before Implementation

```typescript
// Always validate request first
try {
  const preview = await implementer.implementDryRun(request);
  if (preview.warnings.length > 0) {
    console.warn('Warnings:', preview.warnings);
  }
  // Proceed with implementation
} catch (error) {
  console.error('Dry run failed:', error);
  return;
}
```

### 3. Monitor Progress

```typescript
const subscriptionId = implementer.subscribeToProgress(requestId, (progress) => {
  if (progress.stage === 'writing-files') {
    console.log(`Writing files: ${progress.progress}%`);
  }
});
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await implementer.implement(request);
} catch (error) {
  // Implementation automatically rolls back if rollbackStrategy is set
  // Log error for debugging
  logger.error('Implementation failed:', {
    error: error.message,
    requestId: error.context.requestId,
    taskId: error.context.taskId,
  });
  
  // Return user-friendly error
  return { success: false, error: error.message };
}
```

## Integration Examples

### With Database

```typescript
import { DatabaseClient } from '@/database/client';

const database = new DatabaseClient({
  host: 'localhost',
  port: 5432,
  database: 'implementer',
});

const implementer = new Implementer(apiKey, eventBus, {
  database,
});
```

### With Custom Event Bus

```typescript
const customEventBus = new TypedEventBus({
  verbose: true,
});

customEventBus.on('implementer:progress:updated', (data) => {
  // Send to monitoring system
  monitoringSystem.trackProgress(data);
});

const implementer = new Implementer(apiKey, customEventBus);
```

### With Task Queue

```typescript
// Process implementations in queue
queue.process('implementation', async (job) => {
  const { request } = job.data;
  
  const result = await implementer.implement(request);
  
  // Update job progress
  job.progress(50);
  
  return result;
});
```

## API Reference

### Implementer Class

#### Constructor
```typescript
new Implementer(groqApiKey: string, eventBus: TypedEventBus, options?: {
  database?: DatabaseClient;
  config?: Partial<typeof DEFAULT_CONFIG>;
})
```

#### Methods
- `implement(request: ImplementationRequest): Promise<ImplementationResult>`
- `implementDryRun(request: ImplementationRequest): Promise<DryRunPreview>`
- `subscribeToProgress(requestId: string, callback: (progress: ImplementationProgress) => void): string`
- `unsubscribeFromProgress(subscriptionId: string): void`
- `cancelImplementation(requestId: string): Promise<void>`
- `getTaskHistory(taskId: string): Promise<ImplementationResult[]>`
- `getStatistics(): Promise<Statistics>`
- `cleanup(): Promise<void>`

### CodeGenerator Class

#### Constructor
```typescript
new CodeGenerator(groqApiKey: string, options?: Partial<CodeGenerationConfig>, eventBus?: TypedEventBus)
```

#### Methods
- `generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse>`
- `generateCodeStream(request: CodeGenerationRequest): AsyncGenerator<string, CodeGenerationResponse>`
- `getAvailableModels(): string[]`
- `estimateTokens(text: string): number`

### FileWriter Class

#### Constructor
```typescript
new FileWriter(options?: Partial<FileSystemConfig>, eventBus?: TypedEventBus)
```

#### Methods
- `createFile(filePath: string, content: string, options?: Partial<FileOperationOptions>): Promise<FileSystemOperation>`
- `modifyFile(filePath: string, content: string, options?: Partial<FileOperationOptions>): Promise<FileSystemOperation>`
- `deleteFile(filePath: string, options?: Partial<FileOperationOptions>): Promise<FileSystemOperation>`
- `moveFile(sourcePath: string, targetPath: string, options?: Partial<FileOperationOptions>): Promise<FileSystemOperation>`
- `copyFile(sourcePath: string, targetPath: string, options?: Partial<FileOperationOptions>): Promise<FileSystemOperation>`
- `performAtomicOperation(operation: FileOperation, files: Array<{path: string, content?: string, options?: Partial<FileOperationOptions>}>): Promise<FileSystemOperation[]>`
- `readFile(filePath: string, encoding?: BufferEncoding): Promise<string>`
- `fileExists(filePath: string): Promise<boolean>`
- `getFileStats(filePath: string): Promise<fs.Stats>`
- `createDirectory(dirPath: string, mode?: string): Promise<void>`
- `removeDirectory(dirPath: string, force?: boolean): Promise<void>`

### RollbackManager Class

#### Constructor
```typescript
new RollbackManager(options?: Partial<RollbackConfig>, eventBus?: TypedEventBus)
```

#### Methods
- `createSession(name: string, description?: string, metadata?: Record<string, any>): Promise<RollbackSession>`
- `addOperation(sessionId: string, operation: Omit<RollbackOperation, 'id' | 'timestamp'>): Promise<RollbackOperation>`
- `createBackup(sessionId: string, filePath: string, originalContent?: string): Promise<string>`
- `commitSession(sessionId: string): Promise<void>`
- `rollbackSession(sessionId: string): Promise<void>`
- `forceRollback(sessionId: string): Promise<void>`
- `getSession(sessionId: string): Promise<RollbackSession>`
- `getAllSessions(): Promise<RollbackSession[]>`
- `getSessionsByStatus(status: RollbackSession['status']): Promise<RollbackSession[]>`
- `deleteSession(sessionId: string): Promise<void>`
- `exportSession(sessionId: string): Promise<string>`
- `importSession(sessionData: string): Promise<string>`
- `createSnapshot(sessionId: string, filePaths: string[]): Promise<FileSystemSnapshot>`
- `restoreFromSnapshot(sessionId: string, snapshotId: string): Promise<void>`
- `getStatistics(): Promise<RollbackStatistics>`

## Contributing

When contributing to the Implementer component:

1. **Follow the existing error handling patterns**
2. **Add comprehensive tests for new functionality**
3. **Update documentation for any API changes**
4. **Ensure backward compatibility**
5. **Follow TypeScript best practices**
6. **Add proper event emissions for monitoring**
7. **Include rollback support for file operations**

## License

This component is part of the main project and follows the same license terms.
