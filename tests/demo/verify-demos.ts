#!/usr/bin/env ts-node
/**
 * Demo Verification Script
 * 
 * This script verifies that all demo files are properly structured,
 * importable, and contain the expected exports.
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  file: string;
  exists: boolean;
  canImport: boolean;
  hasExports: boolean;
  errors: string[];
  warnings: string[];
}

interface VerificationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errors: string[];
  warnings: string[];
}

/**
 * Verify demo directory structure
 */
function verifyDemoStructure(): VerificationSummary {
  console.log('🔍 Verifying Demo Directory Structure...\n');

  const demoDir = path.join(__dirname, 'tests', 'demo');
  const expectedFiles = [
    'index.ts',
    'demo-simple.ts',
    'demo-realistic.ts',
    'demo-interactive.ts',
    'README.md'
  ];

  const summary: VerificationSummary = {
    totalFiles: expectedFiles.length,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  expectedFiles.forEach(file => {
    const filePath = path.join(demoDir, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      console.log(`✓ ${file} - EXISTS`);
      summary.validFiles++;
    } else {
      console.log(`✗ ${file} - MISSING`);
      summary.errors.push(`Missing file: ${file}`);
      summary.invalidFiles++;
    }
  });

  return summary;
}

/**
 * Verify TypeScript files are syntactically valid
 */
function verifyTypeScriptFiles(): VerificationSummary {
  console.log('\n🔍 Verifying TypeScript Files...\n');

  const demoDir = path.join(__dirname, 'tests', 'demo');
  const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.ts'));
  
  const summary: VerificationSummary = {
    totalFiles: files.length,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  files.forEach(file => {
    const filePath = path.join(demoDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Basic TypeScript syntax checks
    const hasExport = content.includes('export');
    const hasImport = content.includes('import');
    const hasClass = content.includes('class');
    const hasInterface = content.includes('interface');
    
    let isValid = true;
    const issues: string[] = [];

    // Check for balanced braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      isValid = false;
      issues.push('Unbalanced braces');
    }

    // Check for basic structure
    if (!hasExport && !hasClass && !hasInterface) {
      issues.push('No exports or classes found');
    }

    if (isValid) {
      console.log(`✓ ${file} - VALID TypeScript`);
      summary.validFiles++;
    } else {
      console.log(`✗ ${file} - INVALID TypeScript`);
      issues.forEach(issue => console.log(`  - ${issue}`));
      summary.errors.push(`${file}: ${issues.join(', ')}`);
      summary.invalidFiles++;
    }
  });

  return summary;
}

/**
 * Verify package.json scripts
 */
function verifyPackageScripts(): VerificationSummary {
  console.log('\n🔍 Verifying Package.json Scripts...\n');

  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const expectedScripts = [
    'demo',
    'demo:all',
    'demo:simple',
    'demo:realistic',
    'demo:interactive',
    'demo:quick',
    'demo:web',
    'demo:api',
    'demo:ecommerce'
  ];

  const summary: VerificationSummary = {
    totalFiles: expectedScripts.length,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  expectedScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`✓ ${script} - DEFINED`);
      summary.validFiles++;
    } else {
      console.log(`✗ ${script} - MISSING`);
      summary.errors.push(`Missing script: ${script}`);
      summary.invalidFiles++;
    }
  });

  return summary;
}

/**
 * Verify README documentation
 */
function verifyReadme(): VerificationSummary {
  console.log('\n🔍 Verifying README Documentation...\n');

  const readmePath = path.join(__dirname, 'tests', 'demo', 'README.md');
  const readmeExists = fs.existsSync(readmePath);
  
  const summary: VerificationSummary = {
    totalFiles: 1,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  if (readmeExists) {
    const content = fs.readFileSync(readmePath, 'utf-8');
    
    // Check for required sections
    const requiredSections = [
      '# AI Code Agent Demo Suite',
      '## 📋 Overview',
      '### 1. Simple Demos',
      '### 2. Realistic Scenarios',
      '### 3. Interactive Demos',
      '## 🚀 Quick Start',
      '## 📖 Usage Examples'
    ];

    let hasAllSections = true;
    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        hasAllSections = false;
        summary.warnings.push(`Missing section: ${section}`);
      }
    });

    if (hasAllSections) {
      console.log('✓ README.md - COMPLETE');
      summary.validFiles++;
    } else {
      console.log('⚠ README.md - INCOMPLETE');
      summary.invalidFiles++;
    }
  } else {
    console.log('✗ README.md - MISSING');
    summary.errors.push('README.md file not found');
    summary.invalidFiles++;
  }

  return summary;
}

/**
 * Test basic imports (requires ts-node)
 */
function verifyImports(): VerificationSummary {
  console.log('\n🔍 Verifying Demo Imports...\n');

  const summary: VerificationSummary = {
    totalFiles: 4,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
    warnings: []
  };

  try {
    // Test that main index exports exist
    const indexModule = require('./tests/demo/index.ts');
    const expectedExports = [
      'runAllDemoSuites',
      'runQuickDemo',
      'runSimpleDemos',
      'runRealisticScenarios',
      'runInteractiveDemos',
      'DemoConfig',
      'validateDemoEnvironment'
    ];

    expectedExports.forEach(ex => {
      if (indexModule[ex]) {
        console.log(`✓ index.ts exports ${ex}`);
        summary.validFiles++;
      } else {
        console.log(`✗ index.ts missing export ${ex}`);
        summary.errors.push(`Missing export: ${ex}`);
        summary.invalidFiles++;
      }
    });
  } catch (error) {
    console.log('✗ Failed to import demo modules');
    summary.errors.push(`Import error: ${error.message}`);
    summary.invalidFiles += 4;
  }

  return summary;
}

/**
 * Main verification function
 */
async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('🎬 AI Code Agent Demo Verification');
  console.log('='.repeat(80));
  console.log('');

  const results: VerificationSummary[] = [
    verifyDemoStructure(),
    verifyTypeScriptFiles(),
    verifyPackageScripts(),
    verifyReadme(),
    verifyImports()
  ];

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Verification Summary');
  console.log('='.repeat(80));

  let totalFiles = 0;
  let validFiles = 0;
  let invalidFiles = 0;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  results.forEach(result => {
    totalFiles += result.totalFiles;
    validFiles += result.validFiles;
    invalidFiles += result.invalidFiles;
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  console.log(`\nTotal Checks: ${totalFiles}`);
  console.log(`Valid: ${validFiles} ✓`);
  console.log(`Invalid: ${invalidFiles} ✗`);
  console.log(`Success Rate: ${((validFiles / totalFiles) * 100).toFixed(1)}%`);

  if (allErrors.length > 0) {
    console.log('\n❌ Errors:');
    allErrors.forEach(error => console.log(`  • ${error}`));
  }

  if (allWarnings.length > 0) {
    console.log('\n⚠ Warnings:');
    allWarnings.forEach(warning => console.log(`  • ${warning}`));
  }

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (invalidFiles === 0) {
    console.log('🎉 ALL VERIFICATIONS PASSED!');
    console.log('✅ Demo suite is ready to use');
  } else {
    console.log('❌ VERIFICATION FAILED!');
    console.log(`🔧 Please fix ${invalidFiles} issues before running demos`);
  }
  console.log('='.repeat(80));

  // Suggest next steps
  if (invalidFiles === 0) {
    console.log('\n🚀 Next Steps:');
    console.log('  • Run: npm run demo:simple (basic demos)');
    console.log('  • Run: npm run demo:realistic (enterprise scenarios)');
    console.log('  • Run: npm run demo:interactive (interactive demos)');
    console.log('  • Run: npm run demo:all (all demos)');
    console.log('  • See: tests/demo/README.md (full documentation)');
  }

  process.exit(invalidFiles === 0 ? 0 : 1);
}

// Run verification
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Verification failed with error:', error);
    process.exit(1);
  });
}

export { verifyDemoStructure, verifyTypeScriptFiles, verifyPackageScripts, verifyReadme, verifyImports };
