# End-to-End Testing Documentation

## 📋 Overview

This directory contains comprehensive end-to-end (E2E) tests for the AI Code Agent system. These tests verify the complete integration of all system components working together in realistic scenarios.

## 📁 Test Files

### 1. `test-end-to-end.ts` - Core Workflow Tests
Tests complete workflows from input to result across the entire system.

**What it tests:**
- Complete feature request workflows
- Bug fix workflows
- Code refactoring workflows
- Multi-component integration
- Session persistence
- Data flow validation
- State transitions

**Example workflow:**
```typescript
const workflowInput = {
  type: 'feature-request',
  description: 'Add user authentication system',
  requirements: ['Login/logout', 'JWT tokens', 'Password hashing'],
};

const result = await orchestrator.executeWorkflow(workflowInput);
expect(result.success).toBe(true);
```

### 2. `test-real-scenarios.ts` - Real-World Scenarios
Tests realistic development scenarios developers encounter in production.

**Scenarios covered:**
- Adding features to existing applications
- Integrating third-party services
- Fixing production issues (memory leaks, race conditions)
- Refactoring legacy code
- Managing technical debt
- Cloud migrations
- Microservices integration

**Example scenario:**
```typescript
// Add authentication to existing Express app
const existingApp = {
  type: 'existing-project',
  framework: 'Express',
  missing: ['Authentication', 'JWT'],
};

const result = await orchestrator.executeWorkflow({
  type: 'feature-request',
  description: 'Add JWT authentication',
  projectPath: '/path/to/express/app',
});
```

### 3. `test-error-handling.ts` - Error Scenarios
Tests error handling, recovery mechanisms, and system resilience.

**Error scenarios:**
- Network failures and timeouts
- Invalid/malicious inputs
- Resource exhaustion (memory, CPU, disk)
- Partial failures in workflows
- Recovery mechanisms (retries, circuit breakers)
- Error propagation and logging

**Example error test:**
```typescript
// Test database connection failure
dbClient.connect = jest.fn().mockRejectedValue(
  new Error('Connection refused')
);

const result = await orchestrator.executeWorkflow(input);
expect(result.success).toBe(false);
expect(result.retryable).toBe(true);
```

### 4. `test-performance.ts` - Performance & Stress Tests
Tests system performance characteristics and stress limits.

**Performance metrics:**
- Response time benchmarks
- Memory usage patterns
- Throughput measurements
- Concurrency limits
- Scalability testing
- Long-running stability
- Resource utilization

**Example performance test:**
```typescript
// Test < 100ms response time for simple workflows
const iterations = 100;
const responseTimes = await measureWorkflowPerformance(iterations);

const avgTime = calculateAverage(responseTimes);
expect(avgTime).toBeLessThan(100); // ms
```

## 🚀 Running E2E Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
# Core workflow tests
npm test -- test-end-to-end.ts

# Real-world scenarios
npm test -- test-real-scenarios.ts

# Error handling tests
npm test -- test-error-handling.ts

# Performance tests
npm test -- test-performance.ts
```

### Run with Coverage
```bash
npm run test:e2e -- --coverage
```

### Run in CI Mode
```bash
CI=true npm run test:e2e -- --ci --watchAll=false
```

### Debug Mode
```bash
npm run test:debug tests/e2e/test-end-to-end.ts
```

## ⚙️ Configuration

### Environment Variables
```bash
# Required
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=ai_code_agent_e2e_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=postgres

# Optional
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=1
```

### Test Database Setup
```bash
# Create test database
createdb ai_code_agent_e2e_test

# Or using Docker
docker run --name e2e-test-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_code_agent_e2e_test -p 5432:5432 -d postgres:13
```

### Performance Test Configuration
Edit the performance thresholds in `index.ts`:
```typescript
export const e2eTestConfig = {
  performance: {
    maxAverageResponseTime: 100,  // ms
    maxP95ResponseTime: 200,      // ms
    minThroughput: 10,            // req/s
    maxMemoryGrowthPercent: 10,   // %
    maxErrorRate: 1,              // %
  },
};
```

## 📊 Understanding Test Results

### Core Workflow Tests
Look for:
- ✅ Workflow completed successfully
- ✅ All required steps executed
- ✅ Artifacts generated correctly
- ✅ Session persistence working
- ✅ Data flow consistent

### Real-World Scenario Tests
Look for:
- ✅ Feature integration successful
- ✅ Existing code preserved
- ✅ Constraints respected
- ✅ Migration strategy sound

### Error Handling Tests
Look for:
- ✅ Errors handled gracefully
- ✅ Appropriate error codes returned
- ✅ Recovery mechanisms work
- ✅ Security maintained
- ✅ Logging captures context

### Performance Tests
Look for:
- ✅ Response times within thresholds
- ✅ No memory leaks
- ✅ Good throughput maintained
- ✅ Graceful degradation under load

## 🔧 Writing New E2E Tests

### Test Structure Template
```typescript
describe('New E2E Test Suite', () => {
  let app: Application;
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    app = new Application({ port: testPort });
    await app.initialize();
  });

  afterAll(async () => {
    // Cleanup
    await app.stop();
  });

  it('should handle specific scenario', async () => {
    const input = {
      type: 'feature-request',
      description: 'Test scenario',
    };

    const result = await orchestrator.executeWorkflow(input);

    // Assertions
    expect(result.success).toBe(true);
    // ... more assertions
  });
});
```

### Best Practices

1. **Use Descriptive Test Names**
   ```typescript
   it('should add authentication to existing Express app without breaking existing routes', () => {});
   ```

2. **Test Complete Workflows**
   ```typescript
   // Test from input to final result
   const result = await orchestrator.executeWorkflow(input);
   expect(result.artifacts).toBeDefined();
   expect(result.steps).toEqual(expectedSteps);
   ```

3. **Verify Realistic Scenarios**
   ```typescript
   // Use actual project structures
   const projectPath = path.join(tempDir, 'real-project-structure');
   await createTestProject(projectPath);
   ```

4. **Include Error Cases**
   ```typescript
   it('should handle malformed input gracefully', async () => {
     const result = await orchestrator.executeWorkflow(invalidInput);
     expect(result.success).toBe(false);
     expect(result.error.code).toBe('VALIDATION_ERROR');
   });
   ```

5. **Measure Performance**
   ```typescript
   const startTime = performance.now();
   await orchestrator.executeWorkflow(input);
   const duration = performance.now() - startTime;
   expect(duration).toBeLessThan(1000);
   ```

6. **Clean Up Resources**
   ```typescript
   afterAll(async () => {
     // Remove test files
     await fs.rm(testDir, { recursive: true, force: true });
     // Close connections
     await app.stop();
   });
   ```

## 🎯 Test Coverage Goals

### Core Functionality
- ✅ Complete workflow execution
- ✅ Component integration
- ✅ Data persistence
- ✅ Error handling
- ✅ Performance benchmarks

### Real-World Scenarios
- ✅ Feature additions to existing code
- ✅ Bug fixes in production
- ✅ Code refactoring
- ✅ Technical debt management
- ✅ Migration scenarios

### Resilience
- ✅ Network failures
- ✅ Resource exhaustion
- ✅ Invalid inputs
- ✅ Concurrent access
- ✅ Recovery mechanisms

## 🚨 Troubleshooting

### Common Issues

1. **Test Timeouts**
   ```typescript
   // Increase timeout for slow tests
   it('slow test', async () => {
     // Test code
   }, 60000); // 60 seconds
   ```

2. **Database Connection Issues**
   ```bash
   # Check if test database is running
   pg_isready -h localhost -p 5432
   
   # Recreate test database
   dropdb ai_code_agent_e2e_test
   createdb ai_code_agent_e2e_test
   ```

3. **Port Conflicts**
   ```typescript
   // Use random port
   const testPort = Math.floor(Math.random() * 10000) + 30000;
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e
   ```

5. **Slow Tests**
   ```typescript
   // Use mocks for slow operations
   orchestrator.executeWorkflowPipeline = jest.fn().mockResolvedValue({
     success: true,
     steps: [],
     artifacts: {},
   });
   ```

### Debugging Failed Tests

1. **Enable Verbose Logging**
   ```typescript
   logger.level = 'debug';
   ```

2. **Use Test-Specific Logger**
   ```typescript
   const testLogger = logger.child({ test: 'specific-test-name' });
   testLogger.info('Debug information');
   ```

3. **Add Console Output**
   ```typescript
   console.log('Current state:', state);
   console.log('Result:', result);
   ```

4. **Isolate Failing Tests**
   ```typescript
   it.only('only this test runs', () => {
     // Test code
   });
   ```

## 📈 Performance Optimization

### Test Execution Speed
- Use appropriate mocks for slow operations
- Reuse application instances when possible
- Clean up resources promptly
- Use concurrent testing where safe

### Resource Usage
- Monitor memory usage during tests
- Clean up temporary files
- Close database connections
- Clear event listeners

### CI/CD Optimization
- Run tests in parallel
- Use test sharding
- Cache dependencies
- Run only affected tests

## 📚 Additional Resources

- [Jest E2E Testing Guide](https://jestjs.io/docs/tutorial-async)
- [Testing TypeScript Applications](https://jestjs.io/docs/typescript)
- [Performance Testing Best Practices](https://k6.io/docs/)
- [Error Handling Patterns](https://nodejs.org/api/errors.html)

## 🤝 Contributing

When adding new E2E tests:

1. Follow the established test structure
2. Include both positive and negative test cases
3. Add performance benchmarks where applicable
4. Test real-world scenarios
5. Document complex test scenarios
6. Ensure tests are independent and repeatable
7. Clean up resources after tests
8. Update this documentation

## 📄 License

E2E tests are part of the AI Code Agent project and follow the same license terms.
