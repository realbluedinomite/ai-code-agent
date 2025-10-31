/**
 * Tests for Logger Component
 */

import { StructuredLogger, LogLevel, createDefaultLogger } from '../../src/core/logger';
import {
  createMock,
  testDataFactory,
  timerMock,
  expectToThrow,
  expectWithinRange,
} from '../utils/test-utils';
import { mockLoggerConfig, mockLogEntries } from '../fixtures/mock-data';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let mockWinston: any;

  beforeEach(() => {
    jest.clearAllMocks();
    timerMock.clearAll();
    
    // Create a mock Winston logger
    mockWinston = {
      createLogger: jest.fn().mockReturnValue({
        level: '',
        transports: [],
        child: jest.fn().mockReturnThis(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        silly: jest.fn(),
        end: jest.fn().mockImplementation((cb) => cb()),
      }),
      format: {
        timestamp: jest.fn().mockReturnValue(jest.fn()),
        errors: jest.fn().mockReturnValue(jest.fn()),
        json: jest.fn().mockReturnValue(jest.fn()),
        colorize: jest.fn().mockReturnValue(jest.fn()),
        printf: jest.fn().mockReturnValue(jest.fn()),
        combine: jest.fn().mockReturnValue(jest.fn()),
      },
      transports: {
        Console: jest.fn(),
        Http: jest.fn(),
      },
    };

    // Mock winston modules
    jest.doMock('winston', () => mockWinston);
    jest.doMock('winston-daily-rotate-file', () => jest.fn());
    
    // Create logger instance
    logger = new StructuredLogger(mockLoggerConfig.basic);
  });

  afterEach(() => {
    timerMock.clearAll();
  });

  describe('Constructor', () => {
    it('should create logger with basic configuration', () => {
      expect(logger).toBeInstanceOf(StructuredLogger);
    });

    it('should create logger with advanced configuration', () => {
      const advancedLogger = new StructuredLogger(mockLoggerConfig.advanced);
      expect(advancedLogger).toBeInstanceOf(StructuredLogger);
    });

    it('should create Winston logger with correct configuration', () => {
      expect(mockWinston.createLogger).toHaveBeenCalled();
      const callArgs = mockWinston.createLogger.mock.calls[0][0];
      
      expect(callArgs.level).toBeDefined();
      expect(callArgs.format).toBeDefined();
      expect(callArgs.defaultMeta).toEqual({
        service: 'test-service',
        environment: 'test',
        version: '1.0.0',
      });
      expect(callArgs.transports).toBeDefined();
      expect(callArgs.exitOnError).toBe(false);
    });
  });

  describe('Transport Creation', () => {
    it('should create console transport', () => {
      const transports = (logger as any).createTransports([
        {
          type: 'console',
          level: LogLevel.INFO,
          format: 'simple',
        },
      ]);
      
      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeDefined();
    });

    it('should create file transport with daily rotate', () => {
      const transports = (logger as any).createTransports([
        {
          type: 'file',
          level: LogLevel.ERROR,
          format: 'json',
          options: {
            filename: 'test.log',
            maxSize: '10m',
            maxFiles: '5d',
          },
        },
      ]);
      
      expect(transports).toHaveLength(1);
    });

    it('should create HTTP transport', () => {
      const transports = (logger as any).createTransports([
        {
          type: 'http',
          level: LogLevel.ERROR,
          format: 'json',
          options: {
            host: 'localhost',
            port: 8080,
            path: '/log',
          },
        },
      ]);
      
      expect(transports).toHaveLength(1);
    });

    it('should throw error for unknown transport type', () => {
      expect(() => {
        (logger as any).createTransports([
          {
            type: 'unknown' as any,
          },
        ]);
      }).toThrow('Unknown transport type: unknown');
    });
  });

  describe('Log Levels', () => {
    beforeEach(() => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
    });

    it('should log error messages', () => {
      logger.error('Test error message', { metadata: 'test' });
      
      expect(logger.winston.error).toHaveBeenCalledWith(
        'Test error message',
        expect.objectContaining({
          metadata: 'test',
          error: undefined,
        })
      );
    });

    it('should log error with Error object', () => {
      const testError = new Error('Test error');
      logger.error(testError, { additional: 'info' });
      
      expect(logger.winston.error).toHaveBeenCalledWith(
        testError.message,
        expect.objectContaining({
          additional: 'info',
          error: {
            name: 'Error',
            message: 'Test error',
            stack: testError.stack,
          },
        })
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning', { warning: 'data' });
      
      expect(logger.winston.warn).toHaveBeenCalledWith(
        'Test warning',
        expect.objectContaining({ warning: 'data' })
      );
    });

    it('should log info messages', () => {
      logger.info('Test info', { info: 'data' });
      
      expect(logger.winston.info).toHaveBeenCalledWith(
        'Test info',
        expect.objectContaining({ info: 'data' })
      );
    });

    it('should log HTTP messages', () => {
      logger.http('GET /api/test 200', { method: 'GET', status: 200 });
      
      expect(logger.winston.http).toHaveBeenCalledWith(
        'GET /api/test 200',
        expect.objectContaining({ method: 'GET', status: 200 })
      );
    });

    it('should log verbose messages', () => {
      logger.verbose('Verbose message', { verbose: true });
      
      expect(logger.winston.verbose).toHaveBeenCalledWith(
        'Verbose message',
        expect.objectContaining({ verbose: true })
      );
    });

    it('should log debug messages', () => {
      logger.debug('Debug message', { debug: true });
      
      expect(logger.winston.debug).toHaveBeenCalledWith(
        'Debug message',
        expect.objectContaining({ debug: true })
      );
    });

    it('should log silly messages', () => {
      logger.silly('Silly message', { silly: true });
      
      expect(logger.winston.silly).toHaveBeenCalledWith(
        'Silly message',
        expect.objectContaining({ silly: true })
      );
    });
  });

  describe('Context Management', () => {
    beforeEach(() => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
    });

    it('should set context for subsequent log entries', () => {
      logger.setContext({ userId: 'user-123', sessionId: 'session-456' });
      logger.info('Test with context');
      
      expect(logger.winston.info).toHaveBeenCalledWith(
        'Test with context',
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-456',
        })
      );
    });

    it('should merge context with new context', () => {
      logger.setContext({ userId: 'user-123' });
      logger.setContext({ sessionId: 'session-456' });
      logger.info('Test with merged context');
      
      expect(logger.winston.info).toHaveBeenCalledWith(
        'Test with merged context',
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-456',
        })
      );
    });

    it('should clear context', () => {
      logger.setContext({ userId: 'user-123' });
      logger.clearContext();
      logger.info('Test without context');
      
      expect(logger.winston.info).toHaveBeenCalledWith(
        'Test without context',
        expect.objectContaining({})
      );
    });

    it('should create child logger with additional context', () => {
      logger.setContext({ userId: 'user-123' });
      const childLogger = logger.child({ requestId: 'req-456' });
      
      childLogger.info('Child log message');
      
      expect(childLogger.winston.info).toHaveBeenCalledWith(
        'Child log message',
        expect.objectContaining({
          userId: 'user-123',
          requestId: 'req-456',
        })
      );
    });
  });

  describe('Performance Profiling', () => {
    beforeEach(() => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
    });

    it('should start and end a timer', () => {
      const timerLabel = 'test-operation';
      
      logger.startTimer(timerLabel);
      timerMock.advanceTime(100);
      const duration = logger.endTimer(timerLabel);
      
      expect(duration).toBe(100);
      expect(logger.winston.info).toHaveBeenCalledWith(
        expect.stringContaining(`Timer '${timerLabel}' completed`),
        expect.objectContaining({ duration: 100 })
      );
    });

    it('should warn when ending non-existent timer', () => {
      logger.endTimer('non-existent');
      
      expect(logger.winston.warn).toHaveBeenCalledWith(
        expect.stringContaining("Timer 'non-existent' was not started")
      );
    });

    it('should profile async function execution', async () => {
      const testFn = jest.fn().mockResolvedValue('result');
      
      const result = await logger.profile('async-operation', testFn);
      
      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
      expect(logger.winston.info).toHaveBeenCalledWith(
        expect.stringContaining(`Timer 'async-operation' completed`),
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors in profiled function', async () => {
      const testFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(
        logger.profile('failing-operation', testFn)
      ).rejects.toThrow('Test error');
      
      expect(logger.winston.info).toHaveBeenCalledWith(
        expect.stringContaining(`Timer 'failing-operation' completed`),
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('Request Logging', () => {
    beforeEach(() => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
    });

    it('should log HTTP request', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/test',
        get: jest.fn((header) => 'test-agent'),
        ip: '127.0.0.1',
      };
      
      const mockRes = {
        statusCode: 200,
        get: jest.fn((header) => '1024'),
      };
      
      logger.logRequest(mockReq, mockRes, 100);
      
      expect(logger.winston.log).toHaveBeenCalledWith(
        LogLevel.HTTP,
        'GET /api/test 200',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          responseTime: 100,
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          contentLength: '1024',
        })
      );
    });

    it('should log error request with warn level', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/error',
        get: jest.fn(),
        ip: '127.0.0.1',
      };
      
      const mockRes = {
        statusCode: 500,
        get: jest.fn(),
      };
      
      logger.logRequest(mockReq, mockRes, 200);
      
      expect(logger.winston.log).toHaveBeenCalledWith(
        LogLevel.WARN,
        'POST /api/error 500',
        expect.objectContaining({
          method: 'POST',
          url: '/api/error',
          statusCode: 500,
          responseTime: 200,
        })
      );
    });
  });

  describe('Database Query Logging', () => {
    beforeEach(() => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
    });

    it('should log database query', () => {
      const query = 'SELECT * FROM users WHERE id = 123';
      const duration = 50;
      
      logger.logQuery(query, duration, { table: 'users' });
      
      expect(logger.winston.debug).toHaveBeenCalledWith(
        'Database query executed',
        expect.objectContaining({
          query,
          duration: 50,
          table: 'users',
        })
      );
    });
  });

  describe('Memory Logging', () => {
    beforeEach(() => {
      // Create logger with memory logging enabled
      logger = new StructuredLogger({
        ...mockLoggerConfig.advanced,
        logToMemory: true,
        maxMemoryLogs: 5,
      });
    });

    it('should store logs in memory', () => {
      const memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs).toEqual([]);
      
      logger.info('Test message 1');
      logger.info('Test message 2');
      
      const updatedLogs = logger.getMemoryLogs();
      expect(updatedLogs).toHaveLength(2);
    });

    it('should filter memory logs by level', () => {
      logger.info('Info message');
      logger.error('Error message');
      
      const infoLogs = logger.getMemoryLogs(LogLevel.INFO);
      const errorLogs = logger.getMemoryLogs(LogLevel.ERROR);
      
      expect(infoLogs).toHaveLength(1);
      expect(errorLogs).toHaveLength(1);
    });

    it('should maintain max memory logs limit', () => {
      // Add more logs than the limit
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }
      
      const memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs).toHaveLength(5); // maxMemoryLogs is 5
    });

    it('should clear memory logs', () => {
      logger.info('Test message');
      
      let memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs).toHaveLength(1);
      
      logger.clearMemoryLogs();
      
      memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should return logger statistics', () => {
      logger.setContext({ userId: 'user-123' });
      logger.startTimer('test-timer');
      logger.info('Test message');
      
      const stats = logger.getStats();
      
      expect(stats).toEqual({
        memoryLogsCount: 0,
        activeTimers: ['test-timer'],
        context: { userId: 'user-123' },
      });
    });
  });

  describe('Flushing', () => {
    it('should flush all transports', async () => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
      
      await logger.flush();
      
      expect(mockWinstonLogger.end).toHaveBeenCalled();
    });
  });

  describe('Default Logger Creation', () => {
    it('should create default logger for development', () => {
      const defaultLogger = createDefaultLogger('test-service', 'development', '1.0.0');
      
      expect(defaultLogger).toBeInstanceOf(StructuredLogger);
    });

    it('should create default logger for production', () => {
      const defaultLogger = createDefaultLogger('test-service', 'production', '1.0.0');
      
      expect(defaultLogger).toBeInstanceOf(StructuredLogger);
    });

    it('should create default logger for test', () => {
      const defaultLogger = createDefaultLogger('test-service', 'test', '1.0.0');
      
      expect(defaultLogger).toBeInstanceOf(StructuredLogger);
    });
  });

  describe('Min Level Calculation', () => {
    it('should calculate minimum level correctly', () => {
      const transports = [
        { level: LogLevel.ERROR },
        { level: LogLevel.WARN },
        { level: LogLevel.INFO },
      ];
      
      const minLevel = (logger as any).getMinLevel(transports);
      
      expect(minLevel).toBe(LogLevel.ERROR);
    });

    it('should handle empty transports array', () => {
      const minLevel = (logger as any).getMinLevel([]);
      
      expect(minLevel).toBe(LogLevel.ERROR);
    });
  });

  describe('Error Handling', () => {
    it('should handle winston logger errors gracefully', () => {
      const mockWinstonLogger = mockWinston.createLogger.mock.results[0].value;
      logger.winston = mockWinstonLogger;
      
      // Should not throw when logging
      expect(() => {
        logger.error('Test error');
      }).not.toThrow();
    });

    it('should handle invalid context data', () => {
      logger.setContext(null as any);
      logger.setContext(undefined as any);
      
      // Should not throw
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
    });
  });
});
