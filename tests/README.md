# Testing Framework Documentation

This document describes the comprehensive testing framework setup for the AI Code Agent project.

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Test Types](#test-types)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Configuration](#configuration)
- [Database Testing](#database-testing)
- [Mock Data and Fixtures](#mock-data-and-fixtures)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The testing framework provides:

- **Jest** for unit and integration testing
- **TypeScript** support with full type checking
- **Test utilities** and helper functions
- **Mock data** and fixtures
- **Database setup/teardown** scripts
- **Comprehensive coverage** reporting
- **CI/CD integration** ready

## 📁 Project Structure

```
tests/
├── config/                 # Test configuration files
│   └── test-env.config.ts  # Environment-specific test settings
├── fixtures/              # Mock data and fixtures
│   └── mock-data.ts       # Shared mock data
├── helpers/               # Test helper utilities
│   └── database-setup.ts  # Database setup/teardown
├── integration/           # Integration tests
├── mocks/                 # Mock implementations
├── unit/                  # Unit tests
│   └── core/              # Core component tests
│       ├── event-bus.test.ts
│       ├── logger.test.ts
│       └── config.test.ts
├── utils/                 # Test utilities
│   └── test-utils.ts      # Common test helpers
├── e2e/                   # End-to-end tests
├── setup.ts               # Jest setup file
├── global-setup.ts        # Global test setup
└── global-teardown.ts     # Global test cleanup
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL (for integration tests)
- Redis (optional, for caching tests)

### Installation

The testing dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Environment Setup

1. **Copy test environment file:**
   ```bash
   cp tests/fixtures/.env.test .env.test
   ```

2. **Set up test database:**
   ```bash
   # Create test database
   createdb ai_code_agent_test
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE ai_code_agent_test;"
   ```

3. **Set environment variables:**
   ```bash
   export TEST_DB_HOST=localhost
   export TEST_DB_PORT=5432
   export TEST_DB_NAME=ai_code_agent_test
   export TEST_DB_USER=postgres
   export TEST_DB_PASSWORD=postgres
   ```

## 🧪 Test Types

### Unit Tests (`tests/unit/`)

Test individual components and functions in isolation.

```typescript
describe('ComponentName', () => {
  it('should do something specific', () => {
    // Test implementation
  });
});
```

### Integration Tests (`tests/integration/`)

Test how components work together.

### End-to-End Tests (`tests/e2e/`)

Test complete user workflows and system behavior.

### Performance Tests

Test performance characteristics and benchmarks.

## ✍️ Writing Tests

### Unit Test Example

```typescript
import { ComponentName } from '@/core/component';
import { createMock, testDataFactory } from '@/tests/utils/test-utils';

describe('ComponentName', () => {
  let component: ComponentName;
  let mockDependency: any;

  beforeEach(() => {
    mockDependency = createMock();
    component = new ComponentName(mockDependency);
  });

  it('should initialize correctly', () => {
    expect(component).toBeInstanceOf(ComponentName);
  });

  it('should handle valid input', async () => {
    const input = testDataFactory.createUser();
    const result = await component.process(input);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should throw error for invalid input', async () => {
    const invalidInput = { invalid: 'data' };
    
    await expect(component.process(invalidInput))
      .rejects.toThrow('Invalid input');
  });
});
```

### Using Test Utilities

```typescript
import { 
  testDataFactory, 
  timerMock, 
  expectToThrow,
  EventTestHelper 
} from '@/tests/utils/test-utils';

// Create test data
const user = testDataFactory.createUser({ role: 'admin' });

// Mock async operations
const asyncMock = createAsyncMock();

// Handle time-dependent tests
timerMock.mockDate(new Date('2025-10-31T00:00:00Z'));
timerMock.advanceTime(1000);

// Test error scenarios
await expectToThrow(() => component.fail(), /Expected error/);

// Test event handling
const eventHelper = new EventTestHelper();
eventHelper.captureEvents(eventBus);
```

## 🏃 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- event-bus.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should initialize"

# Run tests with specific environment
NODE_ENV=test npm test
```

### Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# Coverage with HTML report
npm run test:coverage -- --coverageReporters=html

# Coverage threshold check
npm run test:coverage -- --coverageThreshold.failUnder=80
```

### Database Testing

```bash
# Setup test database
npm run test:db:setup

# Run tests with database
npm run test:integration

# Clean up test database
npm run test:db:cleanup
```

### CI/CD Commands

```bash
# Run all tests (CI-friendly)
CI=true npm test -- --ci --coverage --watchAll=false

# Run tests with JUnit output
npm test -- --reporters=default --reporters=jest-junit
```

## ⚙️ Configuration

### Jest Configuration

The main Jest configuration is in `jest.config.ts`:

```typescript
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  // ... more configuration
};
```

### Test Environment Configuration

Environment-specific settings in `tests/config/test-env.config.ts`:

```typescript
export const testEnvironmentConfig = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    // ... more config
  },
  server: {
    port: 0, // Random port for tests
  },
  // ... more config
};
```

### Environment Variables

Required environment variables for testing:

```bash
# Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=ai_code_agent_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=postgres

# JWT Secret
TEST_JWT_SECRET=test-secret-key-for-testing

# Optional: Redis
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=1

# Optional: External services
TEST_OPENAI_API_KEY=sk-test-key
TEST_GROQ_API_KEY=gsk-test-key
```

## 🗄️ Database Testing

### Database Test Manager

```typescript
import { TestDatabaseManager, TestDatabaseFactory } from '@/tests/helpers/database-setup';

// Create database manager
const dbManager = TestDatabaseFactory.createFromEnv();

// Setup database
await dbManager.setup();

// Run tests
await runTests();

// Cleanup
await dbManager.teardown();
```

### Database Test Utilities

```typescript
import { DatabaseTestHelper } from '@/tests/utils/test-utils';

// Clean all tables
await DatabaseTestHelper.cleanAll(connection);

// Seed test data
await DatabaseTestHelper.seed(connection, testData);

// Rollback changes
await DatabaseTestHelper.rollback(connection);
```

### Test Database Schema

Ensure your database migrations include test data:

```sql
-- tests/fixtures/test-data.sql
INSERT INTO users (id, name, email) VALUES 
  ('test-user-1', 'Test User', 'test@example.com'),
  ('test-user-2', 'Another User', 'another@example.com');
```

## 🎭 Mock Data and Fixtures

### Using Mock Data

```typescript
import { mockConfigData, mockEventData } from '@/tests/fixtures/mock-data';

// Use predefined mock data
const config = mockConfigData.test;
const event = mockEventData['system:start'];

// Create custom mock data
const customData = {
  ...mockEventData['agent:registered'],
  customField: 'custom value',
};
```

### Creating Test Fixtures

```typescript
// tests/fixtures/custom-fixture.ts
export const customTestFixture = {
  users: [
    {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    },
  ],
  agents: [
    {
      id: 'agent-1',
      name: 'Test Agent',
      type: 'test-agent',
      status: 'idle',
    },
  ],
};
```

## 📊 Coverage Reporting

### Coverage Configuration

Coverage thresholds are configured in `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report:** `coverage/lcov-report/index.html`
- **LCOV File:** `coverage/lcov.info`
- **JSON Report:** `coverage/coverage-final.json`

### Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Check coverage without running tests
npm run test:coverage -- --collectCoverageOnly
```

## 🎯 Best Practices

### 1. Test Organization

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  describe('Feature 1', () => {
    it('should do thing 1', () => { /* test */ });
    it('should do thing 2', () => { /* test */ });
  });

  describe('Feature 2', () => {
    it('should do thing 3', () => { /* test */ });
  });
});
```

### 2. Test Naming

```typescript
// Good
it('should return 400 status for invalid input', () => { });

// Bad
it('test', () => { });
```

### 3. Mocking

```typescript
// Good - Mock external dependencies
jest.mock('@/external/service');

// Good - Use test utilities
const mockService = createMock({
  method: jest.fn().mockResolvedValue({ data: 'test' })
});

// Bad - Over-mocking
jest.mock('fs'); // Only mock what's needed
```

### 4. Async Testing

```typescript
// Good - Proper async handling
it('should handle async operation', async () => {
  const result = await component.asyncOperation();
  expect(result).toBeDefined();
});

// Good - Error handling
it('should handle async errors', async () => {
  await expect(component.asyncOperation())
    .rejects.toThrow('Expected error');
});
```

### 5. Test Data Management

```typescript
// Good - Use test data factory
const user = testDataFactory.createUser({ role: 'admin' });

// Good - Use fixtures
const config = mockConfigData.test;

// Bad - Hardcoded test data
const user = { id: '1', name: 'John' };
```

### 6. Isolation

```typescript
// Good - Clean state per test
beforeEach(() => {
  configManager.clear();
  eventBus.removeAllListeners();
  logger.clearMemoryLogs();
});

// Good - Mock cleanup
afterEach(() => {
  jest.clearAllMocks();
});
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Check database exists
   psql -U postgres -l | grep ai_code_agent_test
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

3. **Test Timeouts**
   ```typescript
   // Increase timeout for slow tests
   it('slow test', async () => {
     // Test implementation
   }, 30000); // 30 seconds
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

### Debug Mode

```bash
# Run tests in debug mode
npm test -- --debug

# Run specific test with debugging
npm test -- event-bus.test.ts --verbose
```

### Test Logging

```typescript
// Enable debug logging in tests
process.env.LOG_LEVEL = 'debug';

// Use test-specific logger
const testLogger = logger.child({ test: 'event-bus' });
testLogger.info('Debug message');
```

### Performance Issues

```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Run only unit tests
npm test -- --testPathPattern=unit

# Exclude slow tests
npm test -- --testPathIgnorePatterns=integration
```

## 📈 CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --ci --coverage --watchAll=false
        env:
          TEST_DB_HOST: localhost
          TEST_DB_NAME: ai_code_agent_test
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: postgres
```

### GitLab CI

```yaml
test:
  image: node:18
  services:
    - postgres:13
    - redis:6
  variables:
    TEST_DB_HOST: postgres
    TEST_DB_NAME: ai_code_agent_test
    TEST_DB_USER: postgres
    TEST_DB_PASSWORD: postgres
  script:
    - npm install
    - npm test -- --ci --coverage --watchAll=false
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [TypeScript Testing](https://jestjs.io/docs/typescript)
- [Mock Functions](https://jestjs.io/docs/mock-functions)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the provided test utilities
3. Include both positive and negative test cases
4. Add proper error handling tests
5. Update this documentation if needed

## 📄 License

This testing framework is part of the AI Code Agent project and follows the same license terms.
