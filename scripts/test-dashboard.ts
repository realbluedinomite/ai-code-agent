#!/usr/bin/env ts-node
/**
 * Testing Dashboard - Interactive Testing Interface
 * 
 * Provides a comprehensive, interactive testing experience with:
 * - Real-time progress tracking
 * - Visual test result display
 * - Interactive test selection
 * - Coverage visualization
 * - Performance metrics
 */

import * as readline from 'readline';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';

// Types and interfaces
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration: number;
  filePath: string;
  error?: string;
}

interface TestSuite {
  name: string;
  path: string;
  results: TestResult[];
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
}

interface CoverageReport {
  total: {
    lines: { total: number; covered: number; skipped: number; pct: number };
    functions: { total: number; covered: number; skipped: number; pct: number };
    statements: { total: number; covered: number; skipped: number; pct: number };
    branches: { total: number; covered: number; skipped: number; pct: number };
  };
  files: Array<{
    path: string;
    lines: { total: number; covered: number; skipped: number; pct: number };
    functions: { total: number; covered: number; skipped: number; pct: number };
    statements: { total: number; covered: number; skipped: number; pct: number };
    branches: { total: number; covered: number; skipped: number; pct: number };
  }>;
}

class TestDashboard {
  private rl: readline.Interface;
  private currentSuite: TestSuite | null = null;
  private results: TestResult[] = [];
  private spinner: any = null;
  private startTime: number = 0;
  private lastOutput: string = '';

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.setupConsoleHandlers();
  }

  private setupConsoleHandlers() {
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nTest run interrupted by user.'));
      if (this.spinner) {
        this.spinner.stop();
      }
      process.exit(0);
    });
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private clearLine() {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  private printHeader(title: string) {
    const width = process.stdout.columns || 80;
    const padding = Math.floor((width - title.length - 4) / 2);
    
    console.log(chalk.cyan('='.repeat(padding) + ' ' + title + ' ' + '='.repeat(padding)));
    console.log('');
  }

  private printTestResult(result: TestResult) {
    const status = {
      passed: chalk.green('✓'),
      failed: chalk.red('✗'),
      pending: chalk.yellow('○'),
      skipped: chalk.gray('⊝')
    };

    const color = {
      passed: chalk.green,
      failed: chalk.red,
      pending: chalk.yellow,
      skipped: chalk.gray
    };

    const icon = status[result.status];
    const colorFn = color[result.status];
    const duration = chalk.gray(`(${result.duration}ms)`);

    console.log(`${icon} ${colorFn(result.name)} ${duration}`);

    if (result.error) {
      console.log(chalk.red(`  ${result.error}`));
    }
  }

  private printProgressBar(current: number, total: number, label: string) {
    const width = 40;
    const progress = Math.floor((current / total) * width);
    const bar = '█'.repeat(progress) + '░'.repeat(width - progress);
    
    this.clearLine();
    console.log(`${label}: [${bar}] ${current}/${total} (${Math.floor((current / total) * 100)}%)`);
  }

  private async showMainMenu(): Promise<string> {
    console.clear();
    this.printHeader('AI Code Agent Testing Dashboard');

    console.log(chalk.white('Select testing mode:'));
    console.log('');
    console.log(chalk.cyan('1. ') + chalk.white('Run All Tests'));
    console.log(chalk.cyan('2. ') + chalk.white('Run Unit Tests'));
    console.log(chalk.cyan('3. ') + chalk.white('Run Integration Tests'));
    console.log(chalk.cyan('4. ') + chalk.white('Run End-to-End Tests'));
    console.log(chalk.cyan('5. ') + chalk.white('Run Tests with Coverage'));
    console.log(chalk.cyan('6. ') + chalk.white('Run Tests in Watch Mode'));
    console.log(chalk.cyan('7. ') + chalk.white('Run Performance Tests'));
    console.log(chalk.cyan('8. ') + chalk.white('Debug Specific Test'));
    console.log(chalk.cyan('9. ') + chalk.white('Test Database Setup'));
    console.log(chalk.cyan('10. ') + chalk.white('Custom Test Pattern'));
    console.log(chalk.cyan('11. ') + chalk.white('View Test History'));
    console.log(chalk.cyan('0. ') + chalk.white('Exit'));
    console.log('');

    const choice = await this.prompt(chalk.yellow('Enter your choice (0-11): '));
    return choice;
  }

  private async runJestTest(args: string[], options: any = {}): Promise<boolean> {
    return new Promise((resolve) => {
      const jestArgs = [
        'jest',
        ...args,
        '--config=jest.config.ts',
        '--passWithNoTests',
        '--testTimeout=30000'
      ];

      if (options.watch) {
        jestArgs.push('--watch');
      }
      if (options.coverage) {
        jestArgs.push('--coverage');
      }
      if (options.verbose) {
        jestArgs.push('--verbose');
      }
      if (options.ci) {
        jestArgs.push('--ci', '--watchAll=false');
      }
      if (options.pattern) {
        jestArgs.push('--testNamePattern', options.pattern);
      }

      this.spinner = ora('Running tests...').start();

      const jest = spawn('npx', jestArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      let errorOutput = '';

      jest.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.parseTestOutput(text);
        this.displayProgress(text);
      });

      jest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      jest.on('close', (code) => {
        if (this.spinner) {
          this.spinner.stop();
        }

        if (code === 0) {
          console.log(chalk.green('\n✓ All tests passed!'));
          resolve(true);
        } else {
          console.log(chalk.red(`\n✗ Tests failed with exit code ${code}`));
          if (errorOutput) {
            console.log(chalk.red(errorOutput));
          }
          resolve(false);
        }
      });
    });
  }

  private parseTestOutput(output: string) {
    // Parse Jest output to extract test results
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match test pass/fail patterns
      const passMatch = line.match(/✓ (.+?) \((\d+)ms\)/);
      const failMatch = line.match(/✗ (.+?) \((\d+)ms\)/);
      const skipMatch = line.match(/⊝ (.+?)/);

      if (passMatch) {
        this.results.push({
          name: passMatch[1],
          status: 'passed',
          duration: parseInt(passMatch[2]),
          filePath: ''
        });
      } else if (failMatch) {
        this.results.push({
          name: failMatch[1],
          status: 'failed',
          duration: parseInt(failMatch[2]),
          filePath: '',
          error: 'Test failed'
        });
      } else if (skipMatch) {
        this.results.push({
          name: skipMatch[1],
          status: 'skipped',
          duration: 0,
          filePath: ''
        });
      }
    }
  }

  private displayProgress(output: string) {
    // Extract progress information from Jest output
    const progressMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (progressMatch) {
      const passed = parseInt(progressMatch[1]);
      const total = parseInt(progressMatch[2]);
      this.printProgressBar(passed, total, 'Tests');
    }
  }

  private async displayResults(success: boolean) {
    console.log('\n');
    this.printHeader('Test Results Summary');

    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    console.log(chalk.white(`Total Tests: ${chalk.cyan(total)}`));
    console.log(chalk.white(`Passed: ${chalk.green(passed)}`));
    console.log(chalk.white(`Failed: ${chalk.red(failed)}`));
    console.log(chalk.white(`Skipped: ${chalk.gray(skipped)}`));
    console.log('');

    // Display failed tests in detail
    if (failed > 0) {
      console.log(chalk.red('Failed Tests:'));
      this.results
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(chalk.red(`  ✗ ${result.name}`));
          if (result.error) {
            console.log(chalk.red(`    ${result.error}`));
          }
        });
      console.log('');
    }

    // Performance metrics
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(chalk.white(`Total Duration: ${chalk.cyan(totalDuration)}ms`));
    console.log('');

    // Continue prompt
    await this.prompt(chalk.yellow('Press Enter to continue...'));
  }

  private async runQuickTest() {
    console.clear();
    this.printHeader('Quick Test');

    const criticalTests = [
      'src/components/**/__tests__/*.test.ts',
      'src/core/**/*.test.ts',
      'tests/unit/**'
    ];

    console.log(chalk.white('Running critical tests...'));
    
    const success = await this.runJestTest(criticalTests, { verbose: true });
    await this.displayResults(success);
  }

  private async runCoverage() {
    console.clear();
    this.printHeader('Coverage Report');

    console.log(chalk.white('Generating coverage report...'));
    
    const success = await this.runJestTest(['tests'], { coverage: true });
    
    // Display coverage summary
    const coverageFile = path.join(process.cwd(), 'coverage/coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      this.displayCoverageReport(coverageData);
    }

    await this.displayResults(success);
  }

  private displayCoverageReport(coverage: CoverageReport) {
    console.log('\n');
    this.printHeader('Coverage Summary');

    const { total } = coverage;
    
    console.log(chalk.white('Overall Coverage:'));
    console.log(chalk.white(`  Lines: ${chalk.cyan(total.lines.pct.toFixed(1))}%`));
    console.log(chalk.white(`  Functions: ${chalk.cyan(total.functions.pct.toFixed(1))}%`));
    console.log(chalk.white(`  Statements: ${chalk.cyan(total.statements.pct.toFixed(1))}%`));
    console.log(chalk.white(`  Branches: ${chalk.cyan(total.branches.pct.toFixed(1))}%`));
    console.log('');

    // Coverage bars
    const printCoverageBar = (label: string, pct: number) => {
      const width = 30;
      const bars = Math.floor((pct / 100) * width);
      const bar = '█'.repeat(bars) + '░'.repeat(width - bars);
      const color = pct >= 80 ? chalk.green : pct >= 60 ? chalk.yellow : chalk.red;
      console.log(`${color(bar)} ${pct.toFixed(1)}% ${label}`);
    };

    printCoverageBar('Lines', total.lines.pct);
    printCoverageBar('Functions', total.functions.pct);
    printCoverageBar('Statements', total.statements.pct);
    printCoverageBar('Branches', total.branches.pct);
    console.log('');
  }

  private async interactiveTest() {
    console.clear();
    this.printHeader('Interactive Test Runner');

    // Scan for test files
    const testFiles = this.findTestFiles();
    
    if (testFiles.length === 0) {
      console.log(chalk.yellow('No test files found.'));
      await this.prompt(chalk.yellow('Press Enter to continue...'));
      return;
    }

    console.log(chalk.white('Available test files:'));
    testFiles.forEach((file, index) => {
      console.log(chalk.cyan(`${index + 1}. `) + chalk.white(file));
    });
    console.log(chalk.cyan('0. ') + chalk.white('Run all tests'));
    console.log('');

    const choice = await this.prompt(chalk.yellow('Select test to run: '));
    const index = parseInt(choice);

    if (index === 0 || isNaN(index)) {
      await this.runJestTest(['tests'], { verbose: true });
    } else if (index > 0 && index <= testFiles.length) {
      const selectedFile = testFiles[index - 1];
      await this.runJestTest([selectedFile], { verbose: true });
    }

    await this.displayResults(true);
  }

  private findTestFiles(): string[] {
    const testFiles: string[] = [];
    const testPatterns = [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'src/**/__tests__/*.test.ts'
    ];

    for (const pattern of testPatterns) {
      // Simple glob-like matching
      const parts = pattern.split('/');
      let currentDir = process.cwd();

      for (const part of parts) {
        if (part.includes('*')) {
          // Handle wildcards
          const dirs = fs.readdirSync(currentDir);
          for (const dir of dirs) {
            const dirPath = path.join(currentDir, dir);
            if (fs.statSync(dirPath).isDirectory()) {
              const subFiles = fs.readdirSync(dirPath);
              subFiles.forEach(file => {
                if (file.endsWith('.test.ts')) {
                  testFiles.push(path.join(dirPath, file));
                }
              });
            }
          }
          break;
        } else {
          currentDir = path.join(currentDir, part);
        }
      }
    }

    return testFiles;
  }

  private async setupTestDatabase() {
    console.clear();
    this.printHeader('Test Database Setup');

    const spinner = ora('Setting up test database...').start();

    try {
      const { execSync } = require('child_process');
      
      // Run database setup
      execSync('npm run test:db:setup', { stdio: 'inherit' });
      
      spinner.succeed('Test database setup completed successfully!');
      
    } catch (error) {
      spinner.fail('Database setup failed');
      console.log(chalk.red(`Error: ${error.message}`));
    }

    await this.prompt(chalk.yellow('Press Enter to continue...'));
  }

  private async viewTestHistory() {
    console.clear();
    this.printHeader('Test History');

    const historyFile = path.join(process.cwd(), 'test-history.json');
    
    if (fs.existsSync(historyFile)) {
      const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      
      console.log(chalk.white('Recent test runs:'));
      console.log('');
      
      history.slice(0, 10).forEach((run: any, index: number) => {
        const date = new Date(run.timestamp).toLocaleString();
        const status = run.success ? chalk.green('✓') : chalk.red('✗');
        const duration = chalk.gray(`${run.duration}ms`);
        
        console.log(`${status} ${chalk.white(date)} - ${chalk.cyan(run.type)} ${duration}`);
        if (run.details) {
          console.log(chalk.gray(`  ${run.details}`));
        }
        console.log('');
      });
    } else {
      console.log(chalk.yellow('No test history found.'));
    }

    await this.prompt(chalk.yellow('Press Enter to continue...'));
  }

  private saveTestHistory(type: string, success: boolean, duration: number, details?: string) {
    const historyFile = path.join(process.cwd(), 'test-history.json');
    let history: any[] = [];

    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }

    history.unshift({
      timestamp: Date.now(),
      type,
      success,
      duration,
      details
    });

    // Keep only last 50 entries
    history = history.slice(0, 50);

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }

  async run() {
    this.startTime = Date.now();

    try {
      while (true) {
        const choice = await this.showMainMenu();
        
        switch (choice) {
          case '1':
            // Run All Tests
            const allSuccess = await this.runJestTest(['tests'], { verbose: true });
            this.saveTestHistory('All Tests', allSuccess, Date.now() - this.startTime);
            await this.displayResults(allSuccess);
            break;

          case '2':
            // Run Unit Tests
            const unitSuccess = await this.runJestTest(['tests/unit'], { verbose: true });
            this.saveTestHistory('Unit Tests', unitSuccess, Date.now() - this.startTime);
            await this.displayResults(unitSuccess);
            break;

          case '3':
            // Run Integration Tests
            const integrationSuccess = await this.runJestTest(['tests/integration'], { verbose: true });
            this.saveTestHistory('Integration Tests', integrationSuccess, Date.now() - this.startTime);
            await this.displayResults(integrationSuccess);
            break;

          case '4':
            // Run E2E Tests
            const e2eSuccess = await this.runJestTest(['tests/e2e'], { verbose: true });
            this.saveTestHistory('E2E Tests', e2eSuccess, Date.now() - this.startTime);
            await this.displayResults(e2eSuccess);
            break;

          case '5':
            // Run Tests with Coverage
            await this.runCoverage();
            this.saveTestHistory('Coverage Tests', true, Date.now() - this.startTime);
            break;

          case '6':
            // Run Tests in Watch Mode
            await this.runJestTest(['tests'], { watch: true });
            break;

          case '7':
            // Run Performance Tests
            const perfSuccess = await this.runJestTest(['tests'], { 
              verbose: true,
              pattern: 'performance|perf'
            });
            this.saveTestHistory('Performance Tests', perfSuccess, Date.now() - this.startTime);
            await this.displayResults(perfSuccess);
            break;

          case '8':
            // Debug Specific Test
            const file = await this.prompt(chalk.yellow('Enter test file path: '));
            if (file) {
              const debugSuccess = await this.runJestTest([file], { verbose: true, debug: true });
              this.saveTestHistory('Debug Test', debugSuccess, Date.now() - this.startTime, `File: ${file}`);
              await this.displayResults(debugSuccess);
            }
            break;

          case '9':
            // Test Database Setup
            await this.setupTestDatabase();
            break;

          case '10':
            // Custom Test Pattern
            const pattern = await this.prompt(chalk.yellow('Enter test pattern: '));
            if (pattern) {
              const customSuccess = await this.runJestTest(['tests'], { pattern });
              this.saveTestHistory('Custom Pattern', customSuccess, Date.now() - this.startTime, `Pattern: ${pattern}`);
              await this.displayResults(customSuccess);
            }
            break;

          case '11':
            // View Test History
            await this.viewTestHistory();
            break;

          case '0':
            console.log(chalk.green('\nThanks for using the Testing Dashboard!'));
            process.exit(0);

          default:
            console.log(chalk.red('\nInvalid choice. Please try again.'));
            await this.prompt(chalk.yellow('Press Enter to continue...'));
        }

        // Reset for next run
        this.results = [];
        this.startTime = Date.now();
      }
    } catch (error) {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run the dashboard
if (require.main === module) {
  const dashboard = new TestDashboard();
  dashboard.run().catch(error => {
    console.error(chalk.red(`Dashboard error: ${error.message}`));
    process.exit(1);
  });
}

export default TestDashboard;
