/**
 * Integration Tests Example
 * 
 * This file demonstrates how to write integration tests
 * that test how multiple components work together.
 */

import { ConfigManager } from '../../src/core/config';
import { StructuredLogger, createDefaultLogger } from '../../src/core/logger';
import { TypedEventBus, Events } from '../../src/core/event-bus';
import { TestDatabaseManager, TestDatabaseFactory } from '../helpers/database-setup';
import { testDataFactory, EventTestHelper } from '../utils/test-utils';

describe('Core Components Integration', () => {
  let configManager: ConfigManager;
  let logger: StructuredLogger;
  let eventBus: TypedEventBus;
  let dbManager: TestDatabaseManager;
  let eventHelper: EventTestHelper;

  beforeAll(async () => {
    // Initialize database manager
    dbManager = TestDatabaseFactory.createFromEnv();
    const dbResult = await dbManager.setup();
    
    if (!dbResult.success) {
      console.warn('Database setup failed, continuing without database:', dbResult.error);
    }
  });

  afterAll(async () => {
    // Cleanup database
    await dbManager.teardown();
  });

  beforeEach(() => {
    // Initialize components
    configManager = new ConfigManager();
    logger = createDefaultLogger('test-service', 'test', '1.0.0');
    eventBus = new TypedEventBus({ verbose: false });
    eventHelper = new EventTestHelper();

    // Load test configuration
    configManager.loadFromEnvironment('test');
    
    // Setup event capture
    eventHelper.captureEvents(eventBus);
  });

  afterEach(() => {
    // Cleanup
    configManager.clear();
    eventBus.removeAllListeners();
    logger.clearMemoryLogs();
    eventHelper.clear();
  });

  describe('Config-Logger Integration', () => {
    it('should use configuration to setup logger', () => {
      // Set log level in config
      configManager.set('LOG_LEVEL', 'debug');
      configManager.set('SERVICE_NAME', 'integration-test');

      // Create logger with config
      const testLogger = createDefaultLogger(
        configManager.get('SERVICE_NAME', 'test-service'),
        'test',
        '1.0.0'
      );

      // Logger should be created successfully
      expect(testLogger).toBeInstanceOf(StructuredLogger);
    });

    it('should log configuration changes', () => {
      const configChangeHandler = jest.fn();
      
      logger.setContext({ component: 'config' });
      configManager.on('change', (event) => {
        logger.info('Config changed', event);
      });

      configManager.set('TEST_KEY', 'test-value');
      
      // Should not throw
      expect(() => configManager.set('TEST_KEY', 'new-value')).not.toThrow();
    });
  });

  describe('Config-EventBus Integration', () => {
    it('should emit events when configuration changes', (done) => {
      const changeHandler = jest.fn((event) => {
        expect(event.key).toBe('EMIT_TEST_KEY');
        expect(event.newValue).toBe('test-value');
        done();
      });

      eventBus.on('change', changeHandler);
      configManager.on('change', (event) => {
        eventBus.emit('change', event);
      });

      configManager.set('EMIT_TEST_KEY', 'test-value');
    });

    it('should handle configuration validation events', async () => {
      // Register validation schema
      configManager.registerSchema('PORT', require('joi').number().port().required());
      
      const validationHandler = jest.fn();
      eventBus.on('config:validated', validationHandler);

      // Set valid value
      configManager.set('PORT', 3000);
      
      // Emit validation event
      eventBus.emitAsync('config:validated', {
        key: 'PORT',
        isValid: true,
        value: 3000,
      });

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(validationHandler).toHaveBeenCalled();
    });
  });

  describe('Logger-EventBus Integration', () => {
    it('should log event emissions', () => {
      const logSpy = jest.spyOn(logger, 'info');
      
      eventBus.on('test:event', (data) => {
        logger.info('Event received', { data });
      });

      eventBus.emit('test:event', { message: 'test' });

      expect(logSpy).toHaveBeenCalledWith(
        'Event received',
        expect.objectContaining({ data: { message: 'test' } })
      );
    });

    it('should handle event errors with logging', async () => {
      const errorSpy = jest.spyOn(logger, 'error');
      
      eventBus.on('error:event', () => {
        throw new Error('Test event error');
      });

      await eventBus.emitAsync('error:event', { data: 'test' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ message: 'Test event error' }) })
      );
    });
  });

  describe('All Three Components Integration', () => {
    it('should work together in a complete workflow', async () => {
      // 1. Setup configuration
      configManager.registerSchemas({
        ENABLE_FEATURE: require('joi').boolean().default(false),
        FEATURE_TIMEOUT: require('joi').number().default(5000),
      });

      // 2. Setup event handlers with logging
      eventBus.on('feature:enable', (data) => {
        logger.info('Feature enabled', { feature: data.feature });
      });

      eventBus.on('feature:disable', (data) => {
        logger.info('Feature disabled', { feature: data.feature });
      });

      eventBus.on('feature:error', (data) => {
        logger.error('Feature error', data);
      });

      // 3. Simulate workflow
      const enableResult = eventBus.emitAsync('feature:enable', {
        feature: 'test-feature',
        enabled: true,
      });

      await enableResult;

      // Verify events were captured
      const enableEvents = eventHelper.getEventsByName('feature:enable');
      expect(enableEvents).toHaveLength(1);
      expect(enableEvents[0].data).toEqual({
        feature: 'test-feature',
        enabled: true,
      });

      // Verify logging
      const memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs.length).toBeGreaterThan(0);
      
      // Verify configuration
      expect(configManager.get('ENABLE_FEATURE')).toBe(false); // Default value
    });

    it('should handle error scenarios gracefully', async () => {
      let errorHandled = false;

      // Setup error handling chain
      eventBus.on('system:error', async (data) => {
        logger.error('System error occurred', data);
        
        // Update configuration to disable problematic feature
        configManager.set('ENABLE_FEATURE', false);
        
        errorHandled = true;
      });

      // Trigger error
      await eventBus.emitAsync('system:error', {
        error: 'Integration test error',
        severity: 'high',
        component: 'test',
      });

      // Verify error was handled
      expect(errorHandled).toBe(true);

      // Verify configuration was updated
      expect(configManager.get('ENABLE_FEATURE')).toBe(false);

      // Verify error was logged
      const errorLogs = logger.getMemoryLogs('error' as any);
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance under load', async () => {
      const startTime = Date.now();

      // Setup logging for performance tracking
      logger.setContext({ test: 'performance' });

      // Create multiple event listeners
      const listenerCount = 50;
      const listeners: string[] = [];

      for (let i = 0; i < listenerCount; i++) {
        const listenerId = eventBus.on(`perf:event:${i}`, (data) => {
          logger.debug(`Performance event ${i}`, { iteration: data.iteration });
        });
        listeners.push(listenerId);
      }

      // Emit events
      const eventCount = 100;
      const promises = [];

      for (let i = 0; i < eventCount; i++) {
        const eventName = `perf:event:${i % listenerCount}`;
        promises.push(
          eventBus.emitAsync(eventName, { iteration: i, timestamp: Date.now() })
        );
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify events were captured
      const totalEvents = eventHelper.getEvents().length;
      expect(totalEvents).toBe(eventCount);
    }, 10000); // 10 second timeout

    it('should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate many configuration changes
      for (let i = 0; i < 1000; i++) {
        configManager.set(`MEMORY_TEST_${i}`, `value_${i}`);
        eventBus.emit('memory:test', { key: `MEMORY_TEST_${i}`, value: `value_${i}` });
      }

      const afterConfigMemory = process.memoryUsage();
      
      // Clear and verify memory is released
      configManager.clear();
      eventBus.removeAllListeners();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      
      // Memory should not grow excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });

  describe('Real-world Scenarios', () => {
    it('should simulate application startup sequence', async () => {
      const startupEvents: string[] = [];

      // Setup event handlers for startup sequence
      eventBus.on(Events.SYSTEM_START, async (data) => {
        startupEvents.push('system:start');
        logger.info('System starting', data);
      });

      eventBus.on(Events.DB_CONNECT, async (data) => {
        startupEvents.push('db:connect');
        logger.info('Database connected', data);
        
        // Simulate configuration loading after DB connect
        configManager.loadFromObject({
          DB_CONNECTED: true,
          STARTUP_TIME: Date.now(),
        });
      });

      eventBus.on(Events.AGENT_REGISTERED, async (data) => {
        startupEvents.push('agent:registered');
        logger.info('Agent registered', data);
      });

      // Simulate startup sequence
      await eventBus.emitAsync(Events.SYSTEM_START, {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });

      await eventBus.emitAsync(Events.DB_CONNECT, {
        host: configManager.get('DB_HOST', 'localhost'),
        port: configManager.get('DB_PORT', 5432),
        database: configManager.get('DB_NAME', 'test'),
      });

      await eventBus.emitAsync(Events.AGENT_REGISTERED, {
        agentId: 'test-agent-1',
        type: 'test-agent',
        capabilities: ['test-capability'],
      });

      // Verify startup sequence
      expect(startupEvents).toEqual([
        'system:start',
        'db:connect',
        'agent:registered',
      ]);

      // Verify configuration was loaded
      expect(configManager.get('DB_CONNECTED')).toBe(true);
      expect(configManager.get('STARTUP_TIME')).toBeDefined();
    });

    it('should handle graceful shutdown', async () => {
      const shutdownEvents: string[] = [];

      // Setup shutdown handlers
      eventBus.on(Events.SYSTEM_STOP, async (data) => {
        shutdownEvents.push('system:stop');
        logger.info('System stopping', data);
        
        // Clear configuration on shutdown
        configManager.clear();
      });

      eventBus.on(Events.DB_DISCONNECT, async (data) => {
        shutdownEvents.push('db:disconnect');
        logger.info('Database disconnected', data);
      });

      // Simulate shutdown
      await eventBus.emitAsync(Events.DB_DISCONNECT, {
        reason: 'graceful shutdown',
      });

      await eventBus.emitAsync(Events.SYSTEM_STOP, {
        timestamp: new Date().toISOString(),
        reason: 'normal shutdown',
      });

      // Verify shutdown sequence
      expect(shutdownEvents).toEqual([
        'db:disconnect',
        'system:stop',
      ]);

      // Verify configuration was cleared
      expect(configManager.getAll()).toEqual({});
    });
  });
});
