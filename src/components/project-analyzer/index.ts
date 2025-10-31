/**
 * Project Analyzer - Comprehensive codebase analysis tool
 * 
 * Features:
 * - Smart caching with file modification tracking
 * - File analysis including dependencies and patterns
 * - TypeScript compilation and parsing
 * - Symbol table generation
 * - Dependency graph building
 */

export { ProjectAnalyzer } from './project-analyzer';
export { FileAnalyzer } from './file-analyzer';
export { DependencyAnalyzer } from './dependency-analyzer';
export { PatternDetector } from './pattern-detector';
export { CacheManager } from './cache-manager';
export { SymbolTable } from './symbol-table';
export { DependencyGraph } from './dependency-graph';

export type {
  AnalysisConfig,
  AnalysisResult,
  FileAnalysisResult,
  DependencyAnalysisResult,
  PatternAnalysisResult,
  Symbol,
  SymbolTableEntry,
  DependencyEdge,
  FileModificationInfo,
  CacheOptions,
} from './types';
