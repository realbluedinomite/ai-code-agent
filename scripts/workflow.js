#!/usr/bin/env node

/**
 * Development Workflow Automation Script
 * 
 * This script automates common development workflows including:
 * - Project setup and initialization
 * - Development environment management
 * - Quality assurance workflows
 * - Maintenance tasks
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const ora = require('ora');

class DevelopmentWorkflow {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
    };
  }

  log(message, color = 'reset') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  runCommand(command, options = {}) {
    try {
      const { cwd, env } = options;
      const result = execSync(command, { 
        cwd, 
        env, 
        stdio: options.silent ? 'pipe' : 'inherit',
        encoding: 'utf-8'
      });
      return { success: true, output: result };
    } catch (error) {
      return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
    }
  }

  async runAsyncCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn('sh', ['-c', command], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: options.silent ? 'pipe' : 'inherit'
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    this.log('🔍 Checking Prerequisites...', 'cyan');
    const spinner = ora('Checking Node.js version...').start();
    
    const nodeVersion = process.version;
    const requiredVersion = 'v18.0.0';
    
    if (this.compareVersions(nodeVersion, requiredVersion) < 0) {
      spinner.fail(`Node.js ${requiredVersion} or higher is required. Current: ${nodeVersion}`);
      process.exit(1);
    }
    
    spinner.succeed(`Node.js version: ${nodeVersion}`);
    
    spinner.text = 'Checking npm version...';
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    spinner.succeed(`npm version: ${npmVersion}`);
    
    spinner.text = 'Checking Git...';
    try {
      execSync('git --version', { stdio: 'ignore' });
      spinner.succeed('Git is available');
    } catch {
      spinner.fail('Git is not installed or not in PATH');
      process.exit(1);
    }
    
    spinner.text = 'Checking if in Git repository...';
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      spinner.succeed('Git repository detected');
    } catch {
      spinner.warn('Not in a Git repository. Initialize with: git init');
    }
  }

  async setupProject() {
    this.log('🚀 Setting Up Development Environment...', 'cyan');
    const spinner = ora('Installing dependencies...').start();
    
    const installResult = this.runCommand('npm install');
    if (!installResult.success) {
      spinner.fail('Failed to install dependencies');
      process.exit(1);
    }
    spinner.succeed('Dependencies installed');
    
    spinner.text = 'Setting up Git hooks...';
    const hooksResult = this.runCommand('npm run git:hooks');
    if (hooksResult.success) {
      spinner.succeed('Git hooks configured');
    } else {
      spinner.warn('Failed to setup Git hooks (this is optional)');
    }
    
    spinner.text = 'Setting up test database...';
    const testDbResult = this.runCommand('npm run test:db:setup');
    if (testDbResult.success) {
      spinner.succeed('Test database configured');
    } else {
      spinner.warn('Test database setup failed (check PostgreSQL connection)');
    }
    
    spinner.text = 'Running initial validation...';
    const validationResult = this.runCommand('npm run validate');
    if (validationResult.success) {
      spinner.succeed('Initial validation passed');
    } else {
      spinner.warn('Initial validation failed (this might be expected for new projects)');
    }
    
    this.log('\n✅ Project setup complete!', 'green');
    this.log('\nNext steps:', 'yellow');
    this.log('  npm run dev          - Start development server');
    this.log('  npm run test         - Run tests');
    this.log('  npm run validate     - Validate code quality');
  }

  async validateWorkflow() {
    this.log('🔍 Validating Development Workflow...', 'cyan');
    
    const checks = [
      { name: 'TypeScript compilation', command: 'npm run type-check' },
      { name: 'Linting', command: 'npm run lint' },
      { name: 'Code formatting', command: 'npm run format:check' },
      { name: 'Unit tests', command: 'npm run test:unit' },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const check of checks) {
      const spinner = ora(`Running ${check.name}...`).start();
      const result = this.runCommand(check.command);
      
      if (result.success) {
        spinner.succeed(check.name);
        passed++;
      } else {
        spinner.fail(`${check.name} failed`);
        failed++;
      }
    }
    
    this.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`, 
             failed === 0 ? 'green' : failed > 2 ? 'red' : 'yellow');
    
    if (failed === 0) {
      this.log('✅ All validation checks passed!', 'green');
    } else {
      this.log('❌ Some validation checks failed. Please review the errors above.', 'red');
      process.exit(1);
    }
  }

  async startDevelopment() {
    this.log('🚀 Starting Development Environment...', 'cyan');
    
    try {
      await this.runAsyncCommand('npm run dev:full');
    } catch (error) {
      this.log(`Development server stopped: ${error.message}`, 'yellow');
    }
  }

  async runMaintenance() {
    this.log('🧹 Running Maintenance Tasks...', 'cyan');
    
    const tasks = [
      { name: 'Clean build artifacts', command: 'npm run clean' },
      { name: 'Update dependencies', command: 'npm run deps:update' },
      { name: 'Security audit', command: 'npm run security:audit' },
      { name: 'Run full validation', command: 'npm run validate' },
    ];
    
    for (const task of tasks) {
      const spinner = ora(`${task.name}...`).start();
      const result = this.runCommand(task.command);
      
      if (result.success) {
        spinner.succeed(task.name);
      } else {
        spinner.warn(`${task.name} failed: ${result.error}`);
      }
    }
    
    this.log('✅ Maintenance tasks completed', 'green');
  }

  async resetEnvironment() {
    this.log('🔄 Resetting Development Environment...', 'yellow');
    
    const spinner = ora('Cleaning everything...').start();
    const cleanResult = this.runCommand('npm run clean:all');
    
    if (!cleanResult.success) {
      spinner.fail('Failed to clean environment');
      process.exit(1);
    }
    
    spinner.text = 'Reinstalling dependencies...';
    const installResult = this.runCommand('npm install');
    if (!installResult.success) {
      spinner.fail('Failed to reinstall dependencies');
      process.exit(1);
    }
    
    spinner.text = 'Setting up development environment...';
    const setupResult = this.runCommand('npm run workflow:install');
    if (!setupResult.success) {
      spinner.fail('Failed to setup development environment');
      process.exit(1);
    }
    
    spinner.succeed('Environment reset complete');
    this.log('✅ Development environment has been reset!', 'green');
  }

  async generateStatusReport() {
    this.log('📊 Generating Status Report...', 'cyan');
    
    const report = {
      timestamp: new Date().toISOString(),
      project: {},
      system: {},
      git: {},
      dependencies: {},
      tests: {},
      codeQuality: {}
    };
    
    // Project info
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      report.project = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description
      };
    } catch (error) {
      report.project.error = 'Could not read package.json';
    }
    
    // System info
    report.system = {
      nodeVersion: process.version,
      npmVersion: execSync('npm --version', { encoding: 'utf-8' }).trim(),
      platform: process.platform,
      arch: process.arch
    };
    
    // Git info
    try {
      const gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      report.git = {
        branch: gitBranch,
        hasChanges: gitStatus.length > 0,
        changesCount: gitStatus.split('\n').filter(line => line.trim()).length
      };
    } catch (error) {
      report.git.error = 'Not in a Git repository';
    }
    
    // Test status
    const testResult = this.runCommand('npm test -- --passWithNoTests --silent');
    report.tests = {
      canRun: testResult.success,
      lastRun: testResult.success ? 'Success' : 'Failed'
    };
    
    // Code quality
    const lintResult = this.runCommand('npm run lint --silent');
    const typeCheckResult = this.runCommand('npm run type-check --silent');
    
    report.codeQuality = {
      linting: lintResult.success ? 'Clean' : 'Issues found',
      typeChecking: typeCheckResult.success ? 'Clean' : 'Issues found'
    };
    
    // Print report
    this.log('\n📊 PROJECT STATUS REPORT', 'cyan');
    this.log('=' * 50, 'cyan');
    
    this.log(`\n📦 Project: ${report.project.name} v${report.project.version}`, 'blue');
    if (report.project.description) {
      this.log(`   ${report.project.description}`, 'blue');
    }
    
    this.log(`\n🖥️  System:`, 'blue');
    this.log(`   Node.js: ${report.system.nodeVersion}`, 'blue');
    this.log(`   npm: ${report.system.npmVersion}`, 'blue');
    this.log(`   Platform: ${report.system.platform} (${report.system.arch})`, 'blue');
    
    this.log(`\n🌿 Git:`, 'blue');
    if (report.git.error) {
      this.log(`   ${report.git.error}`, 'yellow');
    } else {
      this.log(`   Branch: ${report.git.branch}`, 'blue');
      this.log(`   Changes: ${report.git.hasChanges ? report.git.changesCount + ' files' : 'Clean'}`, 'blue');
    }
    
    this.log(`\n🧪 Tests:`, 'blue');
    this.log(`   Status: ${report.tests.lastRun}`, report.tests.canRun ? 'green' : 'red');
    
    this.log(`\n✨ Code Quality:`, 'blue');
    this.log(`   Linting: ${report.codeQuality.linting}`, report.codeQuality.linting === 'Clean' ? 'green' : 'red');
    this.log(`   Type Checking: ${report.codeQuality.typeChecking}`, report.codeQuality.typeChecking === 'Clean' ? 'green' : 'red');
    
    this.log('\n' + '=' * 50, 'cyan');
    this.log(`Generated at: ${report.timestamp}`, 'cyan');
  }

  compareVersions(version1, version2) {
    const v1Parts = version1.replace('v', '').split('.').map(Number);
    const v2Parts = version2.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  showHelp() {
    this.log('\n🚀 Development Workflow Automation', 'cyan');
    this.log('Usage: node scripts/workflow.js <command>', 'cyan');
    this.log('\nCommands:', 'yellow');
    this.log('  setup          - Initial project setup');
    this.log('  validate       - Run quality validation');
    this.log('  dev            - Start development environment');
    this.log('  maintenance    - Run maintenance tasks');
    this.log('  reset          - Reset development environment');
    this.log('  status         - Generate status report');
    this.log('  help           - Show this help message');
    this.log('\nExamples:', 'yellow');
    this.log('  node scripts/workflow.js setup', 'green');
    this.log('  node scripts/workflow.js validate', 'green');
    this.log('  node scripts/workflow.js status', 'green');
  }
}

// Main execution
async function main() {
  const workflow = new DevelopmentWorkflow();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'setup':
        await workflow.checkPrerequisites();
        await workflow.setupProject();
        break;
        
      case 'validate':
        await workflow.validateWorkflow();
        break;
        
      case 'dev':
        await workflow.startDevelopment();
        break;
        
      case 'maintenance':
        await workflow.checkPrerequisites();
        await workflow.runMaintenance();
        break;
        
      case 'reset':
        await workflow.resetEnvironment();
        break;
        
      case 'status':
        await workflow.generateStatusReport();
        break;
        
      case 'help':
      case '--help':
      case '-h':
      default:
        workflow.showHelp();
        break;
    }
  } catch (error) {
    workflow.log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DevelopmentWorkflow;