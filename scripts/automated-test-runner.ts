#!/usr/bin/env ts-node
/**
 * Automated Test Runner - Comprehensive Test Execution and Reporting
 * 
 * Provides advanced test automation capabilities including:
 * - Scheduled test execution
 * - Comprehensive reporting (JSON, HTML, XML)
 * - Test history tracking
 * - Performance benchmarking
 * - Parallel test execution
 * - Custom test pipelines
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { format } from 'date-fns';

interface TestConfig {
  name: string;
  command: string;
  patterns: string[];
  timeout?: number;
  retryCount?: number;
  dependencies?: string[];
  env?: Record<string, string>;
  critical: boolean;
  parallel?: boolean;
}

interface TestReport {
  timestamp: string;
  configuration: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
  };
  details: Array<{
    test: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    stdout?: string;
    stderr?: string;
  }>;
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    timestamp: string;
  };
}

class AutomatedTestRunner {
  private reportsDir: string;
  private historyFile: string;
  private isRunning: boolean = false;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'test-reports');
    this.historyFile = path.join(process.cwd(), 'test-history.json');
    
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private printHeader(title: string) {
    const width = process.stdout.columns || 80;
    const padding = Math.floor((width - title.length - 4) / 2);
    
    console.log(chalk.cyan('='.repeat(padding) + ' ' + title + ' ' + '='.repeat(padding)));
    console.log('');
  }

  private async executeJestTest(args: string[], options: any = {}): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    duration: number;
    coverage?: number;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const jestArgs = [
        'jest',
        ...args,
        '--config=jest.config.ts',
        '--passWithNoTests',
        '--testTimeout=30000'
      ];

      if (options.coverage) {
        jestArgs.push('--coverage');
      }
      if (options.verbose) {
        jestArgs.push('--verbose');
      }
      if (options.ci) {
        jestArgs.push('--ci', '--watchAll=false', '--coverage');
      }
      if (options.pattern) {
        jestArgs.push('--testNamePattern', options.pattern);
      }
      if (options.silent) {
        jestArgs.push('--silent');
      }

      const env = {
        ...process.env,
        NODE_ENV: 'test',
        ...options.env
      };

      const jest = spawn('npx', jestArgs, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        env 
      });

      let stdout = '';
      let stderr = '';
      let coverage = 0;

      jest.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;

        // Extract coverage from stdout
        const coverageMatch = text.match(/All files.*?\|\s+([\d.]+)%/);
        if (coverageMatch) {
          coverage = parseFloat(coverageMatch[1]);
        }
      });

      jest.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          success: code === 0,
          stdout,
          stderr,
          duration,
          coverage
        });
      });

      jest.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          duration
        });
      });

      // Timeout handling
      if (options.timeout) {
        setTimeout(() => {
          if (!jest.killed) {
            jest.kill('SIGTERM');
            resolve({
              success: false,
              stdout,
              stderr: 'Test execution timed out',
              duration: Date.now() - startTime
            });
          }
        }, options.timeout);
      }
    });
  }

  private async getTestSummary(stdout: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  }> {
    // Parse Jest output to extract test summary
    const summaryMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed,\s+(\d+)\s+skipped,\s+(\d+)\s+total/);
    
    if (summaryMatch) {
      return {
        passed: parseInt(summaryMatch[1]),
        failed: parseInt(summaryMatch[2]),
        skipped: parseInt(summaryMatch[3]),
        total: parseInt(summaryMatch[4])
      };
    }

    // Fallback parsing
    const failedMatch = stdout.match(/(\d+)\s+failing/);
    const passedMatch = stdout.match(/(\d+)\s+passing/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: 0,
      total: (passedMatch ? parseInt(passedMatch[1]) : 0) + (failedMatch ? parseInt(failedMatch[1]) : 0)
    };
  }

  private async runPreTestChecks(): Promise<boolean> {
    console.log(chalk.yellow('Running pre-test checks...'));
    
    // Check if Jest is installed
    try {
      require.resolve('jest');
      console.log(chalk.green('  ✓ Jest is installed'));
    } catch (error) {
      console.log(chalk.red('  ✗ Jest is not installed'));
      return false;
    }

    // Check test configuration
    const jestConfigPath = path.join(process.cwd(), 'jest.config.ts');
    if (fs.existsSync(jestConfigPath)) {
      console.log(chalk.green('  ✓ Jest configuration found'));
    } else {
      console.log(chalk.yellow('  ⚠ Jest configuration not found'));
    }

    // Check test directories
    const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e'];
    let dirCount = 0;
    
    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        dirCount++;
      }
    }
    
    console.log(chalk.green(`  ✓ Test directories checked (${dirCount}/${testDirs.length} exist)`));

    return dirCount > 0;
  }

  private async runTestSuite(config: TestConfig): Promise<{
    success: boolean;
    duration: number;
    summary: any;
    details: any[];
  }> {
    console.log(chalk.blue(`\n→ Running: ${config.name}`));
    console.log(chalk.gray(`  Patterns: ${config.patterns.join(', ')}`));
    console.log('');

    const details: any[] = [];
    let totalDuration = 0;
    let allSuccess = true;
    let summary = { total: 0, passed: 0, failed: 0, skipped: 0 };

    // Run tests for each pattern
    for (const pattern of config.patterns) {
      const retryCount = config.retryCount || 0;
      let success = false;
      let result: any;
      let lastError = '';

      for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
        if (attempt > 1) {
          console.log(chalk.yellow(`  Retry attempt ${attempt}/${retryCount + 1}`));
        }

        result = await this.executeJestTest([pattern], {
          coverage: true,
          timeout: config.timeout,
          env: config.env
        });

        if (result.success) {
          success = true;
          break;
        } else {
          lastError = result.stderr;
        }

        // Wait before retry
        if (attempt <= retryCount) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      totalDuration += result.duration;

      const patternSummary = await this.getTestSummary(result.stdout);
      summary.total += patternSummary.total;
      summary.passed += patternSummary.passed;
      summary.failed += patternSummary.failed;
      summary.skipped += patternSummary.skipped;

      details.push({
        pattern,
        success,
        duration: result.duration,
        coverage: result.coverage,
        error: success ? undefined : lastError,
        stdout: config.verbose ? result.stdout : undefined,
        stderr: success ? undefined : result.stderr
      });

      allSuccess = allSuccess && success;
    }

    return {
      success: allSuccess,
      duration: totalDuration,
      summary,
      details
    };
  }

  private async generateReport(
    configName: string,
    results: {
      success: boolean;
      duration: number;
      summary: any;
      details: any[];
    }
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    const reportId = `test-${Date.now()}`;
    
    // Create report data
    const reportData: TestReport = {
      timestamp,
      configuration: configName,
      duration: results.duration,
      summary: {
        total: results.summary.total,
        passed: results.summary.passed,
        failed: results.summary.failed,
        skipped: results.summary.skipped,
        coverage: 0 // Would be calculated from details
      },
      details: results.details.map(d => ({
        test: d.pattern,
        status: d.success ? 'passed' : 'failed',
        duration: d.duration,
        error: d.error,
        stdout: d.stdout,
        stderr: d.stderr
      })),
      performance: {
        cpuUsage: process.cpuUsage().user,
        memoryUsage: process.memoryUsage().heapUsed,
        timestamp
      }
    };

    // Save JSON report
    const jsonPath = path.join(this.reportsDir, `${reportId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));

    // Save HTML report
    const htmlPath = path.join(this.reportsDir, `${reportId}.html`);
    this.generateHtmlReport(reportData, htmlPath);

    // Save XML report (JUnit format)
    const xmlPath = path.join(this.reportsDir, `${reportId}.xml`);
    this.generateXmlReport(reportData, xmlPath);

    return reportId;
  }

  private generateHtmlReport(report: TestReport, filePath: string) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${report.configuration}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .metric { font-size: 2em; font-weight: bold; color: #1e293b; }
        .label { color: #64748b; font-size: 0.9em; }
        .passed { color: #16a34a; }
        .failed { color: #dc2626; }
        .skipped { color: #ea580c; }
        .details { background: #f8fafc; border-radius: 8px; padding: 20px; }
        .test-item { margin-bottom: 15px; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #e2e8f0; }
        .test-item.passed { border-left-color: #16a34a; }
        .test-item.failed { border-left-color: #dc2626; }
        .error { color: #dc2626; font-family: monospace; font-size: 0.9em; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report</h1>
        <p>Configuration: ${report.configuration}</p>
        <p>Executed: ${format(new Date(report.timestamp), 'PPpp')}</p>
    </div>
    
    <div class="summary">
        <div class="card">
            <div class="metric">${report.summary.total}</div>
            <div class="label">Total Tests</div>
        </div>
        <div class="card">
            <div class="metric passed">${report.summary.passed}</div>
            <div class="label">Passed</div>
        </div>
        <div class="card">
            <div class="metric failed">${report.summary.failed}</div>
            <div class="label">Failed</div>
        </div>
        <div class="card">
            <div class="metric">${report.duration}ms</div>
            <div class="label">Duration</div>
        </div>
    </div>
    
    <div class="details">
        <h2>Test Details</h2>
        ${report.details.map(detail => `
            <div class="test-item ${detail.status}">
                <strong>${detail.test}</strong><br>
                Status: <span class="${detail.status}">${detail.status.toUpperCase()}</span><br>
                Duration: ${detail.duration}ms
                ${detail.error ? `<div class="error">Error: ${detail.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;

    fs.writeFileSync(filePath, html);
  }

  private generateXmlReport(report: TestReport, filePath: string) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${report.configuration}" tests="${report.summary.total}" failures="${report.summary.failed}" time="${report.duration}">
  <testsuite name="Automated Test Suite" tests="${report.summary.total}" failures="${report.summary.failed}" time="${report.duration}">
    ${report.details.map(detail => `
    <testcase classname="${detail.test}" name="test-run" time="${detail.duration}">
      ${detail.status === 'failed' ? `<failure message="Test failed">${detail.error || 'Unknown error'}</failure>` : ''}
    </testcase>`).join('')}
  </testsuite>
</testsuites>`;

    fs.writeFileSync(filePath, xml);
  }

  private async saveToHistory(reportId: string, configuration: string, success: boolean, duration: number) {
    let history: any[] = [];

    if (fs.existsSync(this.historyFile)) {
      history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
    }

    history.unshift({
      timestamp: Date.now(),
      reportId,
      configuration,
      success,
      duration,
      date: new Date().toISOString()
    });

    // Keep only last 100 entries
    history = history.slice(0, 100);

    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  private async runContinuousTests(interval: number = 300000) { // 5 minutes default
    console.clear();
    this.printHeader('Continuous Test Mode');
    
    console.log(chalk.white(`Running tests every ${interval / 1000} seconds...`));
    console.log(chalk.yellow('Press Ctrl+C to stop'));
    console.log('');

    let iteration = 1;
    
    while (true) {
      console.log(chalk.blue(`\n=== Iteration ${iteration} ===`));
      
      const result = await this.runTestSuite({
        name: 'Continuous Test',
        command: 'all',
        patterns: ['tests/unit', 'tests/integration'],
        critical: true,
        parallel: false
      });

      const reportId = await this.generateReport('Continuous Test', result);
      await this.saveToHistory(reportId, 'Continuous Test', result.success, result.duration);

      if (result.success) {
        console.log(chalk.green(`✓ Iteration ${iteration} passed (${result.duration}ms)`));
      } else {
        console.log(chalk.red(`✗ Iteration ${iteration} failed (${result.duration}ms)`));
      }

      iteration++;
      
      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  private async runBenchmark(): Promise<void> {
    console.clear();
    this.printHeader('Performance Benchmark');

    const benchmarks = [
      { name: 'Unit Tests', pattern: 'tests/unit', runs: 5 },
      { name: 'Integration Tests', pattern: 'tests/integration', runs: 3 },
      { name: 'Full Test Suite', pattern: 'tests', runs: 1 }
    ];

    const results: any[] = [];

    for (const benchmark of benchmarks) {
      console.log(chalk.blue(`\nBenchmarking: ${benchmark.name}`));
      console.log(chalk.gray(`Running ${benchmark.runs} iterations...`));

      const durations: number[] = [];

      for (let i = 1; i <= benchmark.runs; i++) {
        process.stdout.write(chalk.gray(`  Run ${i}/${benchmark.runs}... `));
        
        const result = await this.executeJestTest([benchmark.pattern], {
          silent: true,
          timeout: 120000
        });

        if (result.success) {
          durations.push(result.duration);
          console.log(chalk.green(`${result.duration}ms`));
        } else {
          console.log(chalk.red('FAILED'));
        }

        // Brief pause between runs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        results.push({
          name: benchmark.name,
          average: avg,
          min,
          max,
          runs: durations.length
        });

        console.log(chalk.white(`  Average: ${avg.toFixed(0)}ms`));
        console.log(chalk.white(`  Min: ${min}ms, Max: ${max}ms`));
      }
    }

    // Summary
    console.log('\n');
    this.printHeader('Benchmark Summary');
    
    results.forEach(result => {
      console.log(chalk.white(`${result.name}:`));
      console.log(chalk.cyan(`  Average: ${result.average.toFixed(0)}ms`));
      console.log(chalk.cyan(`  Range: ${result.min}ms - ${result.max}ms`));
      console.log('');
    });

    // Save benchmark results
    const benchmarkFile = path.join(this.reportsDir, `benchmark-${Date.now()}.json`);
    fs.writeFileSync(benchmarkFile, JSON.stringify(results, null, 2));
    console.log(chalk.gray(`Benchmark results saved to: ${benchmarkFile}`));
  }

  async run(args: string[]) {
    const command = args[0] || 'all';

    if (this.isRunning) {
      console.log(chalk.red('Test runner is already running.'));
      process.exit(1);
    }

    this.isRunning = true;

    try {
      switch (command.toLowerCase()) {
        case 'all':
        case 'full':
          if (!(await this.runPreTestChecks())) {
            process.exit(1);
          }

          console.clear();
          this.printHeader('Running All Tests');

          const result = await this.runTestSuite({
            name: 'All Tests',
            command: 'all',
            patterns: ['tests/unit', 'tests/integration', 'tests/e2e'],
            critical: true,
            parallel: false,
            timeout: 180000
          });

          const reportId = await this.generateReport('All Tests', result);
          await this.saveToHistory(reportId, 'All Tests', result.success, result.duration);

          console.log('\n');
          console.log(chalk.white(`Total Duration: ${chalk.cyan(result.duration)}ms`));
          console.log(chalk.white(`Tests: ${chalk.green(result.summary.passed)} passed, ${chalk.red(result.summary.failed)} failed`));

          process.exit(result.success ? 0 : 1);

        case 'unit':
          await this.runTestSuite({
            name: 'Unit Tests',
            command: 'unit',
            patterns: ['tests/unit'],
            critical: true,
            timeout: 60000
          });
          break;

        case 'integration':
          await this.runTestSuite({
            name: 'Integration Tests',
            command: 'integration',
            patterns: ['tests/integration'],
            critical: true,
            timeout: 120000
          });
          break;

        case 'e2e':
          await this.runTestSuite({
            name: 'End-to-End Tests',
            command: 'e2e',
            patterns: ['tests/e2e'],
            critical: false,
            timeout: 180000
          });
          break;

        case 'ci':
          await this.runTestSuite({
            name: 'CI Tests',
            command: 'ci',
            patterns: ['tests/unit', 'tests/integration'],
            critical: true,
            timeout: 180000,
            retryCount: 2
          });
          break;

        case 'coverage':
          console.clear();
          this.printHeader('Coverage Report');

          const coverageResult = await this.runTestSuite({
            name: 'Coverage Tests',
            command: 'coverage',
            patterns: ['tests'],
            critical: true,
            timeout: 120000
          });

          console.log(chalk.green('\n✓ Coverage report generated in test-reports/ directory'));
          break;

        case 'continuous':
        case 'watch':
          const interval = parseInt(args[1]) || 300000;
          await this.runContinuousTests(interval);
          break;

        case 'benchmark':
          await this.runBenchmark();
          break;

        case 'history':
          if (fs.existsSync(this.historyFile)) {
            const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
            
            console.clear();
            this.printHeader('Test History');

            history.slice(0, 20).forEach((entry: any) => {
              const date = new Date(entry.timestamp).toLocaleString();
              const status = entry.success ? chalk.green('✓') : chalk.red('✗');
              console.log(`${status} ${chalk.white(date)} - ${chalk.cyan(entry.configuration)} (${entry.duration}ms)`);
            });
          } else {
            console.log(chalk.yellow('No test history found.'));
          }
          break;

        case 'reports':
          console.clear();
          this.printHeader('Available Reports');

          const files = fs.readdirSync(this.reportsDir)
            .filter(f => f.endsWith('.html'))
            .sort((a, b) => fs.statSync(path.join(this.reportsDir, b)).mtime - fs.statSync(path.join(this.reportsDir, a)).mtime);

          if (files.length === 0) {
            console.log(chalk.yellow('No reports found.'));
          } else {
            console.log(chalk.white('Recent reports:'));
            files.slice(0, 10).forEach((file, index) => {
              const filePath = path.join(this.reportsDir, file);
              const stats = fs.statSync(filePath);
              const date = stats.mtime.toLocaleString();
              console.log(chalk.cyan(`${index + 1}. `) + chalk.white(`${file} (${date})`));
            });
          }
          break;

        case 'help':
        default:
          console.log(chalk.white('Automated Test Runner'));
          console.log('');
          console.log(chalk.white('Usage: npm run test:auto [command] [options]'));
          console.log('');
          console.log(chalk.white('Commands:'));
          console.log(chalk.cyan('  all             ') + chalk.white('Run all tests (default)'));
          console.log(chalk.cyan('  unit            ') + chalk.white('Run unit tests only'));
          console.log(chalk.cyan('  integration     ') + chalk.white('Run integration tests only'));
          console.log(chalk.cyan('  e2e             ') + chalk.white('Run end-to-end tests only'));
          console.log(chalk.cyan('  ci              ') + chalk.white('Run tests for CI/CD pipeline'));
          console.log(chalk.cyan('  coverage        ') + chalk.white('Generate coverage report'));
          console.log(chalk.cyan('  continuous [s]  ') + chalk.white('Run tests continuously (interval in seconds)'));
          console.log(chalk.cyan('  benchmark       ') + chalk.white('Run performance benchmarks'));
          console.log(chalk.cyan('  history         ') + chalk.white('Show test execution history'));
          console.log(chalk.cyan('  reports         ') + chalk.white('List available test reports'));
          console.log(chalk.cyan('  help            ') + chalk.white('Show this help message'));
          console.log('');
          console.log(chalk.white('Examples:'));
          console.log(chalk.gray('  npm run test:auto'));
          console.log(chalk.gray('  npm run test:auto unit'));
          console.log(chalk.gray('  npm run test:auto continuous 300'));
          console.log(chalk.gray('  npm run test:auto benchmark'));
          break;
      }
    } catch (error: any) {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    } finally {
      this.isRunning = false;
    }
  }
}

// Run automated test runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new AutomatedTestRunner();
  
  runner.run(args).catch(error => {
    console.error(chalk.red(`Automated test runner error: ${error.message}`));
    process.exit(1);
  });
}

export default AutomatedTestRunner;
