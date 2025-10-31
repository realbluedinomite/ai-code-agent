/**
 * Base error class with enhanced functionality
 */
export abstract class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly correlationId?: string;
  public readonly userId?: string;
  public readonly sessionId?: string;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isOperational?: boolean;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = options.code || this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational ?? true;
    this.context = options.context || {};
    this.timestamp = new Date();
    this.correlationId = options.correlationId;
    this.userId = options.userId;
    this.sessionId = options.sessionId;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set cause if provided
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * The error that caused this error
   */
  public cause?: Error;

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      } : undefined,
    };
  }

  /**
   * Get error summary for logging
   */
  getSummary(): string {
    const parts = [
      `${this.name} (${this.code})`,
      this.message,
    ];

    if (this.correlationId) {
      parts.push(`[${this.correlationId}]`);
    }

    if (this.userId) {
      parts.push(`user:${this.userId}`);
    }

    return parts.join(' ');
  }

  /**
   * Create a copy of this error with additional context
   */
  enrich(context: Record<string, unknown>): this {
    const enriched = Object.create(Object.getPrototypeOf(this));
    Object.assign(enriched, this);
    enriched.context = { ...this.context, ...context };
    return enriched;
  }

  /**
   * Create a child error with this error as cause
   */
  wrap(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
    } = {}
  ): BaseError {
    const childErrorClass = this.constructor as new (...args: any[]) => BaseError;
    return new childErrorClass(message, {
      ...options,
      cause: this,
      context: { ...this.context, ...options.context },
    });
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    options: {
      field?: string;
      value?: unknown;
      constraint?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      context: {
        field: options.field,
        value: options.value,
        constraint: options.constraint,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Authentication error for auth-related failures
 */
export class AuthenticationError extends BaseError {
  constructor(
    message: string = 'Authentication failed',
    options: {
      reason?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      context: {
        reason: options.reason || 'invalid_credentials',
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Authorization error for permission-related failures
 */
export class AuthorizationError extends BaseError {
  constructor(
    message: string = 'Insufficient permissions',
    options: {
      resource?: string;
      action?: string;
      requiredPermission?: string;
      userPermissions?: string[];
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      context: {
        resource: options.resource,
        action: options.action,
        requiredPermission: options.requiredPermission,
        userPermissions: options.userPermissions,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends BaseError {
  constructor(
    resource: string,
    identifier?: string,
    options: {
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    const message = identifier 
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;

    super(message, {
      code: 'NOT_FOUND_ERROR',
      statusCode: 404,
      context: {
        resource,
        identifier,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends BaseError {
  constructor(
    message: string,
    options: {
      resource?: string;
      field?: string;
      value?: unknown;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'CONFLICT_ERROR',
      statusCode: 409,
      context: {
        resource: options.resource,
        field: options.field,
        value: options.value,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Rate limit error for exceeding rate limits
 */
export class RateLimitError extends BaseError {
  constructor(
    message: string = 'Rate limit exceeded',
    options: {
      limit?: number;
      window?: number;
      retryAfter?: number;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      context: {
        limit: options.limit,
        window: options.window,
        retryAfter: options.retryAfter,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Database error for database-related failures
 */
export class DatabaseError extends BaseError {
  constructor(
    message: string,
    options: {
      operation?: string;
      table?: string;
      query?: string;
      code?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      context: {
        operation: options.operation,
        table: options.table,
        query: options.query,
        dbCode: options.code,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * External service error for third-party service failures
 */
export class ExternalServiceError extends BaseError {
  constructor(
    service: string,
    message: string,
    options: {
      operation?: string;
      endpoint?: string;
      statusCode?: number;
      response?: unknown;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: options.statusCode || 502,
      context: {
        service,
        operation: options.operation,
        endpoint: options.endpoint,
        response: options.response,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Configuration error for configuration-related failures
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    options: {
      key?: string;
      value?: unknown;
      reason?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      statusCode: 500,
      context: {
        key: options.key,
        value: options.value,
        reason: options.reason,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Timeout error for operation timeouts
 */
export class TimeoutError extends BaseError {
  constructor(
    operation: string,
    timeout: number,
    options: {
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(`${operation} timed out after ${timeout}ms`, {
      code: 'TIMEOUT_ERROR',
      statusCode: 408,
      context: {
        operation,
        timeout,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Business logic error for domain-specific failures
 */
export class BusinessLogicError extends BaseError {
  constructor(
    message: string,
    options: {
      domain?: string;
      rule?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'BUSINESS_LOGIC_ERROR',
      statusCode: 422,
      context: {
        domain: options.domain,
        rule: options.rule,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * System error for internal system failures
 */
export class SystemError extends BaseError {
  constructor(
    message: string,
    options: {
      component?: string;
      operation?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'SYSTEM_ERROR',
      statusCode: 500,
      context: {
        component: options.component,
        operation: options.operation,
        ...options.context,
      },
      isOperational: false,
      ...options,
    });
  }
}

/**
 * Network error for network-related failures
 */
export class NetworkError extends BaseError {
  constructor(
    message: string,
    options: {
      host?: string;
      port?: number;
      protocol?: string;
      code?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'NETWORK_ERROR',
      statusCode: 503,
      context: {
        host: options.host,
        port: options.port,
        protocol: options.protocol,
        networkCode: options.code,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Agent error for AI agent-specific failures
 */
export class AgentError extends BaseError {
  constructor(
    agentType: string,
    message: string,
    options: {
      task?: string;
      model?: string;
      prompt?: string;
      response?: unknown;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'AGENT_ERROR',
      statusCode: 500,
      context: {
        agentType,
        task: options.task,
        model: options.model,
        prompt: options.prompt,
        response: options.response,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Task error for task execution failures
 */
export class TaskError extends BaseError {
  constructor(
    taskId: string,
    message: string,
    options: {
      taskType?: string;
      status?: string;
      progress?: number;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'TASK_ERROR',
      statusCode: 500,
      context: {
        taskId,
        taskType: options.taskType,
        status: options.status,
        progress: options.progress,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Workflow error for workflow execution failures
 */
export class WorkflowError extends BaseError {
  constructor(
    workflowId: string,
    message: string,
    options: {
      step?: string;
      status?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'WORKFLOW_ERROR',
      statusCode: 500,
      context: {
        workflowId,
        step: options.step,
        status: options.status,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Plugin error for plugin-related failures
 */
export class PluginError extends BaseError {
  constructor(
    pluginName: string,
    message: string,
    options: {
      pluginVersion?: string;
      operation?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'PLUGIN_ERROR',
      statusCode: 500,
      context: {
        pluginName,
        pluginVersion: options.pluginVersion,
        operation: options.operation,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Error utility functions
 */
export class ErrorUtils {
  /**
   * Check if an error is an operational error (expected)
   */
  static isOperational(error: Error): boolean {
    return error instanceof BaseError && error.isOperational;
  }

  /**
   * Get the root cause of an error
   */
  static getRootCause(error: Error): Error {
    let current = error;
    while ((current as any).cause) {
      current = (current as any).cause;
    }
    return current;
  }

  /**
   * Check if an error matches a specific pattern
   */
  static matches(error: Error, pattern: { name?: string; code?: string; message?: RegExp }): boolean {
    if (error instanceof BaseError) {
      if (pattern.name && error.name !== pattern.name) return false;
      if (pattern.code && error.code !== pattern.code) return false;
      if (pattern.message && !pattern.message.test(error.message)) return false;
      return true;
    }
    
    if (pattern.name && error.name !== pattern.name) return false;
    if (pattern.message && !pattern.message.test(error.message)) return false;
    return true;
  }

  /**
   * Convert any error to a standardized format
   */
  static standardize(error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new SystemError(error.message, { cause: error });
    }
    
    return new SystemError('Unknown error occurred', {
      context: { originalError: error },
    });
  }

  /**
   * Create a chain of errors for debugging
   */
  static formatErrorChain(error: Error): string {
    const lines: string[] = [];
    let current: Error | undefined = error;
    let level = 0;
    
    while (current) {
      const indent = '  '.repeat(level);
      if (current instanceof BaseError) {
        lines.push(`${indent}→ ${current.name} (${current.code}): ${current.message}`);
      } else {
        lines.push(`${indent}→ ${current.name}: ${current.message}`);
      }
      
      current = (current as any).cause;
      level++;
    }
    
    return lines.join('\n');
  }

  /**
   * Extract error context for logging
   */
  static extractContext(error: Error): Record<string, unknown> {
    if (error instanceof BaseError) {
      return {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        context: error.context,
        timestamp: error.timestamp,
        correlationId: error.correlationId,
        userId: error.userId,
        sessionId: error.sessionId,
      };
    }
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}

/**
 * HTTP status code constants
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Export commonly used error types
export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'BUSINESS_LOGIC_ERROR'
  | 'SYSTEM_ERROR'
  | 'NETWORK_ERROR'
  | 'AGENT_ERROR'
  | 'TASK_ERROR'
  | 'WORKFLOW_ERROR'
  | 'PLUGIN_ERROR';