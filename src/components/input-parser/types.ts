/**
 * Input Parser Types and Interfaces
 * Defines all type definitions for the input parsing system
 */

import { Priority } from '@/database/types';

// Intent types for command classification
export enum IntentType {
  ADD_FEATURE = 'ADD_FEATURE',
  FIX_BUG = 'FIX_BUG',
  REFACTOR = 'REFACTOR',
  EXPLAIN_CODE = 'EXPLAIN_CODE',
  ANALYZE_CODE = 'ANALYZE_CODE',
  OPTIMIZE_CODE = 'OPTIMIZE_CODE',
  DOCUMENT_CODE = 'DOCUMENT_CODE',
  TEST_CODE = 'TEST_CODE',
  DEPLOY_CODE = 'DEPLOY_CODE',
  REVIEW_CODE = 'REVIEW_CODE',
  UNKNOWN = 'UNKNOWN'
}

// Extracted entities from user input
export interface ExtractedEntities {
  files?: FilePath[];
  features?: Feature[];
  constraints?: Constraint[];
  dependencies?: Dependency[];
  codePatterns?: CodePattern[];
  customEntities?: Record<string, any>;
}

// File path entity
export interface FilePath {
  path: string;
  type: 'file' | 'directory' | 'pattern';
  confidence: number;
  isGlob?: boolean;
  isAbsolute?: boolean;
}

// Feature entity
export interface Feature {
  name: string;
  type: 'functionality' | 'endpoint' | 'component' | 'module';
  description?: string;
  location?: string;
  confidence: number;
}

// Constraint entity
export interface Constraint {
  type: 'performance' | 'security' | 'compatibility' | 'style' | 'architecture';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value?: string | number;
  confidence: number;
}

// Dependency entity
export interface Dependency {
  name: string;
  version?: string;
  type: 'package' | 'module' | 'library' | 'framework';
  location?: string;
  confidence: number;
}

// Code pattern entity
export interface CodePattern {
  pattern: string;
  type: 'algorithm' | 'pattern' | 'anti-pattern' | 'best-practice';
  location?: string;
  confidence: number;
}

// Parsed request structure
export interface ParsedRequestData {
  intent: IntentType;
  entities: ExtractedEntities;
  confidence: number;
  originalText: string;
  parameters: Record<string, any>;
  context: RequestContext;
  validation: ValidationResult;
}

// Request context information
export interface RequestContext {
  projectPath?: string;
  projectType?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  source: 'cli' | 'api' | 'web' | 'websocket';
  metadata: Record<string, any>;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'warning' | 'error' | 'info';
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
}

// Project scanning results
export interface ProjectScanResult {
  projectPath: string;
  projectName: string;
  projectType: string;
  structure: ProjectStructure;
  metrics: ProjectMetrics;
  files: ScannedFile[];
  dependencies: ScannedDependency[];
  configuration: ProjectConfiguration;
  health: ProjectHealth;
}

export interface ProjectStructure {
  rootPath: string;
  directories: DirectoryInfo[];
  fileCount: number;
  directoryCount: number;
  maxDepth: number;
  hasTests: boolean;
  hasDocumentation: boolean;
  hasConfig: boolean;
}

export interface DirectoryInfo {
  path: string;
  name: string;
  fileCount: number;
  subdirectories: DirectoryInfo[];
  level: number;
}

export interface ProjectMetrics {
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  complexityScore: number;
  testCoverage?: number;
}

export interface ScannedFile {
  path: string;
  name: string;
  type: string;
  size: number;
  lineCount: number;
  language: string;
  modifiedAt: Date;
  isTest: boolean;
  isConfig: boolean;
  imports?: string[];
  exports?: string[];
}

export interface ScannedDependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  source: 'package.json' | 'requirements.txt' | 'pom.xml' | 'Cargo.toml';
  description?: string;
  license?: string;
  homepage?: string;
}

export interface ProjectConfiguration {
  buildSystem: string | null;
  packageManager: string | null;
  hasTypeScript: boolean;
  hasESLint: boolean;
  hasPrettier: boolean;
  hasTests: boolean;
  hasCI: boolean;
  frameworks: string[];
  libraries: string[];
}

export interface ProjectHealth {
  score: number;
  issues: ProjectIssue[];
  recommendations: string[];
  lastAnalyzed: Date;
}

export interface ProjectIssue {
  type: 'error' | 'warning' | 'info';
  category: 'security' | 'performance' | 'maintainability' | 'compatibility';
  description: string;
  file?: string;
  line?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// LLM response structure
export interface LLMResponse {
  intent: IntentType;
  entities: ExtractedEntities;
  confidence: number;
  rawResponse: string;
  tokensUsed: number;
  model: string;
}

// Parser configuration
export interface ParserConfig {
  groqApiKey?: string;
  modelName: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
  fallbackEnabled: boolean;
  validationThreshold: number;
  entityExtractionEnabled: boolean;
  projectScanningEnabled: boolean;
  contextWindowSize: number;
}

// Parser statistics
export interface ParserStats {
  totalRequests: number;
  successfulParses: number;
  failedParses: number;
  averageConfidence: number;
  intentDistribution: Record<IntentType, number>;
  averageProcessingTime: number;
  lastUsed: Date;
}

// Event data structures
export interface ParseRequestEventData {
  requestId: string;
  originalText: string;
  context: RequestContext;
}

export interface ParseCompleteEventData {
  requestId: string;
  result: ParsedRequestData;
  processingTime: number;
}

export interface ParseErrorEventData {
  requestId: string;
  error: Error;
  originalText: string;
  context: RequestContext;
}

export interface ProjectScanEventData {
  requestId: string;
  projectPath: string;
  scanType: 'full' | 'incremental' | 'partial';
}

export interface ProjectScanCompleteEventData {
  requestId: string;
  result: ProjectScanResult;
  processingTime: number;
}

// Error types
export class InputParserError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'INPUT_PARSER_ERROR', details?: any) {
    super(message);
    this.name = 'InputParserError';
    this.code = code;
    this.details = details;
  }
}

export class IntentExtractionError extends InputParserError {
  constructor(message: string, details?: any) {
    super(message, 'INTENT_EXTRACTION_ERROR', details);
  }
}

export class EntityExtractionError extends InputParserError {
  constructor(message: string, details?: any) {
    super(message, 'ENTITY_EXTRACTION_ERROR', details);
  }
}

export class ProjectScanError extends InputParserError {
  constructor(message: string, details?: any) {
    super(message, 'PROJECT_SCAN_ERROR', details);
  }
}

export class ValidationError extends InputParserError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

// Utility types
export type EntityConfidence = number; // 0.0 to 1.0
export type ProcessingTime = number; // milliseconds
export type FileSize = number; // bytes

// Constants
export const ENTITY_CONFIDENCE_THRESHOLD = 0.7;
export const INTENT_CONFIDENCE_THRESHOLD = 0.8;
export const VALIDATION_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_PROJECT_SCAN_DEPTH = 10;
export const MAX_FILES_PER_SCAN = 1000;
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_MAX_RETRIES = 3;
