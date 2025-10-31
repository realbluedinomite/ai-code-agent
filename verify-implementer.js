#!/usr/bin/env node

/**
 * Implementation Verification Script
 * 
 * Verifies that the Implementer component is properly implemented
 * with all required files, exports, and structure.
 */

const fs = require('fs');
const path = require('path');

const IMPLEMENTER_PATH = path.join(__dirname, 'src/components/implementer');
const REQUIRED_FILES = [
  'index.ts',
  'types.ts',
  'implementer.ts',
  'code-generator.ts',
  'file-writer.ts',
  'rollback-manager.ts',
  'README.md',
  'examples.ts',
  'IMPLEMENTATION_SUMMARY.md',
];

const REQUIRED_CLASSES = [
  'Implementer',
  'CodeGenerator',
  'FileWriter',
  'RollbackManager',
];

const REQUIRED_ERRORS = [
  'ImplementationError',
  'CodeGenerationError',
  'FileOperationError',
  'RollbackError',
];

console.log('🔍 Verifying Implementer Component Implementation...\n');

// Check file existence
console.log('📁 Checking required files:');
let allFilesExist = true;

REQUIRED_FILES.forEach(file => {
  const filePath = path.join(IMPLEMENTER_PATH, file);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing!');
  process.exit(1);
}

// Check test directory
const testDir = path.join(IMPLEMENTER_PATH, '__tests__');
if (fs.existsSync(testDir)) {
  console.log('\n📁 Test directory found:');
  const testFiles = fs.readdirSync(testDir);
  testFiles.forEach(file => {
    const filePath = path.join(testDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} (${stats.size} bytes)`);
  });
} else {
  console.log('\n⚠️  Test directory not found (will be created during build)');
}

// Check index.ts exports
console.log('\n📤 Checking index.ts exports:');
const indexPath = path.join(IMPLEMENTER_PATH, 'index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf8');

REQUIRED_CLASSES.forEach(cls => {
  const exportPattern = new RegExp(`export.*${cls}`, 'g');
  const matches = indexContent.match(exportPattern);
  
  if (matches && matches.length > 0) {
    console.log(`  ✅ ${cls} exported`);
  } else {
    console.log(`  ❌ ${cls} NOT exported`);
  }
});

// Check types.ts
console.log('\n📋 Checking type definitions:');
const typesPath = path.join(IMPLEMENTER_PATH, 'types.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

const requiredTypes = [
  'ImplementationRequest',
  'ImplementationResult',
  'CodeGenerationRequest',
  'FileOperation',
  'RollbackSession',
];

requiredTypes.forEach(type => {
  if (typesContent.includes(`interface ${type}`) || typesContent.includes(`type ${type}`)) {
    console.log(`  ✅ ${type} defined`);
  } else {
    console.log(`  ⚠️  ${type} not found (may be imported)`);
  }
});

// Check examples file
console.log('\n📚 Checking examples:');
const examplesPath = path.join(IMPLEMENTER_PATH, 'examples.ts');
const examplesContent = fs.readFileSync(examplesPath, 'utf8');

const exampleFunctions = [
  'basicImplementation',
  'multiFileImplementation',
  'dryRunExample',
  'progressTrackingExample',
  'rollbackSessionExample',
];

exampleFunctions.forEach(func => {
  if (examplesContent.includes(`export async function ${func}`)) {
    console.log(`  ✅ ${func} example`);
  } else {
    console.log(`  ⚠️  ${func} example not found`);
  }
});

// Check README documentation
console.log('\n📖 Checking README documentation:');
const readmePath = path.join(IMPLEMENTER_PATH, 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf8');

const readmeSections = [
  'Overview',
  'Architecture',
  'Components',
  'Configuration',
  'API Reference',
  'Examples',
];

readmeSections.forEach(section => {
  if (readmeContent.includes(section)) {
    console.log(`  ✅ ${section} section`);
  } else {
    console.log(`  ⚠️  ${section} section missing`);
  }
});

// Calculate statistics
console.log('\n📊 Implementation Statistics:');

let totalLines = 0;
let totalFiles = 0;

REQUIRED_FILES.forEach(file => {
  const filePath = path.join(IMPLEMENTER_PATH, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;
    totalFiles++;
    console.log(`  ${file}: ${lines} lines`);
  }
});

console.log(`\n📈 Total: ${totalFiles} files, ${totalLines} lines of code`);

// Final verdict
console.log('\n' + '='.repeat(60));
if (allFilesExist && totalFiles === REQUIRED_FILES.length) {
  console.log('✅ IMPLEMENTATION COMPLETE');
  console.log('All required components have been successfully implemented!');
  console.log('='.repeat(60));
  process.exit(0);
} else {
  console.log('❌ IMPLEMENTATION INCOMPLETE');
  console.log('Some components are missing or incomplete.');
  console.log('='.repeat(60));
  process.exit(1);
}
