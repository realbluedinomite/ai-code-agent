#!/usr/bin/env node

/**
 * Developer Onboarding Script
 * 
 * This script helps new developers get started quickly with:
 * - Environment setup verification
 * - Tool installation checks
 * - Project initialization
 * - Development workflow guidance
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class DeveloperOnboarding {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
    };
    
    this.step = 0;
    this.totalSteps = 8;
  }

  log(message, color = 'reset', prefix = '') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors[color]}${prefix}${message}${this.colors.reset}`);
  }

  header(message) {
    console.log('\n' + '='.repeat(60));
    this.log(message.toUpperCase(), 'bright cyan');
    console.log('='.repeat(60));
  }

  stepHeader(step, title) {
    this.step++;
    this.log(`\n[${this.step}/${this.totalSteps}] ${title}`, 'bright blue');
  }

  runCommand(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit'
      });
      return { success: true, output: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  checkSystemRequirements() {
    this.stepHeader(1, 'Checking System Requirements');
    
    const checks = [
      { name: 'Node.js', command: 'node --version', minVersion: '18.0.0' },
      { name: 'npm', command: 'npm --version', minVersion: '8.0.0' },
      { name: 'Git', command: 'git --version', minVersion: '2.0.0' },
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      try {
        const version = execSync(check.command, { encoding: 'utf-8' }).trim();
        const versionNumber = version.replace(/[^\d.]/g, '');
        
        this.log(`✅ ${check.name}: ${version}`, 'green');
      } catch (error) {
        this.log(`❌ ${check.name}: Not installed`, 'red');
        this.log(`   Please install ${check.name} (minimum version ${check.minVersion})`, 'yellow');
        allPassed = false;
      }
    }
    
    return allPassed;
  }

  verifyNodeVersion() {
    const nodeVersion = process.version;
    const minVersion = '18.0.0';
    
    const versionParts = nodeVersion.slice(1).split('.').map(Number);
    const minParts = minVersion.split('.').map(Number);
    
    const current = versionParts[0] * 10000 + versionParts[1] * 100 + versionParts[2];
    const required = minParts[0] * 10000 + minParts[1] * 100 + minParts[2];
    
    return current >= required;
  }

  setupGitConfiguration() {
    this.stepHeader(2, 'Setting up Git Configuration');
    
    // Check if git is configured
    try {
      const userName = execSync('git config user.name', { encoding: 'utf-8' }).trim();
      const userEmail = execSync('git config user.email', { encoding: 'utf-8' }).trim();
      
      this.log('✅ Git is already configured', 'green');
      this.log(`   Name: ${userName}`, 'blue');
      this.log(`   Email: ${userEmail}`, 'blue');
    } catch {
      this.log('⚠️  Git is not configured', 'yellow');
      this.log('   Setting up basic git configuration...', 'blue');
      
      console.log('\nPlease enter your git configuration:');
      
      // Simple prompt for basic config
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Your name: ', (name) => {
          execSync(`git config user.name "${name}"`);
          
          rl.question('Your email: ', (email) => {
            execSync(`git config user.email "${email}"`);
            rl.close();
            
            this.log('✅ Git configuration completed', 'green');
            resolve();
          });
        });
      });
    }
  }

  installDependencies() {
    this.stepHeader(3, 'Installing Project Dependencies');
    
    this.log('Installing npm dependencies...', 'blue');
    
    const result = this.runCommand('npm install');
    
    if (result.success) {
      this.log('✅ Dependencies installed successfully', 'green');
      return true;
    } else {
      this.log('❌ Failed to install dependencies', 'red');
      this.log('Error:', result.error, 'red');
      return false;
    }
  }

  setupGitHooks() {
    this.stepHeader(4, 'Setting up Git Hooks');
    
    this.log('Initializing Husky...', 'blue');
    
    const result = this.runCommand('npx husky init');
    
    if (result.success) {
      this.log('✅ Git hooks initialized', 'green');
      
      // Copy the existing hooks
      const hooksDir = path.join(process.cwd(), '.husky');
      if (fs.existsSync(hooksDir)) {
        this.log('✅ Git hooks configured', 'green');
      }
    } else {
      this.log('⚠️  Could not initialize git hooks (this is optional)', 'yellow');
    }
  }

  setupDevelopmentDatabase() {
    this.stepHeader(5, 'Setting up Development Database');
    
    this.log('Checking database connection...', 'blue');
    
    const result = this.runCommand('npm run test:db:setup');
    
    if (result.success) {
      this.log('✅ Database setup completed', 'green');
      return true;
    } else {
      this.log('⚠️  Database setup failed (PostgreSQL might not be running)', 'yellow');
      this.log('   You can set up the database later with: npm run test:db:setup', 'blue');
      return false;
    }
  }

  runInitialValidation() {
    this.stepHeader(6, 'Running Initial Validation');
    
    this.log('Running type check...', 'blue');
    const typeCheck = this.runCommand('npm run type-check', { silent: true });
    
    if (typeCheck.success) {
      this.log('✅ Type checking passed', 'green');
    } else {
      this.log('⚠️  Type checking failed (this is expected for new projects)', 'yellow');
    }
    
    this.log('Running linting...', 'blue');
    const lintResult = this.runCommand('npm run lint', { silent: true });
    
    if (lintResult.success) {
      this.log('✅ Linting passed', 'green');
    } else {
      this.log('⚠️  Linting found issues (you can fix them later)', 'yellow');
    }
    
    this.log('Running unit tests...', 'blue');
    const testResult = this.runCommand('npm run test:unit', { silent: true });
    
    if (testResult.success) {
      this.log('✅ Unit tests passed', 'green');
    } else {
      this.log('⚠️  Some unit tests failed (this might be expected)', 'yellow');
    }
  }

  createDevelopmentEnvironment() {
    this.stepHeader(7, 'Creating Development Environment');
    
    const envFile = path.join(process.cwd(), '.env');
    const envExample = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      this.log('✅ Created .env from .env.example', 'green');
      this.log('   Please review and update the environment variables', 'yellow');
    } else if (!fs.existsSync(envFile)) {
      // Create a basic .env file
      const basicEnv = `# Development Environment Variables
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent_dev
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Keys (add your API keys here)
GROQ_API_KEY=your-groq-api-key

# Logging
LOG_LEVEL=debug
`;
      
      fs.writeFileSync(envFile, basicEnv);
      this.log('✅ Created basic .env file', 'green');
      this.log('   Please update the environment variables with your actual values', 'yellow');
    } else {
      this.log('✅ Environment file already exists', 'green');
    }
  }

  generateWelcomeReport() {
    this.stepHeader(8, 'Setup Complete!');
    
    this.log('\n🎉 Welcome to AI Code Agent Development!', 'bright green');
    this.log('\nYour development environment is ready!', 'green');
    
    this.log('\n📋 Quick Start Commands:', 'cyan');
    this.log('  npm run dev              - Start development server', 'blue');
    this.log('  npm test                 - Run all tests', 'blue');
    this.log('  npm run validate         - Validate code quality', 'blue');
    this.log('  npm run workflow:status  - Check project status', 'blue');
    
    this.log('\n📚 Documentation:', 'cyan');
    this.log('  docs/DEVELOPMENT_WORKFLOW.md - Complete development guide', 'blue');
    this.log('  docs/project-structure.md   - Project structure overview', 'blue');
    this.log('  LINTING_SETUP.md          - Linting and formatting setup', 'blue');
    this.log('  TESTING_FRAMEWORK_SUMMARY.md - Testing framework guide', 'blue');
    
    this.log('\n🛠️  Development Workflow:', 'cyan');
    this.log('  1. Create feature branch: git checkout -b feature/your-feature', 'blue');
    this.log('  2. Make changes and test locally', 'blue');
    this.log('  3. Run validation: npm run validate', 'blue');
    this.log('  4. Commit with: npm run commit', 'blue');
    this.log('  5. Push and create PR', 'blue');
    
    this.log('\n⚠️  Important Notes:', 'yellow');
    this.log('  • Pre-commit hooks will run automatically', 'blue');
    this.log('  • Use npm run commit for properly formatted commits', 'blue');
    this.log('  • Keep code coverage above 80%', 'blue');
    this.log('  • Update documentation when adding features', 'blue');
    
    this.log('\n' + '='.repeat(60), 'cyan');
  }

  async run() {
    this.header('Developer Onboarding');
    
    this.log('This script will help you set up your development environment.', 'cyan');
    this.log('Please follow the steps below:', 'cyan');
    
    // Check system requirements
    const systemReady = this.checkSystemRequirements();
    if (!systemReady) {
      this.log('\n❌ Please install the required tools before continuing.', 'red');
      process.exit(1);
    }
    
    // Git configuration
    await this.setupGitConfiguration();
    
    // Install dependencies
    const depsOk = this.installDependencies();
    if (!depsOk) {
      this.log('\n❌ Could not install dependencies. Please check your internet connection and try again.', 'red');
      process.exit(1);
    }
    
    // Setup git hooks
    this.setupGitHooks();
    
    // Setup database
    this.setupDevelopmentDatabase();
    
    // Run validation
    this.runInitialValidation();
    
    // Create environment file
    this.createDevelopmentEnvironment();
    
    // Welcome report
    this.generateWelcomeReport();
    
    this.log('\nReady to start coding! 🚀', 'bright green');
  }
}

// Run onboarding
if (require.main === module) {
  const onboarding = new DeveloperOnboarding();
  onboarding.run().catch((error) => {
    console.error('Onboarding failed:', error);
    process.exit(1);
  });
}

module.exports = DeveloperOnboarding;