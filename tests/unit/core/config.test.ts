/**
 * Tests for Config Component
 */

import Joi from 'joi';
import { ConfigManager, createCommonSchemas } from '../../src/core/config';
import {
  createMock,
  createAsyncMock,
  testDataFactory,
  expectToThrow,
  expectWithinRange,
  createTempFile,
} from '../utils/test-utils';
import { mockConfigData, mockConfigValidation } from '../fixtures/mock-data';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEST_') || key.startsWith('NODE_') || key.startsWith('DB_') || key.startsWith('REDIS_')) {
        delete process.env[key];
      }
    });

    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    configManager.clear();
  });

  describe('Constructor and Initialization', () => {
    it('should create config manager instance', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });

    it('should setup default environments', () => {
      const stats = configManager.getStats();
      expect(stats.envConfigs).toEqual(['development', 'production', 'test']);
    });

    it('should have empty configuration initially', () => {
      const config = configManager.getAll();
      expect(Object.keys(config)).toHaveLength(0);
    });
  });

  describe('Schema Registration', () => {
    it('should register a single schema', () => {
      const schema = Joi.string().required();
      configManager.registerSchema('TEST_KEY', schema);
      
      const validation = configManager.validateKey('TEST_KEY');
      expect(validation.isValid).toBe(false); // No value set yet
    });

    it('should register multiple schemas at once', () => {
      const schemas = {
        PORT: Joi.number().port().required(),
        HOST: Joi.string().required(),
      };
      
      configManager.registerSchemas(schemas);
      
      expect(configManager.getStats().schemaCount).toBe(2);
    });

    it('should validate against registered schemas', () => {
      configManager.registerSchema('PORT', Joi.number().port().required());
      configManager.set('PORT', 3000);
      
      const validation = configManager.validateKey('PORT');
      expect(validation.isValid).toBe(true);
      expect(validation.value).toBe(3000);
    });

    it('should fail validation for invalid values', () => {
      configManager.registerSchema('PORT', Joi.number().port().required());
      configManager.set('PORT', 'invalid');
      
      const validation = configManager.validateKey('PORT');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('Environment Configuration', () => {
    it('should load development environment', () => {
      process.env.NODE_ENV = 'development';
      
      expect(() => {
        configManager.loadFromEnvironment('development');
      }).not.toThrow();
    });

    it('should load test environment', () => {
      expect(() => {
        configManager.loadFromEnvironment('test');
      }).not.toThrow();
    });

    it('should load production environment', () => {
      expect(() => {
        configManager.loadFromEnvironment('production');
      }).not.toThrow();
    });

    it('should throw error for unknown environment', () => {
      expect(() => {
        configManager.loadFromEnvironment('unknown');
      }).toThrow('Unknown environment: unknown');
    });

    it('should set environment variables from config', () => {
      configManager.loadFromEnvironment('test');
      
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.LOG_LEVEL).toBe('error');
      expect(process.env.PORT).toBe('0');
    });

    it('should not override existing environment variables', () => {
      process.env.PORT = '8080';
      configManager.loadFromEnvironment('test');
      
      // Should not change the existing PORT
      expect(process.env.PORT).toBe('8080');
    });
  });

  describe('Configuration Loading', () => {
    it('should load configuration from object', () => {
      const configData = {
        PORT: 3000,
        HOST: 'localhost',
        DB_HOST: 'localhost',
      };
      
      configManager.loadFromObject(configData);
      
      expect(configManager.get('PORT')).toBe(3000);
      expect(configManager.get('HOST')).toBe('localhost');
      expect(configManager.get('DB_HOST')).toBe('localhost');
    });

    it('should load configuration from JSON file', async () => {
      const configFile = createTempFile(JSON.stringify({
        PORT: 3000,
        HOST: 'localhost',
      }), '.json');
      
      await configManager.loadFromFile(configFile);
      
      expect(configManager.get('PORT')).toBe(3000);
      expect(configManager.get('HOST')).toBe('localhost');
      
      // Cleanup
      require('fs').unlinkSync(configFile);
    });

    it('should load configuration from YAML file', async () => {
      const yamlContent = `
PORT: 3000
HOST: localhost
DATABASE:
  host: localhost
  port: 5432
`;
      const configFile = createTempFile(yamlContent, '.yaml');
      
      await configManager.loadFromFile(configFile);
      
      expect(configManager.get('PORT')).toBe(3000);
      expect(configManager.get('HOST')).toBe('localhost');
      expect(configManager.get('DATABASE')).toEqual({
        host: 'localhost',
        port: 5432,
      });
      
      // Cleanup
      require('fs').unlinkSync(configFile);
    });

    it('should throw error for unsupported file format', async () => {
      const configFile = createTempFile('test content', '.txt');
      
      await expect(configManager.loadFromFile(configFile)).rejects.toThrow('Unsupported file format');
      
      // Cleanup
      require('fs').unlinkSync(configFile);
    });

    it('should throw error for non-existent file', async () => {
      await expect(configManager.loadFromFile('/non-existent/file.json')).rejects.toThrow();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      configManager.loadFromEnvironment('test');
    });

    it('should set configuration values', () => {
      configManager.set('TEST_KEY', 'test-value');
      
      expect(configManager.get('TEST_KEY')).toBe('test-value');
    });

    it('should get configuration values', () => {
      configManager.set('PORT', 3000);
      
      expect(configManager.get('PORT')).toBe(3000);
      expect(configManager.get('NON_EXISTENT')).toBeUndefined();
    });

    it('should get configuration values with default', () => {
      expect(configManager.get('NON_EXISTENT', 'default-value')).toBe('default-value');
    });

    it('should get required configuration values', () => {
      configManager.set('REQUIRED_KEY', 'required-value');
      
      expect(configManager.getRequired('REQUIRED_KEY')).toBe('required-value');
    });

    it('should throw error for missing required configuration', () => {
      expect(() => {
        configManager.getRequired('MISSING_KEY');
      }).toThrow('Required configuration key not found: MISSING_KEY');
    });

    it('should check if configuration key exists', () => {
      configManager.set('EXISTS_KEY', 'value');
      
      expect(configManager.has('EXISTS_KEY')).toBe(true);
      expect(configManager.has('NON_EXISTS_KEY')).toBe(false);
    });

    it('should delete configuration values', () => {
      configManager.set('DELETE_KEY', 'value');
      expect(configManager.has('DELETE_KEY')).toBe(true);
      
      configManager.delete('DELETE_KEY');
      expect(configManager.has('DELETE_KEY')).toBe(false);
    });

    it('should return all configuration as object', () => {
      configManager.set('KEY1', 'value1');
      configManager.set('KEY2', 'value2');
      
      const allConfig = configManager.getAll();
      expect(allConfig).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
      });
    });

    it('should clear all configuration', () => {
      configManager.set('KEY1', 'value1');
      configManager.set('KEY2', 'value2');
      
      configManager.clear();
      
      expect(configManager.getAll()).toEqual({});
    });
  });

  describe('Configuration Events', () => {
    it('should emit change event when configuration is modified', (done) => {
      const changeHandler = jest.fn();
      
      configManager.on('change', (event) => {
        changeHandler(event);
        expect(event).toEqual({
          key: 'TEST_KEY',
          oldValue: undefined,
          newValue: 'test-value',
          source: 'environment',
        });
        done();
      });
      
      configManager.set('TEST_KEY', 'test-value');
    });

    it('should emit change event when configuration is deleted', (done) => {
      configManager.set('DELETE_ME', 'value');
      
      configManager.on('change', (event) => {
        expect(event).toEqual({
          key: 'DELETE_ME',
          oldValue: 'value',
          newValue: undefined,
          source: 'api',
        });
        done();
      });
      
      configManager.delete('DELETE_ME');
    });

    it('should not emit change event when value is unchanged', () => {
      const changeHandler = jest.fn();
      
      configManager.on('change', changeHandler);
      configManager.set('SAME_KEY', 'value');
      configManager.set('SAME_KEY', 'value'); // Same value
      
      expect(changeHandler).toHaveBeenCalledTimes(1);
    });

    it('should support configuration change watchers', () => {
      const watcher = jest.fn();
      const unwatch = configManager.watch(watcher);
      
      configManager.set('WATCH_KEY', 'value');
      
      expect(watcher).toHaveBeenCalledWith({
        key: 'WATCH_KEY',
        oldValue: undefined,
        newValue: 'value',
        source: 'environment',
      });
      
      unwatch();
      
      configManager.set('WATCH_KEY', 'new-value');
      expect(watcher).toHaveBeenCalledTimes(1); // Should not be called after unwatch
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      configManager.registerSchemas({
        PORT: Joi.number().port().required(),
        HOST: Joi.string().required(),
        DEBUG: Joi.boolean().default(false),
      });
      
      configManager.set('PORT', 3000);
      configManager.set('HOST', 'localhost');
      configManager.set('DEBUG', true);
    });

    it('should validate all configuration', () => {
      const validation = configManager.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid configuration', () => {
      configManager.set('PORT', 'invalid');
      
      const validation = configManager.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate single configuration key', () => {
      const validation = configManager.validateKey('PORT');
      
      expect(validation.isValid).toBe(true);
      expect(validation.value).toBe(3000);
    });

    it('should return validation error for invalid key', () => {
      configManager.set('PORT', 'invalid');
      
      const validation = configManager.validateKey('PORT');
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should handle validation warnings for unused config keys', () => {
      configManager.set('UNUSED_KEY', 'value');
      
      const validation = configManager.validate();
      
      expect(validation.warnings).toContain('Configuration key not in schema: UNUSED_KEY');
    });

    it('should handle validation warnings for missing config keys', () => {
      // HOST is required but not set in this test
      const tempConfig = new ConfigManager();
      tempConfig.registerSchemas({
        REQUIRED_KEY: Joi.string().required(),
        OPTIONAL_KEY: Joi.string().default('default'),
      });
      
      const validation = tempConfig.validate();
      
      expect(validation.warnings).toContain('Configuration key missing from config: REQUIRED_KEY');
    });
  });

  describe('Typed Configuration Getters', () => {
    beforeEach(() => {
      configManager.set('PORT', 3000);
      configManager.set('HOST', 'localhost');
    });

    it('should create typed getter for configuration', () => {
      const portConfig = configManager.typed<number>('PORT');
      
      expect(portConfig.get()).toBe(3000);
      expect(portConfig.getRequired()).toBe(3000);
      expect(portConfig.validate().isValid).toBe(true);
    });

    it('should handle typed getter with default value', () => {
      const unknownConfig = configManager.typed<number>('UNKNOWN_PORT');
      
      expect(unknownConfig.get(8080)).toBe(8080);
    });

    it('should throw error for required value that does not exist', () => {
      const unknownConfig = configManager.typed<number>('UNKNOWN_REQUIRED');
      
      expect(() => {
        unknownConfig.getRequired();
      }).toThrow('Required configuration key not found: UNKNOWN_REQUIRED');
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configuration from multiple sources', () => {
      const source1 = { KEY1: 'value1', SHARED: 'from-source1' };
      const source2 = { KEY2: 'value2', SHARED: 'from-source2' };
      
      configManager.merge([source1, source2]);
      
      expect(configManager.get('KEY1')).toBe('value1');
      expect(configManager.get('KEY2')).toBe('value2');
      expect(configManager.get('SHARED')).toBe('from-source2'); // Last source wins
    });
  });

  describe('Configuration Export and Redaction', () => {
    beforeEach(() => {
      configManager.set('PUBLIC_KEY', 'public-value');
      configManager.set('PASSWORD', 'secret-password');
      configManager.set('API_KEY', 'sk-1234567890');
    });

    it('should export configuration without redaction', () => {
      const exportConfig = configManager.export(false);
      
      expect(exportConfig).toEqual({
        PUBLIC_KEY: 'public-value',
        PASSWORD: 'secret-password',
        API_KEY: 'sk-1234567890',
      });
    });

    it('should export configuration with sensitive data redacted', () => {
      const exportConfig = configManager.export(true);
      
      expect(exportConfig).toEqual({
        PUBLIC_KEY: 'public-value',
        PASSWORD: 'secr...word',
        API_KEY: 'sk-...6789',
      });
    });

    it('should identify sensitive configuration keys', () => {
      const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential', 'private'];
      
      sensitiveKeys.forEach(key => {
        const config = new ConfigManager();
        config.set(key, 'test-value');
        
        const exportConfig = config.export(true);
        expect(exportConfig[key]).toBe('***');
      });
    });

    it('should handle complex sensitive data structures', () => {
      configManager.set('COMPLEX_CONFIG', {
        publicField: 'visible',
        password: 'secret',
        nested: {
          apiKey: 'key-123',
          token: 'token-456',
        },
      });
      
      const exportConfig = configManager.export(true);
      
      expect(exportConfig['COMPLEX_CONFIG']).toEqual({
        publicField: 'visible',
        password: '***',
        nested: {
          apiKey: '***',
          token: '***',
        },
      });
    });
  });

  describe('Statistics', () => {
    it('should return configuration statistics', () => {
      configManager.set('KEY1', 'value1');
      configManager.set('KEY2', 'value2');
      
      const stats = configManager.getStats();
      
      expect(stats).toEqual({
        totalKeys: 2,
        schemaCount: 0,
        envConfigs: ['development', 'production', 'test'],
      });
    });

    it('should update statistics when configuration changes', () => {
      expect(configManager.getStats().totalKeys).toBe(0);
      
      configManager.set('KEY1', 'value1');
      expect(configManager.getStats().totalKeys).toBe(1);
      
      configManager.delete('KEY1');
      expect(configManager.getStats().totalKeys).toBe(0);
    });
  });

  describe('Common Schemas', () => {
    it('should create common configuration schemas', () => {
      const schemas = createCommonSchemas();
      
      expect(schemas).toHaveProperty('NODE_ENV');
      expect(schemas).toHaveProperty('PORT');
      expect(schemas).toHaveProperty('DB_HOST');
      expect(schemas).toHaveProperty('JWT_SECRET');
      expect(schemas).toHaveProperty('LOG_LEVEL');
    });

    it('should validate against common schemas', () => {
      const schemas = createCommonSchemas();
      configManager.registerSchemas(schemas);
      
      configManager.set('PORT', 3000);
      configManager.set('NODE_ENV', 'development');
      configManager.set('DB_HOST', 'localhost');
      
      const validation = configManager.validate();
      
      expect(validation.isValid).toBe(true);
    });

    it('should fail validation for invalid common schema values', () => {
      const schemas = createCommonSchemas();
      configManager.registerSchemas(schemas);
      
      configManager.set('NODE_ENV', 'invalid-environment');
      configManager.set('PORT', 'not-a-number');
      
      const validation = configManager.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration File Watching', () => {
    // Note: File watching tests would require actual file system operations
    // and are typically tested with integration tests or by mocking fs modules
    it('should have watchFile method', () => {
      expect(typeof configManager.watchFile).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid schema validation', () => {
      const invalidSchema = null;
      
      expect(() => {
        configManager.registerSchema('INVALID', invalidSchema as any);
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle configuration loading errors', async () => {
      await expect(
        configManager.loadFromFile('/non-existent-file.json')
      ).rejects.toThrow();
    });

    it('should handle circular references in configuration', () => {
      const circularRef: any = {};
      circularRef.self = circularRef;
      
      // Should handle circular references gracefully
      expect(() => {
        configManager.set('CIRCULAR', circularRef);
      }).not.toThrow();
    });
  });
});
