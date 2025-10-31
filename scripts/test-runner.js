#!/usr/bin/env node

/**
 * Test Runner Script
 * 
 * Provides easy access to different test commands and configurations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests(testPath, options = {}) {
  const {
    watch = false,
    coverage = false,
    verbose = false,
    ci = false,
    testNamePattern,
    maxWorkers,
  } = options;

  const args = [
    'jest',
    testPath,
    '--config=jest.config.ts',
  ];

  if (watch) {
    args.push('--watch');
  }

  if (coverage) {
    args.push('--coverage');
  }

  if (verbose) {
    args.push('--verbose');
  }

  if (ci) {
    args.push('--ci', '--watchAll=false');
  }

  if (testNamePattern) {
    args.push('--testNamePattern', testNamePattern);
  }

  if (maxWorkers) {
    args.push('--maxWorkers', maxWorkers.toString());
  }

  // Set test environment
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
  };

  log('cyan', `Running: jest ${args.join(' ')}`);
  
  try {
    await runCommand('npx', args, { env });
    return true;
  } catch (error) {
    log('red', `Test run failed: ${error.message}`);
    return false;
  }
}

async function setupTestEnvironment() {
  log('cyan', 'Setting up test environment...');
  
  try {
    // Create test directories
    const testDirs = [
      'tests/fixtures',
      'tests/mocks',
      'tests/temp',
      'coverage',
      '.jest-cache',
    ];

    testDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        log('green', `  ✓ Created directory: ${dir}`);
      }
    });

    // Check database connectivity
    try {
      const { execSync } = require('child_process');
      execSync('pg_isready -h localhost -p 5432', { stdio: 'ignore' });
      log('green', '  ✓ PostgreSQL is available');
    } catch (error) {
      log('yellow', '  ⚠️  PostgreSQL is not available - some tests may fail');
    }

    log('green', 'Test environment setup complete!');
    return true;
  } catch (error) {
    log('red', `Setup failed: ${error.message}`);
    return false;
  }
}

async function runDatabaseSetup() {
  log('cyan', 'Setting up test database...');
  
  try {
    // Import database setup helper
    const { testDbManager } = require('./tests/helpers/database-setup.ts');
    await testDbManager.setup();
    log('green', 'Test database setup complete!');
    return true;
  } catch (error) {
    log('red', `Database setup failed: ${error.message}`);
    return false;
  }
}

async function runDatabaseCleanup() {
  log('cyan', 'Cleaning up test database...');
  
  try {
    const { testDbManager } = require('./tests/helpers/database-setup.ts');
    await testDbManager.teardown();
    log('green', 'Test database cleanup complete!');
    return true;
  } catch (error) {
    log('red', `Database cleanup failed: ${error.message}`);
    return false;
  }
}

function showHelp() {
  log('bright', 'AI Code Agent Test Runner');
  log('', '');
  log('bright', 'Usage: npm run test:runner [command] [options]');
  log('', '');
  log('bright', 'Commands:');
  log('  unit                    Run unit tests');
  log('  integration             Run integration tests');
  log('  e2e                     Run end-to-end tests');
  log('  all                     Run all tests');
  log('  watch                   Run tests in watch mode');
  log('  coverage                Run tests with coverage');
  log('  ci                      Run tests for CI/CD');
  log('  database:setup          Setup test database');
  log('  database:cleanup        Clean up test database');
  log('  setup                   Setup test environment');
  log('  perf                    Run performance tests');
  log('  debug [file]            Run tests in debug mode');
  log('  help                    Show this help message');
  log('', '');
  log('bright', 'Options:');
  log('  --coverage              Generate coverage report');
  log('  --verbose               Verbose output');
  log('  --watch                 Watch mode');
  log('  --ci                    CI/CD mode');
  log('  --pattern=<regex>       Test name pattern');
  log('  --workers=<n>           Number of workers');
  log('', '');
  log('bright', 'Examples:');
  log('  npm run test:runner unit');
  log('  npm run test:runner unit --coverage');
  log('  npm run test:runner integration --watch');
  log('  npm run test:runner --pattern="should initialize"');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};

  // Parse options
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      switch (key) {
        case 'coverage':
          options.coverage = true;
          break;
        case 'verbose':
          options.verbose = true;
          break;
        case 'watch':
          options.watch = true;
          break;
        case 'ci':
          options.ci = true;
          break;
        case 'pattern':
          options.testNamePattern = value;
          break;
        case 'workers':
          options.maxWorkers = parseInt(value);
          break;
      }
    }
  }

  try {
    switch (command) {
      case 'unit':
        log('cyan', 'Running unit tests...');
        const unitSuccess = await runTests('tests/unit', options);
        process.exit(unitSuccess ? 0 : 1);
        break;

      case 'integration':
        log('cyan', 'Running integration tests...');
        const integrationSuccess = await runTests('tests/integration', options);
        process.exit(integrationSuccess ? 0 : 1);
        break;

      case 'e2e':
        log('cyan', 'Running end-to-end tests...');
        const e2eSuccess = await runTests('tests/e2e', options);
        process.exit(e2eSuccess ? 0 : 1);
        break;

      case 'all':
        log('cyan', 'Running all tests...');
        const allSuccess = await runTests('tests', options);
        process.exit(allSuccess ? 0 : 1);
        break;

      case 'watch':
        log('cyan', 'Running tests in watch mode...');
        const watchSuccess = await runTests('tests', { ...options, watch: true });
        process.exit(watchSuccess ? 0 : 1);
        break;

      case 'coverage':
        log('cyan', 'Running tests with coverage...');
        const coverageSuccess = await runTests('tests', { ...options, coverage: true });
        process.exit(coverageSuccess ? 0 : 1);
        break;

      case 'ci':
        log('cyan', 'Running tests for CI/CD...');
        const ciSuccess = await runTests('tests', { ...options, ci: true, coverage: true });
        process.exit(ciSuccess ? 0 : 1);
        break;

      case 'database:setup':
        const setupSuccess = await runDatabaseSetup();
        process.exit(setupSuccess ? 0 : 1);
        break;

      case 'database:cleanup':
        const cleanupSuccess = await runDatabaseCleanup();
        process.exit(cleanupSuccess ? 0 : 1);
        break;

      case 'setup':
        const envSuccess = await setupTestEnvironment();
        process.exit(envSuccess ? 0 : 1);
        break;

      case 'perf':
        log('cyan', 'Running performance tests...');
        const perfSuccess = await runTests('tests', { 
          ...options, 
          testNamePattern: 'performance|perf' 
        });
        process.exit(perfSuccess ? 0 : 1);
        break;

      case 'debug':
        const debugPath = args[1] || 'tests';
        log('cyan', `Running tests in debug mode: ${debugPath}`);
        const debugSuccess = await runTests(debugPath, { 
          ...options, 
          verbose: true,
          watch: false 
        });
        process.exit(debugSuccess ? 0 : 1);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        log('yellow', `Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    log('red', `Error: ${error.message}`);
    process.exit(1);
  }
}

// Check if Jest is available
try {
  require.resolve('jest');
} catch (error) {
  log('red', 'Error: Jest is not installed. Please run: npm install --save-dev jest @types/jest ts-jest');
  process.exit(1);
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  setupTestEnvironment,
  runDatabaseSetup,
  runDatabaseCleanup,
};
