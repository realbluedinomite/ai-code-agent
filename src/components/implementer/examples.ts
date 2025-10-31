/**
 * Implementer Component Examples
 * 
 * Demonstrates various use cases and patterns for the code generation and file operations system.
 */

import { 
  Implementer, 
  CodeGenerator, 
  FileWriter, 
  RollbackManager,
  TypedEventBus,
} from '@/components/implementer';
import { DatabaseClient } from '@/database/client';

// Example 1: Basic Implementation
export async function basicImplementation() {
  const eventBus = new TypedEventBus();
  
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  const result = await implementer.implement({
    taskId: 'task_basic_001',
    description: 'Create a simple utility function',
    requirements: [
      'Create a utility function for string formatting',
      'Include proper error handling',
      'Add JSDoc comments',
    ],
    codeGeneration: {
      prompt: 'Create a utility function to format strings with proper case (title case)',
      language: 'typescript',
      style: {
        naming: 'camelCase',
        comments: 'detailed',
        errorHandling: 'basic',
        testing: 'basic',
      },
    },
    rollbackStrategy: 'automatic',
  });

  console.log('Basic implementation completed:', result.status);
  console.log('Files created:', result.metrics.filesCreated);
  console.log('Lines of code:', result.metrics.linesOfCode);
}

// Example 2: Multi-file Implementation with Context
export async function multiFileImplementation() {
  const eventBus = new TypedEventBus();
  
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  const result = await implementer.implement({
    taskId: 'task_multi_002',
    description: 'Create a complete user authentication module',
    requirements: [
      'Create user model',
      'Create authentication controller',
      'Create middleware for protection',
      'Create login/register routes',
      'Include JWT token handling',
      'Add comprehensive error handling',
    ],
    codeGeneration: {
      prompt: 'Create a complete user authentication module for an Express.js application',
      language: 'typescript',
      framework: 'express',
      context: {
        projectPath: '/workspace/my-app',
        existingFiles: ['src/app.ts', 'src/types/User.ts'],
        dependencies: ['express', 'jsonwebtoken', 'bcryptjs', 'zod'],
        architecture: 'MVC pattern with middleware',
        patterns: ['dependency injection', 'repository pattern'],
      },
      style: {
        naming: 'camelCase',
        comments: 'detailed',
        formatting: 'verbose',
        errorHandling: 'comprehensive',
        testing: 'comprehensive',
      },
      constraints: {
        maxLines: 200,
        requiredPatterns: ['async/await', 'try/catch', 'interface'],
        securityRequirements: ['input validation', 'password hashing', 'JWT security'],
      },
    },
    fileOperations: [
      {
        type: 'create',
        sourcePath: 'src/models/User.ts',
        content: '// User model will be generated here',
      },
      {
        type: 'create',
        sourcePath: 'src/controllers/AuthController.ts',
        content: '// Auth controller will be generated here',
      },
      {
        type: 'create',
        sourcePath: 'src/middleware/auth.ts',
        content: '// Auth middleware will be generated here',
      },
      {
        type: 'create',
        sourcePath: 'src/routes/auth.ts',
        content: '// Auth routes will be generated here',
      },
    ],
    rollbackStrategy: 'automatic',
  });

  console.log('Multi-file implementation completed:', result.status);
  console.log('Generated files:', result.generatedFiles.map(f => f.path));
}

// Example 3: Dry Run Mode
export async function dryRunExample() {
  const eventBus = new TypedEventBus();
  
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  const request = {
    taskId: 'task_dryrun_003',
    description: 'Create API endpoints for user management',
    requirements: [
      'Create CRUD operations for users',
      'Add validation middleware',
      'Include pagination',
    ],
    codeGeneration: {
      prompt: 'Create REST API endpoints for user management with CRUD operations',
      language: 'typescript',
      framework: 'express',
      style: {
        naming: 'camelCase',
        comments: 'standard',
        errorHandling: 'comprehensive',
      },
    },
    fileOperations: [
      { type: 'create', sourcePath: 'src/routes/users.ts' },
      { type: 'modify', sourcePath: 'src/app.ts', content: '// Routes will be added' },
    ],
    rollbackStrategy: 'automatic',
  };

  // First, do a dry run to preview changes
  const preview = await implementer.implementDryRun(request);
  
  console.log('Dry run preview:');
  console.log('Files to create:', preview.preview.filesToCreate);
  console.log('Files to modify:', preview.preview.filesToModify);
  console.log('Estimated duration:', preview.estimatedDuration, 'ms');
  console.log('Warnings:', preview.warnings);

  if (preview.warnings.length === 0) {
    // Proceed with actual implementation if no warnings
    const result = await implementer.implement(request);
    console.log('Implementation completed:', result.status);
  } else {
    console.log('Skipping implementation due to warnings');
  }
}

// Example 4: Progress Tracking
export async function progressTrackingExample() {
  const eventBus = new TypedEventBus();
  
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  const request = {
    taskId: 'task_progress_004',
    description: 'Create a complex data processing module',
    requirements: [
      'Create data validators',
      'Create data transformers',
      'Create data persistence layer',
      'Add comprehensive logging',
    ],
    codeGeneration: {
      prompt: 'Create a data processing module with validation, transformation, and persistence',
      language: 'typescript',
      style: {
        naming: 'camelCase',
        comments: 'detailed',
        errorHandling: 'comprehensive',
        testing: 'comprehensive',
      },
    },
    rollbackStrategy: 'automatic',
  };

  // Subscribe to progress updates
  const subscriptionId = implementer.subscribeToProgress('impl_001', (progress) => {
    console.log(`Progress: ${progress.progress}% - ${progress.stage}`);
    console.log(`Current operation: ${progress.currentOperation}`);
    if (progress.estimatedTimeRemaining) {
      console.log(`Estimated remaining: ${Math.ceil(progress.estimatedTimeRemaining / 1000)}s`);
    }
  });

  const result = await implementer.implement(request);

  // Cleanup subscription
  implementer.unsubscribeFromProgress(subscriptionId);

  console.log('Implementation completed:', result.status);
  console.log('Total duration:', result.metrics.duration, 'ms');
}

// Example 5: Rollback Session Management
export async function rollbackSessionExample() {
  const eventBus = new TypedEventBus();
  const rollbackManager = new RollbackManager({
    maxSessions: 10,
    backupRetention: 5,
  }, eventBus);

  // Create a rollback session
  const session = await rollbackManager.createSession(
    'Feature development session',
    'Developing user profile functionality'
  );

  console.log('Created rollback session:', session.id);

  // Add some file operations
  await rollbackManager.addOperation(session.id, {
    type: 'create',
    targetPath: 'src/profile/UserProfile.ts',
  });

  await rollbackManager.addOperation(session.id, {
    type: 'create',
    targetPath: 'src/profile/ProfileService.ts',
  });

  // Create backups for critical files
  await rollbackManager.createBackup(session.id, 'src/database/User.ts');

  // Commit the session (make changes permanent)
  await rollbackManager.commitSession(session.id);
  console.log('Session committed successfully');

  // If we need to rollback, we can do so
  // await rollbackManager.rollbackSession(session.id);
}

// Example 6: Database Integration
export async function databaseIntegrationExample() {
  const database = new DatabaseClient({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'implementer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  await database.connect();

  const eventBus = new TypedEventBus();
  
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus, {
    database,
  });

  const result = await implementer.implement({
    taskId: 'task_db_006',
    description: 'Create data access layer',
    requirements: [
      'Create repository pattern',
      'Add database connection handling',
      'Include transaction support',
    ],
    codeGeneration: {
      prompt: 'Create a data access layer using repository pattern with transaction support',
      language: 'typescript',
      context: {
        database: 'PostgreSQL',
        orm: 'TypeORM',
        patterns: ['repository pattern', 'unit of work', 'dependency injection'],
      },
    },
    rollbackStrategy: 'automatic',
  });

  // Get implementation history
  const history = await implementer.getTaskHistory('task_db_006');
  console.log('Implementation history:', history.length, 'entries');

  await database.disconnect();
}

// Example 7: Custom Code Generation with Context
export async function customCodeGenerationExample() {
  const eventBus = new TypedEventBus();
  
  const codeGenerator = new CodeGenerator(process.env.GROQ_API_KEY!, {
    model: 'mixtral-8x7b-32768',
    temperature: 0.5,
    maxTokens: 1024,
  }, eventBus);

  const result = await codeGenerator.generateCode({
    prompt: 'Create a React component for displaying a list of users with search and filtering',
    language: 'typescript',
    framework: 'react',
    context: {
      projectPath: '/workspace/my-react-app',
      existingFiles: ['src/components/BaseComponent.tsx', 'src/types/User.ts'],
      dependencies: ['react', 'react-dom', '@types/react'],
      architecture: 'functional components with hooks',
      businessLogic: 'User management system for an admin dashboard',
    },
    style: {
      naming: 'camelCase',
      comments: 'standard',
      formatting: 'standard',
      errorHandling: 'basic',
      testing: 'basic',
    },
    constraints: {
      maxLines: 100,
      requiredPatterns: ['React.FC', 'useState', 'useEffect'],
      prohibitedPatterns: ['class components'],
    },
  });

  console.log('Generated', result.files.length, 'files');
  console.log('Language detected:', result.language);
  console.log('Confidence score:', result.metadata.confidence);
  
  result.files.forEach(file => {
    console.log(`File: ${file.path} (${file.type})`);
  });
}

// Example 8: Atomic File Operations
export async function atomicFileOperationsExample() {
  const eventBus = new TypedEventBus();
  
  const fileWriter = new FileWriter({
    atomicWrites: true,
    backupDirectory: '.backups',
    defaultEncoding: 'utf8',
    maxConcurrentOperations: 3,
  }, eventBus);

  // Create multiple files atomically (all succeed or all fail)
  const results = await fileWriter.performAtomicOperation('create', [
    {
      path: 'src/module/a.ts',
      content: 'export const a = () => console.log("Module A");',
      options: { permissions: '755' },
    },
    {
      path: 'src/module/b.ts',
      content: 'export const b = () => console.log("Module B");',
      options: { permissions: '755' },
    },
    {
      path: 'src/module/c.ts',
      content: 'export const c = () => console.log("Module C");',
      options: { permissions: '755' },
    },
  ]);

  console.log('Created', results.length, 'files atomically');
  results.forEach(op => {
    console.log(`${op.type}: ${op.targetPath} - ${op.status}`);
  });

  // Check if any operation failed
  const failedOps = results.filter(op => op.status === 'failed');
  if (failedOps.length > 0) {
    console.error('Some operations failed:', failedOps.map(op => op.error));
  }
}

// Example 9: Snapshot and Restore
export async function snapshotRestoreExample() {
  const eventBus = new TypedEventBus();
  const rollbackManager = new RollbackManager({}, eventBus);

  const session = await rollbackManager.createSession(
    'Snapshot test session',
    'Testing snapshot and restore functionality'
  );

  // First, create some files
  const fileWriter = new FileWriter({}, eventBus);
  await fileWriter.createFile('test/file1.txt', 'Content of file 1');
  await fileWriter.createFile('test/file2.txt', 'Content of file 2');
  await fileWriter.createFile('test/file3.txt', 'Content of file 3');

  // Create a snapshot
  const snapshot = await rollbackManager.createSnapshot(session.id, [
    'test/file1.txt',
    'test/file2.txt',
    'test/file3.txt',
  ]);

  console.log('Created snapshot:', snapshot.id);
  console.log('Snapshot includes', snapshot.operations.length, 'files');

  // Modify files
  await fileWriter.modifyFile('test/file1.txt', 'Modified content of file 1');
  await fileWriter.modifyFile('test/file2.txt', 'Modified content of file 2');

  // Restore from snapshot
  await rollbackManager.restoreFromSnapshot(session.id, snapshot.id);

  console.log('Restored files from snapshot');

  // Cleanup
  await rollbackManager.deleteSession(session.id);
}

// Example 10: Event System Integration
export async function eventSystemIntegrationExample() {
  const eventBus = new TypedEventBus({ verbose: true });

  // Listen for implementation events
  eventBus.on('implementer:request:started', (data) => {
    console.log('🚀 Implementation started:', data.requestId);
  });

  eventBus.on('implementer:code:generation:started', (data) => {
    console.log('🤖 Code generation started with model:', data.model);
  });

  eventBus.on('implementer:code:generation:completed', (data) => {
    console.log('✅ Code generation completed:', data.filesGenerated, 'files');
  });

  eventBus.on('implementer:file:operation:started', (data) => {
    console.log('📁 File operation started:', data.operation, data.filePath);
  });

  eventBus.on('implementer:file:operation:completed', (data) => {
    console.log('✅ File operation completed:', data.operation, data.filePath);
  });

  eventBus.on('implementer:rollback:started', (data) => {
    console.log('🔄 Rollback started:', data.sessionId);
  });

  eventBus.on('implementer:request:completed', (data) => {
    console.log('🎉 Implementation completed successfully!');
  });

  eventBus.on('implementer:request:failed', (data) => {
    console.log('❌ Implementation failed:', data.error);
  });

  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  const result = await implementer.implement({
    taskId: 'task_events_010',
    description: 'Create a simple utility class',
    requirements: [
      'Create utility class',
      'Add static methods',
      'Include type definitions',
    ],
    codeGeneration: {
      prompt: 'Create a utility class for string and number operations',
      language: 'typescript',
      style: {
        comments: 'standard',
        errorHandling: 'basic',
      },
    },
    rollbackStrategy: 'automatic',
  });

  console.log('Event-driven implementation completed:', result.status);
}

// Example 11: Error Handling and Recovery
export async function errorHandlingExample() {
  const eventBus = new TypedEventBus();
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  try {
    const result = await implementer.implement({
      taskId: 'task_error_011',
      description: 'Create files with potential conflicts',
      requirements: [
        'Create files that may conflict',
      ],
      fileOperations: [
        { type: 'create', sourcePath: 'test/file.txt', content: 'Initial content' },
      ],
      rollbackStrategy: 'automatic',
    });

    console.log('Implementation succeeded:', result.status);

  } catch (error) {
    console.error('Implementation failed:', error.message);
    
    // The rollback has already been handled automatically
    // due to the rollbackStrategy setting
  }

  // Example of manual rollback
  try {
    // This would fail because the session doesn't exist in this example
    await implementer.cancelImplementation('nonexistent_id');
  } catch (error) {
    console.log('Expected error for nonexistent session:', error.message);
  }
}

// Example 12: Statistics and Monitoring
export async function statisticsMonitoringExample() {
  const eventBus = new TypedEventBus();
  const implementer = new Implementer(process.env.GROQ_API_KEY!, eventBus);

  // Run a few implementations to generate statistics
  for (let i = 1; i <= 3; i++) {
    try {
      await implementer.implement({
        taskId: `task_stats_${i}`,
        description: `Test implementation ${i}`,
        requirements: ['Create test file'],
        fileOperations: [
          { type: 'create', sourcePath: `test/file${i}.txt`, content: `Content ${i}` },
        ],
        rollbackStrategy: 'automatic',
      });
    } catch (error) {
      console.error(`Implementation ${i} failed:`, error.message);
    }
  }

  // Get component statistics
  const stats = await implementer.getStatistics();
  
  console.log('Code Generator Statistics:');
  console.log('  Available models:', stats.codeGenerator.availableModels);
  console.log('  Current model:', stats.codeGenerator.currentModel);

  console.log('File System Statistics:');
  console.log('  Active operations:', stats.fileSystem.activeOperations);
  console.log('  Max concurrent operations:', stats.fileSystem.maxConcurrentOperations);

  console.log('Rollback Statistics:');
  console.log('  Active sessions:', stats.rollback.activeSessions);
  console.log('  Total sessions:', stats.rollback.totalSessions);
}

// Main function to run examples
export async function runAllExamples() {
  console.log('=== Implementer Component Examples ===\n');

  try {
    console.log('1. Basic Implementation...');
    await basicImplementation();
    
    console.log('\n2. Multi-file Implementation...');
    await multiFileImplementation();
    
    console.log('\n3. Dry Run Example...');
    await dryRunExample();
    
    console.log('\n4. Progress Tracking...');
    await progressTrackingExample();
    
    console.log('\n5. Rollback Session Management...');
    await rollbackSessionExample();
    
    console.log('\n6. Custom Code Generation...');
    await customCodeGenerationExample();
    
    console.log('\n7. Atomic File Operations...');
    await atomicFileOperationsExample();
    
    console.log('\n8. Event System Integration...');
    await eventSystemIntegrationExample();
    
    console.log('\n9. Statistics and Monitoring...');
    await statisticsMonitoringExample();

    console.log('\n=== All Examples Completed Successfully ===');
    
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
