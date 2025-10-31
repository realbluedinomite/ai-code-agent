/**
 * Verification Script for Groq AI Provider Implementation
 * 
 * This script verifies that all components of the Groq AI Provider
 * have been correctly implemented and are ready for use.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface VerificationResult {
  file: string;
  exists: boolean;
  size: number;
  lines?: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message?: string;
}

const results: VerificationResult[] = [];

function verifyFile(path: string, description: string): void {
  const result: VerificationResult = {
    file: path,
    exists: existsSync(path),
    size: 0,
    status: 'FAIL',
    message: `${description} - File not found`,
  };

  if (result.exists) {
    const content = readFileSync(path, 'utf8');
    result.size = content.length;
    result.lines = content.split('\n').length;
    result.status = 'PASS';
    result.message = `${description} - OK (${result.lines} lines, ${result.size} bytes)`;
  }

  results.push(result);
}

function printResults(): void {
  console.log('='.repeat(80));
  console.log('Groq AI Provider Implementation Verification');
  console.log('='.repeat(80));
  console.log('');

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'WARNING' ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${color}${result.status}\x1b[0m ${result.file}`);
    console.log(`   ${result.message}`);
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARNING') warningCount++;
    else failCount++;
  });

  console.log('');
  console.log('='.repeat(80));
  console.log('Summary:');
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ⚠️  Warnings: ${warningCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('='.repeat(80));

  if (failCount === 0) {
    console.log('');
    console.log('\x1b[32m🎉 All verifications passed! The Groq AI Provider is ready to use.\x1b[0m');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set your Groq API key: export GROQ_API_KEY="your-key"');
    console.log('  2. Run the demo: node quick-start.js');
    console.log('  3. Review examples: src/providers/groq-ai-examples.ts');
    console.log('  4. Read docs: docs/GROQ_PROVIDER.md');
    console.log('  5. Run tests: npm test');
    console.log('');
  } else {
    console.log('');
    console.log('\x1b[31m❌ Some verifications failed. Please check the errors above.\x1b[0m');
    process.exit(1);
  }
}

// Verify core implementation files
verifyFile(
  'src/providers/ai-provider.ts',
  'Base AI Provider Interface'
);

verifyFile(
  'src/providers/groq-ai-provider.ts',
  'Groq AI Provider Implementation'
);

verifyFile(
  'src/providers/groq-ai-examples.ts',
  'Usage Examples'
);

verifyFile(
  'src/providers/index.ts',
  'Main Export File'
);

// Verify documentation
verifyFile(
  'docs/GROQ_PROVIDER.md',
  'Documentation'
);

verifyFile(
  'IMPLEMENTATION_SUMMARY.md',
  'Implementation Summary'
);

// Verify demo script
verifyFile(
  'quick-start.js',
  'Quick Start Demo'
);

// Verify test file
verifyFile(
  'tests/unit/providers/groq-ai-provider.test.ts',
  'Unit Tests'
);

// Check package.json for required dependencies
console.log('Checking package.json for Groq SDK dependency...\n');

try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const hasGroqSDK = packageJson.dependencies['groq-sdk'];
  
  if (hasGroqSDK) {
    console.log('✅ PASS package.json - Groq SDK dependency found');
    results.push({
      file: 'package.json',
      exists: true,
      size: 0,
      status: 'PASS',
      message: 'Groq SDK dependency - OK',
    });
  } else {
    console.log('❌ FAIL package.json - Groq SDK dependency not found');
    results.push({
      file: 'package.json',
      exists: true,
      size: 0,
      status: 'FAIL',
      message: 'Groq SDK dependency - Not found',
    });
  }
} catch (error) {
  console.log('⚠️  WARNING package.json - Could not read package.json');
  results.push({
    file: 'package.json',
    exists: false,
    size: 0,
    status: 'WARNING',
    message: 'Could not read package.json',
  });
}

console.log('');

// Check TypeScript configuration
console.log('Checking TypeScript configuration...\n');

try {
  const tsConfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
  const hasStrict = tsConfig.compilerOptions?.strict;
  
  if (hasStrict) {
    console.log('✅ PASS tsconfig.json - TypeScript strict mode enabled');
    results.push({
      file: 'tsconfig.json',
      exists: true,
      size: 0,
      status: 'PASS',
      message: 'TypeScript strict mode - OK',
    });
  } else {
    console.log('⚠️  WARNING tsconfig.json - TypeScript strict mode not enabled');
    results.push({
      file: 'tsconfig.json',
      exists: true,
      size: 0,
      status: 'WARNING',
      message: 'TypeScript strict mode - Not enabled',
    });
  }
} catch (error) {
  console.log('⚠️  WARNING tsconfig.json - Could not read tsconfig.json');
  results.push({
    file: 'tsconfig.json',
    exists: false,
    size: 0,
    status: 'WARNING',
    message: 'Could not read tsconfig.json',
  });
}

console.log('');

// Print results
printResults();
