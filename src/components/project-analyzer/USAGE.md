# Project Analyzer - Usage Guide

This guide provides practical examples and best practices for using the Project Analyzer in various scenarios.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration Examples](#integration-examples)
3. [Advanced Configuration](#advanced-configuration)
4. [Performance Optimization](#performance-optimization)
5. [CI/CD Integration](#cicd-integration)
6. [Plugin Development](#plugin-development)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Analysis

```typescript
import { ProjectAnalyzer } from '@project-analyzer/core';

async function analyzeMyProject() {
  const analyzer = new ProjectAnalyzer({
    projectPath: './my-project',
  });

  const result = await analyzer.analyze();
  
  console.log(`Analyzed ${result.analyzedFiles} files`);
  console.log(`Found ${result.stats.totalSymbols} symbols`);
  console.log(`Detected ${result.stats.totalPatterns} patterns`);
  
  return result;
}
```

### Web Dashboard Integration

```typescript
import { ProjectAnalyzer } from '@project-analyzer/core';
import express from 'express';

const app = express();
const analyzer = new ProjectAnalyzer({
  projectPath: process.cwd(),
  cacheEnabled: true,
  performanceMode: true,
});

app.get('/api/analyze', async (req, res) => {
  try {
    const result = await analyzer.analyze();
    res.json({
      success: true,
      data: {
        filesAnalyzed: result.analyzedFiles,
        totalSymbols: result.stats.totalSymbols,
        complexityScore: calculateComplexityScore(result),
        dependencyHealth: analyzeDependencyHealth(result),
        patternBreakdown: result.patterns?.statistics,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateComplexityScore(result: any): number {
  // Implementation for complexity scoring
  return 85;
}

function analyzeDependencyHealth(result: any): any {
  // Implementation for dependency health analysis
  return { score: 90, issues: [] };
}

app.listen(3000);
```

## Integration Examples

### VS Code Extension

```typescript
import { ProjectAnalyzer } from '@project-analyzer/core';
import * as vscode from 'vscode';

export class AnalyzerProvider {
  private analyzer: ProjectAnalyzer;
  private diagnostics: vscode.DiagnosticCollection;

  constructor() {
    this.analyzer = new ProjectAnalyzer({
      projectPath: vscode.workspace.rootPath!,
      analyzeTypeScript: true,
      detectPatterns: true,
    });
    this.diagnostics = vscode.languages.createDiagnosticCollection('project-analyzer');
  }

  async analyzeProject() {
    try {
      const result = await this.analyzer.analyze();
      
      // Update diagnostics
      this.updateDiagnostics(result.errors);
      
      // Show status
      vscode.window.setStatusBarMessage(
        `Project Analyzer: ${result.analyzedFiles} files analyzed`,
        5000
      );
      
      return result;
    } catch (error) {
      vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
  }

  private updateDiagnostics(errors: AnalysisError[]) {
    const diagnosticMap = new Map<string, vscode.Diagnostic[]>();
    
    errors.forEach(error => {
      const uri = vscode.Uri.file(error.file);
      const diagnostics = diagnosticMap.get(uri.toString()) || [];
      
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position((error.line || 1) - 1, (error.column || 1) - 1),
          new vscode.Position((error.line || 1) - 1, (error.column || 1))
        ),
        error.message,
        vscode.DiagnosticSeverity.Error
      ));
      
      diagnosticMap.set(uri.toString(), diagnostics);
    });
    
    this.diagnostics.clear();
    this.diagnostics.set(diagnosticMap);
  }
}
```

### GitHub Action

```yaml
name: Code Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Project Analyzer
        run: |
          npx ts-node src/analyze.ts
          
      - name: Upload Analysis Results
        uses: actions/upload-artifact@v3
        with:
          name: analysis-results
          path: analysis-report.json
```

### CLI Tool

```typescript
#!/usr/bin/env node

import { ProjectAnalyzer } from '@project-analyzer/core';
import * as yargs from 'yargs';

const argv = yargs
  .option('path', {
    alias: 'p',
    type: 'string',
    default: '.',
    describe: 'Path to project directory',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    default: 'analysis-report.json',
    describe: 'Output file for results',
  })
  .option('format', {
    alias: 'f',
    type: 'string',
    choices: ['json', 'html', 'md'],
    default: 'json',
    describe: 'Output format',
  })
  .option('parallel', {
    type: 'boolean',
    default: true,
    describe: 'Enable parallel analysis',
  })
  .option('cache', {
    type: 'boolean',
    default: true,
    describe: 'Enable caching',
  })
  .help()
  .argv;

async function main() {
  const analyzer = new ProjectAnalyzer({
    projectPath: argv.path,
    parallelAnalysis: argv.parallel,
    cacheEnabled: argv.cache,
  });

  console.log('🔍 Analyzing project...');
  const result = await analyzer.analyze();
  
  await writeOutput(result, argv.output, argv.format);
  
  console.log(`✅ Analysis complete: ${result.analyzedFiles} files analyzed`);
  console.log(`📊 Report saved to: ${argv.output}`);
}

async function writeOutput(result: any, outputPath: string, format: string) {
  switch (format) {
    case 'json':
      await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2));
      break;
    case 'html':
      await writeHtmlReport(result, outputPath);
      break;
    case 'md':
      await writeMarkdownReport(result, outputPath);
      break;
  }
}

async function writeHtmlReport(result: any, outputPath: string) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Project Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .error { color: red; }
    .warning { color: orange; }
  </style>
</head>
<body>
  <h1>Project Analysis Report</h1>
  <div class="metric">Files Analyzed: ${result.analyzedFiles}</div>
  <div class="metric">Total Symbols: ${result.stats.totalSymbols}</div>
  <div class="metric">Total Patterns: ${result.stats.totalPatterns}</div>
  ${result.errors.map((e: any) => `<div class="error">Error: ${e.message}</div>`).join('')}
</body>
</html>`;
  
  await fs.promises.writeFile(outputPath, html);
}

main().catch(console.error);
```

### ESLint Integration

```typescript
import { ProjectAnalyzer } from '@project-analyzer/core';

export class AnalyzerESLintPlugin {
  private analyzer: ProjectAnalyzer;

  constructor() {
    this.analyzer = new ProjectAnalyzer({
      projectPath: process.cwd(),
      detectPatterns: true,
    });
  }

  async analyzeFile(filePath: string) {
    const result = await this.analyzer.analyzeFile(filePath);
    
    return result.patterns.map(pattern => ({
      ruleId: 'project-analyzer-pattern',
      severity: pattern.severity === 'error' ? 2 : 1,
      message: `${pattern.name}: ${pattern.description}`,
      line: pattern.files[0]?.line || 1,
      column: pattern.files[0]?.column || 1,
      endLine: pattern.files[0]?.line || 1,
      endColumn: pattern.files[0]?.column || 1,
    }));
  }
}
```

## Advanced Configuration

### Performance Tuning

```typescript
// For large monorepos
const analyzer = new ProjectAnalyzer({
  projectPath: './monorepo',
  parallelAnalysis: true,
  maxConcurrency: Math.max(1, os.cpus().length - 1), // Use all but one CPU
  cacheEnabled: true,
  maxCacheSize: 1000,
  cacheTTL: 7200000, // 2 hours
  cacheDir: './.cache/project-analyzer',
  performanceMode: true,
  includeFiles: [
    'packages/*/src/**/*.{ts,tsx,js,jsx}',
    'apps/*/src/**/*.{ts,tsx,js,jsx}',
  ],
  excludeFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.test.{ts,js}',
    '**/*.spec.{ts,js}',
  ],
});

// For quick development analysis
const devAnalyzer = new ProjectAnalyzer({
  projectPath: './src',
  analyzeTypeScript: true,
  generateSymbolTable: false, // Skip symbol table for speed
  buildDependencyGraph: true,
  detectPatterns: true,
  cacheEnabled: true,
  parallelAnalysis: true,
  maxConcurrency: 2, // Limit concurrency for smaller projects
});
```

### Custom Pattern Detection

```typescript
import { PatternDetector } from '@project-analyzer/core';

class CustomPatternDetector extends PatternDetector {
  detectCustomPatterns(sourceFile: ts.SourceFile, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    
    // Custom pattern detection logic
    const visit = (node: ts.Node) => {
      // Your custom pattern logic here
      if (this.isMyCustomPattern(node)) {
        patterns.push({
          type: PatternType.CUSTOM,
          name: 'MyCustomPattern',
          description: 'Custom pattern detected',
          files: [/* pattern locations */],
          severity: 'info',
          category: PatternCategory.CUSTOM,
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return patterns;
  }
}
```

### Custom Symbol Extraction

```typescript
class CustomFileAnalyzer extends FileAnalyzer {
  protected extractCustomSymbols(sourceFile: ts.SourceFile, filePath: string): Symbol[] {
    const symbols: Symbol[] = [];
    
    const visit = (node: ts.Node) => {
      // Extract custom symbols
      if (ts.isEnumDeclaration(node) && node.name) {
        symbols.push({
          name: node.name.text,
          kind: ts.SymbolKind.Enum,
          location: this.getLocation(node, sourceFile),
          isExported: this.isExported(node),
          isDeclared: true,
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return symbols;
  }
}
```

## Performance Optimization

### Memory-Efficient Processing

```typescript
class StreamingAnalyzer {
  private readonly BATCH_SIZE = 50;
  
  async analyzeLargeProject(projectPath: string): Promise<AnalysisResult> {
    const filePaths = await this.discoverFiles(projectPath);
    const results: FileAnalysisResult[] = [];
    
    // Process files in batches to manage memory
    for (let i = 0; i < filePaths.length; i += this.BATCH_SIZE) {
      const batch = filePaths.slice(i, i + this.BATCH_SIZE);
      const batchResults = await this.analyzeBatch(batch);
      results.push(...batchResults);
      
      // Force garbage collection between batches
      if (global.gc) {
        global.gc();
      }
      
      // Progress reporting
      const progress = (i + batch.length) / filePaths.length * 100;
      console.log(`Progress: ${progress.toFixed(1)}%`);
    }
    
    return this.aggregateResults(results);
  }
  
  private async analyzeBatch(filePaths: string[]): Promise<FileAnalysisResult[]> {
    const analyzer = new FileAnalyzer();
    return Promise.all(
      filePaths.map(filePath => 
        analyzer.analyzeFile(filePath).catch(error => {
          console.warn(`Failed to analyze ${filePath}:`, error.message);
          return null;
        })
      )
    ).then(results => results.filter((r): r is FileAnalysisResult => r !== null));
  }
}
```

### Cache Optimization

```typescript
class OptimizedAnalyzer extends ProjectAnalyzer {
  private cache: LRUCache<string, any>;
  
  constructor(config: AnalysisConfig) {
    super(config);
    
    this.cache = new LRUCache({
      max: config.maxCacheSize || 500,
      ttl: config.cacheTTL || 3600000,
    });
  }
  
  // Override caching strategy for better performance
  protected getCacheKey(filePath: string, lastModified: number): string {
    return `analysis:${filePath}:${lastModified}`;
  }
  
  protected async getCachedResult(cacheKey: string): Promise<any> {
    return this.cache.get(cacheKey);
  }
  
  protected setCachedResult(cacheKey: string, result: any): void {
    this.cache.set(cacheKey, result);
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Code Quality Analysis
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Project Analyzer
        run: |
          npx ts-node scripts/analyze.ts --output=analysis-report.json
      
      - name: Upload Analysis Report
        uses: actions/upload-artifact@v3
        with:
          name: analysis-report
          path: analysis-report.json
      
      - name: Comment PR with Analysis Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('analysis-report.json'));
            
            const comment = `
            ## 📊 Code Analysis Results
            
            - **Files Analyzed:** ${report.analyzedFiles}
            - **Total Symbols:** ${report.stats.totalSymbols}
            - **Patterns Detected:** ${report.stats.totalPatterns}
            - **Errors:** ${report.errors.length}
            - **Warnings:** ${report.warnings.length}
            
            ${report.errors.length > 0 ? '⚠️ **Errors Found:**\n' + report.errors.map(e => `- ${e.file}: ${e.message}`).join('\n') : ''}
            ${report.warnings.length > 0 ? '\n⚠️ **Warnings:**\n' + report.warnings.map(w => `- ${w.file}: ${w.message}`).join('\n') : ''}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Analyze') {
            steps {
                script {
                    def result = sh(
                        script: 'npx ts-node scripts/analyze.ts --output=analysis-report.json',
                        returnStatus: true
                    )
                    
                    if (result != 0) {
                        error('Analysis failed')
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                script {
                    def report = readJSON file: 'analysis-report.json'
                    
                    // Quality gates
                    if (report.errors.size() > 0) {
                        error("Build failed: ${report.errors.size()} errors found")
                    }
                    
                    if (report.stats.totalPatterns > 100) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Publish Results') {
            steps {
                archiveArtifacts artifacts: 'analysis-report.json', fingerprint: true
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'reports',
                    reportFiles: 'index.html',
                    reportName: 'Code Analysis Report'
                ])
            }
        }
    }
}
```

## Plugin Development

### Creating Custom Analyzers

```typescript
export interface AnalyzerPlugin {
  name: string;
  version: string;
  
  initialize(config: any): Promise<void>;
  analyzeFile(filePath: string, content: string): Promise<PluginResult>;
  finalize(): Promise<PluginResult>;
}

export class SecurityAnalyzerPlugin implements AnalyzerPlugin {
  name = 'security-analyzer';
  version = '1.0.0';
  
  async initialize(config: any): Promise<void> {
    // Plugin initialization
  }
  
  async analyzeFile(filePath: string, content: string): Promise<PluginResult> {
    const issues = this.detectSecurityIssues(content, filePath);
    
    return {
      filePath,
      issues,
      metrics: {},
    };
  }
  
  async finalize(): Promise<PluginResult> {
    return { filePath: '', issues: [], metrics: {} };
  }
  
  private detectSecurityIssues(content: string, filePath: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // Detect eval usage
    if (content.includes('eval(')) {
      issues.push({
        type: 'security',
        severity: 'high',
        message: 'Use of eval() detected',
        location: { file: filePath, line: 1, column: 1 },
      });
    }
    
    // Detect hardcoded passwords
    const passwordRegex = /(password|passwd|pwd)\s*=\s*['"][^'"]+['"]/gi;
    const matches = content.match(passwordRegex);
    if (matches) {
      issues.push({
        type: 'security',
        severity: 'critical',
        message: 'Hardcoded password detected',
        location: { file: filePath, line: 1, column: 1 },
      });
    }
    
    return issues;
  }
}
```

### Plugin Manager

```typescript
class PluginManager {
  private plugins: Map<string, AnalyzerPlugin> = new Map();
  
  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    await plugin.default.initialize({});
    this.plugins.set(plugin.default.name, plugin.default);
  }
  
  async analyzeFile(filePath: string, content: string): Promise<PluginResult[]> {
    const results: PluginResult[] = [];
    
    for (const plugin of this.plugins.values()) {
      try {
        const result = await plugin.analyzeFile(filePath, content);
        results.push(result);
      } catch (error) {
        console.warn(`Plugin ${plugin.name} failed:`, error);
      }
    }
    
    return results;
  }
}
```

## Troubleshooting

### Common Issues

#### Memory Issues with Large Projects

```typescript
// Solution: Use streaming analysis
class MemoryEfficientAnalyzer {
  async analyzeProject(projectPath: string): Promise<AnalysisResult> {
    const fileStream = this.createFileStream(projectPath);
    const results: FileAnalysisResult[] = [];
    
    for await (const file of fileStream) {
      const result = await this.analyzeFile(file.path);
      results.push(result);
      
      // Process result immediately and discard
      this.processResult(result);
      
      // Clear references for garbage collection
      result.content = undefined;
      result.ast = undefined;
    }
    
    return this.aggregateMinimalResults(results);
  }
}
```

#### Slow TypeScript Compilation

```typescript
// Solution: Optimize TypeScript configuration
const analyzer = new ProjectAnalyzer({
  tsConfigPath: './optimized-tsconfig.json',
});

/* optimized-tsconfig.json */
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "allowJs": true,
    "checkJs": false,
    "declaration": false,
    "emitDeclarationOnly": false
  }
}
```

#### Cache Misses

```typescript
// Solution: Improve cache configuration
const analyzer = new ProjectAnalyzer({
  cacheEnabled: true,
  cacheTTL: 7200000, // 2 hours
  maxCacheSize: 1000,
  cacheDir: './project-cache',
});

// Monitor cache performance
setInterval(() => {
  const stats = analyzer.getCacheStatus();
  console.log(`Cache hit rate: ${(stats.stats.hitRate * 100).toFixed(1)}%`);
}, 60000);
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): () => void {
    const start = process.hrtime.bigint();
    
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      this.metrics.get(operation)!.push(duration);
    };
  }
  
  getReport(): any {
    const report: any = {};
    
    for (const [operation, times] of this.metrics) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      report[operation] = {
        count: times.length,
        average: avg.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
      };
    }
    
    return report;
  }
}

// Usage
const monitor = new PerformanceMonitor();

async function analyzeWithMonitoring() {
  const endTimer = monitor.startTimer('full-analysis');
  
  const analyzer = new ProjectAnalyzer();
  const result = await analyzer.analyze();
  
  endTimer();
  
  console.log(monitor.getReport());
}
```

This comprehensive usage guide provides practical examples for integrating the Project Analyzer into various development workflows and environments.
