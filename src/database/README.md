# Database Implementation

This document provides an overview of the complete database implementation for the AI Code Agent system, including PostgreSQL connection management, TypeScript models, and CRUD operations.

## Overview

The database layer is built with PostgreSQL and provides:
- Connection pooling with health monitoring
- Type-safe TypeScript models with comprehensive CRUD operations
- Automatic validation using Joi
- Transaction support
- Soft delete capabilities
- Audit logging
- Comprehensive error handling

## Architecture

### Core Components

1. **Database Connection Manager** (`src/database/client.ts`)
   - PostgreSQL connection pooling
   - Health monitoring and recovery
   - Query retry logic
   - Transaction support
   - Event-driven architecture

2. **Base Model Class** (`src/database/base-model.ts`)
   - Generic CRUD operations
   - Pagination and filtering
   - Validation framework
   - Soft delete support
   - Transaction helpers

3. **Entity Interfaces** (`src/database/entities.ts`)
   - TypeScript interfaces for all database entities
   - Create and update DTOs
   - Comprehensive type definitions

4. **Specific Models**
   - `UserModel` - User management with authentication
   - `SessionModel` - Session handling and management
   - `ParsedRequestModel` - Request parsing and processing
   - `ProjectAnalysisModel` - Project analysis workflows
   - `TaskModel` - Task management and execution
   - `CodeFileModel` - File management and analysis
   - `ConfigurationModel` - System configuration
   - `AuditLogModel` - Audit trail logging
   - `ApiKeyModel` - API key management

## Getting Started

### Initialize Database

```typescript
import { initializeDatabaseForApp, getDatabaseContext } from '@/database/initializer';

// Initialize database connection
await initializeDatabaseForApp();

// Get database context for operations
const dbContext = await getDatabaseContext();
```

### Basic Usage

```typescript
// Access models through database context
const userModel = dbContext.userModel;
const sessionModel = dbContext.sessionModel;
const taskModel = dbContext.taskModel;

// Create a user
const user = await userModel.create({
  email: 'user@example.com',
  username: 'testuser',
  password_hash: await UserModel.hashPassword('password123'),
  first_name: 'John',
  last_name: 'Doe'
});

// Find user by email
const foundUser = await userModel.findByEmail('user@example.com');

// Update user profile
const updatedUser = await userModel.updateProfile(user.id, {
  first_name: 'Jane',
  avatar_url: 'https://example.com/avatar.jpg'
});
```

## Model Operations

### Common CRUD Operations

All models inherit from `BaseModel` and provide:

```typescript
// Create
const entity = await model.create(createData);

// Read
const entity = await model.findById(id);
const entities = await model.findMany(filters, options);

// Update
const updated = await model.update(id, updateData);

// Delete
await model.delete(id); // Soft delete by default
await model.delete(id, true); // Hard delete

// Restore (for soft deleted entities)
const restored = await model.restore(id);

// Pagination
const result = await model.findMany({}, {
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'DESC'
});
```

### Model-Specific Features

#### User Model
```typescript
// Password operations
await UserModel.hashPassword('password123');
await UserModel.verifyPassword('password', hash);

// User management
const verified = await userModel.verifyUser(userId);
const activated = await userModel.activateUser(userId);
const lastLogin = await userModel.updateLastLogin(userId);

// Search and statistics
const users = await userModel.searchUsers('john');
const stats = await userModel.getUserStatistics();
```

#### Session Model
```typescript
// Session operations
const session = await sessionModel.findByToken(token);
const activeSessions = await sessionModel.findActiveByUserId(userId);

// Session lifecycle
await sessionModel.updateLastAccessed(sessionId);
const expired = await sessionModel.expireSession(sessionId);
await sessionModel.terminateAllUserSessions(userId);
await sessionModel.cleanupExpiredSessions();
```

#### Task Model
```typescript
// Task management
const tasks = await taskModel.findByStatus('pending');
const overdue = await taskModel.taskModel.findOverdue();

// Task lifecycle
const started = await taskModel.startTask(taskId, assignedTo);
const completed = await taskModel.completeTask(taskId, results);
const failed = await taskModel.failTask(taskId, errorMessage, true); // Retry
```

## Database Configuration

Environment variables:

```bash
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent
DB_USER=postgres
DB_PASSWORD=password

# Connection pool settings
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Retry settings
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY=1000

# Logging
DB_LOGGING=true
```

## Validation

All models use Joi for validation:

```typescript
// Custom validation is automatically applied
const validation = model.validate(data);
if (!validation.isValid) {
  throw new ValidationError('Validation failed', validation.errors);
}
```

Built-in validations include:
- Required field validation
- Type checking (string, number, boolean, date, uuid, etc.)
- Length constraints
- Pattern matching (emails, URLs, etc.)
- Custom business logic validation

## Transactions

```typescript
// Automatic transaction handling
const dbContext = await getDatabaseContext();
const dbManager = dbContext.getDatabaseManager();

await dbManager.transaction(async (client) => {
  const user = await userModel.createInTransaction(client, userData);
  const session = await sessionModel.createInTransaction(client, sessionData);
  
  // All operations are atomic
});
```

## Error Handling

The system provides comprehensive error handling:

```typescript
// Custom error types
throw new NotFoundError('User', userId);
throw new ValidationError('Invalid data', validationErrors);
throw new ConflictError('User already exists');
```

## Health Monitoring

```typescript
// Check database health
const isHealthy = await dbManager.checkHealth();

// Get connection pool statistics
const stats = dbManager.getStats();
console.log(stats); // { totalCount, idleCount, waitingCount, activeCount }
```

## Logging

All database operations are logged with appropriate levels:

```typescript
// Development logging
DB_LOGGING=true // Enables detailed query logging

// Production logging
logger.info('Entity created', { table: 'users', id: userId });
logger.error('Database operation failed', { error, query });
```

## Entity Relationships

The system supports complex relationships:

```typescript
// User -> Sessions (one-to-many)
const sessions = await sessionModel.findActiveByUserId(userId);

// Request -> Analysis -> Tasks (one-to-many chains)
const request = await parsedRequestModel.findById(requestId);
const analyses = await projectAnalysisModel.findByParsedRequestId(requestId);
const tasks = await taskModel.findByParsedRequestId(requestId);

// Analysis -> Files (one-to-many)
const files = await codeFileModel.findByProjectAnalysisId(analysisId);
```

## Best Practices

1. **Always use database context** for model access
2. **Handle transactions** for complex operations involving multiple models
3. **Use pagination** for large datasets
4. **Implement proper validation** in model operations
5. **Use soft delete** for important entities
6. **Monitor health** and connection pool usage
7. **Log operations** appropriately for debugging
8. **Use proper error handling** for user feedback

## Testing

```typescript
// Example test structure
describe('UserModel', () => {
  let userModel: UserModel;
  
  beforeEach(async () => {
    const dbContext = await createTestDatabaseContext();
    userModel = dbContext.userModel;
  });
  
  it('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      username: 'testuser',
      password_hash: await UserModel.hashPassword('password123')
    };
    
    const user = await userModel.create(userData);
    expect(user.email).toBe(userData.email);
  });
});
```

## Performance Considerations

1. **Connection pooling** - Automatically managed
2. **Query optimization** - Use appropriate indexes
3. **Pagination** - Always use for large datasets
4. **Transaction scope** - Keep transactions short
5. **Connection cleanup** - Proper resource management

## Security

1. **Password hashing** - bcrypt with salt
2. **SQL injection protection** - Parameterized queries
3. **Input validation** - Joi validation on all inputs
4. **Audit logging** - Track all changes
5. **Access control** - Implement proper authorization

## Monitoring and Maintenance

```typescript
// Regular health checks
setInterval(async () => {
  const isHealthy = await dbManager.checkHealth();
  if (!isHealthy) {
    logger.error('Database health check failed');
    // Implement recovery logic
  }
}, 30000);

// Statistics monitoring
const stats = {
  users: await userModel.getUserStatistics(),
  requests: await parsedRequestModel.getStatistics(),
  tasks: await taskModel.getTaskStatistics()
};
```

This implementation provides a robust, type-safe, and scalable database layer for the AI Code Agent system.