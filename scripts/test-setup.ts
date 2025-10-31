#!/usr/bin/env ts-node
/**
 * Comprehensive Testing Setup Script
 * 
 * This script verifies the environment, dependencies, and configuration
 * required for the AI Code Agent system to function properly.
 * 
 * Usage:
 *   ts-node scripts/test-setup.ts                    # Run all checks
 *   ts-node scripts/test-setup.ts --env             # Check environment only
 *   ts-node scripts/test-setup.ts --deps            # Check dependencies only
 *   ts-node scripts/test-setup.ts --db              # Check database only
 *   ts-node scripts/test-setup.ts --groq            # Check Groq API only
 *   ts-node scripts/test-setup.ts --components      # Check components only
 *   ts-node scripts/test-setup.ts --verbose         # Verbose output
 *   ts-node scripts/test-setup.ts --fix             # Attempt to fix issues automatically
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '@/core/config';
import { logger } from '@/core/logger';
import { GroqAIProvider } from '@/providers/groq-ai-provider';
import { DatabaseConnectionManager } from '@/database/client';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
  fixable?: boolean;
}

interface SetupOptions {
  checkEnvironment?: boolean;
  checkDependencies?: boolean;
  checkDatabase?: boolean;
  checkGroq?: boolean;
  checkComponents?: boolean;
  all?: boolean;
  verbose?: boolean;
  fix?: boolean;
}

class TestSetupManager {
  private results: TestResult[] = [];
  private verbose: boolean = false;
  private fixMode: boolean = false;

  constructor(verbose: boolean = false, fixMode: boolean = false) {
    this.verbose = verbose;
    this.fixMode = fixMode;
  }

  /**
   * Run all verification checks
   */
  async runAllChecks(): Promise<boolean> {
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
        this.addResult('System Check', 'fail', `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.displayResults();
  }

  /**
   * Check environment variables
   */
  private async checkEnvironment(): Promise<void> {
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

    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

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
  private async checkNodeVersion(): Promise<void> {
    const spinner = ora('Checking Node.js version...').start();

    try {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim();
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
  private async checkNpmVersion(): Promise<void> {
    const spinner = ora('Checking npm version...').start();

    try {
      const { stdout } = await execAsync('npm --version');
      const version = stdout.trim();
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
  private async checkDependencies(): Promise<void> {
    const spinner = ora('Checking project dependencies...').start();

    try {
      // Check if node_modules exists
      const nodeModulesPath = join(process.cwd(), 'node_modules');
      await fs.access(nodeModulesPath);

      // Check package.json exists
      const packageJsonPath = join(process.cwd(), 'package.json');
      await fs.access(packageJsonPath);

      spinner.succeed('Dependencies installed');
      this.addResult('Dependencies', 'pass', 'All dependencies are installed');

      // Check for critical packages
      if (this.verbose) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const criticalDeps = ['typescript', 'jest', 'groq-sdk', 'pg', 'express'];
        
        console.log(chalk.gray('\nCritical dependencies:'));
        for (const dep of criticalDeps) {
          const isInstalled = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
          console.log(chalk.gray(`  ${dep}:`), isInstalled ? chalk.green('✓') : chalk.red('✗'));
        }
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
  private async checkTypeScriptConfiguration(): Promise<void> {
    const spinner = ora('Checking TypeScript configuration...').start();

    try {
      // Check tsconfig.json
      const tsconfigPath = join(process.cwd(), 'tsconfig.json');
      await fs.access(tsconfigPath);

      // Try to compile TypeScript
      const { stdout, stderr } = await execAsync('npx tsc --noEmit --project tsconfig.json');
      
      if (stderr && stderr.trim() !== '') {
        spinner.warn('TypeScript compilation has warnings');
        this.addResult(
          'TypeScript Configuration',
          'warn',
          'TypeScript compilation has warnings',
          stderr
        );
      } else {
        spinner.succeed('TypeScript configuration valid');
        this.addResult('TypeScript Configuration', 'pass', 'TypeScript compiles successfully');
      }
    } catch (error: any) {
      if (error.status === 1) {
        spinner.fail('TypeScript compilation errors');
        this.addResult(
          'TypeScript Configuration',
          'fail',
          'TypeScript compilation failed',
          error.stdout || error.stderr,
          false
        );
      } else {
        spinner.warn('TypeScript not available');
        this.addResult(
          'TypeScript Configuration',
          'warn',
          'TypeScript compiler not found',
          'Please install TypeScript: npm install -D typescript'
        );
      }
    }
  }

  /**
   * Check environment files
   */
  private async checkEnvironmentFiles(): Promise<void> {
    const spinner = ora('Checking environment files...').start();

    const envFiles = [
      '.env',
      '.env.development',
      '.env.test',
      '.env.production',
    ];

    const existingFiles: string[] = [];
    const missingFiles: string[] = [];

    for (const file of envFiles) {
      try {
        await fs.access(file);
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
      await fs.access('.env.example');
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
  private async checkDatabaseSetup(): Promise<void> {
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
      const { stdout } = await execAsync(
        `psql "${connectionString}" -c "SELECT 1;" -t`
      );

      spinner.succeed('Database connection successful');
      this.addResult('Database Setup', 'pass', 'PostgreSQL connection successful');

      // Check if migrations have been run
      try {
        const { stdout: tablesOutput } = await execAsync(
          `psql "${connectionString}" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t`
        );
        
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

    } catch (error: any) {
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
  private async checkGroqApiKey(): Promise<void> {
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
      const provider = new GroqAIProvider();
      await provider.initialize({
        apiKey: groqApiKey,
      });

      spinner.succeed('Groq API key valid');
      this.addResult('Groq API', 'pass', 'Groq API key is valid and working');

      // Display available models
      if (this.verbose) {
        try {
          const models = await provider.getAvailableModels();
          console.log(chalk.gray('\nAvailable Groq models:'));
          models.forEach(model => {
            console.log(chalk.gray(`  ${model.name} (${model.id})`));
          });
        } catch (error) {
          console.log(chalk.yellow('Could not fetch model list'));
        }
      }

      await provider.close();
    } catch (error: any) {
      spinner.fail('Groq API validation failed');
      
      if (error.message.includes('invalid') || error.message.includes('401') || error.message.includes('403')) {
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
  private async checkComponentHealth(): Promise<void> {
    const spinner = ora('Checking component health...').start();

    try {
      const checks = [
        { name: 'Config Manager', test: () => this.testConfigManager() },
        { name: 'Logger', test: () => this.testLogger() },
        { name: 'Event Bus', test: () => this.testEventBus() },
        { name: 'Plugin Manager', test: () => this.testPluginManager() },
      ];

      const results: string[] = [];
      for (const check of checks) {
        try {
          await check.test();
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
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Check Docker setup
   */
  private async checkDockerSetup(): Promise<void> {
    const spinner = ora('Checking Docker setup...').start();

    try {
      // Check if docker-compose.yml exists
      await fs.access('docker-compose.yml');
      
      spinner.succeed('Docker Compose configuration found');
      this.addResult('Docker Setup', 'pass', 'docker-compose.yml found');

      // Check if Docker is running
      try {
        await execAsync('docker ps');
        
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
        await fs.access('docker-compose.prod.yml');
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
  private async checkTestConfiguration(): Promise<void> {
    const spinner = ora('Checking test configuration...').start();

    try {
      // Check Jest configuration
      await fs.access('jest.config.ts');
      
      // Check test directories
      const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e'];
      const existingDirs = [];
      
      for (const dir of testDirs) {
        try {
          await fs.access(dir);
          existingDirs.push(dir);
        } catch (error) {
          // Directory doesn't exist
        }
      }

      spinner.succeed('Test configuration found');
      this.addResult('Test Configuration', 'pass', `Found Jest config and ${existingDirs.length} test directories`);

      // Check package.json test scripts
      try {
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
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

  private async testConfigManager(): Promise<void> {
    const testConfig = config.get('NODE_ENV') || 'test';
    if (!testConfig) {
      throw new Error('Config manager not working');
    }
  }

  private async testLogger(): Promise<void> {
    try {
      logger.info('Test log message');
      logger.debug('Debug test');
    } catch (error) {
      throw new Error('Logger not working');
    }
  }

  private async testEventBus(): Promise<void> {
    const { EventBus } = await import('@/core/event-bus');
    const bus = EventBus.getInstance();
    
    let eventReceived = false;
    const unsubscribe = bus.on('test-event', () => {
      eventReceived = true;
    });
    
    bus.emit('test-event', { test: true });
    unsubscribe();
    
    if (!eventReceived) {
      throw new Error('Event bus not working');
    }
  }

  private async testPluginManager(): Promise<void> {
    const { PluginManager } = await import('@/core/plugin-manager');
    const manager = PluginManager.getInstance();
    
    // Just verify it can be instantiated
    if (!manager) {
      throw new Error('Plugin manager not working');
    }
  }

  /**
   * Add a test result
   */
  private addResult(
    name: string,
    status: 'pass' | 'fail' | 'warn',
    message: string,
    details?: string,
    fixable?: boolean
  ): void {
    this.results.push({ name, status, message, details, fixable });
  }

  /**
   * Display results and attempt auto-fix if enabled
   */
  private async displayResults(): Promise<boolean> {
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
  private async attemptAutoFix(): Promise<void> {
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
            
          case 'Database Setup':
            console.log(chalk.blue(`Running database setup...`));
            await this.runCommand('npm run db:setup -- --full');
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
        console.log(chalk.red(`Failed to fix ${result.name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
  }

  /**
   * Run a command with output
   */
  private async runCommand(command: string): Promise<void> {
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
  private async createEnvFromExample(): Promise<void> {
    try {
      const exampleContent = await fs.readFile('.env.example', 'utf-8');
      await fs.writeFile('.env', exampleContent);
      console.log(chalk.green('✓ Created .env from .env.example'));
      console.log(chalk.yellow('Please review and update the .env file with your configuration'));
    } catch (error) {
      console.log(chalk.red('Failed to create .env from example'));
    }
  }
}

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
        logger.error('Test setup failed', { error });
        process.exit(1);
      }
    });

  program.parse();
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error('Setup script failed', { error });
    process.exit(1);
  });
}

export { TestSetupManager };
