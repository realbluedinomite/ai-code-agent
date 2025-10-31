/**
 * Core Infrastructure Module
 * 
 * This module provides the foundational components for the AI Code Agent system:
 * - Event Bus: Typed event handling with async support
 * - Logger: Structured logging with Winston
 * - Configuration: Environment-based configuration management
 * - Errors: Custom error classes with context tracking
 */

// Export event bus
export { 
  TypedEventBus, 
  eventBus, 
  Events, 
  type EventListener, 
  type EventBusOptions,
  type EventData 
} from './event-bus';

// Export logger
export { 
  StructuredLogger, 
  logger, 
  createDefaultLogger,
  LogLevel,
  type LogFormat,
  type TransportConfig,
  type LoggerConfig 
} from './logger';

// Export configuration
export { 
  ConfigManager, 
  config, 
  createCommonSchemas,
  type ValidationResult,
  type ConfigChangeEvent,
  type EnvironmentConfig,
  type EnvVarMapping,
  type ConfigSchema 
} from './config';

// Export errors
export { 
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError,
  TimeoutError,
  BusinessLogicError,
  SystemError,
  NetworkError,
  AgentError,
  TaskError,
  WorkflowError,
  PluginError,
  ErrorUtils,
  HTTP_STATUS,
  type ErrorCode
} from './errors';

/**
 * Initialize the core infrastructure
 */
export async function initializeCore(configOptions?: {
  environment?: string;
  enableProfiling?: boolean;
  registerCommonSchemas?: boolean;
}): Promise<void> {
  const options = {
    environment: process.env.NODE_ENV || 'development',
    enableProfiling: process.env.NODE_ENV !== 'production',
    registerCommonSchemas: true,
    ...configOptions,
  };

  // Load configuration
  config.loadFromEnvironment(options.environment);
  
  if (options.registerCommonSchemas) {
    config.registerSchemas(createCommonSchemas());
    const validation = config.validate();
    
    if (!validation.isValid) {
      logger.error('Configuration validation failed', { 
        errors: validation.errors,
        warnings: validation.warnings 
      });
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
  }

  // Setup default event listeners for common events
  setupDefaultEventListeners();

  logger.info('Core infrastructure initialized', {
    environment: options.environment,
    hasSchemas: Object.keys(config.getAll()).length > 0,
  });
}

/**
 * Setup default event listeners for system events
 */
function setupDefaultEventListeners(): void {
  // Log unhandled errors
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', { error: ErrorUtils.extractContext(error) });
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', { 
      reason: reason instanceof Error ? ErrorUtils.extractContext(reason) : reason,
      promise: promise.toString() 
    });
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    eventBus.emit('system:shutdown', { signal: 'SIGTERM' });
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    eventBus.emit('system:shutdown', { signal: 'SIGINT' });
  });

  // Log system events
  eventBus.on('system:start', (data) => {
    logger.info('System started', data);
  });

  eventBus.on('system:shutdown', (data) => {
    logger.info('System shutting down', data);
  });

  eventBus.on('system:error', (data) => {
    logger.error('System error occurred', data);
  });

  // Log database events
  eventBus.on('db:connect', (data) => {
    logger.info('Database connected', data);
  });

  eventBus.on('db:disconnect', (data) => {
    logger.info('Database disconnected', data);
  });

  eventBus.on('db:error', (data) => {
    logger.error('Database error', data);
  });

  // Log configuration changes
  config.watch((change) => {
    logger.debug('Configuration changed', { 
      key: change.key, 
      oldValue: change.oldValue, 
      newValue: change.newValue 
    });
  });
}

/**
 * Get system health information
 */
export function getSystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message?: string;
    details?: Record<string, unknown>;
  }>;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  timestamp: Date;
} {
  const checks = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check configuration
  const configValidation = config.validate();
  if (configValidation.isValid) {
    checks.push({ name: 'configuration', status: 'ok' as const });
  } else {
    checks.push({ 
      name: 'configuration', 
      status: 'error' as const, 
      message: configValidation.errors.join(', ') 
    });
    overallStatus = 'unhealthy';
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (memUsagePercent < 80) {
    checks.push({ 
      name: 'memory', 
      status: 'ok' as const,
      details: { usage: `${memUsagePercent.toFixed(1)}%` }
    });
  } else if (memUsagePercent < 90) {
    checks.push({ 
      name: 'memory', 
      status: 'warning' as const,
      details: { usage: `${memUsagePercent.toFixed(1)}%` }
    });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  } else {
    checks.push({ 
      name: 'memory', 
      status: 'error' as const,
      details: { usage: `${memUsagePercent.toFixed(1)}%` }
    });
    overallStatus = 'unhealthy';
  }

  // Check event bus
  const eventBusStats = eventBus.getStats();
  if (eventBusStats.totalListeners > 0) {
    checks.push({ 
      name: 'event-bus', 
      status: 'ok' as const,
      details: { 
        listeners: eventBusStats.totalListeners,
        events: eventBusStats.registeredEvents.length 
      }
    });
  } else {
    checks.push({ name: 'event-bus', status: 'warning' as const });
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    checks,
    uptime: process.uptime(),
    memory: memUsage,
    timestamp: new Date(),
  };
}

/**
 * Shutdown the core infrastructure gracefully
 */
export async function shutdownCore(): Promise<void> {
  logger.info('Starting core infrastructure shutdown');

  // Emit shutdown event
  eventBus.emit('system:shutdown', { 
    timestamp: new Date(),
    uptime: process.uptime() 
  });

  // Wait for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  // Flush logs
  await logger.flush();

  logger.info('Core infrastructure shutdown complete');
}