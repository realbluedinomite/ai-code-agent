# Project Analyzer

A comprehensive codebase analysis tool that provides intelligent caching, file analysis, TypeScript compilation, symbol table generation, and dependency graph building for large projects.

## Features

### Core Functionality
- **Smart Caching**: Intelligent file modification tracking with LRU cache eviction
- **File Analysis**: Comprehensive analysis of TypeScript/JavaScript files including AST parsing
- **TypeScript Integration**: Full TypeScript compiler integration for type checking and symbol extraction
- **Symbol Table**: Generate symbol tables with references and dependency tracking
- **Dependency Graph**: Build and analyze dependency relationships between files
- **Pattern Detection**: Identify common design patterns and anti-patterns
- **Performance Optimization**: Parallel processing and memory-efficient analysis for large projects

### Analysis Capabilities
- **Code Statistics**: Lines of code, complexity metrics, maintainability index
- **Symbol Analysis**: Function/class/interface extraction with type information
- **Dependency Analysis**: Internal and external dependencies, circular dependency detection
- **Pattern Recognition**: Design patterns (Factory, Singleton, Observer, etc.), React patterns
- **Quality Metrics**: Cyclomatic complexity, Halstead metrics, cognitive complexity
- **Performance Monitoring**: Analysis duration, cache hit rates, memory usage

## Installation

```bash
npm install --save-dev @types/typescript
```

## Usage

### Basic Usage

```typescript
import { ProjectAnalyzer } from './project-analyzer';

// Create analyzer with default configuration
const analyzer = new ProjectAnalyzer({
  projectPath: './my-project',
});

// Run full analysis
const result = await analyzer.analyze();

console.log('Analysis Results:');
console.log(`Files analyzed: ${result.analyzedFiles}`);
console.log(`Total symbols: ${result.stats.totalSymbols}`);
console.log(`Duration: ${result.duration}ms`);
```

### Advanced Configuration

```typescript
const analyzer = new ProjectAnalyzer({
  projectPath: './my-project',
  includeFiles: ['**/*.{ts,tsx,js,jsx}'],
  excludeFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.{ts,js}',
  ],
  analyzeTypeScript: true,
  generateSymbolTable: true,
  buildDependencyGraph: true,
  detectPatterns: true,
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
  maxCacheSize: 100,
  performanceMode: true,
  parallelAnalysis: true,
  maxConcurrency: 4,
  tsConfigPath: './tsconfig.json',
});
```

### Incremental Analysis

```typescript
// Analyze only changed files
const result = await analyzer.incrementalAnalysis();
```

### Single File Analysis

```typescript
const fileAnalysis = await analyzer.analyzeFile('./src/components/Button.tsx');
console.log('File symbols:', fileAnalysis.symbols);
console.log('File dependencies:', fileAnalysis.dependencies);
console.log('Detected patterns:', fileAnalysis.patterns);
```

### Cache Management

```typescript
// Get cache status
const cacheStatus = analyzer.getCacheStatus();
console.log('Cache hit rate:', cacheStatus.stats.hitRate);

// Clear cache
analyzer.clearCache();
```

## API Reference

### ProjectAnalyzer

Main orchestrator class for project analysis.

#### Constructor

```typescript
constructor(config?: Partial<AnalysisConfig>)
```

#### Methods

- `analyze(): Promise<AnalysisResult>` - Run full project analysis
- `analyzeFile(filePath: string): Promise<FileAnalysisResult>` - Analyze single file
- `incrementalAnalysis(): Promise<AnalysisResult>` - Analyze only changed files
- `getFileInfo(filePath: string): Promise<FileInfo>` - Get file information
- `updateConfig(config: Partial<AnalysisConfig>): void` - Update configuration
- `getCacheStatus(): CacheStatus` - Get cache statistics
- `clearCache(): void` - Clear analysis cache

### FileAnalyzer

Analyzes individual files for symbols, dependencies, and patterns.

```typescript
const analyzer = new FileAnalyzer();

// Analyze file
const result = await analyzer.analyzeFile('./src/App.tsx');

// Analyze multiple files
const results = await analyzer.analyzeFiles(['./src/App.tsx', './src/Button.tsx']);
```

### DependencyAnalyzer

Builds dependency graphs and analyzes relationships.

```typescript
const analyzer = new DependencyAnalyzer();

// Analyze dependencies
const result = await analyzer.analyzeDependencies(fileResults, projectPath);

// Get dependency metrics
const metrics = analyzer.calculateDependencyMetrics(graph);
```

### PatternDetector

Detects code patterns and anti-patterns.

```typescript
const detector = new PatternDetector();

// Detect patterns in AST
const patterns = detector.detectPatterns(sourceFile, filePath);
```

### CacheManager

Smart caching with file modification tracking.

```typescript
const cache = new CacheManager({
  enabled: true,
  maxSize: 100,
  ttl: 3600000,
  checkModifications: true,
  compression: true,
  persistent: true,
});
```

### SymbolTable

Manages symbol information and cross-references.

```typescript
const symbolTable = new SymbolTable();

// Add symbol
symbolTable.addSymbol(symbol);

// Get symbol
const entry = symbolTable.getSymbol('MyClass');

// Get symbols by file
const fileSymbols = symbolTable.getSymbolsByFile('./src/App.tsx');
```

### DependencyGraph

Manages dependency relationships and graph operations.

```typescript
const graph = new DependencyGraph();

// Add nodes and edges
graph.addNode(node);
graph.addEdge('file1.ts', 'file2.ts', DependencyType.IMPORT);

// Find cycles
const cycles = graph.findCycles();

// Get shortest path
const path = graph.findShortestPath('file1.ts', 'file2.ts');
```

## Data Types

### AnalysisResult

```typescript
interface AnalysisResult {
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
```

### FileAnalysisResult

```typescript
interface FileAnalysisResult {
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
```

### Symbol

```typescript
interface Symbol {
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
```

## Pattern Detection

The analyzer detects various code patterns:

### Design Patterns
- **Factory Pattern**: Object creation with factory methods
- **Singleton Pattern**: Single instance enforcement
- **Observer Pattern**: Event-driven architecture
- **Strategy Pattern**: Interchangeable algorithms
- **Decorator Pattern**: Behavior addition
- **Adapter Pattern**: Interface compatibility
- **Facade Pattern**: Simplified interfaces

### React Patterns
- **Components**: Class and functional components
- **Hooks**: React hooks with naming conventions
- **Custom Hooks**: Complex hook implementations
- **Context**: React Context usage
- **Higher-Order Components**: Component enhancement
- **Render Props**: Component composition

### Anti-patterns
- **Large Classes**: Classes with too many members
- **Long Functions**: Functions over 50 lines
- **God Objects**: Objects with too many responsibilities

## Performance Optimization

### Large Project Support
- **Parallel Processing**: Multi-threaded analysis with configurable concurrency
- **Chunked Processing**: Memory-efficient batch processing
- **Lazy Loading**: On-demand file parsing
- **Smart Caching**: LRU cache with file modification tracking
- **Progress Tracking**: Real-time analysis progress

### Memory Management
- **Streaming Analysis**: Process files in streams for large datasets
- **Garbage Collection**: Automatic cleanup of temporary objects
- **Cache Eviction**: LRU policy with configurable limits
- **Compression**: Optional data compression for cache storage

### Configuration Tuning

```typescript
// For large projects
const analyzer = new ProjectAnalyzer({
  performanceMode: true,
  parallelAnalysis: true,
  maxConcurrency: 8,
  cacheEnabled: true,
  maxCacheSize: 500,
  cacheTTL: 7200000, // 2 hours
});

// For development
const analyzer = new ProjectAnalyzer({
  performanceMode: false,
  parallelAnalysis: false,
  cacheEnabled: true,
  maxCacheSize: 50,
});
```

## Examples

### Basic Project Analysis

```typescript
import { ProjectAnalyzer } from './project-analyzer';

async function analyzeProject() {
  const analyzer = new ProjectAnalyzer({
    projectPath: './my-project',
    analyzeTypeScript: true,
    generateSymbolTable: true,
    buildDependencyGraph: true,
  });

  try {
    const result = await analyzer.analyze();
    
    console.log(`Analysis completed in ${result.duration}ms`);
    console.log(`Analyzed ${result.analyzedFiles} files`);
    console.log(`Found ${result.stats.totalSymbols} symbols`);
    console.log(`Detected ${result.stats.totalPatterns} patterns`);
    
    if (result.dependencyGraph) {
      const metrics = analyzer.calculateDependencyMetrics(result.dependencyGraph);
      console.log(`Dependency density: ${metrics.density}`);
      console.log(`Circular dependencies: ${result.circularDependencies.length}`);
    }
    
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}
```

### Dependency Analysis

```typescript
import { DependencyAnalyzer } from './dependency-analyzer';

async function analyzeDependencies() {
  const analyzer = new DependencyAnalyzer();
  
  const dependencyResult = await analyzer.analyzeDependencies(
    fileResults, 
    projectPath
  );
  
  console.log('External Dependencies:');
  dependencyResult.externalDependencies.forEach(dep => {
    console.log(`- ${dep.name} (${dep.version}) - ${dep.isUsed ? 'Used' : 'Unused'}`);
  });
  
  console.log('Circular Dependencies:');
  dependencyResult.circularDependencies.forEach(cycle => {
    console.log(`- ${cycle.path.join(' -> ')}`);
  });
  
  console.log('Unused Dependencies:');
  dependencyResult.unusedDependencies.forEach(dep => {
    console.log(`- ${dep.name}`);
  });
}
```

### Pattern Detection

```typescript
import { PatternDetector } from './pattern-detector';

function detectPatterns() {
  const detector = new PatternDetector();
  
  for (const fileResult of fileResults) {
    if (fileResult.ast) {
      const patterns = detector.detectPatterns(fileResult.ast, fileResult.filePath);
      
      patterns.forEach(pattern => {
        console.log(`${pattern.severity.toUpperCase()}: ${pattern.name}`);
        console.log(`  Description: ${pattern.description}`);
        console.log(`  Category: ${pattern.category}`);
        console.log(`  Files: ${pattern.files.length}`);
        
        if (pattern.recommendation) {
          console.log(`  Recommendation: ${pattern.recommendation}`);
        }
      });
    }
  }
}
```

## Error Handling

The analyzer provides comprehensive error handling:

```typescript
try {
  const result = await analyzer.analyze();
  
  console.log('Errors:', result.errors.length);
  result.errors.forEach(error => {
    console.log(`ERROR ${error.code} in ${error.file}: ${error.message}`);
  });
  
  console.log('Warnings:', result.warnings.length);
  result.warnings.forEach(warning => {
    console.log(`WARNING ${warning.type} in ${warning.file}: ${warning.message}`);
  });
} catch (error) {
  console.error('Analysis failed:', error.message);
}
```

## Cache Management

The analyzer includes sophisticated caching:

```typescript
// Cache statistics
const stats = analyzer.getCacheStatus();
console.log(`Cache hit rate: ${(stats.stats.hitRate * 100).toFixed(1)}%`);
console.log(`Cache size: ${stats.stats.size} bytes`);
console.log(`Entries: ${stats.stats.entries}`);

// Manual cache cleanup
analyzer.clearCache();

// Cache automatically cleans expired entries
const cache = analyzer['cacheManager']; // Access internal cache
const cleaned = cache.cleanup(); // Remove expired entries
console.log(`Cleaned ${cleaned} expired entries`);
```

## Testing

Run tests with:

```bash
npm test
```

Run specific test categories:

```bash
npm test -- --testNamePattern="CacheManager"
npm test -- --testPathPattern="dependency"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details
