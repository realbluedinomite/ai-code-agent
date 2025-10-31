/**
 * Example usage of Project Analyzer
 * 
 * This file demonstrates various ways to use the Project Analyzer
 * component for different analysis scenarios.
 */

import { ProjectAnalyzer } from './project-analyzer';
import { FileAnalyzer } from './file-analyzer';
import { DependencyAnalyzer } from './dependency-analyzer';
import { PatternDetector } from './pattern-detector';
import { CacheManager } from './cache-manager';
import { FileType } from './types';

async function basicAnalysisExample() {
  console.log('=== Basic Analysis Example ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    includeFiles: ['**/*.{ts,tsx,js,jsx}'],
    excludeFiles: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.{ts,js}',
      '**/*.spec.{ts,js}',
    ],
    analyzeTypeScript: true,
    generateSymbolTable: true,
    buildDependencyGraph: true,
    detectPatterns: true,
  });

  try {
    const result = await analyzer.analyze();
    
    console.log(`✅ Analysis completed in ${result.duration}ms`);
    console.log(`📁 Analyzed ${result.analyzedFiles} files`);
    console.log(`🔍 Found ${result.stats.totalSymbols} symbols`);
    console.log(`🔗 Found ${result.stats.totalDependencies} dependencies`);
    console.log(`🎨 Detected ${result.stats.totalPatterns} patterns`);
    console.log(`📊 Lines of code: ${result.stats.codeLines}`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(error => {
        console.log(`  - ${error.file}: ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => {
        console.log(`  - ${warning.file}: ${warning.message}`);
      });
    }

    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

async function performanceOptimizedAnalysis() {
  console.log('\n=== Performance Optimized Analysis ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    performanceMode: true,
    parallelAnalysis: true,
    maxConcurrency: 8, // Use 8 parallel workers
    cacheEnabled: true,
    maxCacheSize: 500, // Cache up to 500 entries
    cacheTTL: 7200000, // 2 hours cache
    cacheDir: './.cache/project-analyzer',
  });

  const startTime = Date.now();
  const result = await analyzer.analyze();
  const endTime = Date.now();

  console.log(`⚡ Performance Mode Analysis:`);
  console.log(`  Total time: ${endTime - startTime}ms`);
  console.log(`  Analysis duration: ${result.duration}ms`);
  console.log(`  Effective parallelism: ${Math.round((result.analyzedFiles / (result.duration / 1000)) * 100) / 100} files/second`);

  if (result.cache) {
    console.log(`💾 Cache Stats:`);
    console.log(`  Hit rate: ${(result.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`  Cache size: ${(result.cache.size / 1024).toFixed(2)} KB`);
    console.log(`  Entries: ${result.cache.entries}`);
    console.log(`  Evictions: ${result.cache.evictions}`);
  }

  return result;
}

async function dependencyAnalysisExample() {
  console.log('\n=== Dependency Analysis Example ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    buildDependencyGraph: true,
    analyzeTypeScript: true,
  });

  const result = await analyzer.analyze();

  if (result.dependencyGraph) {
    const dependencyAnalyzer = new DependencyAnalyzer();
    const metrics = dependencyAnalyzer.calculateDependencyMetrics(result.dependencyGraph);

    console.log('📊 Dependency Metrics:');
    console.log(`  Total nodes: ${metrics.totalNodes}`);
    console.log(`  Total edges: ${metrics.totalEdges}`);
    console.log(`  Density: ${metrics.density.toFixed(4)}`);
    console.log(`  Average depth: ${metrics.averageDepth.toFixed(2)}`);
    console.log(`  Max depth: ${metrics.maxDepth}`);
    console.log(`  Root nodes: ${metrics.rootNodes.length}`);
    console.log(`  Leaf nodes: ${metrics.leafNodes.length}`);
    console.log(`  Hub nodes: ${metrics.hubNodes.length}`);

    // Show dependency chains
    if (metrics.rootNodes.length > 0 && metrics.leafNodes.length > 0) {
      const root = metrics.rootNodes[0];
      const leaf = metrics.leafNodes[0];
      const chain = dependencyAnalyzer.getDependencyChain(root, leaf, result.dependencyGraph);
      
      if (chain) {
        console.log(`\n🔗 Example dependency chain (${chain.length} steps):`);
        console.log(`  ${chain.join(' → ')}`);
      }
    }
  }

  return result;
}

async function patternDetectionExample() {
  console.log('\n=== Pattern Detection Example ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    detectPatterns: true,
    analyzeTypeScript: true,
  });

  const result = await analyzer.analyze();

  if (result.patterns) {
    const patterns = result.patterns;
    
    console.log(`🎨 Pattern Statistics:`);
    console.log(`  Total patterns: ${patterns.statistics.totalPatterns}`);
    console.log(`  Anti-patterns: ${patterns.statistics.antiPatterns}`);
    console.log(`  Most used patterns:`);
    
    patterns.statistics.mostUsedPatterns.slice(0, 5).forEach(({ pattern, count }) => {
      console.log(`    - ${pattern}: ${count} occurrences`);
    });

    // Group patterns by category
    const patternsByCategory = new Map<string, number>();
    patterns.patterns.forEach(pattern => {
      const category = pattern.category;
      patternsByCategory.set(category, (patternsByCategory.get(category) || 0) + 1);
    });

    console.log('\n📋 Patterns by Category:');
    for (const [category, count] of patternsByCategory) {
      console.log(`  ${category}: ${count}`);
    }

    // Show anti-patterns
    const antiPatterns = patterns.patterns.filter(p => p.severity === 'warning' || p.severity === 'error');
    if (antiPatterns.length > 0) {
      console.log('\n⚠️  Anti-patterns Found:');
      antiPatterns.forEach(pattern => {
        console.log(`  - ${pattern.name} in ${pattern.files.length} file(s)`);
        console.log(`    ${pattern.description}`);
      });
    }
  }

  return result;
}

async function symbolAnalysisExample() {
  console.log('\n=== Symbol Analysis Example ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    generateSymbolTable: true,
    analyzeTypeScript: true,
  });

  const result = await analyzer.analyze();

  if (result.symbolTable) {
    const symbolTable = result.symbolTable;
    const stats = symbolTable.getStatistics();

    console.log('🔍 Symbol Statistics:');
    console.log(`  Total symbols: ${stats.totalSymbols}`);
    console.log(`  Exported symbols: ${stats.exportedSymbols}`);
    console.log(`  Global symbols: ${stats.globalSymbols}`);
    console.log(`  Total references: ${stats.totalReferences}`);

    // Show symbols by kind
    console.log('\n📊 Symbols by Kind:');
    for (const [kind, count] of stats.symbolsByKind) {
      console.log(`  ${kind}: ${count}`);
    }

    // Show most referenced symbols
    const mostReferenced = symbolTable.getMostReferencedSymbols(10);
    console.log('\n🔗 Most Referenced Symbols:');
    mostReferenced.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.symbol.name} (${entry.references.length} references)`);
    });

    // Show most dependent symbols
    const mostDependent = symbolTable.getMostDependentSymbols(10);
    console.log('\n📈 Most Dependent Symbols:');
    mostDependent.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.symbol.name} (${entry.dependencies.length} dependencies)`);
    });
  }

  return result;
}

async function cacheManagementExample() {
  console.log('\n=== Cache Management Example ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    cacheEnabled: true,
    maxCacheSize: 100,
    cacheTTL: 3600000,
    parallelAnalysis: false, // Disable for cache demo
  });

  // First analysis (cache miss)
  console.log('🧪 First analysis (cache miss expected):');
  const start1 = Date.now();
  const result1 = await analyzer.analyze();
  const time1 = Date.now() - start1;
  console.log(`  Time: ${time1}ms`);

  // Second analysis (should use cache)
  console.log('\n🧪 Second analysis (cache hit expected):');
  const start2 = Date.now();
  const result2 = await analyzer.analyze();
  const time2 = Date.now() - start2;
  console.log(`  Time: ${time2}ms`);
  console.log(`  Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);

  // Show cache statistics
  const cacheStatus = analyzer.getCacheStatus();
  console.log('\n💾 Cache Statistics:');
  console.log(`  Enabled: ${cacheStatus.enabled}`);
  console.log(`  Hit rate: ${(cacheStatus.stats.hitRate * 100).toFixed(1)}%`);
  console.log(`  Size: ${(cacheStatus.stats.size / 1024).toFixed(2)} KB`);
  console.log(`  Entries: ${cacheStatus.stats.entries}`);

  // Clear cache and analyze again
  console.log('\n🧹 Clearing cache...');
  analyzer.clearCache();
  
  const result3 = await analyzer.analyze();
  console.log(`Analysis after cache clear completed in ${result3.duration}ms`);

  return result1;
}

async function singleFileAnalysisExample() {
  console.log('\n=== Single File Analysis Example ===\n');

  const fileAnalyzer = new FileAnalyzer();

  const testFiles = [
    './src/components/Button.tsx',
    './src/utils/helpers.ts',
    './src/services/api.ts',
  ];

  for (const filePath of testFiles) {
    try {
      console.log(`\n📄 Analyzing ${filePath}...`);
      
      const result = await fileAnalyzer.analyzeFile(filePath);
      
      console.log(`  File type: ${result.fileType}`);
      console.log(`  Size: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`  Lines: ${result.stats.lines}`);
      console.log(`  Symbols: ${result.symbols.length}`);
      console.log(`  Dependencies: ${result.dependencies.length}`);
      console.log(`  Exports: ${result.exports.length}`);
      console.log(`  Patterns: ${result.patterns.length}`);
      
      if (result.complexity) {
        console.log(`  Cyclomatic complexity: ${result.complexity.cyclomaticComplexity}`);
        console.log(`  Maintainability index: ${result.complexity.maintainabilityIndex.toFixed(1)}`);
      }

      // Show symbols
      if (result.symbols.length > 0) {
        console.log(`  Symbols:`);
        result.symbols.slice(0, 5).forEach(symbol => {
          console.log(`    - ${symbol.name} (${symbol.kind})`);
        });
        if (result.symbols.length > 5) {
          console.log(`    ... and ${result.symbols.length - 5} more`);
        }
      }

      // Show patterns
      if (result.patterns.length > 0) {
        console.log(`  Patterns:`);
        result.patterns.forEach(pattern => {
          console.log(`    - ${pattern.name} (${pattern.category})`);
        });
      }
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function incrementalAnalysisExample() {
  console.log('\n=== Incremental Analysis Example ===\n');

  const analyzer = new ProjectAnalyzer({
    projectPath: './src',
    cacheEnabled: true,
    analyzeTypeScript: true,
  });

  // Initial analysis
  console.log('🔍 Initial analysis:');
  const initialResult = await analyzer.analyze();
  console.log(`  Analyzed ${initialResult.analyzedFiles} files in ${initialResult.duration}ms`);

  // Simulate file changes (in real scenario, you would track actual changes)
  console.log('\n📝 Simulating file changes...');
  
  // Incremental analysis (currently same as full analysis)
  console.log('🔄 Incremental analysis:');
  const incrementalResult = await analyzer.incrementalAnalysis();
  console.log(`  Analyzed ${incrementalResult.analyzedFiles} files in ${incrementalResult.duration}ms`);

  // Show cache hit rate improvement
  if (incrementalResult.cache) {
    console.log(`\n💾 Cache hit rate: ${(incrementalResult.cache.hitRate * 100).toFixed(1)}%`);
  }

  return incrementalResult;
}

async function performanceBenchmark() {
  console.log('\n=== Performance Benchmark ===\n');

  const configurations = [
    {
      name: 'Sequential',
      config: {
        projectPath: './src',
        parallelAnalysis: false,
        performanceMode: false,
        cacheEnabled: false,
      },
    },
    {
      name: 'Parallel',
      config: {
        projectPath: './src',
        parallelAnalysis: true,
        maxConcurrency: 4,
        performanceMode: false,
        cacheEnabled: false,
      },
    },
    {
      name: 'Parallel + Cache',
      config: {
        projectPath: './src',
        parallelAnalysis: true,
        maxConcurrency: 4,
        performanceMode: true,
        cacheEnabled: true,
      },
    },
  ];

  const results = [];

  for (const { name, config } of configurations) {
    console.log(`⚡ Running ${name} configuration...`);
    
    const analyzer = new ProjectAnalyzer(config);
    const startTime = Date.now();
    
    try {
      const result = await analyzer.analyze();
      const endTime = Date.now();
      
      const benchmarkResult = {
        name,
        totalTime: endTime - startTime,
        analysisTime: result.duration,
        filesAnalyzed: result.analyzedFiles,
        throughput: result.duration > 0 ? (result.analyzedFiles / (result.duration / 1000)) : 0,
      };
      
      results.push(benchmarkResult);
      
      console.log(`  Total time: ${benchmarkResult.totalTime}ms`);
      console.log(`  Analysis time: ${benchmarkResult.analysisTime}ms`);
      console.log(`  Throughput: ${benchmarkResult.throughput.toFixed(2)} files/sec`);
    } catch (error) {
      console.log(`  Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('');
  }

  // Show comparison
  console.log('📊 Performance Comparison:');
  console.log('Configuration'.padEnd(20) + 'Total Time'.padEnd(12) + 'Analysis Time'.padEnd(15) + 'Throughput');
  console.log('-'.repeat(65));
  
  results.forEach(result => {
    console.log(
      result.name.padEnd(20) +
      `${result.totalTime}ms`.padEnd(12) +
      `${result.analysisTime}ms`.padEnd(15) +
      `${result.throughput.toFixed(2)} files/sec`
    );
  });

  return results;
}

// Main execution
async function main() {
  console.log('🚀 Project Analyzer Examples\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Run examples (comment out examples you don't want to run)
    
    // await basicAnalysisExample();
    // await performanceOptimizedAnalysis();
    // await dependencyAnalysisExample();
    // await patternDetectionExample();
    // await symbolAnalysisExample();
    // await cacheManagementExample();
    // await singleFileAnalysisExample();
    // await incrementalAnalysisExample();
    // await performanceBenchmark();
    
    console.log('\n✅ All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicAnalysisExample,
  performanceOptimizedAnalysis,
  dependencyAnalysisExample,
  patternDetectionExample,
  symbolAnalysisExample,
  cacheManagementExample,
  singleFileAnalysisExample,
  incrementalAnalysisExample,
  performanceBenchmark,
};
