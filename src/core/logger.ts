import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import path from 'path';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

/**
 * Log format options
 */
export interface LogFormat {
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  module?: string;
  function?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  type: 'console' | 'file' | 'http' | 'custom';
  level?: LogLevel;
  format?: 'json' | 'simple' | 'combined' | 'custom';
  options?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  service: string;
  environment: string;
  version: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  transports: TransportConfig[];
  logToMemory?: boolean;
  maxMemoryLogs?: number;
  enableProfiling?: boolean;
}

/**
 * Memory log entry
 */
interface MemoryLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  format: LogFormat;
}

/**
 * Custom log formatter that adds correlation IDs and other context
 */
const customFormat = winston.format((info) => {
  const correlationId = (info.correlationId as string) || 
                       (global as any).__CORRELATION_ID__ || 
                       uuidv4();
  
  return {
    ...info,
    timestamp: new Date().toISOString(),
    correlationId,
    service: info.service,
    environment: info.environment,
    version: info.version,
    userId: info.userId,
    sessionId: info.sessionId,
  };
});

/**
 * JSON formatter for structured logging
 */
const jsonFormat = winston.format.combine(
  customFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Console formatter with colors
 */
const consoleFormat = winston.format.combine(
  customFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const correlationStr = correlationId ? `[${correlationId.slice(0, 8)}]` : '';
    return `${timestamp} ${level} ${correlationStr} ${service}: ${message} ${metaStr}`;
  })
);

/**
 * Simple formatter for file output
 */
const simpleFormat = winston.format.combine(
  customFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    const correlationStr = correlationId ? `[${correlationId.slice(0, 8)}]` : '';
    return `${timestamp} ${level} ${correlationStr} ${service}: ${message} ${metaStr}`;
  })
);

/**
 * Enhanced Winston logger with context tracking and memory logging
 */
export class StructuredLogger extends EventEmitter {
  private winston: winston.Logger;
  private config: LoggerConfig;
  private memoryLogs: MemoryLogEntry[] = [];
  private performanceMarks = new Map<string, number>();
  private context: Partial<LogFormat> = {};

  constructor(config: LoggerConfig) {
    super();
    this.config = config;
    this.winston = winston.createLogger({
      level: this.getMinLevel(config.transports),
      format: jsonFormat,
      defaultMeta: {
        service: config.service,
        environment: config.environment,
        version: config.version,
      },
      transports: this.createTransports(config.transports),
      exitOnError: false,
    });

    this.setupEventHandling();
  }

  /**
   * Create Winston transports based on configuration
   */
  private createTransports(transports: TransportConfig[]): winston.transport[] {
    return transports.map((transport) => {
      switch (transport.type) {
        case 'console':
          return new winston.transports.Console({
            level: transport.level || LogLevel.INFO,
            format: transport.format === 'simple' ? simpleFormat : 
                    transport.format === 'combined' ? consoleFormat : 
                    consoleFormat,
          });

        case 'file':
          const fileOptions = transport.options as any || {};
          return new DailyRotateFile({
            level: transport.level || LogLevel.INFO,
            format: transport.format === 'json' ? jsonFormat : simpleFormat,
            filename: fileOptions.filename || path.join('logs', `${this.config.service}-%DATE%.log`),
            datePattern: fileOptions.datePattern || 'YYYY-MM-DD',
            zippedArchive: fileOptions.zippedArchive ?? true,
            maxSize: fileOptions.maxSize || '20m',
            maxFiles: fileProps.maxFiles || '14d',
            ...fileOptions,
          });

        case 'http':
          const httpOptions = transport.options as any || {};
          return new winston.transports.Http({
            level: transport.level || LogLevel.ERROR,
            host: httpOptions.host || 'localhost',
            port: httpOptions.port || 8080,
            path: httpOptions.path || '/log',
            ...httpOptions,
          });

        default:
          throw new Error(`Unknown transport type: ${transport.type}`);
      }
    });
  }

  /**
   * Get minimum log level across all transports
   */
  private getMinLevel(transports: TransportConfig[]): LogLevel {
    const levels = transports.map(t => t.level || LogLevel.INFO);
    const levelValues = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.HTTP]: 3,
      [LogLevel.VERBOSE]: 4,
      [LogLevel.DEBUG]: 5,
      [LogLevel.SILLY]: 6,
    };

    let minLevel = LogLevel.ERROR;
    let minValue = levelValues[LogLevel.ERROR];

    for (const level of levels) {
      if (levelValues[level] < minValue) {
        minValue = levelValues[level];
        minLevel = level;
      }
    }

    return minLevel;
  }

  /**
   * Setup event handling for memory logging and profiling
   */
  private setupEventHandling(): void {
    if (this.config.logToMemory) {
      this.on('log', (info) => {
        this.addToMemory(info);
      });
    }

    if (this.config.enableProfiling) {
      this.on('profile', (mark, info) => {
        this.winston.info('Profile completed', { mark, ...info });
      });
    }
  }

  /**
   * Add log entry to memory buffer
   */
  private addToMemory(info: winston.LogEntry): void {
    const memoryEntry: MemoryLogEntry = {
      id: uuidv4(),
      timestamp: new Date(info.timestamp as string),
      level: info.level as LogLevel,
      message: info.message as string,
      format: info as LogFormat,
    };

    this.memoryLogs.push(memoryEntry);

    // Maintain max memory logs limit
    if (this.memoryLogs.length > (this.config.maxMemoryLogs || 1000)) {
      this.memoryLogs.shift();
    }
  }

  /**
   * Set context for subsequent log entries
   */
  setContext(context: Partial<LogFormat>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogFormat>): StructuredLogger {
    const childLogger = new StructuredLogger({
      ...this.config,
      transports: [], // Don't create transports for child logger
    });

    childLogger.winston = this.winston.child({
      ...this.context,
      ...additionalContext,
    });

    return childLogger;
  }

  /**
   * Log at ERROR level
   */
  error(message: string, metadata?: Record<string, unknown>): void;
  error(error: Error, metadata?: Record<string, unknown>): void;
  error(messageOrError: string | Error, metadata: Record<string, unknown> = {}): void {
    const logData = {
      ...this.context,
      ...metadata,
      error: messageOrError instanceof Error ? {
        name: messageOrError.name,
        message: messageOrError.message,
        stack: messageOrError.stack,
      } : undefined,
    };

    if (messageOrError instanceof Error) {
      this.winston.error(messageOrError.message, logData);
    } else {
      this.winston.error(messageOrError, logData);
    }

    this.emit('log', { ...logData, level: LogLevel.ERROR });
  }

  /**
   * Log at WARN level
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    const logData = { ...this.context, ...metadata };
    this.winston.warn(message, logData);
    this.emit('log', { ...logData, level: LogLevel.WARN });
  }

  /**
   * Log at INFO level
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    const logData = { ...this.context, ...metadata };
    this.winston.info(message, logData);
    this.emit('log', { ...logData, level: LogLevel.INFO });
  }

  /**
   * Log at HTTP level
   */
  http(message: string, metadata?: Record<string, unknown>): void {
    const logData = { ...this.context, ...metadata };
    this.winston.http(message, logData);
    this.emit('log', { ...logData, level: LogLevel.HTTP });
  }

  /**
   * Log at VERBOSE level
   */
  verbose(message: string, metadata?: Record<string, unknown>): void {
    const logData = { ...this.context, ...metadata };
    this.winston.verbose(message, logData);
    this.emit('log', { ...logData, level: LogLevel.VERBOSE });
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    const logData = { ...this.context, ...metadata };
    this.winston.debug(message, logData);
    this.emit('log', { ...logData, level: LogLevel.DEBUG });
  }

  /**
   * Log at SILLY level
   */
  silly(message: string, metadata?: Record<string, unknown>): void {
    const logData = { ...this.context, ...metadata };
    this.winston.silly(message, logData);
    this.emit('log', { ...logData, level: LogLevel.SILLY });
  }

  /**
   * Start a performance timer
   */
  startTimer(label: string): void {
    this.performanceMarks.set(label, Date.now());
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(label: string, metadata?: Record<string, unknown>): number | undefined {
    const startTime = this.performanceMarks.get(label);
    if (!startTime) {
      this.warn(`Timer '${label}' was not started`);
      return undefined;
    }

    const duration = Date.now() - startTime;
    this.performanceMarks.delete(label);
    
    const logData = { ...this.context, duration, ...metadata };
    this.info(`Timer '${label}' completed`, logData);
    this.emit('profile', label, logData);

    return duration;
  }

  /**
   * Profile a function execution
   */
  async profile<T>(label: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.startTimer(label);
    try {
      const result = await fn();
      this.endTimer(label, { success: true, ...metadata });
      return result;
    } catch (error) {
      this.endTimer(label, { success: false, error: error instanceof Error ? error.message : error, ...metadata });
      throw error;
    }
  }

  /**
   * Log an HTTP request
   */
  logRequest(req: any, res: any, responseTime?: number): void {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get?.('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress,
      contentLength: res.get?.('content-length'),
    };

    const level = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;
    this.winston.log(level, `${req.method} ${req.url} ${res.statusCode}`, logData);
  }

  /**
   * Log a database query
   */
  logQuery(query: string, duration: number, metadata?: Record<string, unknown>): void {
    this.debug('Database query executed', {
      query,
      duration,
      ...metadata,
    });
  }

  /**
   * Get memory logs
   */
  getMemoryLogs(level?: LogLevel): MemoryLogEntry[] {
    if (!level) return [...this.memoryLogs];
    return this.memoryLogs.filter(log => log.level === level);
  }

  /**
   * Clear memory logs
   */
  clearMemoryLogs(): void {
    this.memoryLogs = [];
  }

  /**
   * Get logger statistics
   */
  getStats(): {
    memoryLogsCount: number;
    activeTimers: string[];
    context: Partial<LogFormat>;
  } {
    return {
      memoryLogsCount: this.memoryLogs.length,
      activeTimers: Array.from(this.performanceMarks.keys()),
      context: this.context,
    };
  }

  /**
   * Flush all transports (useful for testing)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.end(() => {
        resolve();
      });
    });
  }
}

/**
 * Default logger configuration
 */
export const createDefaultLogger = (service: string, environment: string, version: string): StructuredLogger => {
  const defaultConfig: LoggerConfig = {
    service,
    environment,
    version,
    transports: [
      {
        type: 'console',
        level: environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
        format: environment === 'production' ? 'simple' : 'combined',
      },
      {
        type: 'file',
        level: LogLevel.INFO,
        format: 'json',
        options: {
          filename: path.join('logs', `${service}.log`),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        },
      },
    ],
    logToMemory: environment !== 'production',
    maxMemoryLogs: 1000,
    enableProfiling: environment !== 'production',
  };

  return new StructuredLogger(defaultConfig);
};

/**
 * Create a logger instance
 */
export const logger = createDefaultLogger(
  process.env.SERVICE_NAME || 'ai-code-agent',
  process.env.NODE_ENV || 'development',
  process.env.SERVICE_VERSION || '1.0.0'
);