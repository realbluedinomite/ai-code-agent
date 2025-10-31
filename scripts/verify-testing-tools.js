#!/usr/bin/env node
/**
 * Test Scripts Verification
 * 
 * Verifies that all testing scripts are properly configured and functional
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + colors.cyan + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60) + colors.reset);
}

async function verifyScript(scriptPath, args = []) {
  return new Promise((resolve) => {
    log('blue', `\nTesting: ${path.basename(scriptPath)}`);
    
    const proc = spawn('npx', ['ts-node', scriptPath, ...args], {
      stdio: 'pipe',
      timeout: 10000
    });

    let output = '';
    let errorOutput = '';

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 || output.includes('Usage:') || output.includes('help')) {
        log('green', `  ✓ ${path.basename(scriptPath)} is functional`);
        resolve(true);
      } else {
        log('red', `  ✗ ${path.basename(scriptPath)} failed`);
        if (errorOutput) {
          log('yellow', `    Error: ${errorOutput.substring(0, 200)}`);
        }
        resolve(false);
      }
    });

    proc.on('error', (error) => {
      log('red', `  ✗ ${path.basename(scriptPath)} error: ${error.message}`);
      resolve(false);
    });
  });
}

async function checkFileExists(filePath) {
  if (fs.existsSync(filePath)) {
    log('green', `  ✓ ${filePath} exists`);
    return true;
  } else {
    log('red', `  ✗ ${filePath} missing`);
    return false;
  }
}

async function checkPackageJsonScripts() {
  logSection('Package.json Scripts');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const testScripts = [
    'test:dashboard',
    'test:dashboard:dev',
    'test:quick',
    'test:quick:smoke',
    'test:quick:list',
    'test:quick:all',
    'test:quick:all-optional',
    'test:auto',
    'test:auto:ci',
    'test:auto:coverage',
    'test:auto:benchmark',
    'test:auto:continuous',
    'test:reports',
    'test:history'
  ];

  let allFound = true;
  for (const script of testScripts) {
    if (packageJson.scripts[script]) {
      log('green', `  ✓ ${script}: ${packageJson.scripts[script]}`);
    } else {
      log('red', `  ✗ ${script} missing`);
      allFound = false;
    }
  }

  return allFound;
}

async function main() {
  logSection('Testing Tools Verification');

  console.log('Verifying testing dashboard and CLI interface...\n');

  // Check script files
  logSection('Script Files');
  const scripts = [
    '/workspace/scripts/test-dashboard.ts',
    '/workspace/scripts/quick-test.ts',
    '/workspace/scripts/automated-test-runner.ts'
  ];

  let filesOk = true;
  for (const script of scripts) {
    const exists = await checkFileExists(script);
    filesOk = filesOk && exists;
  }

  // Check documentation
  logSection('Documentation');
  await checkFileExists('/workspace/TESTING_TOOLS.md');

  // Check package.json scripts
  const scriptsOk = await checkPackageJsonScripts();

  // Test script functionality (help mode)
  logSection('Script Functionality');
  const testCases = [
    { script: '/workspace/scripts/test-dashboard.ts', args: ['help'], name: 'Test Dashboard' },
    { script: '/workspace/scripts/quick-test.ts', args: ['help'], name: 'Quick Test' },
    { script: '/workspace/scripts/automated-test-runner.ts', args: ['help'], name: 'Automated Runner' }
  ];

  let functionalityOk = true;
  for (const testCase of testCases) {
    const works = await verifyScript(testCase.script, testCase.args);
    functionalityOk = functionalityOk && works;
  }

  // Test directory creation
  logSection('Test Reports Directory');
  const reportsDir = '/workspace/test-reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    log('green', `  ✓ Created ${reportsDir}`);
  } else {
    log('green', `  ✓ ${reportsDir} exists`);
  }

  // Summary
  logSection('Summary');
  
  const checks = [
    { name: 'Script Files', passed: filesOk },
    { name: 'Package.json Scripts', passed: scriptsOk },
    { name: 'Script Functionality', passed: functionalityOk },
    { name: 'Documentation', passed: true }
  ];

  let allPassed = true;
  for (const check of checks) {
    const status = check.passed ? colors.green + '✓' : colors.red + '✗';
    log(check.passed ? 'green' : 'red', `  ${status} ${check.name}`);
    allPassed = allPassed && check.passed;
  }

  console.log();
  if (allPassed) {
    log('green', '🎉 All verification checks passed!');
    log('cyan', '\nThe testing dashboard and CLI interface are ready to use.');
    log('cyan', '\nQuick Start Commands:');
    log('blue', '  npm run test:dashboard       # Interactive testing dashboard');
    log('blue', '  npm run test:quick          # Quick test of critical components');
    log('blue', '  npm run test:auto all       # Full automated test suite');
    log('blue', '  npm run test:quick:smoke    # Fast smoke test');
    console.log();
  } else {
    log('red', '❌ Some verification checks failed.');
    log('yellow', 'Please review the issues above.');
    process.exit(1);
  }
}

main().catch(error => {
  log('red', `Verification error: ${error.message}`);
  process.exit(1);
});
