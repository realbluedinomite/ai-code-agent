# Testing Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Prerequisites](#prerequisites)
4. [Environment Setup](#environment-setup)
5. [Running Tests](#running-tests)
6. [Test Types](#test-types)
7. [Component Testing](#component-testing)
8. [Database Testing](#database-testing)
9. [Groq API Testing](#groq-api-testing)
10. [Integration Testing](#integration-testing)
11. [End-to-End Testing](#end-to-end-testing)
12. [Performance Testing](#performance-testing)
13. [Troubleshooting](#troubleshooting)
14. [Best Practices](#best-practices)

---

## Overview

The AI Code Agent system uses a comprehensive testing strategy with multiple test types:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete workflows
- **Performance Tests**: Verify system performance and scalability
- **Component Health Tests**: Verify system health and configuration

---

## Quick Start

### 1. Verify Your Setup

Before running tests, verify your environment:

```bash
# Run comprehensive setup verification
npm run test:setup

# Or run specific checks
npm run test:setup -- --env      # Environment variables
npm run test:setup -- --deps     # Dependencies
npm run test:setup -- --db       # Database
npm run test:setup -- --groq     # Groq API
```

### 2. Run All Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 3. Run Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# CI mode (no watch, with coverage)
npm run test:ci
```

---

## Prerequisites

### Required Software
- Node.js 18+ 
- npm 8+
- PostgreSQL 12+
- Git

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Core Environment
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent_dev
DB_USER=ai_agent_user
DB_PASSWORD=your_secure_password
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=postgres

# Optional: Groq AI API
GROQ_API_KEY=your_groq_api_key

# Optional: Redis (for caching and sessions)
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Security
JWT_SECRET=your_jwt_secret_min_32_chars
```

---

## Environment Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Option A: Automatic setup (recommended)
npm run db:setup -- --full

# Option B: Manual setup
npm run db:migrate
npm run db:seed
```

### 3. Verify Configuration

```bash
# Run test setup verification
npm run test:setup -- --verbose
```

Expected output:
```
✓ Node.js version: v18.x.x
✓ Dependencies installed
✓ TypeScript configuration valid
✓ Database connection successful
✓ Groq API key valid (if configured)
✓ Component health check complete
```

### 4. Start Development Server

```bash
npm run dev
```

---

## Running Tests

### Test Commands Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:e2e` | Run end-to-end tests only |
| `npm run test:ci` | CI mode (no watch, with coverage) |
| `npm run test:debug` | Debug tests with Node inspector |
| `npm run test:perf` | Run performance tests |
| `npm run test:snapshots` | Update test snapshots |

### Test Setup Commands

| Command | Description |
|---------|-------------|
| `npm run test:setup` | Run comprehensive setup verification |
| `npm run test:db:setup` | Setup test database |
| `npm run test:db:cleanup` | Clean up test database |

---

## Test Types

### Unit Tests

Unit tests verify individual components in isolation.

**Location**: `tests/unit/`

**Run**: `npm run test:unit`

**Example**:
```typescript
// tests/unit/components/example.test.ts
import { ExampleComponent } from '@/components/example';

describe('ExampleComponent', () => {
  it('should initialize correctly', () => {
    const component = new ExampleComponent();
    expect(component).toBeDefined();
  });

  it('should handle input correctly', () => {
    const component = new ExampleComponent();
    const result = component.process('test input');
    expect(result).toBe('processed: test input');
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Location**: `tests/integration/`

**Run**: `npm run test:integration`

**Example**:
```typescript
// tests/integration/component-integration.test.ts
import { ComponentA } from '@/components/a';
import { ComponentB } from '@/components/b';

describe('Component Integration', () => {
  it('should integrate components A and B', async () => {
    const a = new ComponentA();
    const b = new ComponentB();
    
    const result = await a.process('data');
    const final = await b.process(result);
    
    expect(final).toBeDefined();
  });
});
```

### End-to-End Tests

End-to-end tests simulate real user workflows.

**Location**: `tests/e2e/`

**Run**: `npm run test:e2e`

**Example**:
```typescript
// tests/e2e/workflow.test.ts
import { spawn } from 'child_process';

describe('End-to-End Workflow', () => {
  it('should complete full workflow', async () => {
    const agent = spawn('npm', ['run', 'start'], {
      stdio: 'pipe'
    });

    // Simulate user input
    agent.stdin.write('create a simple API endpoint\n');
    
    // Wait for completion
    const output = await new Promise<string>((resolve) => {
      agent.stdout.on('data', (data) => {
        if (data.toString().includes('completed')) {
          resolve(data.toString());
        }
      });
    });

    expect(output).toContain('completed');
    agent.kill();
  });
});
```

---

## Component Testing

### Testing the Config Manager

```typescript
// tests/unit/core/config.test.ts
import { config } from '@/core/config';

describe('Config Manager', () => {
  beforeEach(() => {
    config.clear();
  });

  it('should load configuration from environment', () => {
    process.env.TEST_VAR = 'test_value';
    
    config.loadFromEnvironment();
    
    expect(config.get('TEST_VAR')).toBe('test_value');
  });

  it('should validate required configuration', () => {
    config.set('REQUIRED_VAR', 'value');
    
    const result = config.validate();
    
    expect(result.isValid).toBe(true);
  });

  it('should emit change events', (done) => {
    config.on('change', (event) => {
      expect(event.key).toBe('test');
      expect(event.newValue).toBe('new_value');
      done();
    });

    config.set('test', 'new_value');
  });
});
```

### Testing the Logger

```typescript
// tests/unit/core/logger.test.ts
import { logger } from '@/core/logger';

describe('Logger', () => {
  it('should log messages at different levels', () => {
    expect(() => {
      logger.info('Info message');
      logger.debug('Debug message');
      logger.warn('Warning message');
      logger.error('Error message');
    }).not.toThrow();
  });

  it('should respect log level configuration', () => {
    // Test with different log levels
    process.env.LOG_LEVEL = 'error';
    
    const errorLogger = new Logger({ level: 'error' });
    expect(errorLogger.debug('debug')).toBeUndefined();
    expect(errorLogger.error('error')).toBeDefined();
  });
});
```

### Testing the Event Bus

```typescript
// tests/unit/core/event-bus.test.ts
import { EventBus } from '@/core/event-bus';

describe('Event Bus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
  });

  it('should emit and receive events', () => {
    let receivedData: any;

    const unsubscribe = eventBus.on('test-event', (data) => {
      receivedData = data;
    });

    eventBus.emit('test-event', { message: 'test' });

    expect(receivedData.message).toBe('test');
    unsubscribe();
  });

  it('should handle multiple listeners', () => {
    const calls: string[] = [];

    eventBus.on('multi-event', () => calls.push('listener1'));
    eventBus.on('multi-event', () => calls.push('listener2'));

    eventBus.emit('multi-event');

    expect(calls).toHaveLength(2);
    expect(calls).toContain('listener1');
    expect(calls).toContain('listener2');
  });
});
```

### Testing AI Providers

```typescript
// tests/unit/providers/groq-ai-provider.test.ts
import { GroqAIProvider } from '@/providers/groq-ai-provider';

describe('GroqAIProvider', () => {
  let provider: GroqAIProvider;

  beforeEach(() => {
    provider = new GroqAIProvider();
  });

  it('should initialize with valid API key', async () => {
    process.env.GROQ_API_KEY = 'test_key';
    
    await expect(provider.initialize({
      apiKey: process.env.GROQ_API_KEY
    })).resolves.not.toThrow();
  });

  it('should throw error with invalid API key', async () => {
    await expect(provider.initialize({
      apiKey: 'invalid_key'
    })).rejects.toThrow();
  });

  it('should complete text with valid config', async () => {
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'test_key'
    });

    const response = await provider.completeText({
      prompt: 'Hello, world!',
      maxTokens: 50
    });

    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('usage');
  });

  it('should generate code', async () => {
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'test_key'
    });

    const response = await provider.generateCode({
      prompt: 'Create a function to add two numbers',
      language: 'typescript'
    });

    expect(response).toHaveProperty('code');
    expect(response).toHaveProperty('qualityScore');
  });
});
```

---

## Database Testing

### Test Database Setup

```typescript
// tests/helpers/database-setup.ts
import { DatabaseConnectionManager } from '@/database/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DatabaseTestSetup {
  private static instance: DatabaseTestSetup;
  private dbManager: DatabaseConnectionManager;

  private constructor() {
    this.dbManager = new DatabaseConnectionManager();
  }

  static getInstance(): DatabaseTestSetup {
    if (!DatabaseTestSetup.instance) {
      DatabaseTestSetup.instance = new DatabaseTestSetup();
    }
    return DatabaseTestSetup.instance;
  }

  async setup(): Promise<void> {
    // Create test database
    await execAsync('createdb ai_code_agent_test');
    
    // Run migrations
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'ai_code_agent_test';
    
    const { MigrationManager } = await import('@/database/migrations');
    const db = await this.dbManager.getConnection();
    const migrationManager = new MigrationManager(db);
    await migrationManager.runMigrations();
  }

  async teardown(): Promise<void> {
    // Clean up test database
    await execAsync('dropdb ai_code_agent_test');
  }

  async getConnection() {
    return this.dbManager.getConnection();
  }
}
```

### Testing Database Models

```typescript
// tests/unit/database/user-model.test.ts
import { User } from '@/database/models/User';
import { DatabaseTestSetup } from '@/tests/helpers/database-setup';

describe('User Model', () => {
  let db: any;
  let testSetup: DatabaseTestSetup;

  beforeAll(async () => {
    testSetup = DatabaseTestSetup.getInstance();
    await testSetup.setup();
    db = await testSetup.getConnection();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.query('DELETE FROM users');
  });

  it('should create a new user', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashed_password'
    });

    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
  });

  it('should find user by username', async () => {
    await User.create({
      username: 'johndoe',
      email: 'john@example.com',
      password: 'hashed_password'
    });

    const found = await User.findByUsername('johndoe');
    
    expect(found).toBeDefined();
    expect(found?.username).toBe('johndoe');
  });

  it('should validate unique username', async () => {
    await User.create({
      username: 'uniqueuser',
      email: 'first@example.com',
      password: 'password1'
    });

    await expect(
      User.create({
        username: 'uniqueuser',
        email: 'second@example.com',
        password: 'password2'
      })
    ).rejects.toThrow();
  });
});
```

### Testing Database Migrations

```typescript
// tests/unit/database/migrations.test.ts
import { MigrationManager } from '@/database/migrations';
import { DatabaseTestSetup } from '@/tests/helpers/database-setup';

describe('Database Migrations', () => {
  let db: any;
  let migrationManager: MigrationManager;
  let testSetup: DatabaseTestSetup;

  beforeEach(async () => {
    testSetup = DatabaseTestSetup.getInstance();
    await testSetup.setup();
    db = await testSetup.getConnection();
    migrationManager = new MigrationManager(db);
  });

  afterEach(async () => {
    await testSetup.teardown();
  });

  it('should run migrations successfully', async () => {
    await expect(migrationManager.runMigrations()).resolves.not.toThrow();
  });

  it('should create expected tables', async () => {
    await migrationManager.runMigrations();

    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableNames = tables.rows.map((row: any) => row.table_name);
    
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('tasks');
  });

  it('should handle migration rollback', async () => {
    await migrationManager.runMigrations();
    await migrationManager.rollbackMigrations();

    const tables = await db.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    expect(parseInt(tables.rows[0].count)).toBe(0);
  });
});
```

---

## Groq API Testing

### Testing API Key Validation

```typescript
// tests/unit/providers/groq-validation.test.ts
import { GroqAIProvider } from '@/providers/groq-ai-provider';

describe('Groq API Validation', () => {
  it('should reject invalid API key', async () => {
    const provider = new GroqAIProvider();
    
    await expect(
      provider.initialize({ apiKey: 'invalid_key' })
    ).rejects.toThrow(/invalid.*api.*key/i);
  });

  it('should accept valid API key', async () => {
    const provider = new GroqAIProvider();
    
    if (!process.env.GROQ_API_KEY) {
      console.log('Skipping Groq API test - no API key');
      return;
    }

    await expect(
      provider.initialize({ apiKey: process.env.GROQ_API_KEY })
    ).resolves.not.toThrow();
  });

  it('should get available models', async () => {
    const provider = new GroqAIProvider();
    
    if (!process.env.GROQ_API_KEY) {
      console.log('Skipping model test - no API key');
      return;
    }

    await provider.initialize({ apiKey: process.env.GROQ_API_KEY });
    const models = await provider.getAvailableModels();

    expect(models).toHaveLength.greaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('name');
  });
});
```

### Testing API Responses

```typescript
// tests/integration/groq-integration.test.ts
import { GroqAIProvider } from '@/providers/groq-ai-provider';

describe('Groq API Integration', () => {
  let provider: GroqAIProvider;

  beforeAll(async () => {
    if (!process.env.GROQ_API_KEY) {
      console.log('Skipping Groq integration tests - no API key');
      return;
    }

    provider = new GroqAIProvider();
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY
    });
  });

  afterAll(async () => {
    if (provider) {
      await provider.close();
    }
  });

  it('should complete text successfully', async () => {
    if (!provider) return;

    const response = await provider.completeText({
      prompt: 'What is artificial intelligence?',
      maxTokens: 100
    });

    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.usage).toBeDefined();
  });

  it('should handle chat completion', async () => {
    if (!provider) return;

    const response = await provider.completeChat({
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      maxTokens: 50
    });

    expect(response.message.content).toBeTruthy();
    expect(response.usage).toBeDefined();
  });

  it('should generate code', async () => {
    if (!provider) return;

    const response = await provider.generateCode({
      prompt: 'Create a function to calculate fibonacci numbers',
      language: 'typescript'
    });

    expect(response.code).toBeTruthy();
    expect(response.language).toBe('typescript');
    expect(response.qualityScore).toBeGreaterThanOrEqual(0);
  });

  it('should respect rate limits', async () => {
    if (!provider) return;

    // Make multiple requests to test rate limiting
    const promises = Array(10).fill(0).map(() => 
      provider.completeText({
        prompt: 'Test',
        maxTokens: 1
      })
    );

    await expect(Promise.all(promises)).resolves.not.toThrow();
  });
});
```

---

## Integration Testing

### Testing Component Integration

```typescript
// tests/integration/orchestrator-integration.test.ts
import { Orchestrator } from '@/orchestrator/orchestrator';
import { Implementer } from '@/orchestrator/implementer';
import { Reviewer } from '@/orchestrator/reviewer';

describe('Orchestrator Integration', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  it('should coordinate implementer and reviewer', async () => {
    const task = {
      type: 'code-generation',
      description: 'Create a simple API endpoint',
      context: { language: 'typescript' }
    };

    const result = await orchestrator.executeTask(task);

    expect(result.status).toBe('completed');
    expect(result.output).toBeDefined();
    expect(result.output.implementations).toBeDefined();
    expect(result.output.reviews).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const invalidTask = {
      type: 'invalid-type',
      description: 'Invalid task'
    };

    await expect(
      orchestrator.executeTask(invalidTask as any)
    ).rejects.toThrow();
  });
});
```

### Testing Workflow Orchestration

```typescript
// tests/integration/workflow-orchestration.test.ts
import { WorkflowManager } from '@/orchestrator/workflow-manager';
import { Task } from '@/types';

describe('Workflow Orchestration', () => {
  let workflowManager: WorkflowManager;

  beforeEach(() => {
    workflowManager = new WorkflowManager();
  });

  it('should execute complete workflow', async () => {
    const tasks: Task[] = [
      {
        id: '1',
        type: 'analysis',
        description: 'Analyze requirements'
      },
      {
        id: '2',
        type: 'implementation',
        description: 'Implement solution'
      },
      {
        id: '3',
        type: 'review',
        description: 'Review implementation'
      }
    ];

    const workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      tasks
    };

    const result = await workflowManager.executeWorkflow(workflow);

    expect(result.status).toBe('completed');
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].status).toBe('completed');
    expect(result.tasks[1].status).toBe('completed');
    expect(result.tasks[2].status).toBe('completed');
  });

  it('should handle workflow errors', async () => {
    const failedTask: Task = {
      id: 'failing-task',
      type: 'failing-type',
      description: 'This task will fail'
    };

    const workflow = {
      id: 'failing-workflow',
      name: 'Failing Workflow',
      tasks: [failedTask]
    };

    const result = await workflowManager.executeWorkflow(workflow);

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });
});
```

---

## End-to-End Testing

### Testing Complete User Workflows

```typescript
// tests/e2e/user-workflows.test.ts
import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(spawn);

describe('End-to-End User Workflows', () => {
  it('should complete code generation workflow', async () => {
    const agent = spawn('npm', ['run', 'cli', '--', 'generate', 'api-endpoint'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    
    agent.stdout.on('data', (data) => {
      output += data.toString();
    });

    agent.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Wait for completion
    const exitCode = await new Promise<number>((resolve) => {
      agent.on('close', resolve);
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('completed');
  }, 30000);

  it('should handle interactive sessions', async () => {
    const agent = spawn('npm', ['run', 'cli'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send commands
    agent.stdin.write('analyze project\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    agent.stdin.write('create component TestComponent\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    agent.stdin.write('exit\n');

    let output = '';
    agent.stdout.on('data', (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
      agent.on('close', resolve);
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('analyze');
    expect(output).toContain('create');
  }, 30000);
});
```

---

## Performance Testing

### Load Testing

```typescript
// tests/performance/load.test.ts
import { GroqAIProvider } from '@/providers/groq-ai-provider';

describe('Performance Tests', () => {
  let provider: GroqAIProvider;

  beforeAll(async () => {
    if (!process.env.GROQ_API_KEY) {
      console.log('Skipping performance tests - no API key');
      return;
    }

    provider = new GroqAIProvider();
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY
    });
  });

  afterAll(async () => {
    if (provider) {
      await provider.close();
    }
  });

  it('should handle concurrent requests', async () => {
    if (!provider) return;

    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = Array(concurrentRequests).fill(0).map(() =>
      provider.completeText({
        prompt: 'Hello',
        maxTokens: 10
      })
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(concurrentRequests);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    expect(duration / concurrentRequests).toBeLessThan(5000); // Average < 5s per request
  });

  it('should maintain response quality under load', async () => {
    if (!provider) return;

    const requests = 5;
    const promises = Array(requests).fill(0).map(() =>
      provider.completeText({
        prompt: 'Explain the concept of artificial intelligence',
        maxTokens: 100
      })
    );

    const results = await Promise.all(promises);

    // All responses should be valid
    results.forEach(result => {
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);
    });

    // Response times should be reasonable
    results.forEach(result => {
      expect(result.responseTime).toBeLessThan(10000); // < 10 seconds
    });
  }, 60000);
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Failed

**Symptoms**:
- Tests fail with "connection refused"
- Database authentication errors

**Solutions**:
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Check connection settings
npm run test:setup -- --db
```

#### 2. Groq API Key Invalid

**Symptoms**:
- API tests fail with 401/403 errors
- "Invalid API key" messages

**Solutions**:
```bash
# Verify API key is set
echo $GROQ_API_KEY

# Check .env file
cat .env | grep GROQ_API_KEY

# Test API key
npm run test:setup -- --groq
```

#### 3. TypeScript Compilation Errors

**Symptoms**:
- Tests fail to run
- TypeScript compilation warnings

**Solutions**:
```bash
# Type check project
npm run type-check

# Compile TypeScript
npx tsc --noEmit

# Check tsconfig.json
cat tsconfig.json
```

#### 4. Test Timeouts

**Symptoms**:
- Tests timeout unexpectedly
- Tests hang indefinitely

**Solutions**:
```bash
# Run tests with longer timeout
npm test -- --testTimeout=30000

# Run specific test
npm test -- tests/unit/specific.test.ts

# Debug tests
npm run test:debug
```

#### 5. Port Already in Use

**Symptoms**:
- Cannot start test server
- "EADDRINUSE" errors

**Solutions**:
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm test
```

### Debug Mode

Enable debug mode for detailed test output:

```bash
# Run tests in debug mode
npm run test:debug

# Enable verbose logging
DEBUG=test:* npm test

# Show console logs in tests
npm test -- --verbose
```

---

## Best Practices

### Writing Tests

1. **Use Descriptive Test Names**
   ```typescript
   // Good
   it('should create a user with valid email and password');
   
   // Bad
   it('should work');
   ```

2. **Follow AAA Pattern (Arrange, Act, Assert)**
   ```typescript
   it('should process user input correctly', () => {
     // Arrange
     const processor = new UserProcessor();
     const input = { name: 'John', email: 'john@example.com' };
     
     // Act
     const result = processor.process(input);
     
     // Assert
     expect(result.id).toBeDefined();
     expect(result.name).toBe('John');
   });
   ```

3. **Use Setup and Teardown**
   ```typescript
   beforeAll(async () => {
     // Setup once before all tests
     await setupDatabase();
   });

   beforeEach(() => {
     // Setup before each test
     clearTestData();
   });

   afterEach(() => {
     // Cleanup after each test
     resetMocks();
   });

   afterAll(async () => {
     // Cleanup after all tests
     await cleanupDatabase();
   });
   ```

4. **Mock External Dependencies**
   ```typescript
   // Mock database
   jest.mock('@/database/client');
   
   // Mock API calls
   jest.mock('axios');
   
   // Use spy for method monitoring
   const logSpy = jest.spyOn(logger, 'info');
   ```

### Test Data Management

1. **Use Factories for Test Data**
   ```typescript
   // tests/factories/UserFactory.ts
   export class UserFactory {
     static create(overrides = {}) {
       return {
         id: '1',
         username: 'testuser',
         email: 'test@example.com',
         password: 'hashed_password',
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
     logLevel: 'error', // Reduce noise in tests
     disableExternalAPIs: true
   };
   ```

### Performance Optimization

1. **Parallel Test Execution**
   ```typescript
   // jest.config.ts
   export default {
     maxWorkers: '50%', // Use half available CPU cores
   };
   ```

2. **Selective Test Running**
   ```typescript
   // Run tests matching pattern
   npm test -- --testNamePattern="user management"
   
   // Run specific file
   npm test tests/unit/user.test.ts
   ```

3. **Test Coverage**
   ```typescript
   // Minimum coverage thresholds
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

### Continuous Integration

1. **Pre-commit Hooks**
   ```bash
   # Run tests before commit
   npm run pre-commit
   
   # Or use Husky
   npx husky add .husky/pre-commit "npm run test:unit"
   ```

2. **CI Pipeline**
   ```yaml
   # .github/workflows/test.yml
   name: Test
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run test:ci
   ```

---

## Appendix

### Useful Commands

```bash
# Run tests with custom configuration
npm test -- --config=jest.custom.config.js

# Update snapshots
npm test -- -u

# Generate coverage report
npm run test:coverage && open coverage/lcov-report/index.html

# Profile test performance
npm test -- --detectLeaks --prof

# Run tests in random order
npm test -- --runInBand
```

### Test File Templates

**Unit Test Template**:
```typescript
import { Component } from '@/components/Component';

describe('Component', () => {
  let component: Component;

  beforeEach(() => {
    component = new Component();
  });

  it('should initialize correctly', () => {
    expect(component).toBeDefined();
  });

  // Add more tests...
});
```

**Integration Test Template**:
```typescript
import { ComponentA } from '@/components/A';
import { ComponentB } from '@/components/B';

describe('Component Integration', () => {
  let componentA: ComponentA;
  let componentB: ComponentB;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  it('should integrate components', async () => {
    const result = await componentA.process('input');
    const final = await componentB.process(result);
    
    expect(final).toBeDefined();
  });
});
```

### References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [PostgreSQL Testing Best Practices](https://thoughtbot.com/blog/postgresql-testing-strategies)
- [API Testing Guide](https://www.postman.com/api-testing-101/)
