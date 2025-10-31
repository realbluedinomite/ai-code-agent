/**
 * Verification Test
 * 
 * This test verifies that the testing framework is properly set up
 * and all components are working correctly.
 */

import { ConfigManager } from '../../src/core/config';
import { StructuredLogger, createDefaultLogger } from '../../src/core/logger';
import { TypedEventBus } from '../../src/core/event-bus';

describe('Testing Framework Verification', () => {
  describe('Component Import and Instantiation', () => {
    it('should import and instantiate ConfigManager', () => {
      const config = new ConfigManager();
      expect(config).toBeInstanceOf(ConfigManager);
      expect(config.getStats().envConfigs).toContain('test');
    });

    it('should import and instantiate StructuredLogger', () => {
      const logger = createDefaultLogger('test-service', 'test', '1.0.0');
      expect(logger).toBeInstanceOf(StructuredLogger);
      
      // Test logging
      logger.info('Test log message');
      const memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs.length).toBeGreaterThan(0);
    });

    it('should import and instantiate TypedEventBus', () => {
      const eventBus = new TypedEventBus();
      expect(eventBus).toBeInstanceOf(TypedEventBus);
      
      const handler = jest.fn();
      const listenerId = eventBus.on('test:event', handler);
      expect(typeof listenerId).toBe('string');
      
      eventBus.emit('test:event', { message: 'test' });
      expect(handler).toHaveBeenCalledWith({ message: 'test' });
    });
  });

  describe('Test Utilities', () => {
    it('should provide test utilities', () => {
      // These should be available globally
      expect(global.testUtils).toBeDefined();
      expect(typeof global.testUtils.generateId).toBe('function');
      expect(typeof global.testUtils.waitFor).toBe('function');
    });

    it('should generate unique IDs', () => {
      const id1 = global.testUtils.generateId();
      const id2 = global.testUtils.generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should create test users', () => {
      const user = global.testUtils.createTestUser();
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user.name).toBe('Test User');
    });
  });

  describe('Jest Configuration', () => {
    it('should have access to Jest matchers', () => {
      // Test custom matchers
      expect(5).toBeWithinRange(1, 10);
      expect(() => {
        throw new Error('test error');
      }).toThrow();
    });

    it('should handle async operations', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      };

      const result = await asyncFunction();
      expect(result).toBe('success');
    });
  });

  describe('Mock Data and Fixtures', () => {
    it('should import mock data', async () => {
      const { mockConfigData, mockEventData } = await import('../fixtures/mock-data');
      
      expect(mockConfigData).toBeDefined();
      expect(mockEventData).toBeDefined();
      expect(mockConfigData.test).toBeDefined();
      expect(mockEventData['system:start']).toBeDefined();
    });

    it('should use mock configurations', () => {
      const config = new ConfigManager();
      config.loadFromObject(mockConfigData.test);
      
      expect(config.get('NODE_ENV')).toBe('test');
      expect(config.get('LOG_LEVEL')).toBe('error');
    });
  });

  describe('Integration Check', () => {
    it('should work with all components together', () => {
      // Create components
      const config = new ConfigManager();
      const logger = createDefaultLogger('verification-test', 'test', '1.0.0');
      const eventBus = new TypedEventBus();

      // Setup integration
      config.set('INTEGRATION_TEST', 'success');
      
      eventBus.on('integration:test', (data) => {
        logger.info('Integration test event', data);
      });

      // Test integration
      eventBus.emit('integration:test', { 
        configValue: config.get('INTEGRATION_TEST'),
        timestamp: new Date().toISOString() 
      });

      // Verify
      const memoryLogs = logger.getMemoryLogs();
      expect(memoryLogs.length).toBeGreaterThan(0);
      
      const integrationEvent = memoryLogs.find(log => 
        log.message.includes('Integration test event')
      );
      expect(integrationEvent).toBeDefined();
      expect(integrationEvent?.format.configValue).toBe('success');
    });
  });

  describe('Environment Setup', () => {
    it('should be running in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should have test configuration loaded', () => {
      const config = new ConfigManager();
      config.loadFromEnvironment('test');
      
      expect(config.get('NODE_ENV')).toBe('test');
    });
  });

  describe('Cleanup Verification', () => {
    it('should clean up after each test', () => {
      const config = new ConfigManager();
      const eventBus = new TypedEventBus();
      const logger = createDefaultLogger('cleanup-test', 'test', '1.0.0');

      // Add some data
      config.set('CLEANUP_TEST', 'value');
      eventBus.on('cleanup:test', jest.fn());
      logger.info('Cleanup test message');

      // Clear (this happens in setup.ts afterEach)
      config.clear();
      eventBus.removeAllListeners();
      logger.clearMemoryLogs();

      // Verify cleanup
      expect(config.getAll()).toEqual({});
      expect(eventBus.eventNames()).toEqual([]);
      expect(logger.getMemoryLogs()).toEqual([]);
    });
  });

  describe('Performance Check', () => {
    it('should complete tests within reasonable time', async () => {
      const startTime = Date.now();
      
      // Perform some operations
      const config = new ConfigManager();
      const logger = createDefaultLogger('perf-test', 'test', '1.0.0');
      const eventBus = new TypedEventBus();

      for (let i = 0; i < 100; i++) {
        config.set(`perf_${i}`, `value_${i}`);
        eventBus.emit('perf:event', { index: i });
        logger.debug(`Performance test ${i}`);
      }

      const duration = Date.now() - startTime;
      
      // Should complete within 1 second for this simple test
      expect(duration).toBeLessThan(1000);
    }, 5000); // 5 second timeout for this test
  });
});
