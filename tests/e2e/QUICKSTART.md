# E2E Tests - Quick Start Guide

## 🚀 Quick Start

### 1. Setup Test Environment

```bash
# Create test database
createdb ai_code_agent_e2e_test

# Or with Docker
docker run --name e2e-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ai_code_agent_e2e_test \
  -p 5432:5432 -d postgres:13
```

### 2. Set Environment Variables

```bash
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_NAME=ai_code_agent_e2e_test
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=postgres
export NODE_ENV=test
```

### 3. Run Tests

```bash
# All E2E tests
npm run test:e2e

# Specific test file
npm test -- test-end-to-end.ts

# With coverage
npm run test:e2e -- --coverage

# Watch mode
npm run test:watch tests/e2e
```

## 📝 Writing Your First E2E Test

### Basic Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Application } from '../../src';
import { Orchestrator } from '../../src/orchestrator/orchestrator';
import { createMockProject } from './utils';

describe('My E2E Test', () => {
  let app: Application;
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    app = new Application({ port: 34567 });
    await app.initialize();
    
    orchestrator = new Orchestrator({
      workflow: { enabled: true, timeout: 30000 },
      session: { ttl: 3600 },
      logging: { level: 'info' },
    });
    await orchestrator.initialize();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('should handle my workflow', async () => {
    // Create test project
    const projectPath = '/tmp/my-test-project';
    await createMockProject(projectPath, 'express');

    // Define workflow input
    const input = {
      type: 'feature-request' as const,
      description: 'Add new feature to my app',
      requirements: ['Feature A', 'Feature B'],
      projectPath,
    };

    // Execute workflow
    const result = await orchestrator.executeWorkflow(input);

    // Assert results
    expect(result.success).toBe(true);
    expect(result.steps).toBeDefined();
    expect(result.steps.length).toBeGreaterThan(0);
  });
});
```

## 🔧 Common Utilities

### Generate Test Data

```typescript
import { 
  generateFeatureRequestInput,
  generateBugFixInput,
  generateRefactorInput,
} from './utils';

// Feature request
const featureInput = generateFeatureRequestInput({
  description: 'My custom feature',
  priority: 'high',
});

// Bug fix
const bugInput = generateBugFixInput({
  severity: 'critical',
});

// Refactor
const refactorInput = generateRefactorInput({
  currentLanguage: 'JavaScript',
});
```

### Measure Performance

```typescript
import { measureWorkflowExecution, measureWorkflowPerformance } from './utils';

// Single execution
const { duration, result } = await measureWorkflowExecution(() =>
  orchestrator.executeWorkflow(input)
);
console.log(`Response time: ${duration.toFixed(2)}ms`);

// Multiple executions with statistics
const stats = await measureWorkflowPerformance(
  () => orchestrator.executeWorkflow(input),
  100 // iterations
);
console.log(`Average: ${stats.average.toFixed(2)}ms`);
console.log(`P95: ${stats.p95.toFixed(2)}ms`);
console.log(`Throughput: ${stats.throughput.toFixed(2)} req/s`);
```

### Create Mock Projects

```typescript
import { createMockProject } from './utils';

// Create different project types
await createMockProject('/tmp/express-app', 'express');
await createMockProject('/tmp/react-app', 'react');
await createMockProject('/tmp/nodejs-app', 'nodejs');
await createMockProject('/tmp/api-app', 'api');
```

### Validate Results

```typescript
import { 
  validateWorkflowResult,
  validatePerformanceMetrics,
} from './utils';

// Validate workflow structure
if (validateWorkflowResult(result)) {
  console.log('Valid workflow result');
}

// Validate performance
const validation = validatePerformanceMetrics(stats, {
  maxAverage: 100,
  maxP95: 200,
  minThroughput: 10,
  maxErrorRate: 1,
});

if (validation.passed) {
  console.log('Performance is acceptable');
} else {
  console.log('Violations:', validation.violations);
}
```

## 📊 Test Patterns

### Test Complete Workflow

```typescript
it('should complete feature request workflow', async () => {
  const input = generateFeatureRequestInput({
    description: 'Add authentication system',
  });

  const result = await orchestrator.executeWorkflow(input);

  // Verify success
  expect(result.success).toBe(true);

  // Verify steps executed
  const stepNames = result.steps.map(s => s.name);
  expect(stepNames).toContain('input-parsing');
  expect(stepNames).toContain('project-analysis');
  expect(stepNames).toContain('planning');
  expect(stepNames).toContain('implementation');
  expect(stepNames).toContain('review');

  // Verify artifacts
  expect(result.artifacts).toBeDefined();
  if (result.artifacts.code) {
    expect(result.artifacts.code.length).toBeGreaterThan(0);
  }
});
```

### Test Error Handling

```typescript
it('should handle invalid input gracefully', async () => {
  const invalidInput = {
    type: 'feature-request',
    description: '', // Empty description
  };

  const result = await orchestrator.executeWorkflow(invalidInput);

  // Should fail gracefully
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error.code).toMatch(/VALIDATION_ERROR/);
});
```

### Test Performance

```typescript
it('should maintain performance under load', async () => {
  const input = generateFeatureRequestInput();

  const stats = await measureWorkflowPerformance(
    () => orchestrator.executeWorkflow(input),
    100
  );

  // Performance assertions
  expect(stats.average).toBeLessThan(100); // < 100ms
  expect(stats.p95).toBeLessThan(200); // P95 < 200ms
  expect(stats.throughput).toBeGreaterThan(10); // > 10 req/s
  expect(stats.errors).toBe(0); // No errors
});
```

### Test Concurrent Execution

```typescript
it('should handle concurrent requests', async () => {
  const workflows = Array.from({ length: 10 }, (_, i) => ({
    type: 'feature-request',
    description: `Request ${i}`,
  }));

  // Execute concurrently
  const results = await Promise.all(
    workflows.map(input => orchestrator.executeWorkflow(input))
  );

  // All should succeed
  results.forEach(result => {
    expect(result.success).toBe(true);
  });

  // Should have different session IDs
  const sessionIds = results.map(r => r.sessionId);
  const uniqueIds = new Set(sessionIds);
  expect(uniqueIds.size).toBe(10);
});
```

## 🚨 Debugging Tips

### 1. Enable Verbose Logging

```typescript
// In beforeAll or test
logger.level = 'debug';

// Or use test-specific logger
const testLogger = logger.child({ test: 'my-test' });
testLogger.info('Debug information');
```

### 2. Run Single Test

```typescript
// Focus on one test
it.only('this is the only test that runs', () => {
  // Test code
});

// Or skip specific tests
it.skip('this test is skipped', () => {
  // Test code
});
```

### 3. Add Console Output

```typescript
it('should work', async () => {
  console.log('Test state:', state);
  console.log('Result:', result);
  
  const intermediateResult = await doSomething();
  console.log('Intermediate:', intermediateResult);
  
  expect(result).toBeDefined();
});
```

### 4. Increase Timeout

```typescript
// For slow tests
it('slow test', async () => {
  // Test code
}, 60000); // 60 seconds
```

### 5. Check Test Directory

```typescript
import { e2eTestUtils } from './setup';

beforeEach(async () => {
  const testDir = e2eTestUtils.getTestDir();
  console.log('Test directory:', testDir);
});
```

## 📦 Package Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "jest --config=tests/e2e/jest.config.ts",
    "test:e2e:watch": "jest --config=tests/e2e/jest.config.ts --watch",
    "test:e2e:coverage": "jest --config=tests/e2e/jest.config.ts --coverage",
    "test:e2e:debug": "node --inspect-brk node_modules/.bin/jest --config=tests/e2e/jest.config.ts --runInBand"
  }
}
```

## 🎯 Best Practices

1. **Always clean up** - Use `afterEach` or `afterAll` to clean up resources
2. **Use descriptive names** - `it('should add authentication to Express app', ...)`
3. **Test one thing** - Each test should validate one specific behavior
4. **Use utilities** - Don't repeat setup code, use helper functions
5. **Assert thoroughly** - Check success, errors, metrics, and side effects
6. **Consider performance** - Add performance tests for critical workflows
7. **Test errors** - Always test both success and failure scenarios

## 🆘 Common Issues

### Database Connection Error
```bash
# Check if database is running
pg_isready -h localhost -p 5432

# Restart database
docker restart e2e-test-db
```

### Port Already in Use
```typescript
// Use random port
const testPort = Math.floor(Math.random() * 10000) + 30000;
```

### Test Timeout
```typescript
// Increase timeout in test
it('slow test', async () => {
  // Test code
}, 60000);
```

### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e
```

## 📚 More Resources

- [Full E2E Documentation](README.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Jest Documentation](https://jestjs.io/docs)
- [Testing Best Practices](../README.md)

## 💡 Need Help?

Check:
1. ✅ Is the test database running?
2. ✅ Are environment variables set?
3. ✅ Is the port available?
4. ✅ Did you increase timeout for slow tests?
5. ✅ Are you cleaning up resources?

For more help, see the full documentation in README.md
