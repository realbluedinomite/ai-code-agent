#!/usr/bin/env ts-node
/**
 * Quick Test - Rapid Testing of Key Functionality
 * 
 * Provides fast, focused testing for critical components and functionality
 * without running the full test suite. Ideal for quick validation during development.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';

interface QuickTest {
  name: string;
  description: string;
  patterns: string[];
  critical: boolean;
  timeout?: number;
}

class QuickTester {
  private tests: QuickTest[] = [
    {
      name: 'Core Components',
      description: 'Test essential core components and utilities',
      patterns: ['src/core/**/*.test.ts', 'src/components/__tests__/'],
      critical: true,
      timeout: 10000
    },
    {
      name: 'Input Parser',
      description: 'Test input parsing and entity extraction',
      patterns: ['src/components/input-parser/**/*.test.ts'],
      critical: true,
      timeout: 8000
    },
    {
      name: 'Planner',
      description: 'Test planning and task breakdown logic',
      patterns: ['src/components/planner/**/*.test.ts'],
      critical: true,
      timeout: 8000
    },
    {
      name: 'Implementer',
      description: 'Test code generation and implementation',
      patterns: ['src/components/implementer/**/*.test.ts'],
      critical: true,
      timeout: 10000
    },
    {
      name: 'Reviewer',
      description: 'Test code review and validation',
      patterns: ['src/components/reviewer/**/*.test.ts'],
      critical: true,
      timeout: 8000
    },
    {
      name: 'Project Analyzer',
      description: 'Test project analysis and dependency tracking',
      patterns: ['src/components/project-analyzer/**/*.test.ts'],
      critical: false,
      timeout: 12000
    },
    {
      name: 'Database Models',
      description: 'Test database models and queries',
      patterns: ['src/database/**/model.test.ts'],
      critical: true,
      timeout: 8000
    },
    {
      name: 'AI Providers',
      description: 'Test AI provider integrations',
      patterns: ['src/providers/**/*provider*.test.ts'],
      critical: true,
      timeout: 10000
    },
    {
      name: 'Orchestrator',
      description: 'Test workflow orchestration',
      patterns: ['src/orchestrator/**/*.test.ts'],
      critical: true,
      timeout: 12000
    },
    {
      name: 'Integration Tests',
      description: 'Test component integration',
      patterns: ['tests/integration/**/*.test.ts'],
      critical: false,
      timeout: 15000
    }
  ];

  private spinner: any = null;
  private results: Array<{
    test: QuickTest;
    success: boolean;
    duration: number;
    error?: string;
  }> = [];

  private printHeader(title: string) {
    const width = process.stdout.columns || 80;
    const padding = Math.floor((width - title.length - 4) / 2);
    
    console.log(chalk.cyan('='.repeat(padding) + ' ' + title + ' ' + '='.repeat(padding)));
    console.log('');
  }

  private printStatus(name: string, status: 'success' | 'error' | 'running', details?: string) {
    const colors = {
      success: chalk.green,
      error: chalk.red,
      running: chalk.blue
    };

    const icons = {
      success: '✓',
      error: '✗',
      running: '⟳'
    };

    const color = colors[status];
    const icon = icons[status];
    
    console.log(`${icon} ${chalk.white(name)}`);
    if (details) {
      console.log(chalk.gray(`  ${details}`));
    }
  }

  private async runJestTest(pattern: string, timeout: number = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const args = [
        'jest',
        pattern,
        '--config=jest.config.ts',
        '--passWithNoTests',
        '--testTimeout=5000',
        '--runInBand',
        '--silent'
      ];

      const jest = spawn('npx', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        jest.kill('SIGTERM');
        resolve(false);
      }, timeout);

      jest.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve(code === 0);
      });

      jest.on('error', () => {
        clearTimeout(timeoutId);
        resolve(false);
      });
    });
  }

  private async checkTestFilesExist(patterns: string[]): Promise<number> {
    let count = 0;
    
    for (const pattern of patterns) {
      // Simple file existence check
      if (pattern.includes('*')) {
        // Handle wildcards by scanning directories
        const parts = pattern.split('/');
        const filePattern = parts.pop();
        const dirPattern = parts.join('/');
        
        // Check if pattern points to existing directory
        if (fs.existsSync(dirPattern)) {
          const files = fs.readdirSync(dirPattern);
          const matching = files.filter(f => {
            if (filePattern?.includes('*')) {
              const regex = new RegExp(filePattern.replace('*', '.*'));
              return regex.test(f);
            }
            return f.endsWith('.test.ts');
          });
          count += matching.length;
        }
      } else {
        if (fs.existsSync(pattern)) {
          count++;
        }
      }
    }
    
    return count;
  }

  private async runQuickTest(test: QuickTest): Promise<{
    success: boolean;
    duration: number;
    error?: string;
  }> {
    const startTime = Date.now();
    this.printStatus(test.name, 'running', test.description);

    try {
      // Check if test files exist
      const fileCount = await this.checkTestFilesExist(test.patterns);
      
      if (fileCount === 0) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: 'No test files found'
        };
      }

      // Run tests for each pattern
      let allPassed = true;
      let errors: string[] = [];

      for (const pattern of test.patterns) {
        const passed = await this.runJestTest(pattern, test.timeout);
        if (!passed) {
          allPassed = false;
          errors.push(`Failed pattern: ${pattern}`);
        }
      }

      const duration = Date.now() - startTime;

      if (allPassed) {
        this.printStatus(test.name, 'success', `${fileCount} tests passed in ${duration}ms`);
      } else {
        this.printStatus(test.name, 'error', errors.join(', '));
      }

      return {
        success: allPassed,
        duration,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

    } catch (error: any) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async runAllQuickTests(includeOptional: boolean = false) {
    console.clear();
    this.printHeader('Quick Test Suite');

    const testsToRun = includeOptional 
      ? this.tests 
      : this.tests.filter(t => t.critical);

    const total = testsToRun.length;
    let completed = 0;
    let passed = 0;
    let failed = 0;

    console.log(chalk.white(`Running ${total} test suites...`));
    console.log('');

    // Progress indicator
    const progressInterval = setInterval(() => {
      const progress = Math.floor((completed / total) * 100);
      this.spinner = ora(`Progress: ${progress}%`).start();
    }, 500);

    for (const test of testsToRun) {
      const result = await this.runQuickTest(test);
      this.results.push({ test, ...result });
      
      completed++;
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }

      // Small delay between tests to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    clearInterval(progressInterval);
    if (this.spinner) {
      this.spinner.stop();
    }

    console.log('');
    this.printHeader('Quick Test Summary');

    console.log(chalk.white(`Total Test Suites: ${chalk.cyan(total)}`));
    console.log(chalk.white(`Passed: ${chalk.green(passed)}`));
    console.log(chalk.white(`Failed: ${chalk.red(failed)}`));
    console.log(chalk.white(`Success Rate: ${chalk.cyan(((passed / total) * 100).toFixed(1))}%`));
    console.log('');

    // Detailed results
    if (failed > 0) {
      console.log(chalk.red('Failed Test Suites:'));
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(chalk.red(`  ✗ ${r.test.name}`));
          if (r.error) {
            console.log(chalk.red(`    ${r.error}`));
          }
        });
      console.log('');
    }

    // Performance summary
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(chalk.white(`Total Duration: ${chalk.cyan(totalDuration)}ms`));
    console.log(chalk.white(`Average Duration: ${chalk.cyan((totalDuration / total).toFixed(0)}ms per suite`));
    console.log('');

    return failed === 0;
  }

  private async runSpecificTest(testName: string) {
    const test = this.tests.find(t => 
      t.name.toLowerCase().includes(testName.toLowerCase()) ||
      testName.toLowerCase().includes(t.name.toLowerCase())
    );

    if (!test) {
      console.log(chalk.red(`Test "${testName}" not found.`));
      console.log(chalk.yellow('Available tests:'));
      this.tests.forEach(t => {
        console.log(chalk.cyan(`  - ${t.name}`));
      });
      return false;
    }

    console.clear();
    this.printHeader(`Quick Test: ${test.name}`);

    const result = await this.runQuickTest(test);
    
    console.log('');
    console.log(chalk.white(`Status: ${result.success ? chalk.green('PASSED') : chalk.red('FAILED')}`));
    console.log(chalk.white(`Duration: ${chalk.cyan(result.duration)}ms`));
    
    if (result.error) {
      console.log(chalk.red(`Error: ${result.error}`));
    }

    return result.success;
  }

  private async listTests() {
    console.clear();
    this.printHeader('Available Quick Tests');

    this.tests.forEach((test, index) => {
      const critical = test.critical ? chalk.red('[CRITICAL]') : chalk.gray('[OPTIONAL]');
      console.log(chalk.cyan(`${index + 1}. `) + chalk.white(`${test.name} ${critical}`));
      console.log(chalk.gray(`   ${test.description}`));
      console.log('');
    });
  }

  private async runSmokeTest() {
    console.clear();
    this.printHeader('Smoke Test');

    // Run only the most critical tests
    const criticalTests = this.tests.filter(t => t.critical).slice(0, 3);
    
    console.log(chalk.white('Running smoke test (first 3 critical components)...'));
    console.log('');

    let allPassed = true;

    for (const test of criticalTests) {
      const result = await this.runQuickTest(test);
      if (!result.success) {
        allPassed = false;
      }
    }

    console.log('');
    this.printHeader('Smoke Test Result');
    
    if (allPassed) {
      console.log(chalk.green('✓ Smoke test passed! Core functionality is working.'));
    } else {
      console.log(chalk.red('✗ Smoke test failed! Some core components are not working.'));
    }

    return allPassed;
  }

  async run(args: string[]) {
    const command = args[0] || 'all';

    switch (command.toLowerCase()) {
      case 'all':
        await this.runAllQuickTests(false);
        break;

      case 'all-with-optional':
        await this.runAllQuickTests(true);
        break;

      case 'list':
        await this.listTests();
        break;

      case 'smoke':
        await this.runSmokeTest();
        break;

      case 'test':
        const testName = args[1];
        if (!testName) {
          console.log(chalk.red('Please specify a test name: npm run quick-test test <test-name>'));
          console.log(chalk.yellow('Available tests:'));
          this.tests.forEach(t => {
            console.log(chalk.cyan(`  - ${t.name}`));
          });
          process.exit(1);
        }
        const success = await this.runSpecificTest(testName);
        process.exit(success ? 0 : 1);

      case 'help':
      default:
        console.log(chalk.white('Quick Test Usage:'));
        console.log('');
        console.log(chalk.cyan('npm run quick-test [command]'));
        console.log('');
        console.log(chalk.white('Commands:'));
        console.log(chalk.cyan('  all              ') + chalk.white('Run all critical tests (default)'));
        console.log(chalk.cyan('  all-with-optional ') + chalk.white('Run all tests including optional ones'));
        console.log(chalk.cyan('  smoke            ') + chalk.white('Run smoke test (core functionality)'));
        console.log(chalk.cyan('  test <name>      ') + chalk.white('Run specific test by name'));
        console.log(chalk.cyan('  list             ') + chalk.white('List all available tests'));
        console.log(chalk.cyan('  help             ') + chalk.white('Show this help message'));
        console.log('');
        console.log(chalk.white('Examples:'));
        console.log(chalk.gray('  npm run quick-test'));
        console.log(chalk.gray('  npm run quick-test smoke'));
        console.log(chalk.gray('  npm run quick-test test "Core Components"'));
        console.log(chalk.gray('  npm run quick-test list'));
        break;
    }
  }
}

// Run quick test
if (require.main === module) {
  const args = process.argv.slice(2);
  const tester = new QuickTester();
  
  tester.run(args).catch(error => {
    console.error(chalk.red(`Quick test error: ${error.message}`));
    process.exit(1);
  });
}

export default QuickTester;
