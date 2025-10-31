# AI Code Agent - Testing Quick Start Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Setup (5 Minutes)](#quick-setup-5-minutes)
4. [Testing Phases](#testing-phases)
   - [Phase 1: Environment Verification](#phase-1-environment-verification)
   - [Phase 2: Database Setup](#phase-2-database-setup)
   - [Phase 3: Component Testing](#phase-3-component-testing)
   - [Phase 4: Integration Testing](#phase-4-integration-testing)
   - [Phase 5: End-to-End Testing](#phase-5-end-to-end-testing)
   - [Phase 6: Performance Validation](#phase-6-performance-validation)
5. [Testing Tools Reference](#testing-tools-reference)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Best Practices](#best-practices)
9. [CI/CD Integration](#cicd-integration)
10. [Advanced Testing](#advanced-testing)

---

## Overview

The AI Code Agent system includes a comprehensive testing framework with multiple testing layers:

- **Test Dashboard** - Interactive interface for guided testing
- **Quick Test** - Fast validation of critical components
- **Automated Test Runner** - Comprehensive test automation
- **Legacy Test Runner** - Basic test execution

**Testing Types:**
- Unit Tests - Individual component testing
- Integration Tests - Component interaction testing
- End-to-End Tests - Complete workflow testing
- Performance Tests - Load and performance validation

---

## Prerequisites

### Required Software
- **Node.js** 18+ (`node --version`)
- **npm** 8+ (`npm --version`)
- **PostgreSQL** 12+ (`psql --version`)
- **Git** (`git --version`)

### Optional Components
- **Docker** (for containerized database)
- **Redis** (for caching)
- **Groq API Key** (for AI features)

---

## Quick Setup (5 Minutes)

### Step 1: Verify Installation
```bash
# Check versions
node --version  # Should be 18+
npm --version   # Should be 8+

# If versions are outdated
npm install -g npm@latest
```

### Step 2: Install Dependencies
```bash
# Install all project dependencies
npm install

# Verify installation
npm run test:setup
```

**Expected Output:**
```
✓ Node.js version: v18.x.x
✓ Dependencies installed
✓ TypeScript configuration valid
```

### Step 3: Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

**Required Environment Variables:**
```bash
# Core Environment
NODE_ENV=development
LOG_LEVEL=debug

# Database (Required)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent_dev
DB_USER=your_username
DB_PASSWORD=your_password

# Optional: AI Features
GROQ_API_KEY=your_groq_api_key

# Optional: Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 4: Database Setup
```bash
# Using npm script (recommended)
npm run db:setup

# OR using test runner
npm run test:db:setup

# Verify setup
npm run test:setup -- --db
```

**Expected Output:**
```
✓ Database connection successful
✓ Migrations completed
✓ Test database ready
```

### Step 5: Run Smoke Test
```bash
# Quick validation of critical components
npm run test:quick:smoke

# Should complete in ~10 seconds
```

**Expected Output:**
```
✓ Core Components (5s)
✓ Input Parser (3s)
✓ Database Models (2s)

Smoke test passed! ✓
```

**If smoke test fails**, proceed to [Troubleshooting](#troubleshooting-guide).

---

## Testing Phases

### Phase 1: Environment Verification

**Purpose:** Ensure all dependencies and configuration are correct

**Duration:** 2-3 minutes

#### Step-by-Step:

1. **Run Setup Verification**
   ```bash
   npm run test:setup -- --verbose
   ```

2. **Check Each Component**
   ```bash
   # Environment variables only
   npm run test:setup -- --env

   # Dependencies only
   npm run test:setup -- --deps

   # Database only
   npm run test:setup -- --db

   # Groq API only (if configured)
   npm run test:setup -- --groq
   ```

3. **Expected Results:**
   - ✓ Node.js 18+ installed
   - ✓ npm 8+ installed
   - ✓ All dependencies installed
   - ✓ TypeScript compiles successfully
   - ✓ Environment variables configured
   - ✓ Database connection working
   - ✓ Groq API key valid (if configured)

#### Troubleshooting Phase 1:
- **Issue:** `npm install` fails
  ```bash
  # Solution: Clear cache and reinstall
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  ```

- **Issue:** TypeScript compilation errors
  ```bash
  # Solution: Check TypeScript configuration
  npx tsc --noEmit
  ```

---

### Phase 2: Database Setup

**Purpose:** Set up and verify database connectivity

**Duration:** 3-5 minutes

#### Step-by-Step:

1. **Start Database**
   ```bash
   # Using Docker (recommended for testing)
   docker-compose up -d postgres

   # OR start PostgreSQL directly
   sudo service postgresql start
   ```

2. **Create Database**
   ```bash
   # Create development database
   createdb ai_code_agent_dev

   # Create test database
   createdb ai_code_agent_test
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate

   # Verify migration status
   npm run db:status
   ```

4. **Test Database Connection**
   ```bash
   npm run test:setup -- --db

   # Test with test runner
   npm run test:db:setup
   ```

5. **Expected Results:**
   - ✓ PostgreSQL service running
   - ✓ Database created successfully
   - ✓ Migrations applied
   - ✓ Test database ready
   - ✓ Connection successful

#### Sample Output:
```
Database Setup Results:
✓ PostgreSQL 13.x running on port 5432
✓ Database 'ai_code_agent_dev' created
✓ Database 'ai_code_agent_test' created
✓ Migrations applied: 5 tables created
✓ Test connection successful
```

#### Troubleshooting Phase 2:
- **Issue:** `createdb: command not found`
  ```bash
  # Solution: Install PostgreSQL
  # Ubuntu/Debian
  sudo apt-get install postgresql postgresql-contrib

  # macOS
  brew install postgresql
  brew services start postgresql

  # Windows
  # Download from https://www.postgresql.org/download/
  ```

- **Issue:** "role does not exist"
  ```bash
  # Solution: Create PostgreSQL user
  sudo -u postgres psql
  CREATE USER your_username WITH PASSWORD 'your_password';
  ALTER USER your_username CREATEDB;
  \q
  ```

- **Issue:** Port already in use
  ```bash
  # Find and kill process using port 5432
  lsof -ti:5432 | xargs kill -9

  # OR use different port
  export DB_PORT=5433
  ```

---

### Phase 3: Component Testing

**Purpose:** Test individual components in isolation

**Duration:** 5-10 minutes

#### Step-by-Step:

1. **Run Unit Tests**
   ```bash
   # Using dashboard (interactive)
   npm run test:dashboard
   # Select option 2: Run Unit Tests

   # OR direct command
   npm run test:unit

   # OR quick test
   npm run test:quick
   ```

2. **Test Individual Components**
   ```bash
   # Core components
   npm run test:quick test "Core Components"

   # Input parser
   npm run test:quick test "Input Parser"

   # Planner
   npm run test:quick test "Planner"

   # Implementer
   npm run test:quick test "Implementer"

   # Reviewer
   npm run test:quick test "Reviewer"
   ```

3. **Expected Results:**
   - All unit tests passing
   - No TypeScript compilation errors
   - All components initialized correctly

#### Sample Output:
```
Unit Tests Results:
Test Suites: 15 passed, 15 total
Tests:       142 passed, 142 total
Snapshots:   0 obsolete, 0 total
Time:        4.23s
```

#### Component-Specific Tests:

**Core Components Test:**
```bash
npm test -- tests/unit/core/
```

**Expected:** Config, Logger, Event Bus, Plugin Manager all working

**AI Provider Test:**
```bash
npm test -- tests/unit/providers/groq-ai-provider.test.ts
```

**Expected:** API key validation, model listing, text completion

**Database Model Test:**
```bash
npm test -- tests/unit/database/
```

**Expected:** CRUD operations, validations, relationships

#### Troubleshooting Phase 3:
- **Issue:** Tests timeout
  ```bash
  # Solution: Increase timeout
  npm test -- --testTimeout=30000

  # Or run specific test
  npm test -- tests/unit/specific.test.ts
  ```

- **Issue:** Module not found
  ```bash
  # Solution: Check TypeScript paths
  cat tsconfig.json | grep paths

  # Verify jest.config.ts moduleNameMapper
  ```

---

### Phase 4: Integration Testing

**Purpose:** Test component interactions and workflows

**Duration:** 10-15 minutes

#### Step-by-Step:

1. **Run Integration Tests**
   ```bash
   # Using dashboard
   npm run test:dashboard
   # Select option 3: Run Integration Tests

   # OR direct command
   npm run test:integration

   # OR automated runner
   npm run test:auto integration
   ```

2. **Test Specific Integrations**
   ```bash
   # Component integration
   npm test -- tests/integration/component-integration.test.ts

   # Core integration
   npm test -- tests/integration/core-integration.test.ts

   # Workflow orchestration
   npm test -- tests/integration/workflow-orchestration.test.ts
   ```

3. **Expected Results:**
   - Components communicate correctly
   - Data flows between components
   - Error handling works
   - Workflows complete successfully

#### Sample Output:
```
Integration Tests Results:
Test Suites: 8 passed, 8 total
Tests:       67 passed, 67 total
Time:        12.45s

Integration Points Verified:
✓ Input Parser → Planner
✓ Planner → Implementer
✓ Implementer → Reviewer
✓ Database → Models
✓ Orchestrator → All Components
```

#### Integration Test Scenarios:

**Full Workflow Test:**
```bash
npm test -- tests/integration/example-workflows.test.ts
```

**Expected:** Complete feature request workflow from input to implementation

**Error Recovery Test:**
```bash
npm test -- tests/integration/error-recovery-performance.test.ts
```

**Expected:** System recovers gracefully from errors

#### Troubleshooting Phase 4:
- **Issue:** Component communication fails
  ```bash
  # Debug with verbose logging
  DEBUG=test:* npm run test:integration

  # Check event bus
  npm test -- tests/unit/core/event-bus.test.ts
  ```

- **Issue:** Workflow hangs
  ```bash
  # Check for timeout
  npm test -- tests/integration/workflow-orchestration.test.ts --verbose
  ```

---

### Phase 5: End-to-End Testing

**Purpose:** Test complete user workflows

**Duration:** 15-20 minutes

#### Step-by-Step:

1. **Setup E2E Environment**
   ```bash
   # Create E2E test database
   createdb ai_code_agent_e2e_test

   # Set test environment variables
   export TEST_DB_HOST=localhost
   export TEST_DB_PORT=5432
   export TEST_DB_NAME=ai_code_agent_e2e_test
   export NODE_ENV=test
   ```

2. **Run E2E Tests**
   ```bash
   # Using dashboard
   npm run test:dashboard
   # Select option 4: Run End-to-End Tests

   # OR direct command
   npm run test:e2e

   # OR automated runner
   npm run test:auto e2e
   ```

3. **Test Specific Workflows**
   ```bash
   # Complete user workflow
   npm test -- tests/e2e/test-end-to-end.ts

   # Error handling
   npm test -- tests/e2e/test-error-handling.ts

   # Performance scenarios
   npm test -- tests/e2e/test-performance.ts
   ```

4. **Expected Results:**
   - Complete workflows execute
   - CLI interactions work
   - Real scenarios validated

#### Sample Output:
```
E2E Tests Results:
Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
Time:        87.32s

Workflows Tested:
✓ Feature Request Workflow
✓ Bug Fix Workflow
✓ Refactor Workflow
✓ CLI Interactive Session

User Scenarios Validated:
✓ Create Express API endpoint
✓ Add React component
✓ Fix database connection issue
✓ Refactor legacy code
```

#### E2E Test Scenarios:

**Feature Request:**
```typescript
const result = await orchestrator.executeWorkflow({
  type: 'feature-request',
  description: 'Add user authentication',
  requirements: ['Login', 'Logout', 'Session management']
});

expect(result.success).toBe(true);
expect(result.artifacts).toBeDefined();
```

**CLI Interaction:**
```typescript
const agent = spawn('npm', ['run', 'cli'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

agent.stdin.write('create component UserProfile\n');
// ... verify output
```

#### Troubleshooting Phase 5:
- **Issue:** CLI tests fail
  ```bash
  # Build CLI first
  npm run build
  npm run test:e2e
  ```

- **Issue:** Workflow timeout
  ```bash
  # Increase timeout in test
  it('workflow test', async () => {
    // test code
  }, 60000); // 60 seconds
  ```

---

### Phase 6: Performance Validation

**Purpose:** Verify system performance and scalability

**Duration:** 10-15 minutes

#### Step-by-Step:

1. **Run Performance Tests**
   ```bash
   # Using automated runner
   npm run test:auto:benchmark

   # OR direct command
   npm run test:perf

   # OR dashboard
   npm run test:dashboard
   # Select option 7: Run Performance Tests
   ```

2. **Test Under Load**
   ```bash
   # Concurrent requests
   npm test -- tests/performance/load.test.ts

   # Memory usage
   npm test -- tests/performance/memory.test.ts

   # Response times
   npm test -- tests/performance/response-time.test.ts
   ```

3. **Expected Results:**
   - Response times < 5 seconds average
   - Memory usage stable
   - No memory leaks
   - Handles concurrent requests

#### Sample Output:
```
Performance Tests Results:
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
Time:        45.67s

Performance Metrics:
✓ Average Response Time: 1.23s (< 5s target)
✓ P95 Response Time: 3.45s (< 10s target)
✓ Memory Usage: 120MB (< 512MB target)
✓ Concurrent Requests: 10/10 succeeded
✓ No Memory Leaks Detected

Load Test Results:
Concurrent Requests: 100
Success Rate: 100%
Average Throughput: 45 req/s
Peak Memory: 156MB
```

#### Performance Benchmarks:

**Response Time Benchmarks:**
- Average: < 5 seconds
- P95: < 10 seconds
- P99: < 30 seconds

**Memory Benchmarks:**
- Baseline: < 200MB
- Peak: < 512MB
- No leaks detected

**Throughput Benchmarks:**
- Single request: > 1 req/s
- Concurrent (10): > 5 req/s
- Concurrent (100): > 10 req/s

#### Troubleshooting Phase 6:
- **Issue:** Slow response times
  ```bash
  # Profile performance
  npm test -- --detectLeaks --prof

  # Check database queries
  DEBUG=sql npm run test:integration
  ```

- **Issue:** Memory leaks
  ```bash
  # Run with memory monitoring
  npm test -- --detectLeaks

  # Monitor heap usage
  node --max-old-space-size=2048 node_modules/.bin/jest
  ```

---

## Testing Tools Reference

### Test Dashboard (Interactive)
```bash
npm run test:dashboard
npm run test:dashboard:dev  # Auto-reload
```

**Features:**
- 11 interactive testing options
- Real-time progress tracking
- Visual test results
- Coverage reports
- Test history

### Quick Test (Fast)
```bash
npm run test:quick              # All critical tests (~30s)
npm run test:quick:smoke        # Smoke test (~10s)
npm run test:quick:list         # List available tests
npm run test:quick:all          # All critical tests
npm run test:quick test "name"  # Run specific test
```

### Automated Test Runner (Comprehensive)
```bash
npm run test:auto all            # Full test suite
npm run test:auto unit           # Unit tests
npm run test:auto integration    # Integration tests
npm run test:auto e2e            # End-to-end tests
npm run test:auto:ci             # CI mode
npm run test:auto:coverage       # Coverage report
npm run test:auto:benchmark      # Performance tests
npm run test:auto:continuous     # Continuous (every 5 min)
```

### Legacy Runner (Basic)
```bash
npm run test:runner all          # All tests
npm run test:runner unit         # Unit tests
npm run test:runner coverage     # With coverage
npm run test:runner watch        # Watch mode
```

### Direct Jest Commands
```bash
npm test                         # All tests
npm run test:watch               # Watch mode
npm run test:coverage            # With coverage
npm run test:debug               # Debug mode
npm test -- --testNamePattern="name"  # Specific test
```

---

## Troubleshooting Guide

### Quick Diagnosis

**Run diagnostic script:**
```bash
npm run test:setup -- --verbose
```

**Check test history:**
```bash
npm run test:history
```

**View reports:**
```bash
npm run test:reports
```

### Common Issues

#### 1. Environment Setup Issues

**Symptom:** `npm run test:setup` fails

**Diagnosis:**
```bash
npm run test:setup -- --env --verbose
```

**Solutions:**
```bash
# Missing dependencies
npm install

# Outdated Node.js
nvm install 18
nvm use 18

# Missing .env file
cp .env.example .env
```

#### 2. Database Connection Issues

**Symptom:** Database connection errors

**Diagnosis:**
```bash
npm run test:setup -- --db --verbose
```

**Solutions:**
```bash
# PostgreSQL not running
sudo service postgresql start
# OR
docker-compose up -d postgres

# Wrong credentials
# Check .env file
cat .env | grep DB_

# Port conflict
lsof -ti:5432 | xargs kill -9
```

#### 3. Test Timeout Issues

**Symptom:** Tests timeout unexpectedly

**Diagnosis:**
```bash
npm test -- --verbose --detectOpenHandles
```

**Solutions:**
```bash
# Increase timeout
npm test -- --testTimeout=60000

# Run serially
npm test -- --runInBand

# Debug specific test
npm run test:debug tests/unit/specific.test.ts
```

#### 4. Groq API Issues

**Symptom:** Groq API tests fail

**Diagnosis:**
```bash
npm run test:setup -- --groq --verbose
```

**Solutions:**
```bash
# Check API key
echo $GROQ_API_KEY

# Test API key
curl -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models

# Skip API tests (if not available)
GROQ_API_KEY=dummy npm test -- tests/unit/providers/
```

#### 5. Memory Issues

**Symptom:** Out of memory errors

**Diagnosis:**
```bash
npm test -- --detectLeaks --prof
```

**Solutions:**
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test

# Run tests serially
npm test -- --runInBand

# Limit concurrency
npm test -- --maxWorkers=2
```

#### 6. TypeScript Compilation Issues

**Symptom:** TypeScript errors

**Diagnosis:**
```bash
npx tsc --noEmit --verbose
```

**Solutions:**
```bash
# Type check
npm run type-check

# Clean build
npm run clean
npm run build

# Check paths
cat tsconfig.json
```

---

## Common Issues & Solutions

### Issue: Tests Fail After Pull

**Cause:** Dependencies or database state changed

**Solution:**
```bash
# Update dependencies
npm install

# Reset database
npm run db:reset

# Clear test cache
npm test -- --clearCache

# Re-run tests
npm run test:quick:smoke
```

### Issue: Coverage Report Empty

**Cause:** Coverage not configured or collected

**Solution:**
```bash
# Generate coverage
npm run test:auto:coverage

# View report
open coverage/lcov-report/index.html
# OR
cat coverage/lcov.info
```

### Issue: Docker Tests Fail

**Cause:** Docker daemon not running or port conflicts

**Solution:**
```bash
# Check Docker status
docker info

# Start Docker daemon
sudo systemctl start docker

# Use different ports
export DB_PORT=5433
```

### Issue: Watch Mode Not Working

**Cause:** File system watching not configured

**Solution:**
```bash
# Enable file watching
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf

# Run watch mode
npm run test:watch
```

### Issue: Groq API Rate Limiting

**Cause:** Too many API requests

**Solution:**
```bash
# Increase delay between tests
npm test -- tests/unit/providers/groq-ai-provider.test.ts --testTimeout=30000

# Mock API calls
# Edit test file to use mock data
```

---

## Best Practices

### Writing Tests

1. **Use Descriptive Names**
   ```typescript
   // Good
   it('should create a user with valid email and password');

   // Bad
   it('should work');
   ```

2. **Follow AAA Pattern**
   ```typescript
   it('should process input correctly', () => {
     // Arrange
     const processor = new InputProcessor();
     const input = { type: 'feature', description: 'Test' };

     // Act
     const result = processor.process(input);

     // Assert
     expect(result.status).toBe('success');
   });
   ```

3. **Use Setup and Teardown**
   ```typescript
   beforeAll(async () => {
     await setupDatabase();
   });

   beforeEach(() => {
     clearTestData();
   });

   afterEach(() => {
     resetMocks();
   });

   afterAll(async () => {
     await cleanupDatabase();
   });
   ```

4. **Mock External Dependencies**
   ```typescript
   jest.mock('@/database/client');
   jest.mock('groq-sdk');

   const logSpy = jest.spyOn(logger, 'info');
   ```

### Test Data Management

1. **Use Factories**
   ```typescript
   // tests/factories/UserFactory.ts
   export class UserFactory {
     static create(overrides = {}) {
       return {
         id: '1',
         username: 'testuser',
         email: 'test@example.com',
         ...overrides
       };
     }
   }
   ```

2. **Clean Up Test Data**
   ```typescript
   afterEach(async () => {
     await cleanTestDatabase();
   });
   ```

3. **Use Test-Specific Configuration**
   ```typescript
   // tests/config/test-env.config.ts
   export const testConfig = {
     database: 'ai_code_agent_test',
     logLevel: 'error',
     disableExternalAPIs: true
   };
   ```

### Performance Optimization

1. **Parallel Test Execution**
   ```typescript
   // jest.config.ts
   export default {
     maxWorkers: '50%',
   };
   ```

2. **Selective Test Running**
   ```bash
   # Run tests matching pattern
   npm test -- --testNamePattern="user management"

   # Run specific file
   npm test tests/unit/user.test.ts
   ```

3. **Test Coverage Thresholds**
   ```typescript
   // jest.config.ts
   export default {
     coverageThreshold: {
       global: {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80
       }
     }
   };
   ```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ai_code_agent_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - run: npm ci
      
      - run: npm run test:setup
      
      - run: npm run db:migrate
      
      - run: npm run test:ci
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: ai_code_agent_test
          DB_USER: postgres
          DB_PASSWORD: postgres
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
test:
  stage: test
  image: node:18
  
  services:
    - postgres:13
    
  variables:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: ai_code_agent_test
    DB_USER: postgres
    DB_PASSWORD: postgres
    
  script:
    - npm ci
    - npm run test:setup
    - npm run db:migrate
    - npm run test:ci
    
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:quick:smoke
npm run lint
npm run type-check
```

---

## Advanced Testing

### Custom Test Runner

Create custom test runner:
```typescript
// scripts/custom-test-runner.ts
import { runTests } from './automated-test-runner';

await runTests({
  pattern: 'tests/custom/**/*.test.ts',
  coverage: true,
  reporter: 'json',
  output: 'test-reports/custom.json'
});
```

### Performance Monitoring

Monitor test performance over time:
```bash
# Generate performance baseline
npm run test:auto:benchmark -- --baseline

# Compare against baseline
npm run test:auto:benchmark -- --compare
```

### Test Data Generation

Generate test fixtures:
```bash
# Generate mock project
npm run test:fixtures:generate -- --type=express --output=/tmp/test-project

# Generate test data
npm run test:data:generate -- --count=1000
```

### Debugging Tests

```bash
# Debug with Node inspector
npm run test:debug

# Debug specific test
node --inspect-brk node_modules/.bin/jest tests/unit/specific.test.ts

# Debug with VS Code
# Add to .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "${workspaceFolder}/tests/unit/specific.test.ts"],
  "console": "integratedTerminal"
}
```

---

## Quick Reference Commands

### Essential Commands

```bash
# Quick setup
npm run test:setup

# Smoke test
npm run test:quick:smoke

# All tests
npm run test:auto all

# Coverage
npm run test:auto:coverage

# Interactive dashboard
npm run test:dashboard

# Database setup
npm run db:setup

# View reports
npm run test:reports
```

### Diagnostic Commands

```bash
# Verbose setup check
npm run test:setup -- --verbose

# Check test history
npm run test:history

# List all test reports
npm run test:reports

# Debug specific test
npm run test:debug tests/unit/specific.test.ts
```

### Cleanup Commands

```bash
# Clear test cache
npm test -- --clearCache

# Clean coverage
rm -rf coverage

# Reset database
npm run db:reset

# Clean build artifacts
npm run clean
```

---

## Support & Resources

### Documentation
- [Full Testing Guide](TESTING_GUIDE.md)
- [Quick Reference](TESTING_QUICK_REFERENCE.md)
- [E2E Testing Guide](../tests/e2e/QUICKSTART.md)
- [Testing Tools](TESTING_TOOLS.md)

### Getting Help
1. Check this guide
2. Run diagnostic: `npm run test:setup -- --verbose`
3. Check test history: `npm run test:history`
4. Review logs: `npm run test:reports`

### Reporting Issues
Include in issue reports:
- Environment details: `npm run test:setup -- --verbose`
- Test output: `npm test -- --verbose`
- Error logs
- Steps to reproduce

---

## Summary

This guide covers the complete testing workflow for the AI Code Agent system:

1. ✅ **Quick Setup (5 min)** - Verify installation and basic configuration
2. ✅ **Phase 1: Environment** - Verify all dependencies
3. ✅ **Phase 2: Database** - Setup database and migrations
4. ✅ **Phase 3: Components** - Test individual components
5. ✅ **Phase 4: Integration** - Test component interactions
6. ✅ **Phase 5: End-to-End** - Test complete workflows
7. ✅ **Phase 6: Performance** - Validate system performance

**Next Steps:**
- Bookmark this guide for reference
- Set up CI/CD pipeline using examples
- Create custom tests for your features
- Monitor performance over time

**Remember:** Run `npm run test:setup -- --verbose` first if you encounter any issues!

---

*Last Updated: 2025-10-31*
*Version: 1.0.0*
