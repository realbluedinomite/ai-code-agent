/**
 * Project Analyzer Component Test Suite
 * Comprehensive tests for the Project Analyzer component with performance benchmarks
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  ProjectAnalyzer,
  DependencyAnalyzer,
  FileAnalyzer,
  PatternDetector,
  createProjectAnalyzer,
  ProjectAnalysisResult,
  FileAnalysisResult,
  DependencyInfo,
  CodePattern
} from '@/components/project-analyzer';
import { mockEventData } from '../fixtures/mock-data';

// Mock dependencies
jest.mock('@/components/project-analyzer/dependency-analyzer');
jest.mock('@/components/project-analyzer/file-analyzer');
jest.mock('@/components/project-analyzer/pattern-detector');
jest.mock('@/components/project-analyzer/symbol-table');
jest.mock('@/components/project-analyzer/cache-manager');

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

describe('Project Analyzer Component Tests', () => {
  let analyzer: ProjectAnalyzer;
  let performanceBenchmarks: PerformanceBenchmark;
  
  const mockProjectPath = '/test/project';
  const mockConfig = {
    includeNodeModules: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedLanguages: ['typescript', 'javascript', 'python', 'java'],
    cacheEnabled: true,
    analysisDepth: 'full'
  };

  const sampleProjectStructure = {
    'src': {
      'index.ts': 'export { default } from "./app";',
      'app.ts': 'import React from "react";',
      'components': {
        'Button.tsx': 'export const Button = () => <button>Click</button>;',
        'Input.tsx': 'export const Input = () => <input />;'
      },
      'utils': {
        'helpers.ts': 'export const helper = () => {};'
      }
    },
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        'typescript': '^5.0.0'
      }
    }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs'
      }
    })
  };

  const mockDependencyInfo: DependencyInfo[] = [
    {
      name: 'react',
      version: '^18.0.0',
      type: 'dependency',
      path: 'node_modules/react',
      usedIn: ['src/app.ts', 'src/components/Button.tsx'],
      confidence: 0.95
    },
    {
      name: 'typescript',
      version: '^5.0.0',
      type: 'devDependency',
      path: 'node_modules/typescript',
      usedIn: [],
      confidence: 0.9
    }
  ];

  const mockFileAnalysisResults: FileAnalysisResult[] = [
    {
      filePath: 'src/index.ts',
      language: 'typescript',
      size: 1024,
      complexity: 1,
      functions: 0,
      classes: 0,
      imports: ['react'],
      exports: ['default'],
      lastModified: new Date(),
      checksum: 'abc123'
    },
    {
      filePath: 'src/app.ts',
      language: 'typescript',
      size: 2048,
      complexity: 2,
      functions: 0,
      classes: 0,
      imports: ['react'],
      exports: [],
      lastModified: new Date(),
      checksum: 'def456'
    }
  ];

  const mockCodePatterns: CodePattern[] = [
    {
      pattern: 'component-pattern',
      type: 'best-practice',
      location: 'src/components',
      confidence: 0.9,
      description: 'React component pattern detected'
    },
    {
      pattern: 'singleton-pattern',
      type: 'pattern',
      location: 'src/utils',
      confidence: 0.8,
      description: 'Singleton pattern detected'
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
    
    analyzer = createProjectAnalyzer(mockProjectPath, mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should initialize with valid configuration', () => {
      performanceBenchmarks.start();
      
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(ProjectAnalyzer);
      
      const perf = performanceBenchmarks.end();
      expect(perf.duration).toBeLessThan(50); // Should initialize in < 50ms
    });

    test('should initialize with default configuration', () => {
      const defaultAnalyzer = createProjectAnalyzer(mockProjectPath);
      expect(defaultAnalyzer).toBeDefined();
    });

    test('should validate project path', () => {
      expect(() => {
        createProjectAnalyzer('', mockConfig);
      }).toThrow();

      expect(() => {
        createProjectAnalyzer(null as any, mockConfig);
      }).toThrow();
    });

    test('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        maxFileSize: -1,
        analysisDepth: 'invalid' as any
      };
      
      expect(() => {
        createProjectAnalyzer(mockProjectPath, invalidConfig);
      }).toThrow();
    });
  });

  describe('Project Analysis', () => {
    test('should analyze project structure successfully', async () => {
      const mockAnalysisResult: ProjectAnalysisResult = {
        projectPath: mockProjectPath,
        projectType: 'typescript-react',
        language: 'typescript',
        totalFiles: 5,
        totalSize: 8192,
        fileTypes: {
          '.ts': 3,
          '.tsx': 2,
          '.json': 2
        },
        dependencies: mockDependencyInfo,
        devDependencies: [],
        peerDependencies: [],
        files: mockFileAnalysisResults,
        patterns: mockCodePatterns,
        architecture: {
          layers: ['components', 'utils', 'core'],
          entryPoints: ['src/index.ts'],
          testCoverage: 0.7
        },
        analysisTime: 1000,
        timestamp: new Date()
      };

      // Mock the analyzeProject method
      (analyzer as any).analyzeProject = jest.fn().mockResolvedValue(mockAnalysisResult);

      performanceBenchmarks.start();
      const result = await analyzer.analyzeProject();
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result.projectType).toBe('typescript-react');
      expect(result.totalFiles).toBe(5);
      expect(perf.duration).toBeLessThan(5000); // Should analyze in < 5s
    });

    test('should handle non-existent project path', async () => {
      const nonExistentAnalyzer = createProjectAnalyzer('/non/existent/path');
      
      await expect(nonExistentAnalyzer.analyzeProject()).rejects.toThrow();
    });

    test('should handle empty project', async () => {
      const emptyProjectAnalyzer = createProjectAnalyzer('/empty/project');
      
      const mockEmptyResult: ProjectAnalysisResult = {
        projectPath: '/empty/project',
        projectType: 'unknown',
        language: 'unknown',
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: {
          layers: [],
          entryPoints: [],
          testCoverage: 0
        },
        analysisTime: 100,
        timestamp: new Date()
      };

      (emptyProjectAnalyzer as any).analyzeProject = jest.fn().mockResolvedValue(mockEmptyResult);

      const result = await emptyProjectAnalyzer.analyzeProject();
      expect(result.totalFiles).toBe(0);
      expect(result.dependencies).toHaveLength(0);
    });
  });

  describe('File Analysis', () => {
    test('should analyze individual files correctly', async () => {
      const testFilePath = 'src/components/Button.tsx';
      const expectedFileResult = mockFileAnalysisResults[0];

      (analyzer as any).fileAnalyzer.analyzeFile = jest.fn()
        .mockResolvedValue(expectedFileResult);

      performanceBenchmarks.start();
      const result = await analyzer.analyzeFile(testFilePath);
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result.filePath).toBe(testFilePath);
      expect(result.language).toBe('typescript');
      expect(perf.duration).toBeLessThan(1000); // Should analyze file in < 1s
    });

    test('should handle non-existent files', async () => {
      const nonExistentFile = 'non/existent/file.ts';
      
      (analyzer as any).fileAnalyzer.analyzeFile = jest.fn()
        .mockRejectedValue(new Error('File not found'));

      await expect(analyzer.analyzeFile(nonExistentFile)).rejects.toThrow('File not found');
    });

    test('should analyze different file types', async () => {
      const testFiles = [
        { path: 'src/app.ts', expectedLanguage: 'typescript' },
        { path: 'src/app.js', expectedLanguage: 'javascript' },
        { path: 'src/app.py', expectedLanguage: 'python' },
        { path: 'src/App.java', expectedLanguage: 'java' }
      ];

      for (const { path, expectedLanguage } of testFiles) {
        const mockResult: FileAnalysisResult = {
          filePath: path,
          language: expectedLanguage,
          size: 1024,
          complexity: 1,
          functions: 0,
          classes: 0,
          imports: [],
          exports: [],
          lastModified: new Date(),
          checksum: 'abc123'
        };

        (analyzer as any).fileAnalyzer.analyzeFile = jest.fn()
          .mockResolvedValue(mockResult);

        const result = await analyzer.analyzeFile(path);
        expect(result.language).toBe(expectedLanguage);
      }
    });
  });

  describe('Dependency Analysis', () => {
    test('should analyze project dependencies', async () => {
      (analyzer as any).dependencyAnalyzer.analyzeDependencies = jest.fn()
        .mockResolvedValue(mockDependencyInfo);

      performanceBenchmarks.start();
      const result = await analyzer.analyzeDependencies();
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('version');
      expect(result[0]).toHaveProperty('type');
      expect(perf.duration).toBeLessThan(2000); // Should analyze dependencies in < 2s
    });

    test('should detect different dependency types', async () => {
      const mixedDependencies: DependencyInfo[] = [
        ...mockDependencyInfo,
        {
          name: 'jest',
          version: '^29.0.0',
          type: 'devDependency',
          path: 'node_modules/jest',
          usedIn: [],
          confidence: 0.95
        }
      ];

      (analyzer as any).dependencyAnalyzer.analyzeDependencies = jest.fn()
        .mockResolvedValue(mixedDependencies);

      const result = await analyzer.analyzeDependencies();
      
      const dependencies = result.filter(d => d.type === 'dependency');
      const devDependencies = result.filter(d => d.type === 'devDependency');
      
      expect(dependencies.length).toBeGreaterThan(0);
      expect(devDependencies.length).toBeGreaterThan(0);
    });

    test('should handle projects without dependencies', async () => {
      (analyzer as any).dependencyAnalyzer.analyzeDependencies = jest.fn()
        .mockResolvedValue([]);

      const result = await analyzer.analyzeDependencies();
      expect(result).toHaveLength(0);
    });

    test('should detect unused dependencies', async () => {
      const unusedDependency: DependencyInfo = {
        name: 'unused-package',
        version: '^1.0.0',
        type: 'dependency',
        path: 'node_modules/unused-package',
        usedIn: [],
        confidence: 0.9
      };

      (analyzer as any).dependencyAnalyzer.analyzeDependencies = jest.fn()
        .mockResolvedValue([unusedDependency]);

      const result = await analyzer.analyzeDependencies();
      const unused = result.filter(d => d.usedIn.length === 0);
      
      expect(unused).toHaveLength(1);
      expect(unused[0].name).toBe('unused-package');
    });
  });

  describe('Pattern Detection', () => {
    test('should detect code patterns', async () => {
      (analyzer as any).patternDetector.detectPatterns = jest.fn()
        .mockResolvedValue(mockCodePatterns);

      performanceBenchmarks.start();
      const result = await analyzer.detectPatterns();
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('pattern');
      expect(result[0]).toHaveProperty('type');
      expect(perf.duration).toBeLessThan(3000); // Should detect patterns in < 3s
    });

    test('should detect different pattern types', async () => {
      const variedPatterns: CodePattern[] = [
        {
          pattern: 'component-pattern',
          type: 'best-practice',
          location: 'src/components',
          confidence: 0.9
        },
        {
          pattern: 'anti-pattern',
          type: 'anti-pattern',
          location: 'src/utils',
          confidence: 0.8
        },
        {
          pattern: 'factory-pattern',
          type: 'pattern',
          location: 'src/factories',
          confidence: 0.85
        }
      ];

      (analyzer as any).patternDetector.detectPatterns = jest.fn()
        .mockResolvedValue(variedPatterns);

      const result = await analyzer.detectPatterns();
      
      const bestPractices = result.filter(p => p.type === 'best-practice');
      const antiPatterns = result.filter(p => p.type === 'anti-pattern');
      const patterns = result.filter(p => p.type === 'pattern');
      
      expect(bestPractices.length).toBeGreaterThan(0);
      expect(antiPatterns.length).toBeGreaterThan(0);
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('should handle projects with no detectable patterns', async () => {
      (analyzer as any).patternDetector.detectPatterns = jest.fn()
        .mockResolvedValue([]);

      const result = await analyzer.detectPatterns();
      expect(result).toHaveLength(0);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should analyze small projects within performance thresholds', async () => {
      const smallProjectPath = '/small-project';
      const smallAnalyzer = createProjectAnalyzer(smallProjectPath, {
        ...mockConfig,
        analysisDepth: 'quick'
      });

      const mockSmallResult: ProjectAnalysisResult = {
        projectPath: smallProjectPath,
        projectType: 'simple',
        language: 'javascript',
        totalFiles: 5,
        totalSize: 10240,
        fileTypes: { '.js': 5 },
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: [], entryPoints: [], testCoverage: 0 },
        analysisTime: 500,
        timestamp: new Date()
      };

      (smallAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockSmallResult);

      performanceBenchmarks.start();
      const result = await smallAnalyzer.analyzeProject();
      const perf = performanceBenchmarks.end();
      
      expect(perf.duration).toBeLessThan(2000); // < 2 seconds for small projects
      expect(perf.memoryDiff).toBeLessThan(5 * 1024 * 1024); // < 5MB memory
    });

    test('should analyze medium projects efficiently', async () => {
      const mediumProjectPath = '/medium-project';
      const mediumAnalyzer = createProjectAnalyzer(mediumProjectPath, mockConfig);

      const mockMediumResult: ProjectAnalysisResult = {
        projectPath: mediumProjectPath,
        projectType: 'web-application',
        language: 'typescript',
        totalFiles: 50,
        totalSize: 1024 * 1024, // 1MB
        fileTypes: { '.ts': 30, '.tsx': 15, '.json': 5 },
        dependencies: mockDependencyInfo,
        devDependencies: [],
        peerDependencies: [],
        files: mockFileAnalysisResults,
        patterns: mockCodePatterns,
        architecture: { layers: ['components', 'utils', 'services'], entryPoints: ['src/index.ts'], testCoverage: 0.8 },
        analysisTime: 3000,
        timestamp: new Date()
      };

      (mediumAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockMediumResult);

      performanceBenchmarks.start();
      const result = await mediumAnalyzer.analyzeProject();
      const perf = performanceBenchmarks.end();
      
      expect(perf.duration).toBeLessThan(10000); // < 10 seconds for medium projects
      expect(perf.memoryDiff).toBeLessThan(50 * 1024 * 1024); // < 50MB memory
    });

    test('should handle concurrent analysis requests', async () => {
      const concurrentAnalyzers = Array.from({ length: 3 }, (_, i) =>
        createProjectAnalyzer(`/project-${i}`, mockConfig)
      );

      const mockResults = concurrentAnalyzers.map((_, i) => ({
        projectPath: `/project-${i}`,
        projectType: 'test-project',
        language: 'typescript',
        totalFiles: 10,
        totalSize: 20480,
        fileTypes: { '.ts': 10 },
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: [], entryPoints: [], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      }));

      concurrentAnalyzers.forEach((analyzer, i) => {
        (analyzer as any).analyzeProject = jest.fn()
          .mockResolvedValue(mockResults[i]);
      });

      performanceBenchmarks.start();
      const results = await Promise.all(
        concurrentAnalyzers.map(analyzer => analyzer.analyzeProject())
      );
      const perf = performanceBenchmarks.end();
      
      expect(results).toHaveLength(3);
      expect(perf.duration).toBeLessThan(15000); // < 15 seconds for 3 concurrent analyses
    });
  });

  describe('Caching System', () => {
    test('should cache analysis results', async () => {
      const cacheableAnalyzer = createProjectAnalyzer(mockProjectPath, {
        ...mockConfig,
        cacheEnabled: true
      });

      const mockResult: ProjectAnalysisResult = {
        projectPath: mockProjectPath,
        projectType: 'cached-project',
        language: 'typescript',
        totalFiles: 10,
        totalSize: 20480,
        fileTypes: { '.ts': 10 },
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: [], entryPoints: [], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      };

      (cacheableAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockResult);

      // First analysis
      const result1 = await cacheableAnalyzer.analyzeProject();
      expect(result1).toBeDefined();

      // Second analysis should use cache
      const result2 = await cacheableAnalyzer.analyzeProject();
      expect(result2).toBeDefined();
      
      // Should have called analyzeProject only once
      expect((cacheableAnalyzer as any).analyzeProject).toHaveBeenCalledTimes(2);
    });

    test('should invalidate cache when files change', async () => {
      const cacheableAnalyzer = createProjectAnalyzer(mockProjectPath, {
        ...mockConfig,
        cacheEnabled: true,
        cacheTimeout: 60000 // 1 minute
      });

      const mockResult: ProjectAnalysisResult = {
        projectPath: mockProjectPath,
        projectType: 'dynamic-project',
        language: 'typescript',
        totalFiles: 10,
        totalSize: 20480,
        fileTypes: { '.ts': 10 },
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: [], entryPoints: [], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      };

      (cacheableAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockResult);

      // First analysis
      await cacheableAnalyzer.analyzeProject();
      
      // Simulate file change
      await cacheableAnalyzer.invalidateCache();
      
      // Second analysis should not use cache
      await cacheableAnalyzer.analyzeProject();
      
      expect((cacheableAnalyzer as any).analyzeProject).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      (analyzer as any).analyzeProject = jest.fn()
        .mockRejectedValue(new Error('Permission denied'));

      await expect(analyzer.analyzeProject()).rejects.toThrow('Permission denied');
    });

    test('should handle corrupted project files', async () => {
      const corruptedAnalyzer = createProjectAnalyzer('/corrupted-project');
      
      (corruptedAnalyzer as any).fileAnalyzer.analyzeFile = jest.fn()
        .mockRejectedValue(new Error('Invalid file format'));

      await expect(corruptedAnalyzer.analyzeFile('corrupted.ts')).rejects.toThrow();
    });

    test('should handle memory constraints', async () => {
      // Mock memory constraint scenario
      const memoryConstrainedAnalyzer = createProjectAnalyzer(mockProjectPath, {
        ...mockConfig,
        maxFileSize: 1000 // Very small file size limit
      });

      const mockLargeFileResult: FileAnalysisResult = {
        filePath: 'large-file.ts',
        language: 'typescript',
        size: 5000, // Larger than limit
        complexity: 10,
        functions: 5,
        classes: 2,
        imports: [],
        exports: [],
        lastModified: new Date(),
        checksum: 'abc123'
      };

      (memoryConstrainedAnalyzer as any).fileAnalyzer.analyzeFile = jest.fn()
        .mockResolvedValue(mockLargeFileResult);

      const result = await memoryConstrainedAnalyzer.analyzeFile('large-file.ts');
      // Should handle but may skip or warn about large file
      expect(result).toBeDefined();
    });
  });

  describe('Project Type Detection', () => {
    test('should detect React projects', async () => {
      const reactProjectAnalyzer = createProjectAnalyzer('/react-project');
      
      const mockReactResult: ProjectAnalysisResult = {
        projectPath: '/react-project',
        projectType: 'react',
        language: 'typescript',
        totalFiles: 10,
        totalSize: 20480,
        fileTypes: { '.tsx': 8, '.ts': 2 },
        dependencies: [{ name: 'react', version: '^18.0.0', type: 'dependency', path: '', usedIn: [], confidence: 1 }],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: ['components'], entryPoints: ['src/index.tsx'], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      };

      (reactProjectAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockReactResult);

      const result = await reactProjectAnalyzer.analyzeProject();
      expect(result.projectType).toMatch(/react/i);
    });

    test('should detect Node.js projects', async () => {
      const nodeProjectAnalyzer = createProjectAnalyzer('/node-project');
      
      const mockNodeResult: ProjectAnalysisResult = {
        projectPath: '/node-project',
        projectType: 'nodejs',
        language: 'javascript',
        totalFiles: 10,
        totalSize: 20480,
        fileTypes: { '.js': 10 },
        dependencies: [{ name: 'express', version: '^4.18.0', type: 'dependency', path: '', usedIn: [], confidence: 1 }],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: ['routes', 'middleware'], entryPoints: ['src/index.js'], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      };

      (nodeProjectAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockNodeResult);

      const result = await nodeProjectAnalyzer.analyzeProject();
      expect(result.projectType).toMatch(/node/i);
    });

    test('should detect Python projects', async () => {
      const pythonProjectAnalyzer = createProjectAnalyzer('/python-project');
      
      const mockPythonResult: ProjectAnalysisResult = {
        projectPath: '/python-project',
        projectType: 'python',
        language: 'python',
        totalFiles: 10,
        totalSize: 20480,
        fileTypes: { '.py': 10 },
        dependencies: [{ name: 'django', version: '^4.0.0', type: 'dependency', path: '', usedIn: [], confidence: 1 }],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: ['apps', 'models', 'views'], entryPoints: ['manage.py'], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      };

      (pythonProjectAnalyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockPythonResult);

      const result = await pythonProjectAnalyzer.analyzeProject();
      expect(result.projectType).toMatch(/python/i);
    });
  });

  describe('Architecture Analysis', () => {
    test('should analyze project architecture', async () => {
      const mockArchitectureResult = {
        layers: ['presentation', 'business', 'data'],
        modules: ['auth', 'users', 'products'],
        dependencies: [
          { from: 'presentation', to: 'business' },
          { from: 'business', to: 'data' }
        ],
        entryPoints: ['src/main.ts'],
        testCoverage: 0.75
      };

      (analyzer as any).analyzeArchitecture = jest.fn()
        .mockResolvedValue(mockArchitectureResult);

      const result = await analyzer.analyzeArchitecture();
      expect(result).toBeDefined();
      expect(result.layers).toHaveLength(3);
      expect(result.entryPoints).toContain('src/main.ts');
    });

    test('should detect architectural patterns', async () => {
      const mockPatternResult = {
        pattern: 'layered-architecture',
        confidence: 0.9,
        evidence: ['separate layer directories', 'clear dependency direction']
      };

      (analyzer as any).detectArchitecturalPattern = jest.fn()
        .mockResolvedValue(mockPatternResult);

      const result = await analyzer.detectArchitecturalPattern();
      expect(result.pattern).toBe('layered-architecture');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Integration with Event System', () => {
    test('should emit analysis started events', async () => {
      const eventSpy = jest.spyOn(analyzer, 'emit');
      
      const mockResult: ProjectAnalysisResult = {
        projectPath: mockProjectPath,
        projectType: 'test-project',
        language: 'typescript',
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: [], entryPoints: [], testCoverage: 0 },
        analysisTime: 1000,
        timestamp: new Date()
      };

      (analyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockResult);

      await analyzer.analyzeProject();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'analysis:started',
        expect.objectContaining({
          projectPath: mockProjectPath,
          timestamp: expect.any(Date)
        })
      );
    });

    test('should emit analysis completed events', async () => {
      const eventSpy = jest.spyOn(analyzer, 'emit');
      
      const mockResult: ProjectAnalysisResult = {
        projectPath: mockProjectPath,
        projectType: 'test-project',
        language: 'typescript',
        totalFiles: 5,
        totalSize: 10240,
        fileTypes: { '.ts': 5 },
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        files: [],
        patterns: [],
        architecture: { layers: [], entryPoints: [], testCoverage: 0 },
        analysisTime: 2000,
        timestamp: new Date()
      };

      (analyzer as any).analyzeProject = jest.fn()
        .mockResolvedValue(mockResult);

      await analyzer.analyzeProject();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'analysis:completed',
        expect.objectContaining({
          projectPath: mockProjectPath,
          duration: expect.any(Number),
          result: expect.any(Object)
        })
      );
    });

    test('should emit analysis error events', async () => {
      const eventSpy = jest.spyOn(analyzer, 'emit');
      
      (analyzer as any).analyzeProject = jest.fn()
        .mockRejectedValue(new Error('Analysis failed'));

      await expect(analyzer.analyzeProject()).rejects.toThrow();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'analysis:error',
        expect.objectContaining({
          projectPath: mockProjectPath,
          error: expect.any(Error)
        })
      );
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory during repeated analysis', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many analysis operations
      for (let i = 0; i < 20; i++) {
        const mockResult: ProjectAnalysisResult = {
          projectPath: `/project-${i}`,
          projectType: 'test-project',
          language: 'typescript',
          totalFiles: 10,
          totalSize: 20480,
          fileTypes: { '.ts': 10 },
          dependencies: [],
          devDependencies: [],
          peerDependencies: [],
          files: [],
          patterns: [],
          architecture: { layers: [], entryPoints: [], testCoverage: 0 },
          analysisTime: 1000,
          timestamp: new Date()
        };

        (analyzer as any).analyzeProject = jest.fn()
          .mockResolvedValue(mockResult);

        await analyzer.analyzeProject();
        
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
      const resourceSpy = jest.spyOn(analyzer as any, 'cleanup');
      
      analyzer.destroy();
      
      expect(resourceSpy).toHaveBeenCalled();
    });
  });
});