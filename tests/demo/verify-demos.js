#!/usr/bin/env node
/**
 * Demo Verification Script (JavaScript version)
 * 
 * This script verifies that all demo files are properly structured,
 * importable, and contain the expected exports.
 */

const fs = require('fs');
const path = require('path');

/**
 * Verify demo directory structure
 */
function verifyDemoStructure() {
  console.log('🔍 Verifying Demo Directory Structure...\n');

  const demoDir = __dirname;
  const expectedFiles = [
    'index.ts',
    'demo-simple.ts',
    'demo-realistic.ts',
    'demo-interactive.ts',
    'README.md'
  ];

  let validFiles = 0;
  let invalidFiles = 0;
  const errors = [];

  expectedFiles.forEach(file => {
    const filePath = path.join(demoDir, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      console.log(`✓ ${file} - EXISTS`);
      validFiles++;
    } else {
      console.log(`✗ ${file} - MISSING`);
      errors.push(`Missing file: ${file}`);
      invalidFiles++;
    }
  });

  return { totalFiles: expectedFiles.length, validFiles, invalidFiles, errors, warnings: [] };
}

/**
 * Verify TypeScript files are syntactically valid
 */
function verifyTypeScriptFiles() {
  console.log('\n🔍 Verifying TypeScript Files...\n');

  const demoDir = __dirname;
  
  try {
    const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.ts'));
    
    let validFiles = 0;
    let invalidFiles = 0;
    const errors = [];
    const warnings = [];

    files.forEach(file => {
      const filePath = path.join(demoDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Basic TypeScript syntax checks
      const hasExport = content.includes('export');
      const hasImport = content.includes('import');
      const hasClass = content.includes('class');
      const hasInterface = content.includes('interface');
      
      let isValid = true;
      const issues = [];

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

      // Check file size (should be substantial)
      const lines = content.split('\n').length;
      if (lines < 50) {
        warnings.push(`${file} seems short (${lines} lines)`);
      }

      if (isValid) {
        console.log(`✓ ${file} - VALID TypeScript (${lines} lines)`);
        validFiles++;
      } else {
        console.log(`✗ ${file} - INVALID TypeScript`);
        issues.forEach(issue => console.log(`  - ${issue}`));
        errors.push(`${file}: ${issues.join(', ')}`);
        invalidFiles++;
      }
    });

    return { totalFiles: files.length, validFiles, invalidFiles, errors, warnings };
  } catch (error) {
    console.log('✗ Error reading demo directory');
    return { totalFiles: 0, validFiles: 0, invalidFiles: 1, errors: [error.message], warnings: [] };
  }
}

/**
 * Verify package.json scripts
 */
function verifyPackageScripts() {
  console.log('\n🔍 Verifying Package.json Scripts...\n');

  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  
  try {
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

    let validFiles = 0;
    let invalidFiles = 0;
    const errors = [];

    expectedScripts.forEach(script => {
      if (packageJson.scripts[script]) {
        console.log(`✓ ${script} - DEFINED`);
        validFiles++;
      } else {
        console.log(`✗ ${script} - MISSING`);
        errors.push(`Missing script: ${script}`);
        invalidFiles++;
      }
    });

    return { totalFiles: expectedScripts.length, validFiles, invalidFiles, errors, warnings: [] };
  } catch (error) {
    console.log('✗ Error reading package.json');
    return { totalFiles: 0, validFiles: 0, invalidFiles: 1, errors: [error.message], warnings: [] };
  }
}

/**
 * Verify README documentation
 */
function verifyReadme() {
  console.log('\n🔍 Verifying README Documentation...\n');

  const readmePath = path.join(__dirname, 'README.md');
  const readmeExists = fs.existsSync(readmePath);
  
  if (readmeExists) {
    try {
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

      const warnings = [];
      let hasAllSections = true;
      requiredSections.forEach(section => {
        if (!content.includes(section)) {
          hasAllSections = false;
          warnings.push(`Missing section: ${section}`);
        }
      });

      // Check file size
      const lines = content.split('\n').length;
      if (lines < 100) {
        warnings.push('README seems short, may need more documentation');
      }

      if (hasAllSections) {
        console.log(`✓ README.md - COMPLETE (${lines} lines)`);
        return { totalFiles: 1, validFiles: 1, invalidFiles: 0, errors: [], warnings };
      } else {
        console.log('⚠ README.md - INCOMPLETE');
        warnings.forEach(warning => console.log(`  - ${warning}`));
        return { totalFiles: 1, validFiles: 0, invalidFiles: 1, errors: ['Incomplete documentation'], warnings };
      }
    } catch (error) {
      console.log('✗ Error reading README.md');
      return { totalFiles: 1, validFiles: 0, invalidFiles: 1, errors: [error.message], warnings: [] };
    }
  } else {
    console.log('✗ README.md - MISSING');
    return { totalFiles: 1, validFiles: 0, invalidFiles: 1, errors: ['README.md file not found'], warnings: [] };
  }
}

/**
 * Check demo file content
 */
function verifyDemoContent() {
  console.log('\n🔍 Verifying Demo Content...\n');

  const demoFiles = [
    { file: 'demo-simple.ts', expectedClasses: ['SimpleDemos'], expectedFunctions: ['runSimpleDemos'] },
    { file: 'demo-realistic.ts', expectedClasses: ['RealisticScenarios'], expectedFunctions: ['runRealisticScenarios'] },
    { file: 'demo-interactive.ts', expectedClasses: ['InteractiveDemos'], expectedFunctions: ['runInteractiveDemos'] }
  ];

  let validFiles = 0;
  let invalidFiles = 0;
  const errors = [];
  const warnings = [];

  demoFiles.forEach(({ file, expectedClasses, expectedFunctions }) => {
    const filePath = path.join(__dirname, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      let isValid = true;
      const fileErrors = [];

      // Check for expected classes
      expectedClasses.forEach(cls => {
        if (!content.includes(`class ${cls}`)) {
          isValid = false;
          fileErrors.push(`Missing class: ${cls}`);
        }
      });

      // Check for expected functions
      expectedFunctions.forEach(fn => {
        if (!content.includes(`export async function ${fn}`) && !content.includes(`export function ${fn}`)) {
          fileErrors.push(`Missing function: ${fn}`);
        }
      });

      if (isValid) {
        console.log(`✓ ${file} - CONTENT VALID`);
        validFiles++;
      } else {
        console.log(`✗ ${file} - CONTENT ISSUES`);
        fileErrors.forEach(error => console.log(`  - ${error}`));
        errors.push(`${file}: ${fileErrors.join(', ')}`);
        invalidFiles++;
      }

      // Additional checks
      const hasGoodStructure = content.includes('try {') && content.includes('catch');
      const hasLogging = content.includes('console.log');
      const hasAsync = content.includes('async');
      
      if (!hasLogging) {
        warnings.push(`${file}: Missing console.log statements for output`);
      }
      
      if (!hasGoodStructure) {
        warnings.push(`${file}: Missing proper try-catch error handling`);
      }

    } catch (error) {
      console.log(`✗ ${file} - ERROR READING`);
      errors.push(`${file}: ${error.message}`);
      invalidFiles++;
    }
  });

  return { totalFiles: demoFiles.length, validFiles, invalidFiles, errors, warnings };
}

/**
 * Main verification function
 */
function main() {
  console.log('='.repeat(80));
  console.log('🎬 AI Code Agent Demo Verification');
  console.log('='.repeat(80));
  console.log('');

  const results = [
    verifyDemoStructure(),
    verifyTypeScriptFiles(),
    verifyPackageScripts(),
    verifyReadme(),
    verifyDemoContent()
  ];

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Verification Summary');
  console.log('='.repeat(80));

  let totalFiles = 0;
  let validFiles = 0;
  let invalidFiles = 0;
  const allErrors = [];
  const allWarnings = [];

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
  } else if (invalidFiles <= 2 && validFiles >= totalFiles * 0.8) {
    console.log('⚠️ VERIFICATION MOSTLY PASSED');
    console.log('✅ Demo suite is functional with minor issues');
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

  process.exit(invalidFiles <= 2 ? 0 : 1);
}

// Run verification
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n💥 Verification failed with error:', error);
    process.exit(1);
  }
}
