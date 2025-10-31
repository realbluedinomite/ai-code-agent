/**
 * Static Analyzer Component (Layer 1)
 * 
 * Performs static code analysis including:
 * - TypeScript compilation and type checking
 * - ESLint validation for best practices
 * - Syntax validation
 * - Code metrics calculation
 */

import { spawn, ChildProcess } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { TypedEventBus, eventBus, Events } from '@/core/event-bus';
import { logger } from '@/utils/loggers';
import { DatabaseConnectionManager } from '@/database/client';
import { CodeFileModel } from '@/database/models/code-file.model';
import {
  StaticAnalysisResult,
  SyntaxIssue,
  TypeCheckIssue,
  BestPracticeIssue,
  ValidationRule,
  ReviewConfiguration,
  ReviewerEventData,
} from './types';

export interface StaticAnalyzerConfig {
  /** Enable TypeScript compilation checking */
  enableTypeScript: boolean;
  /** Enable ESLint validation */
  enableESLint: boolean;
  /** Custom ESLint configuration path */
  eslintConfigPath?: string;
  /** TypeScript configuration path */
  tsConfigPath?: string;
  /** Maximum file size to analyze (bytes) */
  maxFileSize: number;
  /** Supported file extensions */
  supportedExtensions: string[];
  /** Custom validation rules */
  customRules?: ValidationRule[];
  /** ESLint rule configurations */
  eslintRules?: Record<string, any>;
  /** TypeScript compiler options */
  tsCompilerOptions?: Record<string, any>;
}

/**
 * Static Analyzer - Layer 1 of the Reviewer system
 * 
 * Performs comprehensive static code analysis including:
 * - TypeScript compilation and type checking
 * - ESLint validation for best practices
 * - Syntax validation
 * - Code metrics calculation
 */
export class StaticAnalyzer {
  private config: StaticAnalyzerConfig;
  private eventBus: TypedEventBus;
  private codeFileModel: CodeFileModel;
  private tempDir: string;

  constructor(
    dbManager: DatabaseConnectionManager,
    eventBusInstance?: TypedEventBus,
    config?: Partial<StaticAnalyzerConfig>
  ) {
    this.eventBus = eventBusInstance || eventBus;
    this.codeFileModel = new CodeFileModel(dbManager);
    this.tempDir = join(process.cwd(), 'tmp', 'static-analysis');

    this.config = {
      enableTypeScript: true,
      enableESLint: true,
      maxFileSize: 1048576, // 1MB
      supportedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.cpp'],
      eslintRules: {},
      tsCompilerOptions: {},
      ...config,
    };

    this.initializeTempDir();
  }

  /**
   * Analyze a single code file
   */
  async analyzeFile(file: {
    id: string;
    file_path: string;
    content: string;
    language?: string;
  }): Promise<StaticAnalysisResult> {
    const startTime = Date.now();

    try {
      // Emit event for file analysis start
      this.eventBus.emit('static:analysis:started', {
        file_id: file.id,
        file_path: file.file_path,
        session_id: 'unknown' // Will be set by the orchestrator
      });

      logger.info('Starting static analysis', {
        file_id: file.id,
        file_path: file.file_path,
        content_length: file.content.length
      });

      // Validate file size
      if (Buffer.byteLength(file.content, 'utf8') > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size: ${this.config.maxFileSize} bytes`);
      }

      const syntaxIssues: SyntaxIssue[] = [];
      const typeIssues: TypeCheckIssue[] = [];
      const bestPracticeIssues: BestPracticeIssue[] = [];

      // Create temporary file for analysis
      const tempFilePath = await this.createTempFile(file.file_path, file.content);

      try {
        // Perform syntax analysis
        if (this.config.enableTypeScript && this.isTypeScriptFile(file.file_path)) {
          await this.performTypeScriptAnalysis(tempFilePath, syntaxIssues, typeIssues);
        } else {
          await this.performBasicSyntaxAnalysis(tempFilePath, syntaxIssues);
        }

        // Perform ESLint analysis
        if (this.config.enableESLint && this.isLintedFile(file.file_path)) {
          await this.performESLintAnalysis(tempFilePath, bestPracticeIssues);
        }

        // Calculate code metrics
        const metrics = await this.calculateCodeMetrics(file.content, file.file_path);

        // Apply custom rules
        if (this.config.customRules && this.config.customRules.length > 0) {
          await this.applyCustomRules(file, bestPracticeIssues);
        }

        const result: StaticAnalysisResult = {
          file_id: file.id,
          file_path: file.file_path,
          syntax_valid: syntaxIssues.filter(i => i.severity === 'error').length === 0,
          type_check_passed: typeIssues.filter(i => i.severity === 'error').length === 0,
          syntax_issues: syntaxIssues,
          type_issues: typeIssues,
          best_practice_issues: bestPracticeIssues,
          metrics,
          timestamp: new Date(),
        };

        const processingTime = Date.now() - startTime;

        // Emit success event
        this.eventBus.emit('static:analysis:completed', {
          file_id: file.id,
          file_path: file.file_path,
          issues_found: syntaxIssues.length + typeIssues.length + bestPracticeIssues.length,
          processing_time_ms: processingTime,
          result
        });

        logger.info('Static analysis completed', {
          file_id: file.id,
          processing_time_ms: processingTime,
          issues_count: syntaxIssues.length + typeIssues.length + bestPracticeIssues.length
        });

        return result;

      } finally {
        // Clean up temporary file
        await this.cleanupTempFile(tempFilePath);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Static analysis failed', {
        file_id: file.id,
        file_path: file.file_path,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: processingTime
      });

      // Emit error event
      this.eventBus.emit('static:analysis:error', {
        file_id: file.id,
        file_path: file.file_path,
        error,
        processing_time_ms: processingTime
      });

      throw error;
    }
  }

  /**
   * Analyze multiple files in batch
   */
  async analyzeFiles(files: Array<{
    id: string;
    file_path: string;
    content: string;
    language?: string;
  }>): Promise<StaticAnalysisResult[]> {
    logger.info('Starting batch static analysis', { file_count: files.length });

    const results: StaticAnalysisResult[] = [];
    const errors: Array<{ file_id: string; error: Error }> = [];

    // Process files with limited concurrency
    const concurrency = Math.min(files.length, 5); // Limit to 5 concurrent analyses
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        try {
          const result = await this.analyzeFile(file);
          return { success: true, result, error: null };
        } catch (error) {
          errors.push({
            file_id: file.id,
            error: error instanceof Error ? error : new Error('Unknown error')
          });
          return { success: false, result: null, error };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      for (const chunkResult of chunkResults) {
        if (chunkResult.success && chunkResult.result) {
          results.push(chunkResult.result);
        }
      }
    }

    logger.info('Batch static analysis completed', {
      total_files: files.length,
      successful: results.length,
      failed: errors.length
    });

    if (errors.length > 0) {
      logger.warn('Some files failed static analysis', {
        error_count: errors.length,
        errors: errors.map(e => ({ file_id: e.file_id, error: e.error.message }))
      });
    }

    return results;
  }

  /**
   * Perform TypeScript compilation and type checking
   */
  private async performTypeScriptAnalysis(
    filePath: string,
    syntaxIssues: SyntaxIssue[],
    typeIssues: TypeCheckIssue[]
  ): Promise<void> {
    try {
      // Create a temporary tsconfig.json
      const tsConfigPath = await this.createTempTsConfig();

      // Run TypeScript compiler
      const tscResult = await this.runCommand('npx', [
        'tsc',
        '--noEmit',
        '--pretty',
        '--listFiles',
        filePath,
        '--project', tsConfigPath
      ]);

      if (tscResult.exitCode !== 0) {
        // Parse TypeScript errors
        const errors = this.parseTypeScriptErrors(tscResult.stderr);
        
        errors.forEach(error => {
          if (error.code.startsWith('TS')) {
            // TypeScript type errors start with TS
            typeIssues.push({
              file_id: '', // Will be set by caller
              file_path: filePath,
              line: error.line,
              column: error.column,
              message: error.message,
              severity: 'error',
              type: 'type_error',
              actual_type: error.actualType,
              expected_type: error.expectedType
            });
          } else {
            // Syntax errors
            syntaxIssues.push({
              file_id: '',
              file_path: filePath,
              line: error.line,
              column: error.column,
              message: error.message,
              severity: 'error',
              rule_id: error.code
            });
          }
        });
      }

    } catch (error) {
      logger.warn('TypeScript analysis failed, falling back to basic syntax check', {
        file_path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to basic syntax analysis
      await this.performBasicSyntaxAnalysis(filePath, syntaxIssues);
    }
  }

  /**
   * Perform basic syntax analysis
   */
  private async performBasicSyntaxAnalysis(
    filePath: string,
    syntaxIssues: SyntaxIssue[]
  ): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf8');

      // Basic syntax validation based on file type
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        await this.validateJavaScriptSyntax(content, filePath, syntaxIssues);
      } else if (filePath.endsWith('.py')) {
        await this.validatePythonSyntax(content, filePath, syntaxIssues);
      }

    } catch (error) {
      syntaxIssues.push({
        file_id: '',
        file_path: filePath,
        line: 1,
        message: `Failed to analyze syntax: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  }

  /**
   * Perform ESLint analysis
   */
  private async performESLintAnalysis(
    filePath: string,
    bestPracticeIssues: BestPracticeIssue[]
  ): Promise<void> {
    try {
      const eslintConfig = await this.createTempESLintConfig();
      
      // Run ESLint
      const eslintResult = await this.runCommand('npx', [
        'eslint',
        '--format', 'json',
        '--config', eslintConfig,
        filePath
      ]);

      if (eslintResult.exitCode !== 0 && eslintResult.stderr) {
        const eslintOutput = JSON.parse(eslintResult.stderr);
        
        eslintOutput.forEach((fileResult: any) => {
          fileResult.messages.forEach((message: any) => {
            bestPracticeIssues.push({
              file_id: '',
              file_path: filePath,
              line: message.line,
              message: message.message,
              severity: message.severity === 2 ? 'error' : 'warning',
              rule_id: message.ruleId || 'unknown',
              rule_name: message.ruleId || 'Unknown Rule',
              auto_fixable: message.fix !== undefined
            });
          });
        });
      }

    } catch (error) {
      logger.warn('ESLint analysis failed', {
        file_path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate JavaScript/TypeScript syntax
   */
  private async validateJavaScriptSyntax(
    content: string,
    filePath: string,
    syntaxIssues: SyntaxIssue[]
  ): Promise<void> {
    // Simple JavaScript syntax validation using regex patterns
    const lines = content.split('\n');
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for unbalanced brackets
      for (const char of line) {
        switch (char) {
          case '{': braceCount++; break;
          case '}': braceCount--; break;
          case '(': parenCount++; break;
          case ')': parenCount--; break;
          case '[': bracketCount++; break;
          case ']': bracketCount--; break;
        }
      }

      // Check for common syntax errors
      if (line.includes('console.log') && !line.includes('//')) {
        // Warn about console.log statements
        syntaxIssues.push({
          file_id: '',
          file_path: filePath,
          line: lineNumber,
          message: 'Console statement should be removed in production code',
          severity: 'warning',
          rule_id: 'no-console',
          code: line.trim()
        });
      }

      // Check for missing semicolons (basic check)
      if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) {
          syntaxIssues.push({
            file_id: '',
            file_path: filePath,
            line: lineNumber,
            message: 'Missing semicolon',
            severity: 'warning',
            rule_id: 'semi',
            code: line.trim()
          });
        }
      }
    });

    // Check final bracket balance
    if (braceCount !== 0) {
      syntaxIssues.push({
        file_id: '',
        file_path: filePath,
        line: lines.length,
        message: `Unbalanced braces: ${braceCount > 0 ? 'missing closing braces' : 'too many closing braces'}`,
        severity: 'error',
        rule_id: 'brace-style'
      });
    }
  }

  /**
   * Validate Python syntax
   */
  private async validatePythonSyntax(
    content: string,
    filePath: string,
    syntaxIssues: SyntaxIssue[]
  ): Promise<void> {
    // Basic Python syntax validation
    const lines = content.split('\n');
    let indentLevel = 0;
    let expectedIndent = 0;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return; // Skip empty lines and comments
      }

      // Count leading spaces for indentation
      const leadingSpaces = line.length - line.trimStart().length;
      const currentIndent = Math.floor(leadingSpaces / 4); // Assume 4-space indentation

      // Check indentation consistency
      if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
        // Next block should be indented
        expectedIndent = currentIndent + 1;
      } else if (currentIndent > expectedIndent) {
        syntaxIssues.push({
          file_id: '',
          file_path: filePath,
          line: lineNumber,
          message: 'Unexpected indentation increase',
          severity: 'error',
          rule_id: 'indent',
          code: line
        });
      } else {
        expectedIndent = currentIndent;
      }

      // Check for print statements (Python 3 compatibility)
      if (trimmed.includes('print ')) {
        syntaxIssues.push({
          file_id: '',
          file_path: filePath,
          line: lineNumber,
          message: 'Consider using print() function syntax',
          severity: 'warning',
          rule_id: 'print-statement',
          code: line
        });
      }
    });
  }

  /**
   * Calculate code metrics
   */
  private async calculateCodeMetrics(content: string, filePath: string): Promise<{
    cyclomatic_complexity?: number;
    cognitive_complexity?: number;
    code_coverage?: number;
    maintainability_index?: number;
    lines_of_code: number;
  }> {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const codeLines = nonEmptyLines.filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('#'));

    // Basic cyclomatic complexity calculation
    const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||', '?', 'switch'];
    let cyclomaticComplexity = 1; // Base complexity

    codeLines.forEach(line => {
      const lowerLine = line.toLowerCase();
      complexityKeywords.forEach(keyword => {
        if (lowerLine.includes(keyword)) {
          cyclomaticComplexity++;
        }
      });
    });

    // Lines of code
    const linesOfCode = codeLines.length;

    // Simple maintainability index calculation
    const halsteadComplexity = this.calculateHalsteadComplexity(content);
    const maintainabilityIndex = Math.max(0, Math.min(100, 
      171 - 5.2 * Math.log(linesOfCode) - 0.23 * halsteadComplexity - 16.2 * Math.log(cyclomaticComplexity)
    ));

    return {
      cyclomatic_complexity: cyclomaticComplexity,
      cognitive_complexity: cyclomaticComplexity * 1.2, // Simplified cognitive complexity
      code_coverage: undefined, // Would require coverage tools
      maintainability_index: Math.round(maintainabilityIndex),
      lines_of_code: linesOfCode
    };
  }

  /**
   * Calculate Halstead complexity metrics
   */
  private calculateHalsteadComplexity(content: string): number {
    // Simplified Halstead complexity calculation
    const operators = ['+', '-', '*', '/', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>'];
    const keywords = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'return', 'break', 'continue', 'function', 'const', 'let', 'var', 'class', 'interface', 'extends', 'implements'];

    let operatorCount = 0;
    let keywordCount = 0;

    const lowerContent = content.toLowerCase();
    
    operators.forEach(op => {
      const regex = new RegExp(`\\${op}`, 'g');
      const matches = lowerContent.match(regex);
      if (matches) operatorCount += matches.length;
    });

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = lowerContent.match(regex);
      if (matches) keywordCount += matches.length;
    });

    return operatorCount + keywordCount;
  }

  /**
   * Apply custom validation rules
   */
  private async applyCustomRules(
    file: { id: string; file_path: string; content: string },
    bestPracticeIssues: BestPracticeIssue[]
  ): Promise<void> {
    if (!this.config.customRules) return;

    for (const rule of this.config.customRules) {
      if (!rule.enabled) continue;

      try {
        await this.applyRule(file, rule, bestPracticeIssues);
      } catch (error) {
        logger.warn('Custom rule failed', {
          rule_id: rule.id,
          file_path: file.file_path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Apply a specific validation rule
   */
  private async applyRule(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    bestPracticeIssues: BestPracticeIssue[]
  ): Promise<void> {
    const lines = file.content.split('\n');

    switch (rule.category) {
      case 'best-practice':
        await this.applyBestPracticeRule(file, rule, lines, bestPracticeIssues);
        break;
      case 'security':
        await this.applySecurityRule(file, rule, lines, bestPracticeIssues);
        break;
      case 'performance':
        await this.applyPerformanceRule(file, rule, lines, bestPracticeIssues);
        break;
    }
  }

  /**
   * Apply best practice validation rules
   */
  private async applyBestPracticeRule(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    lines: string[],
    issues: BestPracticeIssue[]
  ): Promise<void> {
    // Implement specific best practice rules
    switch (rule.id) {
      case 'no-magic-numbers':
        this.checkMagicNumbers(file, rule, lines, issues);
        break;
      case 'max-function-length':
        this.checkFunctionLength(file, rule, lines, issues);
        break;
      case 'no-deep-nesting':
        this.checkNestingDepth(file, rule, lines, issues);
        break;
    }
  }

  /**
   * Check for magic numbers
   */
  private checkMagicNumbers(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    lines: string[],
    issues: BestPracticeIssue[]
  ): void {
    const magicNumberPattern = /\b\d{2,}\b/g; // Numbers with 2+ digits
    const acceptableNumbers = [10, 100, 1000]; // Common acceptable numbers

    lines.forEach((line, index) => {
      const matches = line.match(magicNumberPattern);
      if (matches) {
        matches.forEach(match => {
          const number = parseInt(match);
          if (!acceptableNumbers.includes(number)) {
            issues.push({
              file_id: file.id,
              file_path: file.file_path,
              line: index + 1,
              message: `Magic number detected: ${number}`,
              severity: rule.severity,
              rule_id: rule.id,
              rule_name: rule.name,
              suggestion: 'Consider using a named constant instead'
            });
          }
        });
      }
    });
  }

  /**
   * Check function length
   */
  private checkFunctionLength(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    lines: string[],
    issues: BestPracticeIssue[]
  ): void {
    const maxLength = rule.configuration?.maxLength || 50;
    let functionStart = -1;
    let braceLevel = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.match(/^function\s+\w+\s*\(/)) {
        functionStart = index;
        braceLevel = 0;
      } else if (functionStart >= 0) {
        for (const char of line) {
          if (char === '{') braceLevel++;
          else if (char === '}') braceLevel--;
        }

        if (braceLevel === 0) {
          const functionLength = index - functionStart + 1;
          if (functionLength > maxLength) {
            issues.push({
              file_id: file.id,
              file_path: file.file_path,
              line: functionStart + 1,
              message: `Function too long: ${functionLength} lines (max: ${maxLength})`,
              severity: rule.severity,
              rule_id: rule.id,
              rule_name: rule.name,
              suggestion: 'Consider breaking this function into smaller functions'
            });
          }
          functionStart = -1;
        }
      }
    });
  }

  /**
   * Check nesting depth
   */
  private checkNestingDepth(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    lines: string[],
    issues: BestPracticeIssue[]
  ): void {
    const maxDepth = rule.configuration?.maxDepth || 4;
    let currentDepth = 0;
    let maxFoundDepth = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Count opening braces/parentheses/brackets
      let depthIncrease = 0;
      for (const char of trimmed) {
        if (char === '{' || char === '(' || char === '[') {
          depthIncrease++;
        }
      }

      // Count closing braces/parentheses/brackets
      let depthDecrease = 0;
      for (const char of trimmed) {
        if (char === '}' || char === ')' || char === ']') {
          depthDecrease++;
        }
      }

      currentDepth += depthIncrease;
      maxFoundDepth = Math.max(maxFoundDepth, currentDepth);

      // Decrease depth after processing the line
      currentDepth -= depthDecrease;

      if (maxFoundDepth > maxDepth) {
        issues.push({
          file_id: file.id,
          file_path: file.file_path,
          line: index + 1,
          message: `Deep nesting detected: ${maxFoundDepth} levels (max: ${maxDepth})`,
          severity: rule.severity,
          rule_id: rule.id,
          rule_name: rule.name,
          suggestion: 'Consider refactoring to reduce nesting depth'
        });
      }
    });
  }

  /**
   * Apply security validation rules
   */
  private async applySecurityRule(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    lines: string[],
    issues: BestPracticeIssue[]
  ): Promise<void> {
    // Implement security rules
    const securityPatterns = [
      { pattern: /eval\s*\(/, message: 'Use of eval() is dangerous and should be avoided' },
      { pattern: /innerHTML\s*=/, message: 'Direct innerHTML assignment can lead to XSS vulnerabilities' },
      { pattern: /document\.write\s*\(/, message: 'document.write() should be avoided for security reasons' },
    ];

    lines.forEach((line, index) => {
      securityPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line)) {
          issues.push({
            file_id: file.id,
            file_path: file.file_path,
            line: index + 1,
            message,
            severity: 'error',
            rule_id: rule.id,
            rule_name: rule.name,
            suggestion: 'Use safer alternatives like textContent or DOM manipulation'
          });
        }
      });
    });
  }

  /**
   * Apply performance validation rules
   */
  private async applyPerformanceRule(
    file: { id: string; file_path: string; content: string },
    rule: ValidationRule,
    lines: string[],
    issues: BestPracticeIssue[]
  ): Promise<void> {
    // Implement performance rules
    const performancePatterns = [
      { pattern: /for\s*\(\s*\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\.length\s*;/, message: 'Consider caching array length in for loops' },
      { pattern: /new\s+Array\(\)/, message: 'Use array literals [] instead of new Array() for better performance' },
    ];

    lines.forEach((line, index) => {
      performancePatterns.forEach(({ pattern, message }) => {
        if (pattern.test(line)) {
          issues.push({
            file_id: file.id,
            file_path: file.file_path,
            line: index + 1,
            message,
            severity: rule.severity,
            rule_id: rule.id,
            rule_name: rule.name,
            suggestion: 'Optimize for better performance'
          });
        }
      });
    });
  }

  /**
   * Check if file is TypeScript
   */
  private isTypeScriptFile(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  }

  /**
   * Check if file should be linted
   */
  private isLintedFile(filePath: string): boolean {
    const lintedExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs'];
    return lintedExtensions.some(ext => filePath.endsWith(ext));
  }

  /**
   * Parse TypeScript errors
   */
  private parseTypeScriptErrors(stderr: string): Array<{
    line: number;
    column: number;
    message: string;
    code: string;
    actualType?: string;
    expectedType?: string;
  }> {
    const errors = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
      // TypeScript error format: file.ts(line,column): error TS1234: message
      const match = line.match(/^([^:]+):(\d+),(\d+):\s+error\s+(TS\d+):\s+(.+)/);
      if (match) {
        errors.push({
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5]
        });
      }
    }

    return errors;
  }

  /**
   * Create temporary file
   */
  private async createTempFile(filePath: string, content: string): Promise<string> {
    const tempFileName = `${uuidv4()}_${basename(filePath)}`;
    const tempFilePath = join(this.tempDir, tempFileName);

    await writeFile(tempFilePath, content, 'utf8');
    return tempFilePath;
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(tempFilePath: string): Promise<void> {
    try {
      // The file will be cleaned up automatically when temp directory is cleaned
      // For now, we'll leave it for debugging purposes
    } catch (error) {
      logger.warn('Failed to cleanup temp file', { temp_file_path: tempFilePath });
    }
  }

  /**
   * Create temporary TypeScript configuration
   */
  private async createTempTsConfig(): Promise<string> {
    const tsConfig = {
      compilerOptions: {
        target: 'es2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        ...this.config.tsCompilerOptions
      },
      include: ['**/*'],
      exclude: ['node_modules', 'dist', 'build']
    };

    const configPath = join(this.tempDir, `tsconfig_${uuidv4()}.json`);
    await writeFile(configPath, JSON.stringify(tsConfig, null, 2), 'utf8');
    return configPath;
  }

  /**
   * Create temporary ESLint configuration
   */
  private async createTempESLintConfig(): Promise<string> {
    const eslintConfig = {
      env: {
        browser: true,
        es2021: true,
        node: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-console': 'warn',
        'no-unused-vars': 'error',
        'semi': 'warn',
        ...this.config.eslintRules
      },
      ...(this.config.eslintConfigPath ? { configFile: this.config.eslintConfigPath } : {})
    };

    const configPath = join(this.tempDir, `.eslintrc_${uuidv4()}.json`);
    await writeFile(configPath, JSON.stringify(eslintConfig, null, 2), 'utf8');
    return configPath;
  }

  /**
   * Run a shell command
   */
  private runCommand(command: string, args: string[]): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ exitCode: exitCode || 0, stdout, stderr });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Add timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out: ${command} ${args.join(' ')}`));
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Initialize temporary directory
   */
  private async initializeTempDir(): Promise<void> {
    if (!existsSync(this.tempDir)) {
      await mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Get analyzer statistics
   */
  getStats(): {
    config: StaticAnalyzerConfig;
    supported_languages: string[];
    capabilities: string[];
  } {
    return {
      config: this.config,
      supported_languages: this.config.supportedExtensions,
      capabilities: [
        'TypeScript compilation',
        'ESLint validation',
        'Syntax analysis',
        'Code metrics',
        'Custom rules'
      ]
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StaticAnalyzerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}