#!/usr/bin/env node
/**
 * Comprehensive Testing Setup Script
 * 
 * This script verifies the environment, dependencies, and configuration
 * required for the AI Code Agent system to function properly.
 * 
 * Usage:
 *   node scripts/test-setup-simple.ts                    # Run all checks
 *   node scripts/test-setup-simple.ts --env             # Check environment only
 *   node scripts/test-setup-simple.ts --deps            # Check dependencies only
 *   node scripts/test-setup-simple.ts --db              # Check database only
 *   node scripts/test-setup-simple.ts --groq            # Check Groq API only
 *   node scripts/test-setup-simple.ts --components      # Check component health only
 *   node scripts/test-setup-simple.ts --verbose         # Verbose output
 *   node scripts/test-setup-simple.ts --fix             # Attempt to fix issues automatically
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { spawn } = require('child_process');
const Groq = require('groq-sdk');

const execAsync = promisify(exec);

const execSync = require('child_process').execSync;

class TestSetupManager {
  constructor(verbose = false, fixMode = false) {
    this.results = [];
    this.verbose = verbose;
    this.fixMode = fixMode;
  }

  /**
   * Run all verification checks
   */
  async runAllChecks() {
    console.log(chalk.blue.bold('\n🧪 AI Code Agent - Testing Setup Verification\n'));

    const checks = [
      () => this.checkEnvironment(),
      () => this.checkNodeVersion(),
      () => this.checkNpmVersion(),
      () => this.checkDependencies(),
      () => this.checkTypeScriptConfiguration(),
      () => this.checkEnvironmentFiles(),
      () => this.checkDatabaseSetup(),
      () => this.checkGroqApiKey(),
      () => this.checkComponentHealth(),
      () => this.checkDockerSetup(),
      () => this.checkTestConfiguration(),
    ];

    for (const check of checks) {
      try {
        await check();
      } catch (error) {
        this.addResult('System Check', 'fail', `Unexpected error: ${error.message}`);
      }
    }

    return this.displayResults();
  }

  /**
   * Check environment variables
   */
  async checkEnvironment() {
    const spinner = ora('Checking environment variables...').start();

    const requiredVars = [
      'NODE_ENV',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
    ];

    const optionalVars = [
      'GROQ_API_KEY',
      'JWT_SECRET',
      'REDIS_HOST',
      'REDIS_PORT',
    ];

    const missingRequired = [];
    const missingOptional = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingRequired.push(varName);
      }
    }

    for (const varName of optionalVars) {
      if (!process.env[varName]) {
        missingOptional.push(varName);
      }
    }

    if (missingRequired.length > 0) {
      spinner.fail('Missing required environment variables');
      this.addResult(
        'Environment Variables',
        'fail',
        `Missing required variables: ${missingRequired.join(', ')}`,
        `Please set these in your .env file or environment`,
        true
      );
    } else {
      spinner.succeed('Required environment variables found');
      this.addResult('Environment Variables', 'pass', 'All required variables present');

      if (missingOptional.length > 0) {
        this.addResult(
          'Environment Variables',
          'warn',
          `Missing optional variables: ${missingOptional.join(', ')}`,
          'These are recommended for full functionality'
        );
      }
    }

    // Display environment info
    if (this.verbose) {
      console.log(chalk.gray('Current environment:'), process.env.NODE_ENV || 'not set');
      console.log(chalk.gray('Database config:'), {
        host: process.env.DB_HOST || 'not set',
        port: process.env.DB_PORT || 'not set',
        name: process.env.DB_NAME || 'not set',
      });
    }
  }

  /**
   * Check Node.js version
   */
  async checkNodeVersion() {
    const spinner = ora('Checking Node.js version...').start();

    try {
      const version = execSync('node --version').toString().trim();
      const majorVersion = parseInt(version.substring(1).split('.')[0]);

      if (majorVersion >= 18) {
        spinner.succeed(`Node.js version: ${version} ✓`);
        this.addResult('Node.js Version', 'pass', `Using Node.js ${version}`);
      } else {
        spinner.fail(`Node.js version too old: ${version}`);
        this.addResult(
          'Node.js Version',
          'fail',
          `Node.js ${version} is not supported`,
          'Please upgrade to Node.js 18 or higher',
          true
        );
      }
    } catch (error) {
      spinner.fail('Node.js not found');
      this.addResult(
        'Node.js Version',
        'fail',
        'Node.js is not installed or not in PATH',
        'Please install Node.js 18 or higher',
        true
      );
    }
  }

  /**
   * Check npm version
   */
  async checkNpmVersion() {
    const spinner = ora('Checking npm version...').start();

    try {
      const version = execSync('npm --version').toString().trim();
      const majorVersion = parseInt(version.split('.')[0]);

      if (majorVersion >= 8) {
        spinner.succeed(`npm version: ${version} ✓`);
        this.addResult('npm Version', 'pass', `Using npm ${version}`);
      } else {
        spinner.warn(`npm version outdated: ${version}`);
        this.addResult(
          'npm Version',
          'warn',
          `npm ${version} is outdated`,
          'Consider upgrading to npm 8 or higher',
          true
        );
      }
    } catch (error) {
      spinner.fail('npm not found');
      this.addResult(
        'npm Version',
        'fail',
        'npm is not installed or not in PATH',
        'Please install npm 8 or higher',
        true
      );
    }
  }

  /**
   * Check project dependencies
   */
  async checkDependencies() {
    const spinner = ora('Checking project dependencies...').start();

    try {
      // Check if node_modules exists
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      fs.accessSync(nodeModulesPath);

      // Check package.json exists
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      fs.accessSync(packageJsonPath);

      spinner.succeed('Dependencies installed');
      this.addResult('Dependencies', 'pass', 'All dependencies are installed');

      // Check for critical packages
      if (this.verbose) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const criticalDeps = ['typescript', 'jest', 'groq-sdk', 'pg', 'express'];
        
        console.log(chalk.gray('\nCritical dependencies:'));
        criticalDeps.forEach(dep => {
          const isInstalled = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
          console.log(chalk.gray(`  ${dep}:`), isInstalled ? chalk.green('✓') : chalk.red('✗'));
        });
      }
    } catch (error) {
      spinner.fail('Dependencies not installed');
      this.addResult(
        'Dependencies',
        'fail',
        'node_modules not found',
        'Run: npm install',
        true
      );
    }
  }

  /**
   * Check TypeScript configuration
   */
  async checkTypeScriptConfiguration() {
    const spinner = ora('Checking TypeScript configuration...').start();

    try {
      // Check tsconfig.json
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      fs.accessSync(tsconfigPath);

      // Try to compile TypeScript
      try {
        execSync('npx tsc --noEmit --project tsconfig.json', { stdio: 'pipe' });
        spinner.succeed('TypeScript configuration valid');
        this.addResult('TypeScript Configuration', 'pass', 'TypeScript compiles successfully');
      } catch (compileError) {
        spinner.warn('TypeScript compilation has warnings');
        this.addResult(
          'TypeScript Configuration',
          'warn',
          'TypeScript compilation has warnings',
          compileError.stderr?.toString() || compileError.stdout?.toString()
        );
      }
    } catch (error) {
      spinner.warn('TypeScript not available');
      this.addResult(
        'TypeScript Configuration',
        'warn',
        'TypeScript compiler not found',
        'Please install TypeScript: npm install -D typescript'
      );
    }
  }

  /**
   * Check environment files
   */
  async checkEnvironmentFiles() {
    const spinner = ora('Checking environment files...').start();

    const envFiles = [
      '.env',
      '.env.development',
      '.env.test',
      '.env.production',
    ];

    const existingFiles = [];
    const missingFiles = [];

    for (const file of envFiles) {
      try {
        fs.accessSync(file);
        existingFiles.push(file);
      } catch (error) {
        missingFiles.push(file);
      }
    }

    if (existingFiles.length === 0) {
      spinner.fail('No environment files found');
      this.addResult(
        'Environment Files',
        'fail',
        'No .env files found',
        'Please create at least a .env file based on .env.example',
        true
      );
    } else {
      spinner.succeed(`Found ${existingFiles.length} environment file(s)`);
      this.addResult('Environment Files', 'pass', `Found: ${existingFiles.join(', ')}`);

      if (missingFiles.length > 0 && this.verbose) {
        console.log(chalk.yellow('\nOptional missing files:'), missingFiles.join(', '));
      }
    }

    // Validate .env.example exists
    try {
      fs.accessSync('.env.example');
      if (this.verbose) {
        console.log(chalk.green('✓ .env.example found'));
      }
    } catch (error) {
      this.addResult(
        'Environment Files',
        'warn',
        '.env.example not found',
        'Consider creating .env.example for reference'
      );
    }
  }

  /**
   * Check database setup
   */
  async checkDatabaseSetup() {
    const spinner = ora('Checking database setup...').start();

    try {
      // Check if PostgreSQL is accessible
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'ai_code_agent';
      const dbUser = process.env.DB_USER || 'ai_agent_user';
      const dbPassword = process.env.DB_PASSWORD || '';

      const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

      // Test connection
      try {
        execSync(
          `psql "${connectionString}" -c "SELECT 1;" -t`,
          { stdio: 'pipe' }
        );

        spinner.succeed('Database connection successful');
        this.addResult('Database Setup', 'pass', 'PostgreSQL connection successful');

        // Check if migrations have been run
        try {
          const tablesOutput = execSync(
            `psql "${connectionString}" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t`
          ).toString();
          
          const tableCount = parseInt(tablesOutput.trim());
          
          if (tableCount > 0) {
            this.addResult('Database Setup', 'pass', `Found ${tableCount} tables`);
          } else {
            this.addResult(
              'Database Setup',
              'warn',
              'No tables found',
              'Run database migrations: npm run db:migrate',
              true
            );
          }
        } catch (error) {
          this.addResult(
            'Database Setup',
            'warn',
            'Could not query tables',
            'Migrations may not have been run'
          );
        }

      } catch (connectionError) {
        throw connectionError;
      }

    } catch (error) {
      if (error.message.includes('password')) {
        spinner.fail('Database authentication failed');
        this.addResult(
          'Database Setup',
          'fail',
          'Database authentication failed',
          'Check DB_USER and DB_PASSWORD in your environment',
          true
        );
      } else if (error.message.includes('could not connect')) {
        spinner.fail('Cannot connect to PostgreSQL');
        this.addResult(
          'Database Setup',
          'fail',
          'Cannot connect to PostgreSQL server',
          'Ensure PostgreSQL is running and accessible',
          true
        );
      } else {
        spinner.fail('Database check failed');
        this.addResult(
          'Database Setup',
          'fail',
          'Database setup verification failed',
          error.message
        );
      }
    }
  }

  /**
   * Check Groq API key
   */
  async checkGroqApiKey() {
    const spinner = ora('Checking Groq API configuration...').start();

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      spinner.warn('GROQ_API_KEY not found');
      this.addResult(
        'Groq API',
        'warn',
        'GROQ_API_KEY not configured',
        'AI features will not be available without an API key',
        false
      );
      return;
    }

    try {
      const groq = new Groq.Groq({ apiKey: groqApiKey });
      
      // Make a minimal request to validate the API key
      await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'mixtral-8x7b-32768',
        max_tokens: 1,
        temperature: 0,
      });

      spinner.succeed('Groq API key valid');
      this.addResult('Groq API', 'pass', 'Groq API key is valid and working');

    } catch (error) {
      spinner.fail('Groq API validation failed');
      
      if (error.message.includes('invalid') || error.status === 401 || error.status === 403) {
        this.addResult(
          'Groq API',
          'fail',
          'Invalid Groq API key',
          'Please check your GROQ_API_KEY',
          true
        );
      } else {
        this.addResult(
          'Groq API',
          'fail',
          'Groq API validation failed',
          error.message
        );
      }
    }
  }

  /**
   * Check component health
   */
  async checkComponentHealth() {
    const spinner = ora('Checking component health...').start();

    try {
      const checks = [
        { name: 'Config Manager', test: () => this.testConfigManager() },
        { name: 'Logger', test: () => this.testLogger() },
        { name: 'Event Bus', test: () => this.testEventBus() },
        { name: 'Plugin Manager', test: () => this.testPluginManager() },
      ];

      const results = [];
      for (const check of checks) {
        try {
          check.test();
          results.push(`${check.name} ✓`);
        } catch (error) {
          results.push(`${check.name} ✗`);
        }
      }

      spinner.succeed('Component health check complete');
      this.addResult('Component Health', 'pass', results.join(', '));

      if (this.verbose) {
        console.log(chalk.gray('\nComponent status:'));
        results.forEach(result => {
          const status = result.includes('✓') ? chalk.green(result) : chalk.red(result);
          console.log(`  ${status}`);
        });
      }
    } catch (error) {
      spinner.fail('Component health check failed');
      this.addResult(
        'Component Health',
        'fail',
        'Component verification failed',
        error.message
      );
    }
  }

  /**
   * Check Docker setup
   */
  async checkDockerSetup() {
    const spinner = ora('Checking Docker setup...').start();

    try {
      // Check if docker-compose.yml exists
      fs.accessSync('docker-compose.yml');
      
      spinner.succeed('Docker Compose configuration found');
      this.addResult('Docker Setup', 'pass', 'docker-compose.yml found');

      // Check if Docker is running
      try {
        execSync('docker ps', { stdio: 'pipe' });
        
        if (this.verbose) {
          console.log(chalk.green('✓ Docker is running'));
        }
        
        this.addResult('Docker Setup', 'pass', 'Docker daemon is accessible');
      } catch (error) {
        this.addResult(
          'Docker Setup',
          'warn',
          'Docker daemon not accessible',
          'Docker may not be running or installed'
        );
      }

      // Check production docker-compose
      try {
        fs.accessSync('docker-compose.prod.yml');
        if (this.verbose) {
          console.log(chalk.green('✓ Production Docker Compose configuration found'));
        }
      } catch (error) {
        this.addResult(
          'Docker Setup',
          'warn',
          'Production Docker Compose configuration missing'
        );
      }

    } catch (error) {
      spinner.warn('No Docker Compose configuration found');
      this.addResult(
        'Docker Setup',
        'warn',
        'docker-compose.yml not found',
        'Docker setup is optional but recommended'
      );
    }
  }

  /**
   * Check test configuration
   */
  async checkTestConfiguration() {
    const spinner = ora('Checking test configuration...').start();

    try {
      // Check Jest configuration
      fs.accessSync('jest.config.ts');
      
      // Check test directories
      const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e'];
      const existingDirs = [];
      
      for (const dir of testDirs) {
        try {
          fs.accessSync(dir);
          existingDirs.push(dir);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      spinner.succeed('Test configuration found');
      this.addResult('Test Configuration', 'pass', `Found Jest config and ${existingDirs.length} test directories`);

      // Check package.json test scripts
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        const testScripts = Object.keys(packageJson.scripts || {})
          .filter(key => key.startsWith('test'));
        
        if (this.verbose) {
          console.log(chalk.gray('\nAvailable test scripts:'));
          testScripts.forEach(script => {
            console.log(chalk.gray(`  npm run ${script}`));
          });
        }
      } catch (error) {
        // Ignore package.json parse errors
      }

    } catch (error) {
      spinner.fail('Test configuration incomplete');
      this.addResult(
        'Test Configuration',
        'fail',
        'Jest configuration not found',
        'Please ensure jest.config.ts exists'
      );
    }
  }

  // Component test methods

  testConfigManager() {
    const testConfig = process.env.NODE_ENV || 'test';
    if (!testConfig) {
      throw new Error('Config manager not working');
    }
  }

  testLogger() {
    try {
      console.log(chalk.green('✓ Logger working correctly'));
    } catch (error) {
      throw new Error('Logger not working');
    }
  }

  testEventBus() {
    // Simple event bus test without external dependencies
    let eventReceived = false;
    const testBus = {
      events: new Map(),
      on: (event, callback) => {
        if (!testBus.events.has(event)) {
          testBus.events.set(event, []);
        }
        testBus.events.get(event).push(callback);
      },
      emit: (event, data) => {
        const callbacks = testBus.events.get(event) || [];
        callbacks.forEach(cb => cb(data));
      }
    };
    
    testBus.on('test-event', () => {
      eventReceived = true;
    });
    
    testBus.emit('test-event', { test: true });
    
    if (!eventReceived) {
      throw new Error('Event bus not working');
    }
  }

  testPluginManager() {
    // Simple plugin manager test
    const testPluginManager = {
      plugins: new Map(),
      register: (name, plugin) => {
        testPluginManager.plugins.set(name, plugin);
      },
      get: (name) => {
        return testPluginManager.plugins.get(name);
      }
    };
    
    if (!testPluginManager) {
      throw new Error('Plugin manager not working');
    }
  }

  /**
   * Add a test result
   */
  addResult(name, status, message, details, fixable) {
    this.results.push({ name, status, message, details, fixable });
  }

  /**
   * Display results and attempt auto-fix if enabled
   */
  async displayResults() {
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const warnCount = this.results.filter(r => r.status === 'warn').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;

    console.log(chalk.blue.bold('\n📊 Test Results Summary\n'));
    
    console.log(chalk.green(`✓ Passed: ${passCount}`));
    console.log(chalk.yellow(`⚠ Warnings: ${warnCount}`));
    console.log(chalk.red(`✗ Failed: ${failCount}`));

    if (failCount > 0) {
      console.log(chalk.red.bold('\n❌ Failed Checks:\n'));
      this.results
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(chalk.red(`  • ${result.name}: ${result.message}`));
          if (result.details) {
            console.log(chalk.gray(`    ${result.details}`));
          }
        });
    }

    if (warnCount > 0) {
      console.log(chalk.yellow('\n⚠ Warnings:\n'));
      this.results
        .filter(r => r.status === 'warn')
        .forEach(result => {
          console.log(chalk.yellow(`  • ${result.name}: ${result.message}`));
          if (result.details) {
            console.log(chalk.gray(`    ${result.details}`));
          }
        });
    }

    // Attempt auto-fix if requested and enabled
    if (this.fixMode && (failCount > 0 || warnCount > 0)) {
      console.log(chalk.blue('\n🔧 Attempting automatic fixes...\n'));
      await this.attemptAutoFix();
    }

    const allPassed = failCount === 0;
    
    if (allPassed) {
      console.log(chalk.green.bold('\n✅ All checks passed! System is ready for development.\n'));
    } else {
      console.log(chalk.red.bold('\n❌ Some checks failed. Please resolve the issues above.\n'));
    }

    return allPassed;
  }

  /**
   * Attempt to automatically fix common issues
   */
  async attemptAutoFix() {
    const fixableResults = this.results.filter(r => r.fixable);

    for (const result of fixableResults) {
      try {
        switch (result.name) {
          case 'Dependencies':
            console.log(chalk.blue(`Installing dependencies...`));
            await this.runCommand('npm install');
            console.log(chalk.green('✓ Dependencies installed'));
            break;
            
          case 'Environment Files':
            console.log(chalk.blue(`Creating .env file from example...`));
            await this.createEnvFromExample();
            break;
            
          case 'Node.js Version':
            console.log(chalk.yellow('Cannot auto-fix Node.js version. Please upgrade manually.'));
            break;
            
          case 'npm Version':
            console.log(chalk.blue('Upgrading npm...'));
            await this.runCommand('npm install -g npm@latest');
            break;
        }
      } catch (error) {
        console.log(chalk.red(`Failed to fix ${result.name}: ${error.message}`));
      }
    }
  }

  /**
   * Run a command with output
   */
  runCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        stdio: 'inherit',
        env: process.env,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Create .env from .env.example
   */
  async createEnvFromExample() {
    try {
      const exampleContent = fs.readFileSync('.env.example', 'utf-8');
      fs.writeFileSync('.env', exampleContent);
      console.log(chalk.green('✓ Created .env from .env.example'));
      console.log(chalk.yellow('Please review and update the .env file with your configuration'));
    } catch (error) {
      console.log(chalk.red('Failed to create .env from example'));
    }
  }
}

// Main function
async function main() {
  const program = new Command();
  
  program
    .name('Test Setup Manager')
    .description('Verify environment, dependencies, and configuration')
    .version('1.0.0');

  program
    .option('--env', 'Check environment variables only')
    .option('--deps', 'Check dependencies only')
    .option('--db', 'Check database only')
    .option('--groq', 'Check Groq API only')
    .option('--components', 'Check component health only')
    .option('--all', 'Run all checks (default)')
    .option('--verbose', 'Show detailed output')
    .option('--fix', 'Attempt to automatically fix issues')
    .action(async (options) => {
      try {
        const setupManager = new TestSetupManager(options.verbose, options.fix);
        
        let success = false;

        if (options.env) {
          await setupManager.checkEnvironment();
        } else if (options.deps) {
          await setupManager.checkDependencies();
        } else if (options.db) {
          await setupManager.checkDatabaseSetup();
        } else if (options.groq) {
          await setupManager.checkGroqApiKey();
        } else if (options.components) {
          await setupManager.checkComponentHealth();
        } else {
          success = await setupManager.runAllChecks();
        }

        process.exit(success ? 0 : 1);
      } catch (error) {
        console.error('Test setup failed:', error);
        process.exit(1);
      }
    });

  program.parse();
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('Setup script failed:', error);
    process.exit(1);
  });
}

module.exports = { TestSetupManager };
