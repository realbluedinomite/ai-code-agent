/**
 * DependencyAnalyzer - Analyzes dependencies and builds dependency graphs
 * 
 * Features:
 * - Dependency graph construction
 * - External dependency analysis
 * - Circular dependency detection
 * - Unused dependency identification
 * - Duplicate dependency detection
 * - Dependency analysis and visualization
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DependencyAnalysisResult,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  DependencyType,
  ExternalDependency,
  CircularDependency,
  UnusedDependency,
  DuplicateDependency,
  FileAnalysisResult,
} from './types';
import { DependencyGraph as DependencyGraphClass } from './dependency-graph';
import { CacheManager } from './cache-manager';

export class DependencyAnalyzer {
  private cacheManager: CacheManager;
  private externalDepsCache: Map<string, ExternalDependency>;

  constructor(cacheManager?: CacheManager) {
    this.cacheManager = cacheManager || new CacheManager();
    this.externalDepsCache = new Map();
  }

  /**
   * Analyze dependencies from file analysis results
   */
  async analyzeDependencies(fileResults: FileAnalysisResult[], projectPath: string): Promise<DependencyAnalysisResult> {
    const cacheKey = `dependencies:${this.hashFileList(fileResults)}`;
    
    // Check cache first
    const cached = this.cacheManager.get<DependencyAnalysisResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Build dependency graph
      const graph = await this.buildDependencyGraph(fileResults, projectPath);
      
      // Analyze external dependencies
      const externalDeps = this.analyzeExternalDependencies(fileResults, projectPath);
      
      // Find circular dependencies
      const circularDeps = this.findCircularDependencies(graph);
      
      // Find unused dependencies
      const unusedDeps = this.findUnusedDependencies(externalDeps, fileResults);
      
      // Find duplicate dependencies
      const duplicateDeps = this.findDuplicateDependencies(externalDeps);
      
      const result: DependencyAnalysisResult = {
        graph,
        externalDependencies: externalDeps,
        circularDependencies: circularDeps,
        unusedDependencies: unusedDeps,
        duplicateDependencies: duplicateDeps,
      };
      
      // Cache the result
      this.cacheManager.set(cacheKey, result);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to analyze dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build dependency graph from file results
   */
  private async buildDependencyGraph(fileResults: FileAnalysisResult[], projectPath: string): Promise<DependencyGraphClass> {
    const graph = new DependencyGraphClass();
    
    // Add all files as nodes
    for (const fileResult of fileResults) {
      const node: DependencyNode = {
        id: this.normalizePath(fileResult.filePath),
        path: fileResult.filePath,
        type: fileResult.fileType,
        size: fileResult.size,
        dependencies: fileResult.dependencies.length,
        dependents: 0, // Will be calculated later
        level: 0,
      };
      
      graph.addNode(node);
    }
    
    // Add dependency edges
    for (const fileResult of fileResults) {
      const fromId = this.normalizePath(fileResult.filePath);
      
      // Process internal dependencies
      for (const dep of fileResult.dependencies) {
        if (this.isInternalDependency(dep, projectPath)) {
          const resolvedPath = this.resolvePath(dep, fileResult.filePath, projectPath);
          
          if (resolvedPath && this.fileExists(resolvedPath)) {
            const toId = this.normalizePath(resolvedPath);
            graph.addEdge(fromId, toId, DependencyType.IMPORT, 1);
          }
        }
      }
      
      // Process imports (broader than dependencies)
      for (const imp of fileResult.imports) {
        if (this.isInternalDependency(imp, projectPath)) {
          const resolvedPath = this.resolvePath(imp, fileResult.filePath, projectPath);
          
          if (resolvedPath && this.fileExists(resolvedPath)) {
            const toId = this.normalizePath(resolvedPath);
            graph.addEdge(fromId, toId, DependencyType.IMPORT, 1);
          }
        }
      }
    }
    
    // Calculate levels and dependents
    this.calculateNodeLevels(graph);
    this.calculateDependents(graph);
    
    return graph;
  }

  /**
   * Analyze external dependencies
   */
  private analyzeExternalDependencies(fileResults: FileAnalysisResult[], projectPath: string): ExternalDependency[] {
    const externalDeps: Map<string, ExternalDependency> = new Map();
    
    // First, try to read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    let packageJson: any = {};
    
    try {
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not read package.json:', error);
    }
    
    // Collect all external dependencies
    for (const fileResult of fileResults) {
      const fileDir = path.dirname(fileResult.filePath);
      
      for (const imp of fileResult.imports) {
        if (this.isExternalDependency(imp)) {
          const depName = this.extractDependencyName(imp);
          
          if (depName && !externalDeps.has(depName)) {
            // Determine dependency type
            let type: 'npm' | 'git' | 'local' | 'builtin' = 'npm';
            let version: string | undefined;
            let isDev = false;
            
            if (this.isBuiltinModule(depName)) {
              type = 'builtin';
            } else if (depName.startsWith('.') || depName.startsWith('/')) {
              type = 'local';
            } else if (depName.startsWith('git+') || depName.includes('.git')) {
              type = 'git';
            } else {
              // Check package.json for version and dev status
              if (packageJson.dependencies && packageJson.dependencies[depName]) {
                version = packageJson.dependencies[depName];
                isDev = false;
              } else if (packageJson.devDependencies && packageJson.devDependencies[depName]) {
                version = packageJson.devDependencies[depName];
                isDev = true;
              }
            }
            
            // Try to get license info
            let license: string | undefined;
            try {
              const licensePath = path.join(projectPath, 'node_modules', depName, 'package.json');
              if (fs.existsSync(licensePath)) {
                const pkg = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
                license = pkg.license || pkg.licenses?.[0]?.type;
              }
            } catch (error) {
              // Ignore license lookup errors
            }
            
            externalDeps.set(depName, {
              name: depName,
              version,
              type,
              files: [],
              isUsed: false, // Will be checked later
              isDev,
              license,
            });
          }
          
          if (depName) {
            const dep = externalDeps.get(depName);
            if (dep) {
              dep.files.push(fileResult.filePath);
            }
          }
        }
      }
    }
    
    // Convert map to array and mark used dependencies
    const result = Array.from(externalDeps.values()).map(dep => {
      // Check if dependency is actually used (simplified check)
      const isUsed = dep.files.length > 0;
      return {
        ...dep,
        isUsed,
      };
    });
    
    return result;
  }

  /**
   * Find circular dependencies
   */
  private findCircularDependencies(graph: DependencyGraphClass): CircularDependency[] {
    const cycles: string[][] = graph.findCycles();
    
    return cycles.map(cycle => {
      // Filter to only include file paths
      const files = cycle.map(nodeId => {
        const node = graph.getNode(nodeId);
        return node ? node.path : nodeId;
      });
      
      return {
        path: cycle,
        files,
      };
    });
  }

  /**
   * Find unused dependencies
   */
  private findUnusedDependencies(externalDeps: ExternalDependency[], fileResults: FileAnalysisResult[]): UnusedDependency[] {
    const unused: UnusedDependency[] = [];
    
    for (const dep of externalDeps) {
      if (!dep.isUsed) {
        unused.push({
          name: dep.name,
          type: dep.type,
          files: dep.files,
        });
      }
    }
    
    return unused;
  }

  /**
   * Find duplicate dependencies
   */
  private findDuplicateDependencies(externalDeps: ExternalDependency[]): DuplicateDependency[] {
    const depMap: Map<string, Set<string>> = new Map();
    const duplicates: DuplicateDependency[] = [];
    
    for (const dep of externalDeps) {
      const versions = depMap.get(dep.name) || new Set();
      
      if (dep.version) {
        versions.add(dep.version);
      }
      
      depMap.set(dep.name, versions);
    }
    
    // Find dependencies with multiple versions
    for (const [name, versions] of depMap.entries()) {
      if (versions.size > 1) {
        const versionArray = Array.from(versions);
        
        // Find all files that reference this dependency
        const files: string[] = [];
        for (const dep of externalDeps) {
          if (dep.name === name) {
            files.push(...dep.files);
          }
        }
        
        duplicates.push({
          name,
          versions: versionArray,
          files,
        });
      }
    }
    
    return duplicates;
  }

  /**
   * Get dependency information for a specific file
   */
  getFileDependencies(filePath: string, graph: DependencyGraphClass): {
    dependencies: string[];
    dependents: string[];
    depth: number;
    complexity: number;
  } {
    const nodeId = this.normalizePath(filePath);
    const node = graph.getNode(nodeId);
    
    if (!node) {
      return {
        dependencies: [],
        dependents: [],
        depth: 0,
        complexity: 0,
      };
    }
    
    const outgoingEdges = graph.getEdges(nodeId);
    const incomingEdges = graph.getEdges().filter(edge => edge.to === nodeId);
    
    const dependencies = outgoingEdges.map(edge => {
      const targetNode = graph.getNode(edge.to);
      return targetNode ? targetNode.path : edge.to;
    });
    
    const dependents = incomingEdges.map(edge => {
      const sourceNode = graph.getNode(edge.from);
      return sourceNode ? sourceNode.path : edge.from;
    });
    
    return {
      dependencies,
      dependents,
      depth: node.level,
      complexity: node.dependencies + node.dependents,
    };
  }

  /**
   * Calculate dependency metrics
   */
  calculateDependencyMetrics(graph: DependencyGraphClass): {
    totalNodes: number;
    totalEdges: number;
    density: number;
    averageDepth: number;
    maxDepth: number;
    leafNodes: string[];
    rootNodes: string[];
    hubNodes: string[];
  } {
    const nodes = Array.from(graph['nodes'].values());
    const edges = graph.getEdges();
    
    // Calculate density (actual edges / possible edges)
    const n = nodes.length;
    const possibleEdges = n * (n - 1);
    const density = possibleEdges > 0 ? edges.length / possibleEdges : 0;
    
    // Calculate average depth
    const depths = nodes.map(node => node.level);
    const averageDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    const maxDepth = Math.max(...depths, 0);
    
    // Find special nodes
    const leafNodes = nodes.filter(node => node.dependents === 0).map(node => node.path);
    const rootNodes = nodes.filter(node => node.dependencies === 0).map(node => node.path);
    const hubNodes = nodes
      .filter(node => node.dependencies + node.dependents > 10)
      .map(node => node.path);
    
    return {
      totalNodes: n,
      totalEdges: edges.length,
      density,
      averageDepth,
      maxDepth,
      leafNodes,
      rootNodes,
      hubNodes,
    };
  }

  /**
   * Get dependency chain between two files
   */
  getDependencyChain(fromFile: string, toFile: string, graph: DependencyGraphClass): string[] | null {
    // This is a simplified BFS implementation
    // In a real implementation, you might want to use a more sophisticated algorithm
    
    const fromId = this.normalizePath(fromFile);
    const toId = this.normalizePath(toFile);
    
    if (!graph.getNode(fromId) || !graph.getNode(toId)) {
      return null;
    }
    
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromId, path: [fromId] }];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (nodeId === toId) {
        return path;
      }
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      
      // Get all dependencies of current node
      const edges = graph.getEdges(nodeId);
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          queue.push({ nodeId: edge.to, path: [...path, edge.to] });
        }
      }
    }
    
    return null;
  }

  // Helper methods

  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  private isInternalDependency(importPath: string, projectPath: string): boolean {
    return importPath.startsWith('.') || importPath.startsWith('/');
  }

  private isExternalDependency(importPath: string): boolean {
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  private isBuiltinModule(moduleName: string): boolean {
    const builtins = [
      'fs', 'path', 'os', 'util', 'crypto', 'stream', 'http', 'https', 'url', 'querystring',
      'child_process', 'events', 'buffer', 'string_decoder', 'readline', 'repl', 'readline',
      'module', 'process', 'console', 'assert', 'zlib', 'net', 'dns', 'domain', 'tls',
      'https', 'worker_threads', 'perf_hooks', 'v8', 'async_hooks'
    ];
    return builtins.includes(moduleName);
  }

  private extractDependencyName(importPath: string): string | null {
    // Handle different import formats
    if (importPath.startsWith('.')) {
      return importPath; // Local import
    }
    
    // Handle npm packages with subpaths
    const parts = importPath.split('/');
    const firstPart = parts[0];
    
    // Handle scoped packages like @types/node
    if (firstPart.startsWith('@')) {
      return parts.slice(0, 2).join('/');
    }
    
    // Handle regular packages
    return firstPart;
  }

  private resolvePath(importPath: string, currentFilePath: string, projectPath: string): string | null {
    const currentDir = path.dirname(currentFilePath);
    
    // Handle . and .. relative imports
    if (importPath.startsWith('.')) {
      return path.resolve(currentDir, importPath);
    }
    
    // For internal absolute imports
    if (importPath.startsWith('/')) {
      return path.resolve(projectPath, importPath.substring(1));
    }
    
    // For node_modules, we can't easily resolve without node resolution
    return null;
  }

  private fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  private calculateNodeLevels(graph: DependencyGraphClass): void {
    const nodes = Array.from(graph['nodes'].values());
    
    // Initialize all levels
    for (const node of nodes) {
      node.level = 0;
    }
    
    // Topological sort to calculate levels
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (nodeId: string, currentLevel: number): number => {
      if (visiting.has(nodeId)) {
        return currentLevel; // Circular dependency, use current level
      }
      
      if (visited.has(nodeId)) {
        return currentLevel;
      }
      
      visiting.add(nodeId);
      
      const edges = graph.getEdges(nodeId);
      let maxLevel = currentLevel;
      
      for (const edge of edges) {
        const childLevel = visit(edge.to, currentLevel + 1);
        maxLevel = Math.max(maxLevel, childLevel);
      }
      
      const node = graph.getNode(nodeId);
      if (node) {
        node.level = maxLevel;
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      
      return maxLevel;
    };
    
    for (const node of nodes) {
      visit(node.id, 0);
    }
  }

  private calculateDependents(graph: DependencyGraphClass): void {
    const nodes = Array.from(graph['nodes'].values());
    
    // Reset dependents count
    for (const node of nodes) {
      node.dependents = 0;
    }
    
    // Count dependents by traversing edges
    const edges = graph.getEdges();
    
    for (const edge of edges) {
      const targetNode = graph.getNode(edge.to);
      if (targetNode) {
        targetNode.dependents++;
      }
    }
  }

  private hashFileList(fileResults: FileAnalysisResult[]): string {
    const crypto = require('crypto');
    const fileInfo = fileResults
      .map(fr => `${fr.filePath}:${fr.lastModified}:${fr.size}`)
      .sort()
      .join('|');
    
    return crypto.createHash('md5').update(fileInfo).digest('hex');
  }
}
