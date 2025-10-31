#!/usr/bin/env node

/**
 * Demonstration script for Project Analyzer
 * 
 * This script demonstrates the basic functionality of the Project Analyzer
 * without requiring a full project to analyze.
 */

import { ProjectAnalyzer } from './project-analyzer';
import { FileAnalyzer } from './file-analyzer';
import { CacheManager } from './cache-manager';
import { FileType } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Create a simple test project
const DEMO_PROJECT_DIR = './demo-project';

function createDemoProject() {
  console.log('🏗️  Creating demo project...\n');
  
  // Clean up existing demo project
  if (fs.existsSync(DEMO_PROJECT_DIR)) {
    fs.rmSync(DEMO_PROJECT_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(DEMO_PROJECT_DIR, { recursive: true });
  fs.mkdirSync(path.join(DEMO_PROJECT_DIR, 'src'), { recursive: true });
  fs.mkdirSync(path.join(DEMO_PROJECT_DIR, 'src', 'components'), { recursive: true });
  fs.mkdirSync(path.join(DEMO_PROJECT_DIR, 'src', 'utils'), { recursive: true });
  
  // Create TypeScript files
  fs.writeFileSync(path.join(DEMO_PROJECT_DIR, 'src', 'index.ts'), `
import { Button } from './components/Button';
import { counter } from './utils/counter';

const app = new Button('Click me');
console.log(app.render());
console.log('Counter:', counter());
  `);
  
  fs.writeFileSync(path.join(DEMO_PROJECT_DIR, 'src', 'components', 'Button.tsx'), `
import React from 'react';

interface ButtonProps {
  text: string;
  onClick?: () => void;
}

export class Button extends React.Component<ButtonProps> {
  render() {
    return (
      <button onClick={this.props.onClick}>
        {this.props.text}
      </button>
    );
  }
}
  `);
  
  fs.writeFileSync(path.join(DEMO_PROJECT_DIR, 'src', 'utils', 'counter.ts'), `
let count = 0;

export function counter(): number {
  return ++count;
}

export function reset(): void {
  count = 0;
}
  `);
  
  // Create configuration file
  fs.writeFileSync(path.join(DEMO_PROJECT_DIR, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      strict: true,
      jsx: 'react',
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
  }, null, 2));
  
  console.log('✅ Demo project created successfully!\n');
}

async function demonstrateBasicAnalysis() {
  console.log('=' .repeat(60));
  console.log('📊 DEMONSTRATION: Basic Project Analysis');
  console.log('=' .repeat(60) + '\n');
  
  createDemoProject();
  
  console.log('🔍 Running Project Analyzer...\n');
  
  const analyzer = new ProjectAnalyzer({
    projectPath: DEMO_PROJECT_DIR,
    analyzeTypeScript: true,
    generateSymbolTable: true,
    buildDependencyGraph: true,
    detectPatterns: true,
    cacheEnabled: true,
  });
  
  try {
    const result = await analyzer.analyze();
    
    console.log('✅ Analysis Complete!\n');
    
    console.log('📈 Summary:');
    console.log(`  Project Path: ${result.projectPath}`);
    console.log(`  Total Files: ${result.totalFiles}`);
    console.log(`  Analyzed Files: ${result.analyzedFiles}`);
    console.log(`  Duration: ${result.duration}ms`);
    
    console.log('\n📊 Statistics:');
    console.log(`  Total Symbols: ${result.stats.totalSymbols}`);
    console.log(`  Total Dependencies: ${result.stats.totalDependencies}`);
    console.log(`  Total Patterns: ${result.stats.totalPatterns}`);
    console.log(`  Code Lines: ${result.stats.codeLines}`);
    
    console.log('\n🎨 Patterns Detected:');
    if (result.patterns && result.patterns.patterns.length > 0) {
      result.patterns.patterns.forEach(pattern => {
        console.log(`  - ${pattern.name} (${pattern.category})`);
        console.log(`    Severity: ${pattern.severity}`);
        console.log(`    Files: ${pattern.files.length}`);
      });
    } else {
      console.log('  No patterns detected (normal for simple demo)');
    }
    
    console.log('\n🔗 Dependency Graph:');
    if (result.dependencyGraph) {
      const nodes = result.dependencyGraph.getAllNodes();
      console.log(`  Nodes: ${nodes.length}`);
      
      const edges = result.dependencyGraph.getEdges();
      console.log(`  Edges: ${edges.length}`);
      
      const cycles = result.dependencyGraph.findCycles();
      console.log(`  Circular Dependencies: ${cycles.length}`);
    }
    
    console.log('\n💾 Cache Statistics:');
    if (result.cache) {
      console.log(`  Hit Rate: ${(result.cache.hitRate * 100).toFixed(1)}%`);
      console.log(`  Cache Size: ${(result.cache.size / 1024).toFixed(2)} KB`);
      console.log(`  Entries: ${result.cache.entries}`);
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.file}: ${error.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning.file}: ${warning.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

async function demonstrateFileAnalysis() {
  console.log('\n' + '='.repeat(60));
  console.log('📄 DEMONSTRATION: Single File Analysis');
  console.log('='.repeat(60) + '\n');
  
  const filePath = path.join(DEMO_PROJECT_DIR, 'src', 'components', 'Button.tsx');
  
  const analyzer = new FileAnalyzer();
  
  try {
    console.log(`🔍 Analyzing file: ${filePath}\n`);
    
    const result = await analyzer.analyzeFile(filePath);
    
    console.log('✅ Analysis Complete!\n');
    
    console.log('📄 File Information:');
    console.log(`  Path: ${result.filePath}`);
    console.log(`  Type: ${result.fileType}`);
    console.log(`  Size: ${(result.size / 1024).toFixed(2)} KB`);
    console.log(`  Last Modified: ${new Date(result.lastModified).toLocaleString()}`);
    
    console.log('\n📊 File Statistics:');
    console.log(`  Total Lines: ${result.stats.lines}`);
    console.log(`  Code Lines: ${result.stats.codeLines}`);
    console.log(`  Comment Lines: ${result.stats.commentLines}`);
    console.log(`  Functions: ${result.stats.functions}`);
    console.log(`  Classes: ${result.stats.classes}`);
    console.log(`  Interfaces: ${result.stats.interfaces}`);
    
    console.log('\n🔍 Symbols Found:');
    if (result.symbols.length > 0) {
      result.symbols.forEach(symbol => {
        console.log(`  - ${symbol.name} (${symbol.kind})`);
        console.log(`    Location: ${symbol.location.line}:${symbol.location.column}`);
        console.log(`    Exported: ${symbol.isExported}`);
        if (symbol.documentation) {
          console.log(`    Documentation: ${symbol.documentation}`);
        }
      });
    } else {
      console.log('  No symbols found');
    }
    
    console.log('\n🔗 Dependencies:');
    console.log(`  Imports: ${result.imports.join(', ') || 'None'}`);
    console.log(`  Exports: ${result.exports.join(', ') || 'None'}`);
    console.log(`  File Dependencies: ${result.dependencies.join(', ') || 'None'}`);
    
    console.log('\n🎨 Patterns Detected:');
    if (result.patterns.length > 0) {
      result.patterns.forEach(pattern => {
        console.log(`  - ${pattern.name}`);
        console.log(`    Type: ${pattern.type}`);
        console.log(`    Category: ${pattern.category}`);
        console.log(`    Severity: ${pattern.severity}`);
        console.log(`    Description: ${pattern.description}`);
        if (pattern.recommendation) {
          console.log(`    Recommendation: ${pattern.recommendation}`);
        }
      });
    } else {
      console.log('  No patterns detected');
    }
    
    console.log('\n📈 Complexity Metrics:');
    if (result.complexity) {
      console.log(`  Cyclomatic Complexity: ${result.complexity.cyclomaticComplexity}`);
      console.log(`  Cognitive Complexity: ${result.complexity.cognitiveComplexity}`);
      console.log(`  Maintainability Index: ${result.complexity.maintainabilityIndex.toFixed(1)}`);
      console.log(`  Lines of Code: ${result.complexity.linesOfCode}`);
    } else {
      console.log('  No complexity metrics available');
    }
    
  } catch (error) {
    console.error('❌ File analysis failed:', error);
  }
}

async function demonstrateCacheManager() {
  console.log('\n' + '='.repeat(60));
  console.log('💾 DEMONSTRATION: Cache Manager");
  console.log('='.repeat(60) + '\n');
  
  const cache = new CacheManager({
    enabled: true,
    maxSize: 10,
    ttl: 60000, // 1 minute
    checkModifications: true,
    compression: true,
  });
  
  console.log('🧪 Testing Cache Operations:\n');
  
  // Test 1: Set and get
  console.log('1️⃣  Testing set and get:');
  const testData = {
    name: 'Test Data',
    value: 42,
    timestamp: new Date().toISOString(),
  };
  
  cache.set('test-key', testData);
  const retrieved = cache.get('test-key');
  
  if (retrieved && retrieved.name === testData.name) {
    console.log('   ✅ Set and get successful');
  } else {
    console.log('   ❌ Set and get failed');
  }
  
  // Test 2: Cache miss
  console.log('\n2️⃣  Testing cache miss:');
  const missing = cache.get('non-existent-key');
  
  if (missing === undefined) {
    console.log('   ✅ Cache miss handled correctly');
  } else {
    console.log('   ❌ Cache miss not handled correctly');
  }
  
  // Test 3: Cache statistics
  console.log('\n3️⃣  Testing cache statistics:');
  const stats = cache.getStats();
  
  console.log('   Cache Statistics:');
  console.log(`   - Hits: ${stats.hits}`);
  console.log(`   - Misses: ${stats.misses}`);
  console.log(`   - Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`   - Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   - Entries: ${stats.entries}`);
  
  // Test 4: Cache eviction
  console.log('\n4️⃣  Testing cache eviction:');
  
  // Add more items than maxSize
  for (let i = 0; i < 15; i++) {
    cache.set(`item-${i}`, { id: i, data: `item-${i}` });
  }
  
  const finalStats = cache.getStats();
  console.log(`   - Entries after adding 15 items: ${finalStats.entries}`);
  console.log(`   - Evictions: ${finalStats.evictions}`);
  
  if (finalStats.entries <= 10) {
    console.log('   ✅ Cache eviction working correctly');
  } else {
    console.log('   ❌ Cache eviction not working correctly');
  }
  
  // Test 5: Cache clear
  console.log('\n5️⃣  Testing cache clear:');
  cache.clear();
  const clearedStats = cache.getStats();
  
  if (clearedStats.entries === 0) {
    console.log('   ✅ Cache clear successful');
  } else {
    console.log('   ❌ Cache clear failed');
  }
}

async function demonstratePerformanceComparison() {
  console.log('\n' + '='.repeat(60));
  console.log('⚡ DEMONSTRATION: Performance Comparison');
  console.log('='.repeat(60) + '\n');
  
  const configurations = [
    {
      name: 'Sequential Analysis',
      config: {
        projectPath: DEMO_PROJECT_DIR,
        parallelAnalysis: false,
        cacheEnabled: false,
      },
    },
    {
      name: 'Parallel Analysis',
      config: {
        projectPath: DEMO_PROJECT_DIR,
        parallelAnalysis: true,
        cacheEnabled: false,
      },
    },
    {
      name: 'Parallel + Cache',
      config: {
        projectPath: DEMO_PROJECT_DIR,
        parallelAnalysis: true,
        cacheEnabled: true,
      },
    },
  ];
  
  console.log('🧪 Running performance benchmarks:\n');
  
  const results = [];
  
  for (const { name, config } of configurations) {
    console.log(`Running: ${name}...`);
    
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
      
      console.log(`   ✅ Completed in ${benchmarkResult.totalTime}ms`);
      console.log(`   - Analysis time: ${benchmarkResult.analysisTime}ms`);
      console.log(`   - Files analyzed: ${benchmarkResult.filesAnalyzed}`);
      console.log(`   - Throughput: ${benchmarkResult.throughput.toFixed(2)} files/sec`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    console.log('');
  }
  
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
}

async function cleanup() {
  console.log('\n🧹 Cleaning up demo project...');
  
  if (fs.existsSync(DEMO_PROJECT_DIR)) {
    fs.rmSync(DEMO_PROJECT_DIR, { recursive: true, force: true });
    console.log('✅ Demo project removed');
  }
}

async function main() {
  console.log('\n🚀 Project Analyzer Demonstration');
  console.log('==================================\n');
  
  try {
    await demonstrateBasicAnalysis();
    await demonstrateFileAnalysis();
    await demonstrateCacheManager();
    await demonstratePerformanceComparison();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Demonstration Complete!');
    console.log('='.repeat(60) + '\n');
    
    console.log('💡 To run this demo:');
    console.log('   node dist/demo.js');
    console.log('');
    console.log('📚 For more information, see:');
    console.log('   - README.md: Main documentation');
    console.log('   - USAGE.md: Detailed usage guide');
    console.log('   - examples.ts: Code examples');
    console.log('   - __tests__: Test suite\n');
    
  } catch (error) {
    console.error('\n❌ Demonstration failed:', error);
  } finally {
    await cleanup();
  }
}

// Run demonstration if executed directly
if (require.main === module) {
  main().catch(console.error);
}
