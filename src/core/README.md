# Core Infrastructure

The core infrastructure provides foundational components for the AI Code Agent system, including event handling, logging, configuration management, and error handling.

## Components

### 1. Event Bus System (`event-bus.ts`)

A typed event bus implementation using Node.js EventEmitter with TypeScript support and async capabilities.

#### Features
- **Type Safety**: Full TypeScript typing for events and data
- **Async Support**: Both synchronous and asynchronous event emission
- **Namespacing**: Create namespaced event buses for better organization
- **Event Statistics**: Track event counts and listener statistics
- **Priority System**: Event listeners can have priority levels
- **Memory Management**: Configurable max listeners and cleanup

#### Usage

```typescript
import { eventBus, Events } from '@core/event-bus';

// Subscribe to events
const listenerId = eventBus.on('user:created', (data) => {
  console.log('User created:', data);
});

// Emit events synchronously
eventBus.emit('user:created', { id: '123', name: 'John Doe' });

// Emit events asynchronously
await eventBus.emitAsync('user:created', { id: '456', name: 'Jane Doe' });

// Subscribe once
const onceId = eventBus.once('system:ready', () => {
  console.log('System is ready!');
});

// Create namespaced event bus
const apiBus = eventBus.namespace('api');
apiBus.on('request', (data) => {
  console.log('API request:', data);
});

// Wait for events
const userData = await eventBus.waitFor<{ id: string }>('user:created');

// Get statistics
const stats = eventBus.getStats();
console.log('Event stats:', stats);
```

#### Common Events

```typescript
// System events
Events.SYSTEM_START
Events.SYSTEM_STOP
Events.SYSTEM_ERROR

// Database events
Events.DB_CONNECT
Events.DB_DISCONNECT
Events.DB_ERROR

// Agent events
Events.AGENT_REGISTERED
Events.AGENT_TASK_STARTED
Events.AGENT_TASK_COMPLETED

// Task events
Events.TASK_CREATED
Events.TASK_STARTED
Events.TASK_COMPLETED
```

### 2. Logger System (`logger.ts`)

A structured logging system built on Winston with multiple transports and advanced features.

#### Features
- **Multiple Transports**: Console, file, HTTP, and custom transports
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Memory Logging**: In-memory log storage for development/testing
- **Performance Profiling**: Built-in timing and profiling utilities
- **Context Tracking**: Automatic correlation ID and user context
- **Environment-aware**: Different configurations for dev/prod

#### Usage

```typescript
import { logger } from '@core/logger';

// Basic logging
logger.debug('Debug message', { component: 'auth' });
logger.info('User action', { userId: '123', action: 'login' });
logger.warn('Rate limit approaching', { requests: 95 });
logger.error('Database error', { error: err, query: 'SELECT * FROM users' });

// Performance profiling
logger.startTimer('database-query');
// ... perform query ...
const duration = logger.endTimer('database-query');
logger.info('Query completed', { duration });

// Profile function execution
const result = await logger.profile('api-call', async () => {
  return await someApiCall();
});

// Context-aware logging
const userLogger = logger.child({ userId: '123', sessionId: 'abc' });
userLogger.info('User performed action'); // Auto-includes userId and sessionId

// HTTP request logging
logger.logRequest(req, res, responseTime);

// Database query logging
logger.logQuery('SELECT * FROM users', 150);
```

#### Configuration

```typescript
// Create custom logger
import { StructuredLogger, createDefaultLogger } from '@core/logger';

const logger = createDefaultLogger(
  'my-service',
  process.env.NODE_ENV || 'development',
  '1.0.0'
);

// Manual configuration
const logger = new StructuredLogger({
  service: 'my-service',
  environment: 'development',
  version: '1.0.0',
  transports: [
    {
      type: 'console',
      level: 'debug',
      format: 'combined'
    },
    {
      type: 'file',
      level: 'info',
      format: 'json',
      options: {
        filename: 'logs/app.log',
        maxSize: '20m',
        maxFiles: '14d'
      }
    }
  ],
  logToMemory: true,
  maxMemoryLogs: 1000,
  enableProfiling: true
});
```

### 3. Configuration Manager (`config.ts`)

A robust configuration management system with validation and hot-reloading.

#### Features
- **Environment-aware**: Different configs for dev/test/prod
- **Schema Validation**: Joi-based validation with detailed errors
- **Hot Reloading**: Watch configuration files for changes
- **Type Safety**: TypeScript integration with compile-time checking
- **Hierarchical Loading**: Support for multiple configuration sources
- **Security**: Automatic redaction of sensitive values

#### Usage

```typescript
import { config } from '@core/config';

// Load configuration
config.loadFromEnvironment('development');

// Register validation schemas
config.registerSchema('server.port', Joi.number().port().required());
config.registerSchema('database.url', Joi.string().uri().required());

// Set configuration values
config.set('server.port', 3000);
config.set('database.host', 'localhost');

// Get configuration values
const port = config.get<number>('server.port', 3000);
const requiredDbUrl = config.getRequired<string>('database.url');

// Type-safe configuration access
const portConfig = config.typed<number>('server.port');
const port = portConfig.get(3000);
const requiredPort = portConfig.getRequired();

// Validate configuration
const validation = config.validate();
if (!validation.isValid) {
  console.error('Config errors:', validation.errors);
  console.warn('Config warnings:', validation.warnings);
}

// Watch for configuration changes
const unwatch = config.watch((change) => {
  console.log(`Config changed: ${change.key}`);
  console.log(`  ${change.oldValue} → ${change.newValue}`);
});

// Later, stop watching
unwatch();

// Export configuration (with sensitive data redacted)
const configExport = config.export();
console.log('Current config:', configExport);
```

#### Environment Files

```bash
# .env.development
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=myapp_dev

# .env.production
NODE_ENV=production
PORT=80
DB_HOST=prod-db.example.com
DB_NAME=myapp
```

#### Common Schemas

```typescript
import { createCommonSchemas } from '@core/config';

const schemas = createCommonSchemas();
config.registerSchemas(schemas);
```

### 4. Custom Error Classes (`errors.ts`)

A comprehensive hierarchy of custom error classes with proper context tracking.

#### Features
- **Rich Context**: Correlation IDs, user info, timestamps
- **HTTP Integration**: Proper status codes for web applications
- **Error Chaining**: Preserve error causality
- **Classification**: Operational vs programming errors
- **Structured Logging**: Easy to log and analyze
- **Type Safety**: Full TypeScript support

#### Usage

```typescript
import { 
  ValidationError, 
  NotFoundError, 
  BaseError, 
  ErrorUtils 
} from '@core/errors';

// Validation errors
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: userInput,
  constraint: 'email_format'
});

// Not found errors
throw new NotFoundError('User', 'user123');

// Authentication errors
throw new AuthenticationError('Invalid credentials', {
  reason: 'expired_token'
});

// Database errors
throw new DatabaseError('Connection failed', {
  operation: 'connect',
  host: 'db.example.com',
  code: 'ECONNREFUSED'
});

// Error chaining
try {
  // Some operation
} catch (originalError) {
  throw new NotFoundError('Resource', '123').wrap(
    'Failed to process request',
    { correlationId: 'req-123' }
  );
}

// Error utilities
try {
  // risky operation
} catch (error) {
  if (ErrorUtils.isOperational(error)) {
    // Handle expected errors
  } else {
    // Handle programming errors
  }
  
  // Get root cause
  const rootCause = ErrorUtils.getRootCause(error);
  
  // Format error chain for logging
  const errorChain = ErrorUtils.formatErrorChain(error);
  logger.error('Error occurred', { error: errorChain });
}
```

#### Error Hierarchy

```
BaseError (abstract)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
├── TimeoutError (408)
├── BusinessLogicError (422)
├── DatabaseError (500)
├── ExternalServiceError (502)
├── ConfigurationError (500)
├── SystemError (500)
├── NetworkError (503)
├── AgentError (500)
├── TaskError (500)
├── WorkflowError (500)
└── PluginError (500)
```

## Initialization

```typescript
import { initializeCore, getSystemHealth, shutdownCore } from '@core';

async function main() {
  try {
    // Initialize all core components
    await initializeCore({
      environment: process.env.NODE_ENV,
      enableProfiling: process.env.NODE_ENV !== 'production',
      registerCommonSchemas: true
    });
    
    console.log('✅ Core infrastructure ready');
    
    // Get system health
    const health = getSystemHealth();
    console.log('🏥 System health:', health.status);
    
    // Setup graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down...');
      await shutdownCore();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}
```

## Best Practices

### 1. Event-Driven Architecture
- Use events for loose coupling between components
- Keep event payloads small and focused
- Use namespacing for different domains
- Handle errors in event listeners gracefully

### 2. Structured Logging
- Always include correlation IDs
- Log at appropriate levels
- Include relevant context
- Use performance profiling for critical operations

### 3. Configuration Management
- Validate all configuration on startup
- Use environment-specific configurations
- Document all configuration options
- Handle configuration changes gracefully

### 4. Error Handling
- Use specific error types
- Include relevant context
- Log errors appropriately
- Don't expose sensitive information

## Examples

See `test-core.ts` for comprehensive examples of how to use all core infrastructure components together.

## Dependencies

- `winston`: Logging framework
- `winston-daily-rotate-file`: File rotation for logs
- `dotenv`: Environment variable loading
- `joi`: Schema validation
- `eventemitter3`: Event emitter implementation
- `uuid`: Unique identifier generation