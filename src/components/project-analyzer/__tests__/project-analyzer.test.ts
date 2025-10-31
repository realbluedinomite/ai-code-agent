/**
 * Tests for Project Analyzer
 * 
 * Comprehensive test suite covering all major functionality
 */

import { ProjectAnalyzer } from './project-analyzer';
import { FileAnalyzer } from './file-analyzer';
import { DependencyAnalyzer } from './dependency-analyzer';
import { PatternDetector } from './pattern-detector';
import { CacheManager } from './cache-manager';
import { SymbolTable } from './symbol-table';
import { DependencyGraph } from './dependency-graph';
import { FileType, PatternType, PatternCategory, DependencyType } from './types';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// Mock test data
const createMockFile = (filePath: string, content: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
};

const cleanupMockFiles = () => {
  const testDir = './test-project';
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
};

describe('ProjectAnalyzer', () => {
  beforeEach(() => {
    cleanupMockFiles();
  });

  afterEach(() => {
    cleanupMockFiles();
  });

  describe('Basic Functionality', () => {
    it('should analyze a simple TypeScript project', async () => {
      // Create test files
      createMockFile('./test-project/src/index.ts', `
        import { Button } from './components/Button';
        
        const app = new Button();
        app.render();
      `);

      createMockFile('./test-project/src/components/Button.tsx', `
        import React from 'react';
        
        interface Props {
          text: string;
        }
        
        export class Button extends React.Component<Props> {
          render() {
            return <button>{this.props.text}</button>;
          }
        }
      `);

      createMockFile('./test-project/tsconfig.json', JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
        },
      }));

      const analyzer = new ProjectAnalyzer({
        projectPath: './test-project',
        analyzeTypeScript: true,
      });

      const result = await analyzer.analyze();

      expect(result).toBeDefined();
      expect(result.analyzedFiles).toBeGreaterThan(0);
      expect(result.stats).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    }, 30000);

    it('should handle empty project', async () => {
      fs.mkdirSync('./test-project', { recursive: true });

      const analyzer = new ProjectAnalyzer({
        projectPath: './test-project',
      });

      const result = await analyzer.analyze();

      expect(result.analyzedFiles).toBe(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should respect exclusion patterns', async () => {
      // Create test files with excluded patterns
      createMockFile('./test-project/src/index.ts', 'export const test = 1;');
      createMockFile('./test-project/src/test.ts', 'export const test = 1;');
      createMockFile('./test-project/src/index.test.ts', 'export const test = 1;');
      createMockFile('./test-project/node_modules/dep/index.ts', 'export const dep = 1;');

      const analyzer = new ProjectAnalyzer({
        projectPath: './test-project',
        excludeFiles: [
          '**/*.test.{ts,js}',
          '**/node_modules/**',
        ],
      });

      const result = await analyzer.analyze();

      // Should only analyze index.ts (test.ts is not in include pattern)
      expect(result.analyzedFiles).toBe(1);
    });
  });

  describe('CacheManager', () => {
    it('should cache and retrieve data', () => {
      const cache = new CacheManager({
        enabled: true,
        maxSize: 10,
        ttl: 60000,
      });

      const testData = { name: 'test', value: 123 };
      
      cache.set('test-key', testData);
      const retrieved = cache.get('test-key');

      expect(retrieved).toEqual(testData);
    });

    it('should handle cache misses', () => {
      const cache = new CacheManager();
      const result = cache.get('non-existent-key');

      expect(result).toBeUndefined();
    });

    it('should evict least recently used entries', () => {
      const cache = new CacheManager({
        enabled: true,
        maxSize: 2,
        ttl: 60000,
      });

      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.set('key3', { data: 'value3' }); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeDefined();
      expect(cache.get('key3')).toBeDefined();
    });

    it('should track statistics', () => {
      const cache = new CacheManager();
      
      cache.set('key1', { data: 'value1' });
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('FileAnalyzer', () => {
    beforeEach(() => {
      cleanupMockFiles();
    });

    afterEach(() => {
      cleanupMockFiles();
    });

    it('should detect file types correctly', () => {
      const analyzer = new FileAnalyzer();

      expect(analyzer.detectFileType('test.ts')).toBe(FileType.TYPESCRIPT);
      expect(analyzer.detectFileType('test.js')).toBe(FileType.JAVASCRIPT);
      expect(analyzer.detectFileType('test.tsx')).toBe(FileType.TSX);
      expect(analyzer.detectFileType('test.jsx')).toBe(FileType.JSX);
      expect(analyzer.detectFileType('test.json')).toBe(FileType.JSON);
      expect(analyzer.detectFileType('test.css')).toBe(FileType.CSS);
      expect(analyzer.detectFileType('test.md')).toBe(FileType.MD);
    });

    it('should analyze TypeScript file', async () => {
      createMockFile('./test-project/src/index.ts', `
        interface User {
          name: string;
          age: number;
        }
        
        export function greet(user: User): string {
          return \`Hello, \${user.name}!\`;
        }
        
        export class Greeter {
          constructor(private user: User) {}
          
          greet(): string {
            return greet(this.user);
          }
        }
      `);

      const analyzer = new FileAnalyzer();
      const result = await analyzer.analyzeFile('./test-project/src/index.ts');

      expect(result.fileType).toBe(FileType.TYPESCRIPT);
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.dependencies.length).toBe(0);
      expect(result.exports.length).toBe(2); // greet function and Greeter class
      expect(result.stats.functions).toBe(2); // greet function + greet method
      expect(result.stats.classes).toBe(1);
      expect(result.stats.interfaces).toBe(1);
    });

    it('should analyze file with imports', async () => {
      createMockFile('./test-project/src/index.ts', `
        import React from 'react';
        import { useState } from 'react';
        import { Button } from './components/Button';
        import helper from './utils/helper';
        
        export const App = () => {
          const [count, setCount] = useState(0);
          return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
        };
      `);

      const analyzer = new FileAnalyzer();
      const result = await analyzer.analyzeFile('./test-project/src/index.ts');

      expect(result.imports.length).toBe(4); // react, useState, Button, helper
      expect(result.dependencies.length).toBe(1); // Only local dependency
      expect(result.exports.length).toBe(1); // App
      expect(result.patterns.length).toBeGreaterThan(0); // Should detect React component
    });

    it('should calculate complexity metrics', async () => {
      createMockFile('./test-project/src/complex.ts', `
        export function complexFunction(a: number, b: number): number {
          if (a > 0) {
            if (b > 0) {
              for (let i = 0; i < a; i++) {
                if (i % 2 === 0) {
                  console.log('even');
                } else {
                  console.log('odd');
                }
              }
              return a + b;
            } else {
              return 0;
            }
          } else {
            return -1;
          }
        }
      `);

      const analyzer = new FileAnalyzer();
      const result = await analyzer.analyzeFile('./test-project/src/complex.ts');

      expect(result.complexity).toBeDefined();
      expect(result.complexity!.cyclomaticComplexity).toBeGreaterThan(1); // Multiple if statements and loops
      expect(result.complexity!.cognitiveComplexity).toBeGreaterThan(1);
      expect(result.complexity!.halsteadMetrics).toBeDefined();
      expect(result.complexity!.maintainabilityIndex).toBeGreaterThan(0);
    });
  });

  describe('PatternDetector', () => {
    it('should detect React components', () => {
      const detector = new PatternDetector();
      
      // This would require a real AST, so we'll test the logic differently
      const testCode = `
        import React from 'react';
        
        export class Button extends React.Component {
          render() {
            return <button>Click me</button>;
          }
        }
      `;
      
      // Create a simple source file for testing
      const sourceFile = ts.createSourceFile(
        'test.tsx',
        testCode,
        ts.ScriptTarget.Latest,
        true
      );

      const patterns = detector.detectPatterns(sourceFile, './test.tsx');
      
      // Should find at least one React-related pattern
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should detect design patterns', () => {
      const detector = new PatternDetector();
      
      const singletonCode = `
        export class Singleton {
          private static instance: Singleton;
          
          private constructor() {}
          
          public static getInstance(): Singleton {
            if (!Singleton.instance) {
              Singleton.instance = new Singleton();
            }
            return Singleton.instance;
          }
        }
      `;

      const sourceFile = ts.createSourceFile(
        'singleton.ts',
        singletonCode,
        ts.ScriptTarget.Latest,
        true
      );

      const patterns = detector.detectPatterns(sourceFile, './singleton.ts');
      
      // Should detect Singleton pattern
      const singletonPatterns = patterns.filter(p => p.type === PatternType.SINGLETON);
      expect(singletonPatterns.length).toBeGreaterThan(0);
    });

    it('should detect anti-patterns', () => {
      const detector = new PatternDetector();
      
      const largeClassCode = `
        export class LargeClass {
          method1() {}
          method2() {}
          method3() {}
          method4() {}
          method5() {}
          method6() {}
          method7() {}
          method8() {}
          method9() {}
          method10() {}
          method11() {}
          method12() {}
          method13() {}
          method14() {}
          method15() {}
          method16() {}
          method17() {}
          method18() {}
          method19() {}
          method20() {}
          method21() {}
        }
      `;

      const sourceFile = ts.createSourceFile(
        'large.ts',
        largeClassCode,
        ts.ScriptTarget.Latest,
        true
      );

      const patterns = detector.detectPatterns(sourceFile, './large.ts');
      
      // Should detect large class anti-pattern
      const largeClassPatterns = patterns.filter(p => 
        p.severity === 'warning' && p.name === 'LargeClass'
      );
      expect(largeClassPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('DependencyAnalyzer', () => {
    beforeEach(() => {
      cleanupMockFiles();
    });

    afterEach(() => {
      cleanupMockFiles();
    });

    it('should build dependency graph', async () => {
      createMockFile('./test-project/src/a.ts', `
        import { b } from './b';
        import { c } from './c';
        export const a = { b, c };
      `);

      createMockFile('./test-project/src/b.ts', `
        import { c } from './c';
        export const b = { c };
      `);

      createMockFile('./test-project/src/c.ts', `
        export const c = 'c';
      `);

      const analyzer = new FileAnalyzer();
      const dependencyAnalyzer = new DependencyAnalyzer();

      const fileA = await analyzer.analyzeFile('./test-project/src/a.ts');
      const fileB = await analyzer.analyzeFile('./test-project/src/b.ts');
      const fileC = await analyzer.analyzeFile('./test-project/src/c.ts');

      const result = await dependencyAnalyzer.analyzeDependencies(
        [fileA, fileB, fileC],
        './test-project'
      );

      expect(result.graph).toBeDefined();
      expect(result.externalDependencies.length).toBe(0);
      expect(result.circularDependencies.length).toBe(0);
    });

    it('should detect circular dependencies', async () => {
      createMockFile('./test-project/src/a.ts', `
        import { b } from './b';
        export const a = { b };
      `);

      createMockFile('./test-project/src/b.ts', `
        import { c } from './c';
        import { a } from './a';
        export const b = { c, a };
      `);

      createMockFile('./test-project/src/c.ts', `
        import { a } from './a';
        export const c = { a };
      `);

      const analyzer = new FileAnalyzer();
      const dependencyAnalyzer = new DependencyAnalyzer();

      const fileA = await analyzer.analyzeFile('./test-project/src/a.ts');
      const fileB = await analyzer.analyzeFile('./test-project/src/b.ts');
      const fileC = await analyzer.analyzeFile('./test-project/src/c.ts');

      const result = await dependencyAnalyzer.analyzeDependencies(
        [fileA, fileB, fileC],
        './test-project'
      );

      expect(result.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should analyze external dependencies', async () => {
      createMockFile('./test-project/src/index.ts', `
        import React from 'react';
        import _ from 'lodash';
        import fs from 'fs';
      `);

      const analyzer = new FileAnalyzer();
      const dependencyAnalyzer = new DependencyAnalyzer();

      const fileResult = await analyzer.analyzeFile('./test-project/src/index.ts');

      const result = await dependencyAnalyzer.analyzeDependencies(
        [fileResult],
        './test-project'
      );

      expect(result.externalDependencies.length).toBeGreaterThan(0);
      
      const reactDep = result.externalDependencies.find(d => d.name === 'react');
      expect(reactDep).toBeDefined();
      expect(reactDep!.isUsed).toBe(true);
    });
  });

  describe('SymbolTable', () => {
    it('should manage symbols', () => {
      const symbolTable = new SymbolTable();

      const symbol = {
        name: 'TestClass',
        kind: ts.SymbolKind.Class,
        location: { file: './test.ts', line: 1, column: 1 },
        isExported: true,
        isDeclared: true,
      };

      symbolTable.addSymbol(symbol);
      
      const entry = symbolTable.getSymbol('./test.ts:TestClass');
      expect(entry).toBeDefined();
      expect(entry!.symbol).toEqual(symbol);
    });

    it('should track references', () => {
      const symbolTable = new SymbolTable();

      const symbol = {
        name: 'TestClass',
        kind: ts.SymbolKind.Class,
        location: { file: './test.ts', line: 1, column: 1 },
        isExported: true,
        isDeclared: true,
      };

      symbolTable.addSymbol(symbol);
      symbolTable.addReference('./test.ts:TestClass', {
        location: { file: './other.ts', line: 5, column: 10 },
        context: 'const instance = new TestClass()',
      });

      const references = symbolTable.getSymbolReferences('./test.ts:TestClass');
      expect(references.length).toBe(1);
      expect(references[0].location.file).toBe('./other.ts');
    });

    it('should handle dependencies between symbols', () => {
      const symbolTable = new SymbolTable();

      const symbolA = {
        name: 'ClassA',
        kind: ts.SymbolKind.Class,
        location: { file: './a.ts', line: 1, column: 1 },
        isExported: true,
        isDeclared: true,
      };

      const symbolB = {
        name: 'ClassB',
        kind: ts.SymbolKind.Class,
        location: { file: './b.ts', line: 1, column: 1 },
        isExported: true,
        isDeclared: true,
      };

      symbolTable.addSymbol(symbolA);
      symbolTable.addSymbol(symbolB);
      symbolTable.addDependency('./a.ts:ClassA', './b.ts:ClassB');

      const dependencies = symbolTable.getSymbolDependencies('./a.ts:ClassA');
      expect(dependencies).toContain('./b.ts:ClassB');

      const dependents = symbolTable.getSymbolDependents('./b.ts:ClassB');
      expect(dependents).toContain('./a.ts:ClassA');
    });
  });

  describe('DependencyGraph', () => {
    it('should add nodes and edges', () => {
      const graph = new DependencyGraph();

      const nodeA = {
        id: 'a.ts',
        path: './a.ts',
        type: FileType.TYPESCRIPT,
        size: 100,
        dependencies: 1,
        dependents: 0,
        level: 0,
      };

      const nodeB = {
        id: 'b.ts',
        path: './b.ts',
        type: FileType.TYPESCRIPT,
        size: 100,
        dependencies: 0,
        dependents: 0,
        level: 0,
      };

      graph.addNode(nodeA);
      graph.addNode(nodeB);
      graph.addEdge('a.ts', 'b.ts', DependencyType.IMPORT, 1);

      expect(graph.getNode('a.ts')).toEqual(nodeA);
      expect(graph.getNode('b.ts')).toEqual(nodeB);
      
      const edges = graph.getEdges('a.ts');
      expect(edges.length).toBe(1);
      expect(edges[0].to).toBe('b.ts');
    });

    it('should find paths', () => {
      const graph = new DependencyGraph();

      // Create a path: a -> b -> c
      graph.addNode({ id: 'a', path: 'a', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });
      graph.addNode({ id: 'b', path: 'b', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });
      graph.addNode({ id: 'c', path: 'c', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });

      graph.addEdge('a', 'b', DependencyType.IMPORT);
      graph.addEdge('b', 'c', DependencyType.IMPORT);

      const path = graph.findShortestPath('a', 'c');
      expect(path).toEqual(['a', 'b', 'c']);
    });

    it('should detect cycles', () => {
      const graph = new DependencyGraph();

      graph.addNode({ id: 'a', path: 'a', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });
      graph.addNode({ id: 'b', path: 'b', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });

      graph.addEdge('a', 'b', DependencyType.IMPORT);
      graph.addEdge('b', 'a', DependencyType.IMPORT);

      const cycles = graph.findCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should perform topological sort', () => {
      const graph = new DependencyGraph();

      graph.addNode({ id: 'a', path: 'a', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });
      graph.addNode({ id: 'b', path: 'b', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });
      graph.addNode({ id: 'c', path: 'c', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });

      graph.addEdge('a', 'b', DependencyType.IMPORT);
      graph.addEdge('b', 'c', DependencyType.IMPORT);

      const sorted = graph.topologicalSort();
      expect(sorted).toEqual(['a', 'b', 'c']);
    });

    it('should return null for cyclic topological sort', () => {
      const graph = new DependencyGraph();

      graph.addNode({ id: 'a', path: 'a', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });
      graph.addNode({ id: 'b', path: 'b', type: FileType.TYPESCRIPT, size: 100, dependencies: 0, dependents: 0, level: 0 });

      graph.addEdge('a', 'b', DependencyType.IMPORT);
      graph.addEdge('b', 'a', DependencyType.IMPORT);

      const sorted = graph.topologicalSort();
      expect(sorted).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large number of files', async () => {
      const testDir = './test-project-large';
      const fileCount = 100;

      // Create many test files
      for (let i = 0; i < fileCount; i++) {
        const content = `
          export function func${i}() {
            return ${i};
          }
          
          export const value${i} = ${i};
        `;
        createMockFile(`${testDir}/src/file${i}.ts`, content);
      }

      const analyzer = new ProjectAnalyzer({
        projectPath: testDir,
        parallelAnalysis: true,
        maxConcurrency: 4,
      });

      const startTime = Date.now();
      const result = await analyzer.analyze();
      const endTime = Date.now();

      expect(result.analyzedFiles).toBe(fileCount);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Processed ${fileCount} files in ${endTime - startTime}ms`);
    }, 60000);

    it('should use cache effectively', async () => {
      createMockFile('./test-project/src/index.ts', 'export const test = 1;');

      const analyzer = new ProjectAnalyzer({
        projectPath: './test-project',
        cacheEnabled: true,
        parallelAnalysis: false,
      });

      // First run
      const start1 = Date.now();
      await analyzer.analyze();
      const time1 = Date.now() - start1;

      // Second run (should use cache)
      const start2 = Date.now();
      await analyzer.analyze();
      const time2 = Date.now() - start2;

      // Second run should be faster
      expect(time2).toBeLessThan(time1);
      
      const cacheStatus = analyzer.getCacheStatus();
      expect(cacheStatus.stats.hitRate).toBeGreaterThan(0);
    }, 30000);
  });
});
