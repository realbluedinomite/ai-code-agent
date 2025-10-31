/**
 * Implementer Component Test Suite
 * Comprehensive tests for the Implementer component with performance benchmarks
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  Implementer,
  createImplementer,
  CodeGenerator,
  FileWriter,
  RollbackManager,
  ImplementationResult,
  ImplementationContext,
  CodeChange,
  ImplementationStatus
} from '@/components/implementer';
import { mockEventData } from '../fixtures/mock-data';

// Mock dependencies
jest.mock('@/components/implementer/code-generator');
jest.mock('@/components/implementer/file-writer');
jest.mock('@/components/implementer/rollback-manager');

// Performance benchmarking utilities
class PerformanceBenchmark {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryBefore: number = 0;
  private memoryAfter: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.memoryBefore = process.memoryUsage().heapUsed;
  }

  end(): { duration: number; memoryDiff: number } {
    this.endTime = performance.now();
    this.memoryAfter = process.memoryUsage().heapUsed;
    return {
      duration: this.endTime - this.startTime,
      memoryDiff: this.memoryAfter - this.memoryBefore
    };
  }
}

describe('Implementer Component Tests', () => {
  let implementer: Implementer;
  let performanceBenchmarks: PerformanceBenchmark;
  
  const mockConfig = {
    workspacePath: '/test/workspace',
    backupEnabled: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    codeStyle: {
      indent: 2,
      lineEnding: 'lf',
      maxLineLength: 100
    },
    safety: {
      requireConfirmation: false,
      dryRunMode: false,
      allowOverwrites: true
    },
    optimization: {
      minification: false,
      bundleOptimization: true,
      dependencyOptimization: true
    }
  };

  const mockTask = {
    id: 'task-1',
    title: 'Implement user authentication',
    description: 'Create OAuth2 authentication system',
    type: 'implementation' as const,
    estimatedDuration: 4 * 60 * 60 * 1000, // 4 hours
    dependencies: [],
    context: {
      filePaths: ['src/auth/', 'src/components/Login.tsx'],
      environment: 'development',
      parameters: { provider: 'google', strategy: 'oauth2' }
    }
  };

  const mockImplementationContext: ImplementationContext = {
    task: mockTask,
    projectPath: '/test/project',
    targetPath: '/test/workspace',
    dryRun: false,
    backupRequired: true,
    rollbackEnabled: true,
    metadata: {
      userId: 'test-user',
      sessionId: 'test-session',
      timestamp: new Date()
    }
  };

  const sampleCodeChanges: CodeChange[] = [
    {
      filePath: 'src/auth/Login.tsx',
      type: 'create',
      content: `import React from 'react';

export const Login: React.FC = () => {
  return (
    <div className="login-container">
      <h1>Login</h1>
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};`,
      originalContent: null,
      backupCreated: true,
      checksum: 'abc123'
    },
    {
      filePath: 'src/auth/oauth2.ts',
      type: 'create',
      content: `export class OAuth2Provider {
  constructor(private config: any) {}

  async authenticate(code: string): Promise<any> {
    // OAuth2 implementation
    return { success: true, user: {} };
  }
}`,
      originalContent: null,
      backupCreated: true,
      checksum: 'def456'
    },
    {
      filePath: 'src/components/Button.tsx',
      type: 'modify',
      content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};`,
      originalContent: `export const Button = () => <button>Click</button>;`,
      backupCreated: true,
      checksum: 'ghi789'
    }
  ];

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    performanceBenchmarks = new PerformanceBenchmark();
    jest.clearAllMocks();
    
    implementer = createImplementer(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should initialize with valid configuration', () => {
      performanceBenchmarks.start();
      
      expect(implementer).toBeDefined();
      expect(implementer).toBeInstanceOf(Implementer);
      
      const perf = performanceBenchmarks.end();
      expect(perf.duration).toBeLessThan(50); // Should initialize in < 50ms
    });

    test('should initialize with default configuration', () => {
      const defaultImplementer = createImplementer();
      expect(defaultImplementer).toBeDefined();
    });

    test('should validate workspace path', () => {
      expect(() => {
        createImplementer({ ...mockConfig, workspacePath: '' });
      }).toThrow();

      expect(() => {
        createImplementer({ ...mockConfig, workspacePath: null as any });
      }).toThrow();
    });

    test('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        maxFileSize: -1,
        codeStyle: {
          indent: -1,
          lineEnding: 'invalid' as any
        }
      };
      
      expect(() => {
        createImplementer(invalidConfig);
      }).toThrow();
    });
  });

  describe('Code Implementation', () => {
    test('should implement task successfully', async () => {
      const mockResult: ImplementationResult = {
        taskId: mockTask.id,
        status: ImplementationStatus.COMPLETED,
        changes: sampleCodeChanges,
        warnings: [],
        errors: [],
        metrics: {
          filesCreated: 2,
          filesModified: 1,
          linesAdded: 45,
          linesRemoved: 3,
          duration: 5000
        },
        rollbackId: 'rollback-123',
        createdAt: new Date(),
        completedAt: new Date()
      };

      // Mock the internal methods
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: sampleCodeChanges });
      (implementer as any).rollbackManager.createRollback = jest.fn()
        .mockResolvedValue('rollback-123');

      performanceBenchmarks.start();
      const result = await implementer.implementTask(mockImplementationContext);
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.changes).toHaveLength(3);
      expect(result.metrics.filesCreated).toBe(2);
      expect(result.metrics.filesModified).toBe(1);
      expect(perf.duration).toBeLessThan(10000); // Should implement in < 10s
    });

    test('should handle dry run mode', async () => {
      const dryRunContext: ImplementationContext = {
        ...mockImplementationContext,
        dryRun: true
      };

      const mockDryRunResult: ImplementationResult = {
        taskId: mockTask.id,
        status: ImplementationStatus.DRY_RUN,
        changes: sampleCodeChanges.map(change => ({
          ...change,
          dryRunOnly: true
        })),
        warnings: ['This is a dry run - no files were actually created'],
        errors: [],
        metrics: {
          filesCreated: 2,
          filesModified: 1,
          linesAdded: 45,
          linesRemoved: 3,
          duration: 1000
        },
        rollbackId: null,
        createdAt: new Date(),
        completedAt: new Date()
      };

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);

      const result = await implementer.implementTask(dryRunContext);
      
      expect(result.status).toBe(ImplementationStatus.DRY_RUN);
      expect(result.changes[0].dryRunOnly).toBe(true);
      expect(result.warnings).toContain('dry run');
    });

    test('should handle partial implementation failures', async () => {
      const partialFailureChanges = [
        ...sampleCodeChanges.slice(0, 2), // First two succeed
        {
          ...sampleCodeChanges[2],
          error: new Error('Write permission denied')
        }
      ];

      const mockPartialResult: ImplementationResult = {
        taskId: mockTask.id,
        status: ImplementationStatus.PARTIAL,
        changes: partialFailureChanges,
        warnings: ['Some files could not be written'],
        errors: ['Write permission denied'],
        metrics: {
          filesCreated: 1,
          filesModified: 1,
          linesAdded: 30,
          linesRemoved: 0,
          duration: 3000
        },
        rollbackId: 'rollback-456',
        createdAt: new Date(),
        completedAt: new Date()
      };

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(partialFailureChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ 
          success: false, 
          changes: partialFailureChanges,
          errors: ['Write permission denied']
        });
      (implementer as any).rollbackManager.createRollback = jest.fn()
        .mockResolvedValue('rollback-456');

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.PARTIAL);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toContain('Some files could not be written');
    });
  });

  describe('Code Generation', () => {
    test('should generate TypeScript React components', async () => {
      const reactTask = {
        ...mockTask,
        context: {
          ...mockTask.context,
          parameters: { framework: 'react', language: 'typescript' }
        }
      };

      const reactContext: ImplementationContext = {
        ...mockImplementationContext,
        task: reactTask
      };

      const reactChanges: CodeChange[] = [
        {
          filePath: 'src/components/ReactComponent.tsx',
          type: 'create',
          content: `import React, { useState } from 'react';

interface Props {
  title: string;
}

export const ReactComponent: React.FC<Props> = ({ title }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
};`,
          originalContent: null,
          backupCreated: false,
          checksum: 'react123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(reactChanges);

      const result = await implementer.implementTask(reactContext);
      
      expect(result.changes[0].content).toContain('React.FC');
      expect(result.changes[0].content).toContain('useState');
      expect(result.changes[0].content).toContain('interface Props');
    });

    test('should generate Node.js API endpoints', async () => {
      const apiTask = {
        ...mockTask,
        context: {
          ...mockTask.context,
          parameters: { framework: 'express', language: 'javascript' }
        }
      };

      const apiContext: ImplementationContext = {
        ...mockImplementationContext,
        task: apiTask
      };

      const apiChanges: CodeChange[] = [
        {
          filePath: 'src/routes/users.js',
          type: 'create',
          content: `const express = require('express');
const router = express.Router();

router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;`,
          originalContent: null,
          backupCreated: false,
          checksum: 'api123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(apiChanges);

      const result = await implementer.implementTask(apiContext);
      
      expect(result.changes[0].content).toContain('express.Router');
      expect(result.changes[0].content).toContain('router.get');
      expect(result.changes[0].content).toContain('router.post');
    });

    test('should generate Python functions', async () => {
      const pythonTask = {
        ...mockTask,
        context: {
          ...mockTask.context,
          parameters: { language: 'python', version: '3.9' }
        }
      };

      const pythonContext: ImplementationContext = {
        ...mockImplementationContext,
        task: pythonTask
      };

      const pythonChanges: CodeChange[] = [
        {
          filePath: 'src/utils/helpers.py',
          type: 'create',
          content: `from typing import List, Optional
import logging

def process_data(items: List[str], filter_criteria: Optional[str] = None) -> List[str]:
    """
    Process a list of items with optional filtering.
    
    Args:
        items: List of strings to process
        filter_criteria: Optional filter criteria
    
    Returns:
        Filtered and processed list
    """
    logger = logging.getLogger(__name__)
    
    try:
        if filter_criteria:
            filtered = [item for item in items if filter_criteria in item]
            logger.info(f"Filtered {len(items)} items to {len(filtered)} items")
            return filtered
        return items
    except Exception as e:
        logger.error(f"Error processing items: {e}")
        raise`,
          originalContent: null,
          backupCreated: false,
          checksum: 'python123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(pythonChanges);

      const result = await implementer.implementTask(pythonContext);
      
      expect(result.changes[0].content).toContain('from typing import');
      expect(result.changes[0].content).toContain('def process_data');
      expect(result.changes[0].content).toContain('logger = logging.getLogger');
    });
  });

  describe('File Operations', () => {
    test('should create new files successfully', async () => {
      const createOnlyChanges: CodeChange[] = [
        {
          filePath: 'src/new-file.ts',
          type: 'create',
          content: 'export const newFunction = () => "new";',
          originalContent: null,
          backupCreated: false,
          checksum: 'new123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(createOnlyChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ 
          success: true, 
          changes: createOnlyChanges,
          created: ['src/new-file.ts']
        });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.metrics.filesCreated).toBe(1);
      expect(result.changes[0].type).toBe('create');
    });

    test('should modify existing files safely', async () => {
      const modifyChanges: CodeChange[] = [
        {
          filePath: 'src/existing-file.ts',
          type: 'modify',
          content: 'export const modified = () => "modified";',
          originalContent: 'export const original = () => "original";',
          backupCreated: true,
          checksum: 'mod123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(modifyChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ 
          success: true, 
          changes: modifyChanges,
          modified: ['src/existing-file.ts']
        });
      (implementer as any).rollbackManager.createRollback = jest.fn()
        .mockResolvedValue('rollback-789');

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.metrics.filesModified).toBe(1);
      expect(result.changes[0].type).toBe('modify');
      expect(result.changes[0].backupCreated).toBe(true);
    });

    test('should handle file conflicts', async () => {
      const conflictingChanges: CodeChange[] = [
        {
          filePath: 'src/conflict-file.ts',
          type: 'modify',
          content: 'export const newContent = () => "new";',
          originalContent: 'export const oldContent = () => "old";',
          backupCreated: false,
          checksum: 'conflict123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(conflictingChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ 
          success: false, 
          changes: conflictingChanges,
          errors: ['File has been modified by another process'],
          conflicts: ['src/conflict-file.ts']
        });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.PARTIAL);
      expect(result.errors).toContain('File has been modified by another process');
    });

    test('should handle permission errors', async () => {
      const permissionChanges: CodeChange[] = [
        {
          filePath: 'protected/file.ts',
          type: 'create',
          content: 'export const protected = () => "protected";',
          originalContent: null,
          backupCreated: false,
          checksum: 'perm123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(permissionChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockRejectedValue(new Error('Permission denied'));

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.FAILED);
      expect(result.errors).toContain('Permission denied');
    });
  });

  describe('Rollback Management', () => {
    test('should create rollback before modifications', async () => {
      const modificationContext: ImplementationContext = {
        ...mockImplementationContext,
        rollbackEnabled: true
      };

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue([{
          filePath: 'src/modify.ts',
          type: 'modify',
          content: 'new content',
          originalContent: 'old content',
          backupCreated: false,
          checksum: 'rb123'
        }]);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ 
          success: true, 
          changes: []
        });
      (implementer as any).rollbackManager.createRollback = jest.fn()
        .mockResolvedValue('rollback-123');

      const result = await implementer.implementTask(modificationContext);
      
      expect(result.rollbackId).toBe('rollback-123');
      expect((implementer as any).rollbackManager.createRollback).toHaveBeenCalled();
    });

    test('should rollback changes on failure', async () => {
      const failingContext: ImplementationContext = {
        ...mockImplementationContext,
        rollbackEnabled: true
      };

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockRejectedValue(new Error('Generation failed'));

      await expect(implementer.implementTask(failingContext)).rejects.toThrow();
      
      expect((implementer as any).rollbackManager.rollback).toHaveBeenCalled();
    });

    test('should handle rollback failures gracefully', async () => {
      const rollbackContext: ImplementationContext = {
        ...mockImplementationContext,
        rollbackEnabled: true
      };

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockRejectedValue(new Error('Generation failed'));
      (implementer as any).rollbackManager.rollback = jest.fn()
        .mockRejectedValue(new Error('Rollback failed'));

      await expect(implementer.implementTask(rollbackContext)).rejects.toThrow();
      
      // Should attempt rollback even if it fails
      expect((implementer as any).rollbackManager.rollback).toHaveBeenCalled();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should implement simple changes quickly', async () => {
      const simpleChanges: CodeChange[] = [
        {
          filePath: 'src/simple.ts',
          type: 'create',
          content: 'export const simple = () => "simple";',
          originalContent: null,
          backupCreated: false,
          checksum: 'simple123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(simpleChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: simpleChanges });

      performanceBenchmarks.start();
      const result = await implementer.implementTask(mockImplementationContext);
      const perf = performanceBenchmarks.end();
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(perf.duration).toBeLessThan(2000); // < 2 seconds for simple changes
      expect(perf.memoryDiff).toBeLessThan(5 * 1024 * 1024); // < 5MB memory
    });

    test('should handle complex implementations efficiently', async () => {
      const complexChanges = Array.from({ length: 20 }, (_, i) => ({
        filePath: `src/complex-${i}.ts`,
        type: 'create' as const,
        content: `export const function${i} = () => "complex ${i}";`,
        originalContent: null,
        backupCreated: false,
        checksum: `complex${i}`
      }));

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(complexChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: complexChanges });

      performanceBenchmarks.start();
      const result = await implementer.implementTask(mockImplementationContext);
      const perf = performanceBenchmarks.end();
      
      expect(result.changes).toHaveLength(20);
      expect(perf.duration).toBeLessThan(15000); // < 15 seconds for complex changes
      expect(perf.memoryDiff).toBeLessThan(50 * 1024 * 1024); // < 50MB memory
    });

    test('should handle concurrent implementations', async () => {
      const concurrentContexts = Array.from({ length: 3 }, (_, i) => ({
        ...mockImplementationContext,
        task: {
          ...mockTask,
          id: `task-${i}`,
          title: `Implementation ${i}`
        }
      }));

      const concurrentChanges = concurrentContexts.map((_, i) => [{
        filePath: `src/concurrent-${i}.ts`,
        type: 'create' as const,
        content: `export const concurrent${i} = () => "concurrent ${i}";`,
        originalContent: null,
        backupCreated: false,
        checksum: `concurrent${i}`
      }]);

      concurrentChanges.forEach((changes, i) => {
        (implementer as any).codeGenerator.generateCode = jest.fn()
          .mockResolvedValue(changes);
        (implementer as any).fileWriter.writeChanges = jest.fn()
          .mockResolvedValue({ success: true, changes });
      });

      performanceBenchmarks.start();
      const results = await Promise.all(
        concurrentContexts.map(context => implementer.implementTask(context))
      );
      const perf = performanceBenchmarks.end();
      
      expect(results).toHaveLength(3);
      expect(perf.duration).toBeLessThan(20000); // < 20 seconds for 3 concurrent implementations
    });
  });

  describe('Code Quality and Validation', () => {
    test('should validate generated code syntax', async () => {
      const invalidSyntaxChanges: CodeChange[] = [
        {
          filePath: 'src/invalid.ts',
          type: 'create',
          content: 'export const invalid = () => { return "missing semicolon"', // Missing closing brace and semicolon
          originalContent: null,
          backupCreated: false,
          checksum: 'invalid123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(invalidSyntaxChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: invalidSyntaxChanges });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.warnings).toContain(expect.stringContaining('syntax'));
    });

    test('should enforce code style guidelines', async () => {
      const poorlyStyledChanges: CodeChange[] = [
        {
          filePath: 'src/poor-style.ts',
          type: 'create',
          content: `export const poorlyStyled=()=>{return"long line that exceeds maximum length limits and should be wrapped"};`,
          originalContent: null,
          backupCreated: false,
          checksum: 'style123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(poorlyStyledChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: poorlyStyledChanges });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.warnings).toContain(expect.stringMatching(/style|format/i));
    });

    test('should check for security vulnerabilities', async () => {
      const insecureChanges: CodeChange[] = [
        {
          filePath: 'src/insecure.ts',
          type: 'create',
          content: `export const insecure = (userInput) => {
  eval(userInput); // Security risk
  return document.getElementById('result').innerHTML = userInput; // XSS risk
};`,
          originalContent: null,
          backupCreated: false,
          checksum: 'insecure123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(insecureChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: insecureChanges });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.warnings).toContain(expect.stringMatching(/security|vulnerability/i));
    });
  });

  describe('Error Handling', () => {
    test('should handle generation failures gracefully', async () => {
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockRejectedValue(new Error('Code generation failed'));

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.FAILED);
      expect(result.errors).toContain('Code generation failed');
    });

    test('should handle file system errors', async () => {
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockRejectedValue(new Error('File system error'));

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.FAILED);
      expect(result.errors).toContain('File system error');
    });

    test('should handle workspace not found errors', async () => {
      const missingWorkspaceContext: ImplementationContext = {
        ...mockImplementationContext,
        targetPath: '/non/existent/workspace'
      };

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockRejectedValue(new Error('Workspace not found'));

      await expect(implementer.implementTask(missingWorkspaceContext)).rejects.toThrow('Workspace not found');
    });

    test('should handle disk space errors', async () => {
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockRejectedValue(new Error('No space left on device'));

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.FAILED);
      expect(result.errors).toContain('No space left on device');
    });
  });

  describe('Integration with Event System', () => {
    test('should emit implementation started events', async () => {
      const eventSpy = jest.spyOn(implementer, 'emit');
      
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: sampleCodeChanges });

      await implementer.implementTask(mockImplementationContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'implementation:started',
        expect.objectContaining({
          taskId: mockTask.id,
          context: expect.objectContaining({
            task: expect.any(Object)
          }),
          timestamp: expect.any(Date)
        })
      );
    });

    test('should emit implementation completed events', async () => {
      const eventSpy = jest.spyOn(implementer, 'emit');
      
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: sampleCodeChanges });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'implementation:completed',
        expect.objectContaining({
          taskId: mockTask.id,
          result: expect.objectContaining({
            status: expect.any(String),
            changes: expect.any(Array)
          }),
          duration: expect.any(Number)
        })
      );
    });

    test('should emit implementation error events', async () => {
      const eventSpy = jest.spyOn(implementer, 'emit');
      
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockRejectedValue(new Error('Implementation failed'));

      await expect(implementer.implementTask(mockImplementationContext)).rejects.toThrow();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'implementation:error',
        expect.objectContaining({
          taskId: mockTask.id,
          context: expect.any(Object),
          error: expect.any(Error)
        })
      );
    });

    test('should emit file operation events', async () => {
      const eventSpy = jest.spyOn(implementer, 'emit');
      
      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(sampleCodeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ 
          success: true, 
          changes: sampleCodeChanges,
          created: ['src/auth/Login.tsx', 'src/auth/oauth2.ts'],
          modified: ['src/components/Button.tsx']
        });

      await implementer.implementTask(mockImplementationContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'file:created',
        expect.objectContaining({
          files: expect.arrayContaining(['src/auth/Login.tsx'])
        })
      );
      
      expect(eventSpy).toHaveBeenCalledWith(
        'file:modified',
        expect.objectContaining({
          files: expect.arrayContaining(['src/components/Button.tsx'])
        })
      );
    });
  });

  describe('Resource Management', () => {
    test('should not leak memory during repeated implementations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many implementation operations
      for (let i = 0; i < 30; i++) {
        (implementer as any).codeGenerator.generateCode = jest.fn()
          .mockResolvedValue([{
            filePath: `src/test-${i}.ts`,
            type: 'create',
            content: `export const test${i} = () => "test ${i}";`,
            originalContent: null,
            backupCreated: false,
            checksum: `test${i}`
          }]);
        (implementer as any).fileWriter.writeChanges = jest.fn()
          .mockResolvedValue({ success: true, changes: [] });

        await implementer.implementTask({
          ...mockImplementationContext,
          task: { ...mockTask, id: `mem-test-${i}` }
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 30MB)
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024);
    });

    test('should clean up resources properly', async () => {
      const resourceSpy = jest.spyOn(implementer as any, 'cleanup');
      
      implementer.destroy();
      
      expect(resourceSpy).toHaveBeenCalled();
    });

    test('should handle large file implementations', async () => {
      const largeFileContent = Array.from({ length: 10000 }, (_, i) => 
        `export const function${i} = () => ${i};`
      ).join('\n');

      const largeChanges: CodeChange[] = [
        {
          filePath: 'src/large-file.ts',
          type: 'create',
          content: largeFileContent,
          originalContent: null,
          backupCreated: false,
          checksum: 'large123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(largeChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: largeChanges });

      const result = await implementer.implementTask(mockImplementationContext);
      
      expect(result.status).toBe(ImplementationStatus.COMPLETED);
      expect(result.metrics.linesAdded).toBe(10000);
    });
  });

  describe('Advanced Features', () => {
    test('should handle template-based generation', async () => {
      const templateContext: ImplementationContext = {
        ...mockImplementationContext,
        task: {
          ...mockTask,
          context: {
            ...mockTask.context,
            template: 'component-template',
            parameters: {
              name: 'UserCard',
              props: ['title', 'content', 'onAction']
            }
          }
        }
      };

      const templateChanges: CodeChange[] = [
        {
          filePath: 'src/components/UserCard.tsx',
          type: 'create',
          content: `import React from 'react';

interface UserCardProps {
  title: string;
  content: string;
  onAction: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ title, content, onAction }) => {
  return (
    <div className="user-card">
      <h3>{title}</h3>
      <p>{content}</p>
      <button onClick={onAction}>Action</button>
    </div>
  );
};`,
          originalContent: null,
          backupCreated: false,
          checksum: 'template123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(templateChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: templateChanges });

      const result = await implementer.implementTask(templateContext);
      
      expect(result.changes[0].content).toContain('UserCardProps');
      expect(result.changes[0].content).toContain('title: string');
      expect(result.changes[0].content).toContain('content: string');
      expect(result.changes[0].content).toContain('onAction: () => void');
    });

    test('should integrate with dependency management', async () => {
      const dependencyContext: ImplementationContext = {
        ...mockImplementationContext,
        task: {
          ...mockTask,
          context: {
            ...mockTask.context,
            installDependencies: true,
            dependencies: ['react', 'lodash', 'axios']
          }
        }
      };

      const dependencyChanges: CodeChange[] = [
        {
          filePath: 'src/installed-dependency.ts',
          type: 'create',
          content: `import _ from 'lodash';
import axios from 'axios';

export const useExternalLibraries = () => {
  const processed = _.chunk([1, 2, 3, 4], 2);
  const response = axios.get('/api/data');
  return { processed, response };
};`,
          originalContent: null,
          backupCreated: false,
          checksum: 'dep123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(dependencyChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: dependencyChanges });

      const result = await implementer.implementTask(dependencyContext);
      
      expect(result.changes[0].content).toContain('import _ from');
      expect(result.changes[0].content).toContain('import axios from');
    });

    test('should handle test generation', async () => {
      const testContext: ImplementationContext = {
        ...mockImplementationContext,
        task: {
          ...mockTask,
          context: {
            ...mockTask.context,
            generateTests: true,
            testFramework: 'jest'
          }
        }
      };

      const testChanges: CodeChange[] = [
        {
          filePath: 'src/components/__tests__/Button.test.tsx',
          type: 'create',
          content: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});`,
          originalContent: null,
          backupCreated: false,
          checksum: 'test123'
        }
      ];

      (implementer as any).codeGenerator.generateCode = jest.fn()
        .mockResolvedValue(testChanges);
      (implementer as any).fileWriter.writeChanges = jest.fn()
        .mockResolvedValue({ success: true, changes: testChanges });

      const result = await implementer.implementTask(testContext);
      
      expect(result.changes[0].filePath).toContain('__tests__');
      expect(result.changes[0].content).toContain('describe(');
      expect(result.changes[0].content).toContain('it(');
    });
  });
});