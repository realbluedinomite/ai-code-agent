# Testing Dashboard and CLI Interface

This document provides comprehensive documentation for the testing dashboard and CLI interface tools available in the AI Code Agent project.

## Overview

The testing system provides multiple layers of testing capabilities:

1. **Test Dashboard** - Interactive testing interface with real-time progress tracking
2. **Quick Test** - Rapid testing of key functionality
3. **Automated Test Runner** - Comprehensive test automation with reporting
4. **Legacy Test Runner** - Basic test execution script

## Quick Start

### Run All Tests
```bash
# Using the dashboard (interactive)
npm run test:dashboard

# Quick test (fast)
npm run test:quick

# Automated runner
npm run test:auto all

# Legacy runner
npm run test:runner all
```

### Smoke Test (Critical Components Only)
```bash
npm run test:quick:smoke
```

### Coverage Report
```bash
npm run test:auto:coverage
```

## Detailed Usage

### 1. Test Dashboard

Interactive testing interface with visual feedback and comprehensive options.

**Usage:**
```bash
npm run test:dashboard
npm run test:dashboard:dev  # With auto-reload
```

**Features:**
- Interactive menu system
- Real-time progress tracking
- Test result visualization
- Coverage report generation
- Test history tracking
- Database setup integration

**Available Options:**
1. Run All Tests
2. Run Unit Tests
3. Run Integration Tests
4. Run End-to-End Tests
5. Run Tests with Coverage
6. Run Tests in Watch Mode
7. Run Performance Tests
8. Debug Specific Test
9. Test Database Setup
10. Custom Test Pattern
11. View Test History
0. Exit

**Example Session:**
```bash
$ npm run test:dashboard

=================================== AI Code Agent Testing Dashboard ===================================

Select testing mode:

1.  Run All Tests
2.  Run Unit Tests
...
Enter your choice (0-11): 2

Running unit tests...
✓ Test Suite (1234ms)
✓ Another Test Suite (567ms)

Test Results Summary
Total Tests: 42
Passed: 40
Failed: 2
Skipped: 0
...
```

### 2. Quick Test

Fast, focused testing for critical components without running the full test suite.

**Usage:**
```bash
# Run all critical tests
npm run test:quick

# Smoke test (fastest)
npm run test:quick:smoke

# List available tests
npm run test:quick:list

# Include optional tests
npm run test:quick:all-optional

# Run specific test
npm run test:quick test "Core Components"
```

**Available Tests:**
- Core Components (critical)
- Input Parser (critical)
- Planner (critical)
- Implementer (critical)
- Reviewer (critical)
- Project Analyzer (optional)
- Database Models (critical)
- AI Providers (critical)
- Orchestrator (critical)
- Integration Tests (optional)

**Example Output:**
```
=================================== Quick Test Suite ===================================

Running 10 test suites...

✓ Core Components (1234ms)
✓ Input Parser (567ms)
...

Quick Test Summary
Total Test Suites: 10
Passed: 9
Failed: 1
Success Rate: 90.0%

Failed Test Suites:
  ✗ Project Analyzer
    Error: No test files found
```

### 3. Automated Test Runner

Advanced test automation with comprehensive reporting capabilities.

**Usage:**
```bash
# Run all tests with full reporting
npm run test:auto all

# Run unit tests only
npm run test:auto unit

# Run integration tests
npm run test:auto integration

# CI/CD mode with retries
npm run test:auto:ci

# Generate coverage report
npm run test:auto:coverage

# Performance benchmarks
npm run test:auto:benchmark

# Continuous testing (every 5 minutes)
npm run test:auto:continuous

# Custom interval (every 10 minutes = 600 seconds)
npm run test:auto:continuous 600

# View test history
npm run test:history

# List available reports
npm run test:reports
```

**Features:**
- JSON, HTML, and XML report generation
- Test history tracking
- Performance benchmarking
- Continuous testing mode
- Pre-test environment checks
- Retry logic for failed tests
- Parallel test execution support
- CI/CD pipeline integration

**Report Locations:**
- JSON reports: `test-reports/test-{timestamp}.json`
- HTML reports: `test-reports/test-{timestamp}.html`
- XML reports: `test-reports/test-{timestamp}.xml`
- Test history: `test-history.json`
- Coverage reports: `coverage/` directory

**Example HTML Report:**
The automated runner generates beautiful HTML reports with:
- Summary statistics
- Detailed test results
- Performance metrics
- Error details
- Historical data

### 4. Legacy Test Runner

Basic test execution script for compatibility.

**Usage:**
```bash
npm run test:runner [command] [options]
```

**Commands:**
- `unit` - Run unit tests
- `integration` - Run integration tests
- `e2e` - Run end-to-end tests
- `all` - Run all tests
- `watch` - Run tests in watch mode
- `coverage` - Run tests with coverage
- `ci` - Run tests for CI/CD
- `database:setup` - Setup test database
- `database:cleanup` - Clean up test database
- `setup` - Setup test environment
- `perf` - Run performance tests
- `debug [file]` - Run tests in debug mode

## Environment Setup

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL (for integration tests)
- All dependencies installed (`npm install`)

### Test Database Setup
```bash
# Setup test database
npm run test:db:setup

# Cleanup test database
npm run test:db:cleanup
```

### Test Environment Setup
```bash
# Setup test environment
npm run test:setup
```

## Configuration

### Jest Configuration
The project uses Jest for testing with the following configuration (in `jest.config.ts`):
- Test environment: Node.js
- TypeScript support via ts-jest
- Coverage reporting enabled
- Test file patterns configured
- Module name mapping for clean imports

### Environment Variables
Tests use the following environment variables:
- `NODE_ENV=test`
- `LOG_LEVEL=error` (for test runs)
- Database connection variables for integration tests

## Test Structure

### Test Directories
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── fixtures/      # Test fixtures and mock data
├── helpers/       # Test utilities and helpers
└── mocks/         # Mock implementations
```

### Test File Naming
- Unit tests: `*.test.ts` or `*.spec.ts`
- Test files in `__tests__` directories
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/`

## Advanced Features

### Custom Test Patterns
Run tests matching specific patterns:
```bash
# Using dashboard
npm run test:dashboard
# Then select option 10 and enter pattern

# Using quick test
npm run test:quick test "specific-test-name"

# Using automated runner with pattern
npm run test:auto -- --testNamePattern="should.*"
```

### Debug Mode
Run specific test files in debug mode:
```bash
# Using legacy runner
npm run test:runner debug tests/unit/specific.test.ts

# Standard debug with Node.js inspector
npm run test:debug
```

### Watch Mode
Run tests automatically when files change:
```bash
# Basic watch mode
npm run test:watch

# Using dashboard
npm run test:dashboard
# Select option 6

# Using Jest directly
jest --watch
```

### Coverage Reports
Generate and view coverage reports:
```bash
# Generate coverage
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## CI/CD Integration

### Recommended CI Configuration
```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    npm run test:auto:ci
    npm run test:auto:coverage
```

### Continuous Testing
Run tests continuously during development:
```bash
npm run test:auto:continuous 300  # Every 5 minutes
```

### Performance Monitoring
```bash
# Run benchmarks
npm run test:auto:benchmark

# View historical performance data
npm run test:history
```

## Troubleshooting

### Common Issues

1. **Tests timeout**
   - Increase timeout in test configuration
   - Check for infinite loops in tests
   - Ensure database connections are properly closed

2. **Database connection errors**
   - Ensure PostgreSQL is running
   - Run `npm run test:db:setup`
   - Check database credentials

3. **Coverage report missing**
   - Ensure Jest coverage is enabled
   - Check coverage configuration in jest.config.ts

4. **Memory issues with large test suites**
   - Use `--runInBand` to run tests serially
   - Increase Node.js memory limit
   - Split tests into smaller suites

### Getting Help
- Run `npm run test:dashboard` and select help options
- Check test history: `npm run test:history`
- View available reports: `npm run test:reports`

## Best Practices

### Writing Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Keep tests isolated and independent
4. Use appropriate test doubles (mocks, stubs)
5. Test both positive and negative cases

### Running Tests
1. Use smoke tests for quick validation
2. Run full test suite before committing
3. Generate coverage reports regularly
4. Monitor test performance over time
5. Keep test execution time under 5 minutes

### Test Organization
1. Group related tests in describe blocks
2. Use beforeEach/afterEach for setup/teardown
3. Keep test files close to source files
4. Use shared fixtures for common test data
5. Document complex test scenarios

## Examples

### Running Specific Component Tests
```bash
# Quick test specific component
npm run test:quick test "Input Parser"

# Dashboard interactive selection
npm run test:dashboard
# Select option 8, then enter: src/components/input-parser/**/*.test.ts
```

### Performance Testing
```bash
# Quick performance check
npm run test:quick test "Orchestrator"

# Full benchmark
npm run test:auto:benchmark
```

### Coverage Analysis
```bash
# Generate full coverage
npm run test:auto:coverage

# View coverage in dashboard
npm run test:dashboard
# Select option 5
```

## Additional Resources

- Jest Documentation: https://jestjs.io/docs
- TypeScript Testing: https://jestjs.io/docs/typescript
- Testing Best Practices: https://jestjs.io/docs/tutorial-async
- Test Coverage: https://jestjs.io/docs/cli#coverage
