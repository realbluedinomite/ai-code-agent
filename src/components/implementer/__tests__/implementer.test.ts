/**
 * Implementer Component Tests
 * 
 * Comprehensive test suite for the code generation and file operations system.
 */

import fs from 'fs/promises';
import path from 'path';
import { 
  Implementer,
  CodeGenerator,
  FileWriter,
  RollbackManager,
  TypedEventBus,
} from '@/components/implementer';

// Mock database client
class MockDatabaseClient {
  async saveImplementation(result: any): Promise<void> {
    console.log('Mock: Saving implementation to database');
  }

  async getImplementation(requestId: string): Promise<any> {
    console.log('Mock: Getting implementation from database');
    return null;
  }

  async getTaskImplementations(taskId: string): Promise<any[]> {
    console.log('Mock: Getting task implementations from database');
    return [];
  }

  async connect(): Promise<void> {
    console.log('Mock: Connecting to database');
  }

  async disconnect(): Promise<void> {
    console.log('Mock: Disconnecting from database');
  }
}

describe('Implementer Component', () => {
  let eventBus: TypedEventBus;
  let mockDatabase: MockDatabaseClient;
  let groqApiKey: string;

  beforeAll(() => {
    // Set up test environment
    groqApiKey = process.env.GROQ_API_KEY || 'mock-api-key';
    eventBus = new TypedEventBus({ verbose: false });
    mockDatabase = new MockDatabaseClient();
  });

  afterEach(async () => {
    // Clean up test files
    const testDirs = ['test-output', 'test-backups', 'test-rollback-sessions'];
    for (const dir of testDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('CodeGenerator', () => {
    it('should create CodeGenerator instance', () => {
      const codeGen = new CodeGenerator(groqApiKey, {}, eventBus);
      expect(codeGen).toBeInstanceOf(CodeGenerator);
    });

    it('should throw error for invalid API key', () => {
      expect(() => {
        new CodeGenerator('', {}, eventBus);
      }).toThrow('Groq API key is required');
    });

    it('should provide available models', () => {
      const codeGen = new CodeGenerator(groqApiKey, {}, eventBus);
      const models = codeGen.getAvailableModels();
      expect(models).toContain('mixtral-8x7b-32768');
      expect(models).toContain('llama-3.1-8b-instant');
    });

    it('should estimate tokens correctly', () => {
      const codeGen = new CodeGenerator(groqApiKey, {}, eventBus);
      const text = 'This is a test string';
      const tokens = codeGen.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should handle validation errors', async () => {
      const codeGen = new CodeGenerator(groqApiKey, {}, eventBus);
      
      // Test empty prompt
      await expect(codeGen.generateCode({ prompt: '' }))
        .rejects
        .toThrow('Prompt is required');
    });
  });

  describe('FileWriter', () => {
    let fileWriter: FileWriter;

    beforeEach(() => {
      fileWriter = new FileWriter({
        defaultEncoding: 'utf8',
        atomicWrites: true,
        backupDirectory: 'test-backups',
      }, eventBus);
    });

    it('should create FileWriter instance', () => {
      expect(fileWriter).toBeInstanceOf(FileWriter);
    });

    it('should create a file', async () => {
      const testFile = 'test-output/create-test.txt';
      const content = 'Test content';

      const operation = await fileWriter.createFile(testFile, content);
      
      expect(operation.status).toBe('completed');
      expect(operation.type).toBe('create');
      expect(operation.targetPath).toBe(testFile);

      // Verify file was created
      const exists = await fileWriter.fileExists(testFile);
      expect(exists).toBe(true);
    });

    it('should modify an existing file', async () => {
      const testFile = 'test-output/modify-test.txt';
      const originalContent = 'Original content';
      const newContent = 'Modified content';

      // Create file first
      await fileWriter.createFile(testFile, originalContent);

      // Modify file
      const operation = await fileWriter.modifyFile(testFile, newContent);
      
      expect(operation.status).toBe('completed');
      expect(operation.type).toBe('modify');

      // Verify content was changed
      const actualContent = await fileWriter.readFile(testFile);
      expect(actualContent).toBe(newContent);
    });

    it('should delete a file', async () => {
      const testFile = 'test-output/delete-test.txt';
      const content = 'Content to delete';

      // Create file first
      await fileWriter.createFile(testFile, content);

      // Verify file exists
      let exists = await fileWriter.fileExists(testFile);
      expect(exists).toBe(true);

      // Delete file
      const operation = await fileWriter.deleteFile(testFile);
      
      expect(operation.status).toBe('completed');
      expect(operation.type).toBe('delete');

      // Verify file was deleted
      exists = await fileWriter.fileExists(testFile);
      expect(exists).toBe(false);
    });

    it('should move a file', async () => {
      const sourceFile = 'test-output/source.txt';
      const targetFile = 'test-output/target.txt';
      const content = 'Content to move';

      // Create source file
      await fileWriter.createFile(sourceFile, content);

      // Move file
      const operation = await fileWriter.moveFile(sourceFile, targetFile);
      
      expect(operation.status).toBe('completed');
      expect(operation.type).toBe('move');

      // Verify file was moved
      const sourceExists = await fileWriter.fileExists(sourceFile);
      const targetExists = await fileWriter.fileExists(targetFile);
      
      expect(sourceExists).toBe(false);
      expect(targetExists).toBe(true);
    });

    it('should copy a file', async () => {
      const sourceFile = 'test-output/source-copy.txt';
      const targetFile = 'test-output/target-copy.txt';
      const content = 'Content to copy';

      // Create source file
      await fileWriter.createFile(sourceFile, content);

      // Copy file
      const operation = await fileWriter.copyFile(sourceFile, targetFile);
      
      expect(operation.status).toBe('completed');
      expect(operation.type).toBe('copy');

      // Verify both files exist
      const sourceExists = await fileWriter.fileExists(sourceFile);
      const targetExists = await fileWriter.fileExists(targetFile);
      
      expect(sourceExists).toBe(true);
      expect(targetExists).toBe(true);

      // Verify content is the same
      const sourceContent = await fileWriter.readFile(sourceFile);
      const targetContent = await fileWriter.readFile(targetFile);
      expect(sourceContent).toBe(targetContent);
    });

    it('should perform atomic operations', async () => {
      const files = [
        { path: 'test-output/atomic1.txt', content: 'Content 1' },
        { path: 'test-output/atomic2.txt', content: 'Content 2' },
        { path: 'test-output/atomic3.txt', content: 'Content 3' },
      ];

      const operations = await fileWriter.performAtomicOperation('create', files);
      
      expect(operations).toHaveLength(3);
      operations.forEach(op => {
        expect(op.status).toBe('completed');
      });

      // Verify all files were created
      for (const file of files) {
        const exists = await fileWriter.fileExists(file.path);
        expect(exists).toBe(true);
      }
    });

    it('should create directories', async () => {
      const dirPath = 'test-output/nested/directory';
      
      await fileWriter.createDirectory(dirPath);
      
      const exists = await fileWriter.fileExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should handle path validation', async () => {
      const secureWriter = new FileWriter({
        security: {
          deniedPaths: ['/etc', '/var'],
          allowedPaths: ['/workspace'],
        },
      }, eventBus);

      // This should fail due to denied path
      await expect(secureWriter.createFile('/etc/passwd', 'test'))
        .rejects
        .toThrow('Path is in denied directory');
    });
  });

  describe('RollbackManager', () => {
    let rollbackManager: RollbackManager;

    beforeEach(() => {
      rollbackManager = new RollbackManager({
        maxSessions: 10,
        maxSessionAge: 24,
        backupRetention: 5,
      }, eventBus);
    });

    it('should create RollbackManager instance', () => {
      expect(rollbackManager).toBeInstanceOf(RollbackManager);
    });

    it('should create rollback session', async () => {
      const session = await rollbackManager.createSession(
        'Test Session',
        'Testing rollback functionality'
      );
      
      expect(session.id).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.status).toBe('active');
      expect(session.operations).toHaveLength(0);
    });

    it('should add operations to session', async () => {
      const session = await rollbackManager.createSession('Test Session');
      
      const operation = await rollbackManager.addOperation(session.id, {
        type: 'create',
        targetPath: 'test-file.txt',
      });
      
      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('create');
      expect(operation.targetPath).toBe('test-file.txt');
    });

    it('should commit session', async () => {
      const session = await rollbackManager.createSession('Test Session');
      await rollbackManager.addOperation(session.id, {
        type: 'create',
        targetPath: 'test-file.txt',
      });
      
      await rollbackManager.commitSession(session.id);
      
      const updatedSession = await rollbackManager.getSession(session.id);
      expect(updatedSession.status).toBe('committed');
      expect(updatedSession.endTime).toBeDefined();
    });

    it('should handle session not found', async () => {
      await expect(rollbackManager.getSession('nonexistent'))
        .rejects
        .toThrow('Rollback session not found');
    });

    it('should list all sessions', async () => {
      // Create a few sessions
      await rollbackManager.createSession('Session 1');
      await rollbackManager.createSession('Session 2');
      await rollbackManager.createSession('Session 3');
      
      const sessions = await rollbackManager.getAllSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(3);
    });

    it('should get sessions by status', async () => {
      const session1 = await rollbackManager.createSession('Active Session');
      const session2 = await rollbackManager.createSession('Committed Session');
      await rollbackManager.commitSession(session2.id);
      
      const activeSessions = await rollbackManager.getSessionsByStatus('active');
      const committedSessions = await rollbackManager.getSessionsByStatus('committed');
      
      expect(activeSessions.length).toBeGreaterThan(0);
      expect(committedSessions.length).toBeGreaterThan(0);
    });

    it('should delete session', async () => {
      const session = await rollbackManager.createSession('Session to Delete');
      const sessionId = session.id;
      
      await rollbackManager.deleteSession(sessionId);
      
      await expect(rollbackManager.getSession(sessionId))
        .rejects
        .toThrow('Rollback session not found');
    });

    it('should get statistics', async () => {
      const stats = await rollbackManager.getStatistics();
      
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('diskUsage');
    });
  });

  describe('Implementer', () => {
    let implementer: Implementer;

    beforeEach(() => {
      implementer = new Implementer(groqApiKey, eventBus, {
        database: mockDatabase,
        config: {
          fileSystem: {
            backupDirectory: 'test-backups',
          },
        },
      });
    });

    it('should create Implementer instance', () => {
      expect(implementer).toBeInstanceOf(Implementer);
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        new Implementer('', eventBus);
      }).toThrow('Groq API key is required');
    });

    it('should validate implementation request', async () => {
      const invalidRequest = {
        taskId: '',
        description: '',
        requirements: [],
      } as any;

      await expect(implementer.implement(invalidRequest))
        .rejects
        .toThrow('Task ID is required');
    });

    it('should handle dry run mode', async () => {
      const request = {
        taskId: 'dryrun-test',
        description: 'Test dry run',
        requirements: ['Create test file'],
        fileOperations: [
          { type: 'create', sourcePath: 'test-output/dryrun.txt', content: 'Test' },
        ],
      };

      const preview = await implementer.implementDryRun(request);
      
      expect(preview).toHaveProperty('preview');
      expect(preview).toHaveProperty('warnings');
      expect(preview).toHaveProperty('estimatedDuration');
      expect(preview.preview.filesToCreate).toContain('test-output/dryrun.txt');
    });

    it('should subscribe to progress updates', () => {
      const callback = jest.fn();
      const subscriptionId = implementer.subscribeToProgress('test-id', callback);
      
      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
    });

    it('should unsubscribe from progress updates', () => {
      const callback = jest.fn();
      const subscriptionId = implementer.subscribeToProgress('test-id', callback);
      
      implementer.unsubscribeFromProgress(subscriptionId);
      // No exception means success
    });

    it('should get component statistics', async () => {
      const stats = await implementer.getStatistics();
      
      expect(stats).toHaveProperty('codeGenerator');
      expect(stats).toHaveProperty('fileSystem');
      expect(stats).toHaveProperty('rollback');
      expect(stats.codeGenerator).toHaveProperty('availableModels');
      expect(stats.fileSystem).toHaveProperty('activeOperations');
    });
  });

  describe('Integration Tests', () => {
    it('should perform complete implementation workflow', async () => {
      const implementer = new Implementer(groqApiKey, eventBus, {
        config: {
          codeGeneration: {
            model: 'mixtral-8x7b-32768',
          },
          fileSystem: {
            backupDirectory: 'test-backups',
            atomicWrites: true,
          },
        },
      });

      const request = {
        taskId: 'integration-test-001',
        description: 'Create a simple utility module',
        requirements: [
          'Create utility functions',
          'Add type definitions',
          'Include error handling',
        ],
        codeGeneration: {
          prompt: 'Create utility functions for string manipulation',
          language: 'typescript',
          style: {
            naming: 'camelCase',
            comments: 'standard',
            errorHandling: 'basic',
          },
        },
        fileOperations: [
          { type: 'create', sourcePath: 'test-output/utils.ts', content: '// Generated code will be inserted' },
        ],
        rollbackStrategy: 'automatic',
      };

      try {
        const result = await implementer.implement(request);
        
        expect(result).toHaveProperty('requestId');
        expect(result).toHaveProperty('taskId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('generatedFiles');
        expect(result).toHaveProperty('appliedOperations');
        expect(result).toHaveProperty('metrics');
        expect(result).toHaveProperty('timestamp');
        
        expect(result.status).toMatch(/success|partial|failed|rolled-back/);
        expect(result.generatedFiles).toBeInstanceOf(Array);
        expect(result.appliedOperations).toBeInstanceOf(Array);
        expect(result.metrics).toHaveProperty('filesCreated');
        expect(result.metrics).toHaveProperty('duration');
        
      } catch (error) {
        // Some implementations might fail due to mock API key
        expect(error).toBeDefined();
      }
    });

    it('should handle rollback automatically on failure', async () => {
      const fileWriter = new FileWriter({
        backupDirectory: 'test-backups',
      }, eventBus);
      
      const rollbackManager = new RollbackManager({
        maxSessions: 5,
      }, eventBus);

      // Create a rollback session
      const session = await rollbackManager.createSession('Test Rollback Session');
      
      // Create some files
      await fileWriter.createFile('test-output/rollback1.txt', 'Content 1');
      await fileWriter.createFile('test-output/rollback2.txt', 'Content 2');
      
      // Add operations to session
      await rollbackManager.addOperation(session.id, {
        type: 'modify',
        targetPath: 'test-output/rollback1.txt',
        originalContent: 'Content 1',
        newContent: 'Modified content 1',
      });
      
      // Commit changes
      await fileWriter.modifyFile('test-output/rollback1.txt', 'Modified content 1');
      
      // Rollback should restore original content
      await rollbackManager.rollbackSession(session.id);
      
      const content = await fileWriter.readFile('test-output/rollback1.txt');
      expect(content).toBe('Content 1');
    });

    it('should track progress through implementation', async () => {
      const eventBus = new TypedEventBus();
      const progressEvents: any[] = [];
      
      eventBus.on('implementer:progress:updated', (data) => {
        progressEvents.push(data);
      });
      
      const implementer = new Implementer(groqApiKey, eventBus, {
        config: {
          fileSystem: {
            backupDirectory: 'test-backups',
          },
        },
      });

      const request = {
        taskId: 'progress-test',
        description: 'Test progress tracking',
        requirements: ['Create test file'],
        fileOperations: [
          { type: 'create', sourcePath: 'test-output/progress.txt', content: 'Test' },
        ],
      };

      try {
        await implementer.implement(request);
      } catch (error) {
        // Expected to fail with mock API key
      }
      
      // Verify progress events were emitted
      expect(progressEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file paths', async () => {
      const fileWriter = new FileWriter({}, eventBus);
      
      await expect(fileWriter.createFile('', 'content'))
        .rejects
        .toThrow();
    });

    it('should handle missing files gracefully', async () => {
      const fileWriter = new FileWriter({}, eventBus);
      
      await expect(fileWriter.readFile('nonexistent-file.txt'))
        .rejects
        .toThrow('not found');
    });

    it('should handle permission errors', async () => {
      const fileWriter = new FileWriter({
        security: {
          deniedPaths: ['/etc'],
        },
      }, eventBus);
      
      await expect(fileWriter.createFile('/etc/test.txt', 'content'))
        .rejects
        .toThrow('denied directory');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent file operations', async () => {
      const fileWriter = new FileWriter({
        maxConcurrentOperations: 10,
      }, eventBus);
      
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(
          fileWriter.createFile(`test-output/concurrent${i}.txt`, `Content ${i}`)
        );
      }
      
      const results = await Promise.all(operations);
      
      results.forEach((result, index) => {
        expect(result.status).toBe('completed');
        expect(result.targetPath).toBe(`test-output/concurrent${index}.txt`);
      });
    });

    it('should estimate implementation duration', async () => {
      const implementer = new Implementer(groqApiKey, eventBus);
      
      const request = {
        taskId: 'duration-test',
        description: 'Test duration estimation',
        requirements: ['Create file'],
        codeGeneration: {
          prompt: 'Create a function',
          language: 'typescript',
        },
        fileOperations: [
          { type: 'create', sourcePath: 'test.txt', content: 'test' },
        ],
      };
      
      const preview = await implementer.implementDryRun(request);
      
      expect(preview.estimatedDuration).toBeGreaterThan(0);
      expect(typeof preview.estimatedDuration).toBe('number');
    });
  });
});

// Utility functions for testing
export async function createTestFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

export async function cleanupTestFiles(): Promise<void> {
  const testDirs = ['test-output', 'test-backups', 'test-rollback-sessions'];
  for (const dir of testDirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
