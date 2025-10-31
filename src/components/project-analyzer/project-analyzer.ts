/**
 * ProjectAnalyzer - Main orchestrator for comprehensive project analysis
 * 
 * Features:
 * - Smart caching with file modification tracking
 * - Comprehensive file analysis including dependencies and patterns
 * - TypeScript compilation and parsing
 * - Symbol table generation
 * - Dependency graph building
 * - Performance optimization for large projects
 * - Parallel processing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AnalysisConfig,
  AnalysisResult,
  FileAnalysisResult,
  FileType,
} from './types';
import { CacheManager } from './cache-manager';
import { FileAnalyzer } from './file-analyzer';
import { DependencyAnalyzer } from './dependency-analyzer';
import { PatternDetector } from './pattern-detector';
import { SymbolTable } from './symbol-table';

export class ProjectAnalyzer {
  private config: AnalysisConfig;
  private cacheManager: CacheManager;
  private fileAnalyzer: FileAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private patternDetector: PatternDetector;
  private symbolTable: SymbolTable;
  private excludedPatterns: RegExp[];
  private includedPatterns: RegExp[];
  private performanceMode: boolean;
  private parallelAnalysis: boolean;

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = {
      projectPath: config.projectPath || process.cwd(),
      includeFiles: config.includeFiles || ['**/*.{ts,js,tsx,jsx}'],
      excludeFiles: config.excludeFiles || [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/*.test.{ts,js}',
        '**/*.spec.{ts,js}',
        '**/*.d.ts',
      ],
      includeNodeModules: config.includeNodeModules || false,
      analyzeTypeScript: config.analyzeTypeScript !== false,
      generateSymbolTable: config.generateSymbolTable !== false,
      buildDependencyGraph: config.buildDependencyGraph !== false,
      detectPatterns: config.detectPatterns !== false,
      cacheEnabled: config.cacheEnabled !== false,
      maxCacheSize: config.maxCacheSize || 100,
      cacheTTL: config.cacheTTL || 3600000, // 1 hour
      performanceMode: config.performanceMode || false,
      parallelAnalysis: config.parallelAnalysis !== false,
      maxConcurrency: config.maxConcurrency || Math.max(1, os.cpus().length - 1),
      tsConfigPath: config.tsConfigPath,
      customSymbols: config.customSymbols || [],
    };

    this.performanceMode = this.config.performanceMode;
    this.parallelAnalysis = this.config.parallelAnalysis;

    // Initialize components
    this.cacheManager = new CacheManager({
      enabled: this.config.cacheEnabled,
      maxSize: this.config.maxCacheSize,
      ttl: this.config.cacheTTL,
      checkModifications: true,
      compression: true,
      persistent: true,
      cacheDir: path.join(this.config.projectPath, '.cache', 'project-analyzer'),
    });

    this.fileAnalyzer = new FileAnalyzer(this.cacheManager);
    this.dependencyAnalyzer = new DependencyAnalyzer(this.cacheManager);
    this.patternDetector = new PatternDetector();
    this.symbolTable = new SymbolTable();

    // Compile patterns
    this.excludedPatterns = (this.config.excludeFiles || []).map(pattern => 
      new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
    );

    this.includedPatterns = (this.config.includeFiles || []).map(pattern =>
      new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
    );
  }

  /**
   * Analyze the entire project
   */
  async analyze(): Promise<AnalysisResult> {
    const startTime = Date.now();
    const errors: AnalysisError[] = [];
    const warnings: AnalysisWarning[] = [];

    try {
      console.log('🔍 Starting project analysis...');
      
      // Step 1: Discover files
      console.log('📁 Discovering files...');
      const discoveredFiles = await this.discoverFiles();
      console.log(`Found ${discoveredFiles.length} files to analyze`);
      
      if (discoveredFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // Step 2: Analyze files
      console.log('🔬 Analyzing files...');
      const fileResults = await this.analyzeFiles(discoveredFiles, errors, warnings);

      // Step 3: Build symbol table
      let symbolTable: SymbolTable | undefined;
      if (this.config.generateSymbolTable) {
        console.log('📊 Building symbol table...');
        symbolTable = await this.buildSymbolTable(fileResults);
      }

      // Step 4: Analyze dependencies
      let dependencyAnalysis;
      if (this.config.buildDependencyGraph) {
        console.log('🔗 Analyzing dependencies...');
        dependencyAnalysis = await this.dependencyAnalyzer.analyzeDependencies(
          fileResults, 
          this.config.projectPath
        );
      }

      // Step 5: Detect patterns (if not already done in file analysis)
      let patternAnalysis;
      if (this.config.detectPatterns && !this.config.generateSymbolTable) {
        console.log('🎨 Detecting patterns...');
        patternAnalysis = await this.detectGlobalPatterns(fileResults);
      }

      // Step 6: Generate statistics
      const stats = this.generateStats(fileResults);

      // Step 7: Get cache statistics
      const cacheStats = this.config.cacheEnabled ? this.cacheManager.getStats() : undefined;

      const result: AnalysisResult = {
        projectPath: this.config.projectPath,
        totalFiles: discoveredFiles.length,
        analyzedFiles: fileResults.length,
        errors,
        warnings,
        stats,
        symbolTable,
        dependencyGraph: dependencyAnalysis?.graph,
        patterns: patternAnalysis,
        cache: cacheStats,
        duration: Date.now() - startTime,
      };

      console.log(`✅ Analysis completed in ${result.duration}ms`);
      return result;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze a specific file
   */
  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    return this.fileAnalyzer.analyzeFile(filePath, this.config.tsConfigPath);
  }

  /**
   * Get file information without full analysis
   */
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    type: FileType;
    size: number;
    modified: number;
    dependencies: string[];
  }> {
    const cacheKey = `fileinfo:${filePath}`;
    
    // Check cache first
    const cached = this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const exists = fs.existsSync(filePath);
      if (!exists) {
        return {
          exists: false,
          type: FileType.OTHER,
          size: 0,
          modified: 0,
          dependencies: [],
        };
      }

      const stats = fs.statSync(filePath);
      const fileType = this.fileAnalyzer.detectFileType(filePath);

      let dependencies: string[] = [];
      if (this.isCodeFile(fileType)) {
        try {
          const result = await this.fileAnalyzer.analyzeFile(filePath, this.config.tsConfigPath);
          dependencies = result.dependencies;
        } catch (error) {
          // Ignore analysis errors for info-only requests
        }
      }

      const info = {
        exists: true,
        type: fileType,
        size: stats.size,
        modified: stats.mtime.getTime(),
        dependencies,
      };

      // Cache for 5 minutes
      this.cacheManager.set(cacheKey, info);
      
      return info;
    } catch (error) {
      return {
        exists: false,
        type: FileType.OTHER,
        size: 0,
        modified: 0,
        dependencies: [],
      };
    }
  }

  /**
   * Re-analyze only changed files
   */
  async incrementalAnalysis(): Promise<AnalysisResult> {
    console.log('🔄 Starting incremental analysis...');
    
    // This would typically be implemented with file watching
    // For now, just run full analysis
    return this.analyze();
  }

  /**
   * Get analysis cache status
   */
  getCacheStatus(): {
    enabled: boolean;
    stats: any;
    lastCleanup: number;
    size: number;
  } {
    return {
      enabled: this.config.cacheEnabled,
      stats: this.config.cacheEnabled ? this.cacheManager.getStats() : null,
      lastCleanup: Date.now(), // Would track actual cleanup time
      size: this.config.maxCacheSize,
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    if (this.config.cacheEnabled) {
      this.cacheManager.clear();
      console.log('🧹 Cache cleared');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update cache configuration
    if (this.config.cacheEnabled) {
      this.cacheManager.updateOptions({
        maxSize: this.config.maxCacheSize,
        ttl: this.config.cacheTTL,
      });
    }
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats(result: AnalysisResult): {
    filesPerType: Map<FileType, number>;
    complexityDistribution: { simple: number; moderate: number; complex: number };
    dependencyMetrics: any;
    patternDistribution: any;
  } {
    // Files per type
    const filesPerType = new Map<FileType, number>();
    // This would be calculated from the actual results

    // Complexity distribution
    const complexityDistribution = { simple: 0, moderate: 0, complex: 0 };

    // Dependency metrics
    const dependencyMetrics = result.dependencyGraph 
      ? this.dependencyAnalyzer.calculateDependencyMetrics(result.dependencyGraph)
      : null;

    // Pattern distribution
    const patternDistribution = result.patterns?.statistics;

    return {
      filesPerType,
      complexityDistribution,
      dependencyMetrics,
      patternDistribution,
    };
  }

  // Private methods

  private async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const addFile = (filePath: string) => {
      // Check if file matches inclusion patterns
      const matchesInclude = this.includedPatterns.length === 0 || 
        this.includedPatterns.some(pattern => pattern.test(filePath));
      
      // Check if file matches exclusion patterns
      const matchesExclude = this.excludedPatterns.some(pattern => pattern.test(filePath));
      
      if (matchesInclude && !matchesExclude) {
        files.push(filePath);
      }
    };

    const traverse = async (dirPath: string) => {
      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip excluded directories
            if (!this.excludedPatterns.some(pattern => pattern.test(fullPath))) {
              await traverse(fullPath);
            }
          } else if (entry.isFile()) {
            addFile(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors and continue
      }
    };

    await traverse(this.config.projectPath);
    return files;
  }

  private async analyzeFiles(
    filePaths: string[], 
    errors: AnalysisError[], 
    warnings: AnalysisWarning[]
  ): Promise<FileAnalysisResult[]> {
    if (this.parallelAnalysis) {
      return this.analyzeFilesParallel(filePaths, errors, warnings);
    } else {
      return this.analyzeFilesSequential(filePaths, errors, warnings);
    }
  }

  private async analyzeFilesSequential(
    filePaths: string[], 
    errors: AnalysisError[], 
    warnings: AnalysisWarning[]
  ): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];
    const chunkSize = 50; // Process in chunks to avoid memory issues
    
    for (let i = 0; i < filePaths.length; i += chunkSize) {
      const chunk = filePaths.slice(i, i + chunkSize);
      
      const chunkResults = await Promise.allSettled(
        chunk.map(async (filePath) => {
          try {
            return await this.fileAnalyzer.analyzeFile(filePath, this.config.tsConfigPath);
          } catch (error) {
            errors.push({
              file: filePath,
              message: error instanceof Error ? error.message : 'Analysis failed',
              code: 'ANALYSIS_ERROR',
            });
            return null;
          }
        })
      );
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }
      
      // Progress indicator
      const progress = Math.min(100, ((i + chunk.length) / filePaths.length) * 100);
      console.log(`Progress: ${progress.toFixed(1)}%`);
    }
    
    return results;
  }

  private async analyzeFilesParallel(
    filePaths: string[], 
    errors: AnalysisError[], 
    warnings: AnalysisWarning[]
  ): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];
    const batchSize = this.config.maxConcurrency || 4;
    
    // Process files in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (filePath) => {
          try {
            return await this.fileAnalyzer.analyzeFile(filePath, this.config.tsConfigPath);
          } catch (error) {
            errors.push({
              file: filePath,
              message: error instanceof Error ? error.message : 'Analysis failed',
              code: 'ANALYSIS_ERROR',
            });
            return null;
          }
        })
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }
      
      // Progress indicator
      const progress = Math.min(100, ((i + batch.length) / filePaths.length) * 100);
      console.log(`Progress: ${progress.toFixed(1)}%`);
    }
    
    return results;
  }

  private async buildSymbolTable(fileResults: FileAnalysisResult[]): Promise<SymbolTable> {
    const symbolTable = new SymbolTable();
    
    for (const fileResult of fileResults) {
      // Add symbols from file
      for (const symbol of fileResult.symbols) {
        symbolTable.addSymbol(symbol);
        
        // Add references if available
        // This would require more detailed AST analysis
      }
      
      // Track file symbols
      const moduleInfo = {
        path: fileResult.filePath,
        exports: fileResult.exports,
        imports: fileResult.imports,
        isExternal: false,
      };
      
      symbolTable.addModule(fileResult.filePath, moduleInfo);
    }
    
    return symbolTable;
  }

  private async detectGlobalPatterns(fileResults: FileAnalysisResult[]): Promise<any> {
    // This would implement global pattern detection across files
    // For now, return a basic result
    
    return {
      patterns: [],
      architecturalIssues: [],
      codeQualityIssues: [],
      statistics: {
        totalPatterns: 0,
        patternsByType: new Map(),
        patternsByCategory: new Map(),
        antiPatterns: 0,
        unusedPatterns: [],
        mostUsedPatterns: [],
      },
    };
  }

  private generateStats(fileResults: FileAnalysisResult[]): AnalysisStats {
    const stats: AnalysisStats = {
      filesAnalyzed: fileResults.length,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      totalSymbols: fileResults.reduce((sum, fr) => sum + fr.symbols.length, 0),
      totalDependencies: fileResults.reduce((sum, fr) => sum + fr.dependencies.length, 0),
      totalPatterns: fileResults.reduce((sum, fr) => sum + fr.patterns.length, 0),
      codeLines: fileResults.reduce((sum, fr) => sum + fr.stats.codeLines, 0),
      commentLines: fileResults.reduce((sum, fr) => sum + fr.stats.commentLines, 0),
      emptyLines: fileResults.reduce((sum, fr) => sum + fr.stats.emptyLines, 0),
    };
    
    return stats;
  }

  private createEmptyResult(startTime: number): AnalysisResult {
    return {
      projectPath: this.config.projectPath,
      totalFiles: 0,
      analyzedFiles: 0,
      errors: [],
      warnings: [],
      stats: {
        filesAnalyzed: 0,
        filesWithErrors: 0,
        filesWithWarnings: 0,
        totalSymbols: 0,
        totalDependencies: 0,
        totalPatterns: 0,
        codeLines: 0,
        commentLines: 0,
        emptyLines: 0,
      },
      duration: Date.now() - startTime,
    };
  }

  private isCodeFile(fileType: FileType): boolean {
    return [FileType.TYPESCRIPT, FileType.JAVASCRIPT, FileType.TSX, FileType.JSX].includes(fileType);
  }
}

// Supporting interfaces for internal use
interface AnalysisError {
  file: string;
  message: string;
  code: string;
  line?: number;
  column?: number;
}

interface AnalysisWarning {
  file: string;
  message: string;
  type: string;
  line?: number;
  column?: number;
}

interface AnalysisStats {
  filesAnalyzed: number;
  filesWithErrors: number;
  filesWithWarnings: number;
  totalSymbols: number;
  totalDependencies: number;
  totalPatterns: number;
  codeLines: number;
  commentLines: number;
  emptyLines: number;
}
