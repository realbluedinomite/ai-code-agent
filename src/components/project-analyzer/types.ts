/**
 * Type definitions for Project Analyzer
 */

import * as ts from 'typescript';

export interface AnalysisConfig {
  projectPath: string;
  includeFiles?: string[];
  excludeFiles?: string[];
  includeNodeModules?: boolean;
  analyzeTypeScript?: boolean;
  generateSymbolTable?: boolean;
  buildDependencyGraph?: boolean;
  detectPatterns?: boolean;
  cacheEnabled?: boolean;
  maxCacheSize?: number;
  cacheTTL?: number;
  performanceMode?: boolean;
  parallelAnalysis?: boolean;
  maxConcurrency?: number;
  tsConfigPath?: string;
  customSymbols?: string[];
}

export interface AnalysisResult {
  projectPath: string;
  totalFiles: number;
  analyzedFiles: number;
  errors: AnalysisError[];
  warnings: AnalysisWarning[];
  stats: AnalysisStats;
  symbolTable?: SymbolTable;
  dependencyGraph?: DependencyGraph;
  patterns?: PatternAnalysisResult;
  cache?: CacheStats;
  duration: number;
}

export interface AnalysisError {
  file: string;
  message: string;
  code: string;
  line?: number;
  column?: number;
}

export interface AnalysisWarning {
  file: string;
  message: string;
  type: string;
  line?: number;
  column?: number;
}

export interface AnalysisStats {
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

export interface FileAnalysisResult {
  filePath: string;
  fileType: FileType;
  size: number;
  lastModified: number;
  content?: string;
  ast?: ts.SourceFile;
  symbols: Symbol[];
  dependencies: string[];
  exports: string[];
  imports: string[];
  patterns: CodePattern[];
  complexity?: ComplexityMetrics;
  stats: FileStats;
}

export interface FileStats {
  lines: number;
  codeLines: number;
  commentLines: number;
  emptyLines: number;
  functions: number;
  classes: number;
  interfaces: number;
  variables: number;
}

export enum FileType {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  TSX = 'tsx',
  JSX = 'jsx',
  JSON = 'json',
  CSS = 'css',
  SCSS = 'scss',
  HTML = 'html',
  MD = 'markdown',
  OTHER = 'other',
}

export interface Symbol {
  name: string;
  kind: ts.SymbolKind;
  type?: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  exports?: string[];
  imports?: string[];
  documentation?: string;
  isExported: boolean;
  isDeclared: boolean;
  isExternal?: boolean;
}

export interface SymbolTableEntry {
  symbol: Symbol;
  references: SymbolReference[];
  definition: SymbolDefinition;
  dependencies: string[];
  dependents: string[];
}

export interface SymbolReference {
  location: {
    file: string;
    line: number;
    column: number;
  };
  context: string;
}

export interface SymbolDefinition {
  location: {
    file: string;
    line: number;
    column: number;
  };
  signature?: string;
  typeDefinition?: string;
}

export interface SymbolTable {
  symbols: Map<string, SymbolTableEntry>;
  globalSymbols: string[];
  modules: Map<string, ModuleInfo>;
  addSymbol(symbol: Symbol): void;
  getSymbol(name: string): SymbolTableEntry | undefined;
  getSymbolReferences(name: string): SymbolReference[];
  getSymbolDependencies(name: string): string[];
  getSymbolDependents(name: string): string[];
}

export interface ModuleInfo {
  path: string;
  exports: string[];
  imports: string[];
  isExternal: boolean;
  version?: string;
}

export interface DependencyAnalysisResult {
  graph: DependencyGraph;
  externalDependencies: ExternalDependency[];
  circularDependencies: CircularDependency[];
  unusedDependencies: UnusedDependency[];
  duplicateDependencies: DuplicateDependency[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge[]>;
  addNode(node: DependencyNode): void;
  addEdge(from: string, to: string, type: DependencyType, weight?: number): void;
  getNode(id: string): DependencyNode | undefined;
  getEdges(from?: string): DependencyEdge[];
  findCycles(): string[][];
  getTopLevelDependencies(): string[];
  getLeafNodes(): string[];
}

export interface DependencyNode {
  id: string;
  path: string;
  type: FileType;
  size: number;
  dependencies: number;
  dependents: number;
  level: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  weight: number;
  isCircular?: boolean;
  isDirect?: boolean;
  importStatement?: string;
}

export enum DependencyType {
  IMPORT = 'import',
  REQUIRE = 'require',
  EXPORT = 'export',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  REFERENCE = 'reference',
}

export interface ExternalDependency {
  name: string;
  version?: string;
  type: 'npm' | 'git' | 'local' | 'builtin';
  files: string[];
  isUsed: boolean;
  isDev?: boolean;
  license?: string;
}

export interface CircularDependency {
  path: string[];
  files: string[];
}

export interface UnusedDependency {
  name: string;
  type: 'npm' | 'local' | 'builtin';
  files: string[];
}

export interface DuplicateDependency {
  name: string;
  versions: string[];
  files: string[];
}

export interface PatternAnalysisResult {
  patterns: CodePattern[];
  architecturalIssues: ArchitecturalIssue[];
  codeQualityIssues: CodeQualityIssue[];
  statistics: PatternStats;
}

export interface CodePattern {
  type: PatternType;
  name: string;
  description: string;
  files: PatternLocation[];
  severity: 'info' | 'warning' | 'error';
  category: PatternCategory;
  recommendation?: string;
  examples?: string[];
}

export enum PatternType {
  COMPONENT = 'component',
  HOOK = 'hook',
  CONTEXT = 'context',
  HOC = 'hoc',
  RENDER_PROPS = 'render_props',
  CUSTOM_HOOK = 'custom_hook',
  MIDDLEWARE = 'middleware',
  DECORATOR = 'decorator',
  OBSERVER = 'observer',
  STRATEGY = 'strategy',
  FACADE = 'facade',
  ADAPTER = 'adapter',
  FACTORY = 'factory',
  SINGLETON = 'singleton',
}

export enum PatternCategory {
  ARCHITECTURAL = 'architectural',
  DESIGN = 'design',
  BEHAVIORAL = 'behavioral',
  CREATIONAL = 'creational',
  STRUCTURAL = 'structural',
  REACT_SPECIFIC = 'react_specific',
  PERFORMANCE = 'performance',
  ANTI_PATTERN = 'anti_pattern',
}

export interface PatternLocation {
  file: string;
  line: number;
  column: number;
  context: string;
}

export interface ArchitecturalIssue {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  files: string[];
  recommendation: string;
}

export interface CodeQualityIssue {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  file: string;
  line: number;
  column: number;
  recommendation: string;
}

export interface PatternStats {
  totalPatterns: number;
  patternsByType: Map<PatternType, number>;
  patternsByCategory: Map<PatternCategory, number>;
  antiPatterns: number;
  unusedPatterns: string[];
  mostUsedPatterns: { pattern: string; count: number }[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  halsteadMetrics: HalsteadMetrics;
  maintainabilityIndex: number;
  linesOfCode: number;
}

export interface HalsteadMetrics {
  vocabulary: number;
  length: number;
  calculatedLength: number;
  volume: number;
  difficulty: number;
  effort: number;
  time: number;
  bugs: number;
}

export interface FileModificationInfo {
  path: string;
  lastModified: number;
  size: number;
  hash: string;
  dependencies: string[];
  lastAnalyzed?: number;
}

export interface CacheOptions {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  checkModifications: boolean;
  compression: boolean;
  persistent: boolean;
  cacheDir?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  entries: number;
  evictions: number;
  compressionRatio?: number;
}

export { ts };
