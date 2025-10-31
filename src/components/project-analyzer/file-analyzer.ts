/**
 * FileAnalyzer - Comprehensive file analysis including dependencies and patterns
 * 
 * Features:
 * - TypeScript/JavaScript parsing and analysis
 * - File type detection and statistics
 * - Symbol extraction from AST
 * - Import/export analysis
 * - Code complexity metrics
 * - Pattern detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  FileAnalysisResult,
  FileType,
  FileStats,
  Symbol,
  CodePattern,
  PatternType,
  PatternCategory,
  ComplexityMetrics,
  HalsteadMetrics,
} from './types';
import { CacheManager } from './cache-manager';
import { PatternDetector } from './pattern-detector';

export class FileAnalyzer {
  private cacheManager: CacheManager;
  private patternDetector: PatternDetector;
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;

  constructor(cacheManager?: CacheManager) {
    this.cacheManager = cacheManager || new CacheManager();
    this.patternDetector = new PatternDetector();
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath: string, tsConfigPath?: string): Promise<FileAnalysisResult> {
    const cacheKey = `file:${filePath}`;
    
    // Check cache first
    const cached = this.cacheManager.get<FileAnalysisResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Read file
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      
      // Detect file type
      const fileType = this.detectFileType(filePath);
      
      // Parse TypeScript/JavaScript files
      let ast: ts.SourceFile | undefined;
      if (this.isCodeFile(fileType)) {
        ast = this.parseFile(filePath, content, tsConfigPath);
      }
      
      // Analyze symbols
      const symbols = ast ? this.extractSymbols(ast, filePath) : [];
      
      // Analyze dependencies
      const { imports, dependencies, exports } = ast 
        ? this.analyzeDependencies(ast, filePath)
        : { imports: [], dependencies: [], exports: [] };
      
      // Detect patterns
      const patterns = ast 
        ? this.patternDetector.detectPatterns(ast, filePath)
        : [];
      
      // Calculate complexity
      const complexity = ast ? this.calculateComplexity(ast) : undefined;
      
      // Calculate file statistics
      const fileStats = this.calculateFileStats(content, ast);
      
      const result: FileAnalysisResult = {
        filePath,
        fileType,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        content,
        ast,
        symbols,
        dependencies,
        exports,
        imports,
        patterns,
        complexity,
        stats: fileStats,
      };
      
      // Cache the result
      this.cacheManager.set(cacheKey, result, {
        path: filePath,
        lastModified: stats.mtime.getTime(),
        size: stats.size,
        hash: this.calculateHash(content),
        dependencies,
      });
      
      return result;
    } catch (error) {
      throw new Error(`Failed to analyze file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze multiple files in parallel
   */
  async analyzeFiles(filePaths: string[], tsConfigPath?: string, maxConcurrency: number = 10): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];
    const batches = this.createBatches(filePaths, maxConcurrency);
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(filePath => this.analyzeFile(filePath, tsConfigPath))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Detect file type based on extension
   */
  detectFileType(filePath: string): FileType {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.ts':
        return FileType.TYPESCRIPT;
      case '.js':
        return FileType.JAVASCRIPT;
      case '.tsx':
        return FileType.TSX;
      case '.jsx':
        return FileType.JSX;
      case '.json':
        return FileType.JSON;
      case '.css':
        return FileType.CSS;
      case '.scss':
      case '.sass':
        return FileType.SCSS;
      case '.html':
      case '.htm':
        return FileType.HTML;
      case '.md':
      case '.markdown':
        return FileType.MD;
      default:
        return FileType.OTHER;
    }
  }

  /**
   * Parse TypeScript/JavaScript file
   */
  private parseFile(filePath: string, content: string, tsConfigPath?: string): ts.SourceFile {
    const config = tsConfigPath 
      ? ts.readConfigFile(tsConfigPath, ts.sys.readFile)?.config
      : {};
    
    const compilerOptions: ts.CompilerOptions = {
      ...config?.compilerOptions,
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
      checkJs: false,
      noEmit: true,
      isolatedModules: true,
      strict: true,
    };
    
    const host = ts.createCompilerHost(compilerOptions);
    host.readFile = () => content;
    host.fileExists = (file) => file === filePath;
    
    this.program = ts.createProgram([filePath], compilerOptions, host);
    this.checker = this.program.getTypeChecker();
    
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Failed to parse ${filePath}`);
    }
    
    return sourceFile;
  }

  /**
   * Extract symbols from AST
   */
  private extractSymbols(sourceFile: ts.SourceFile, filePath: string): Symbol[] {
    const symbols: Symbol[] = [];
    
    const visit = (node: ts.Node) => {
      // Extract various symbol types
      if (ts.isFunctionDeclaration(node) && node.name) {
        symbols.push(this.createSymbol(node.name.getText(), ts.SymbolKind.Function, node, sourceFile, filePath));
      } else if (ts.isClassDeclaration(node) && node.name) {
        symbols.push(this.createSymbol(node.name.getText(), ts.SymbolKind.Class, node, sourceFile, filePath));
      } else if (ts.isInterfaceDeclaration(node)) {
        symbols.push(this.createSymbol(node.name.getText(), ts.SymbolKind.Interface, node, sourceFile, filePath));
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        symbols.push(this.createSymbol(node.name.getText(), ts.SymbolKind.TypeAlias, node, sourceFile, filePath));
      } else if (ts.isEnumDeclaration(node) && node.name) {
        symbols.push(this.createSymbol(node.name.getText(), ts.SymbolKind.Enum, node, sourceFile, filePath));
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(declaration => {
          if (ts.isVariableDeclaration(declaration) && declaration.name) {
            symbols.push(this.createSymbol(
              declaration.name.getText(), 
              ts.SymbolKind.Variable, 
              declaration, 
              sourceFile, 
              filePath
            ));
          }
        });
      } else if (ts.isImportDeclaration(node)) {
        // Import symbols will be handled in dependency analysis
      } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        // Export symbols will be handled in dependency analysis
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    
    // Add type information if checker is available
    if (this.checker) {
      symbols.forEach(symbol => {
        try {
          const type = this.checker!.getTypeAtLocation(
            this.findNodeByPosition(sourceFile, symbol.location.line, symbol.location.column)
          );
          if (type) {
            symbol.type = this.checker!.typeToString(type);
          }
        } catch (error) {
          // Ignore type resolution errors
        }
      });
    }
    
    return symbols;
  }

  /**
   * Create symbol from node
   */
  private createSymbol(
    name: string,
    kind: ts.SymbolKind,
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): Symbol {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    
    return {
      name,
      kind,
      location: {
        file: filePath,
        line: position.line + 1,
        column: position.character + 1,
      },
      isExported: this.isExported(node),
      isDeclared: true,
      documentation: ts.displayPartsToString(ts.getJSDocCommentsAndTags(node)),
    };
  }

  /**
   * Analyze dependencies (imports and exports)
   */
  private analyzeDependencies(sourceFile: ts.SourceFile, filePath: string): {
    imports: string[];
    dependencies: string[];
    exports: string[];
  } {
    const imports: string[] = [];
    const dependencies: string[] = [];
    const exports: string[] = [];
    
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          imports.push(importPath);
          
          // Determine if it's an external dependency
          if (this.isExternalDependency(importPath)) {
            dependencies.push(importPath);
          }
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          exports.push(node.moduleSpecifier.text);
        }
      } else if (ts.isExportAssignment(node)) {
        // Handle default exports
        if (node.isExportEquals) {
          // export = something
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    
    return { imports, dependencies, exports };
  }

  /**
   * Calculate file statistics
   */
  private calculateFileStats(content: string, ast?: ts.SourceFile): FileStats {
    if (ast) {
      let functions = 0;
      let classes = 0;
      let interfaces = 0;
      let variables = 0;
      
      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
          functions++;
        } else if (ts.isClassDeclaration(node)) {
          classes++;
        } else if (ts.isInterfaceDeclaration(node)) {
          interfaces++;
        } else if (ts.isVariableStatement(node)) {
          variables += node.declarationList.declarations.length;
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(ast);
      
      return {
        lines: this.countLines(content),
        codeLines: this.countCodeLines(content, ast),
        commentLines: this.countCommentLines(content, ast),
        emptyLines: this.countEmptyLines(content),
        functions,
        classes,
        interfaces,
        variables,
      };
    }
    
    // Fallback for non-code files
    return {
      lines: this.countLines(content),
      codeLines: this.countLines(content),
      commentLines: 0,
      emptyLines: this.countEmptyLines(content),
      functions: 0,
      classes: 0,
      interfaces: 0,
      variables: 0,
    };
  }

  /**
   * Calculate complexity metrics
   */
  private calculateComplexity(sourceFile: ts.SourceFile): ComplexityMetrics {
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;
    let halstead: HalsteadMetrics;
    
    // Count cyclomatic complexity
    const visit = (node: ts.Node) => {
      if (
        ts.isIfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node) ||
        ts.isConditionalExpression(node)
      ) {
        cyclomaticComplexity++;
        cognitiveComplexity++;
      } else if (ts.isBinaryExpression(node)) {
        // Handle logical operators
        if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          cognitiveComplexity++;
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    
    // Calculate Halstead metrics
    halstead = this.calculateHalsteadMetrics(sourceFile);
    
    // Calculate maintainability index (simplified)
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      halstead,
      this.countLines(sourceFile.getFullText()),
      cyclomaticComplexity
    );
    
    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      halsteadMetrics: halstead,
      maintainabilityIndex,
      linesOfCode: this.countCodeLines(sourceFile.getFullText(), sourceFile),
    };
  }

  /**
   * Calculate Halstead metrics
   */
  private calculateHalsteadMetrics(sourceFile: ts.SourceFile): HalsteadMetrics {
    const text = sourceFile.getFullText();
    
    // Simple tokenization
    const operators = new Set([
      '+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=',
      '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '>>>', '+=', '-=', '*=', '/=',
      '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>=', '=>', '...', '?.', '??',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'try', 'catch',
      'finally', 'return', 'break', 'continue', 'throw', 'new', 'delete', 'typeof',
      'instanceof', 'in', 'await', 'async', 'void', 'yield', 'class', 'extends',
      'implements', 'interface', 'extends', 'super', 'this', 'constructor'
    ]);
    
    const operands = new Set();
    let operatorCount = 0;
    let operandCount = 0;
    
    // Simple parsing (this is a simplified version)
    const words = text.split(/[\s\n\r]+/);
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord) {
        if (operators.has(cleanWord)) {
          operatorCount++;
        } else if (!this.isKeyword(cleanWord)) {
          operands.add(cleanWord);
          operandCount++;
        }
      }
    }
    
    const vocabulary = operatorCount + operands.size;
    const length = operatorCount + operandCount;
    const calculatedLength = vocabulary * Math.log2(vocabulary);
    const volume = length * Math.log2(vocabulary);
    const difficulty = (operatorCount / 2) * (operands.size / length);
    const effort = difficulty * volume;
    const time = effort / 18;
    const bugs = volume / 3000;
    
    return {
      vocabulary,
      length,
      calculatedLength,
      volume,
      difficulty,
      effort,
      time,
      bugs,
    };
  }

  /**
   * Calculate maintainability index
   */
  private calculateMaintainabilityIndex(
    halstead: HalsteadMetrics,
    linesOfCode: number,
    cyclomaticComplexity: number
  ): number {
    // Simplified maintainability index calculation
    const hl = Math.log(halstead.vocabulary + 1);
    const loc = Math.log(linesOfCode + 1);
    const cc = Math.log(cyclomaticComplexity + 1);
    
    // MI = 171 - 5.2 * ln(HV) - 0.23 * ln(CC) - 16.2 * ln(LOC)
    const mi = 171 - 5.2 * hl - 0.23 * cc - 16.2 * loc;
    
    return Math.max(0, Math.min(100, mi));
  }

  // Helper methods

  private isCodeFile(fileType: FileType): boolean {
    return [FileType.TYPESCRIPT, FileType.JAVASCRIPT, FileType.TSX, FileType.JSX].includes(fileType);
  }

  private isExported(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
      if (ts.isModuleBlock(parent) || ts.isSourceFile(parent)) {
        return false; // Not exported if in module block
      }
      if (ts.isExportDeclaration(parent) || ts.isExportAssignment(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  private isExternalDependency(importPath: string): boolean {
    return importPath.startsWith('.') || importPath.startsWith('/') 
      ? false 
      : true;
  }

  private isKeyword(word: string): boolean {
    const keywords = new Set([
      'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'try',
      'catch', 'finally', 'return', 'break', 'continue', 'throw', 'new', 'delete',
      'typeof', 'instanceof', 'in', 'await', 'async', 'void', 'yield', 'this',
      'super', 'constructor', 'extends', 'implements', 'import', 'export', 'from',
      'public', 'private', 'protected', 'static', 'readonly', 'abstract', 'final',
      'true', 'false', 'null', 'undefined'
    ]);
    return keywords.has(word);
  }

  private findNodeByPosition(sourceFile: ts.SourceFile, line: number, column: number): ts.Node {
    const position = ts.getPositionOfLineAndCharacter(sourceFile, line - 1, column - 1);
    return sourceFile.getChildAt(position) || sourceFile;
  }

  private countLines(content: string): number {
    return content.split(/\r\n|\r|\n/).length;
  }

  private countEmptyLines(content: string): number {
    return content.split(/\r\n|\r|\n/).filter(line => line.trim() === '').length;
  }

  private countCodeLines(content: string, sourceFile?: ts.SourceFile): number {
    if (sourceFile) {
      return sourceFile.getFullText().split(/\r\n|\r|\n/).length;
    }
    return content.split(/\r\n|\r|\n/).filter(line => line.trim() !== '').length;
  }

  private countCommentLines(content: string, sourceFile?: ts.SourceFile): number {
    if (!sourceFile) return 0;
    
    let commentLines = 0;
    const visit = (node: ts.Node) => {
      const fullText = node.getFullText();
      const fullStart = node.getFullStart();
      const hasLeadingComment = ts.getLeadingCommentRanges(fullText, 0);
      if (hasLeadingComment) {
        commentLines += hasLeadingComment.length;
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return commentLines;
  }

  private calculateHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
