import dotenv from 'dotenv';
import Joi from 'joi';
import { EventEmitter } from 'events';
import { logger } from './logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration schema validation
 */
export interface ConfigSchema {
  [key: string]: Joi.Schema;
}

/**
 * Environment variable mapping
 */
export interface EnvVarMapping {
  [key: string]: string | string[];
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, unknown>;
}

/**
 * Configuration change event data
 */
export interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: 'file' | 'environment' | 'api' | 'reload';
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  name: string;
  file: string;
  variables: EnvVarMapping;
}

/**
 * Configuration manager with validation and hot-reloading
 */
export class ConfigManager extends EventEmitter {
  private config: Map<string, any> = new Map();
  private schemas: ConfigSchema = {};
  private envConfigs: Map<string, EnvironmentConfig> = new Map();
  private watchers: Set<() => void> = new Set();
  private isReloading = false;

  constructor() {
    super();
    this.setupDefaultEnvironments();
  }

  /**
   * Setup default environment configurations
   */
  private setupDefaultEnvironments(): void {
    this.envConfigs.set('development', {
      name: 'development',
      file: '.env.development',
      variables: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        PORT: '3000',
        HOST: 'localhost',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'ai_code_agent_dev',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
    });

    this.envConfigs.set('production', {
      name: 'production',
      file: '.env.production',
      variables: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        PORT: '80',
        HOST: '0.0.0.0',
        DB_HOST: process.env.DB_HOST || 'db',
        DB_PORT: process.env.DB_PORT || '5432',
        DB_NAME: process.env.DB_NAME || 'ai_code_agent',
        REDIS_HOST: process.env.REDIS_HOST || 'redis',
        REDIS_PORT: process.env.REDIS_PORT || '6379',
      },
    });

    this.envConfigs.set('test', {
      name: 'test',
      file: '.env.test',
      variables: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
        PORT: '0', // Use random port for tests
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'ai_code_agent_test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
    });
  }

  /**
   * Register a validation schema
   */
  registerSchema(key: string, schema: Joi.Schema): void {
    this.schemas[key] = schema;
    logger.debug(`Registered config schema for: ${key}`);
  }

  /**
   * Register multiple schemas
   */
  registerSchemas(schemas: ConfigSchema): void {
    Object.entries(schemas).forEach(([key, schema]) => {
      this.registerSchema(key, schema);
    });
  }

  /**
   * Load configuration from environment
   */
  loadFromEnvironment(env?: string): void {
    const environment = env || process.env.NODE_ENV || 'development';
    const envConfig = this.envConfigs.get(environment);

    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    logger.info(`Loading configuration for environment: ${environment}`);

    // Load from .env file for this environment
    try {
      dotenv.config({ path: envConfig.file });
      logger.debug(`Loaded environment file: ${envConfig.file}`);
    } catch (error) {
      logger.warn(`Could not load environment file: ${envConfig.file}`, { error });
    }

    // Set environment variables from config
    Object.entries(envConfig.variables).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array values (like ALLOWED_ORIGINS)
        process.env[key] = value.join(',');
      } else if (typeof value === 'string') {
        // Only set if not already set by user
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });

    logger.info(`Configuration loaded for environment: ${environment}`);
  }

  /**
   * Load configuration from object
   */
  loadFromObject(config: Record<string, unknown>): void {
    Object.entries(config).forEach(([key, value]) => {
      this.set(key, value, 'object');
    });
  }

  /**
   * Load configuration from file (JSON/YAML)
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const ext = path.parse(filePath).ext.toLowerCase();
      const content = await fs.readFile(filePath, 'utf-8');
      
      let config: Record<string, unknown>;
      
      if (ext === '.json') {
        config = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        const yaml = await import('yaml');
        config = yaml.parse(content);
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      this.loadFromObject(config);
      logger.info(`Configuration loaded from file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to load configuration from file: ${filePath}`, { error });
      throw error;
    }
  }

  /**
   * Set a configuration value
   */
  set(key: string, value: unknown, source: 'file' | 'environment' | 'api' | 'reload' = 'environment'): void {
    const oldValue = this.config.get(key);
    this.config.set(key, value);
    
    if (oldValue !== value) {
      const changeEvent: ConfigChangeEvent = {
        key,
        oldValue,
        newValue: value,
        source,
      };
      this.emit('change', changeEvent);
      logger.debug(`Configuration changed: ${key}`, { oldValue, newValue, source });
    }
  }

  /**
   * Get a configuration value
   */
  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    return this.config.has(key) ? this.config.get(key) : defaultValue;
  }

  /**
   * Get a required configuration value (throws if not found)
   */
  getRequired<T = unknown>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Required configuration key not found: ${key}`);
    }
    return value;
  }

  /**
   * Check if a configuration key exists
   */
  has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Delete a configuration value
   */
  delete(key: string): boolean {
    const existed = this.config.delete(key);
    if (existed) {
      this.emit('change', {
        key,
        oldValue: existed,
        newValue: undefined,
        source: 'api',
      });
    }
    return existed;
  }

  /**
   * Get all configuration as object
   */
  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.config.entries());
  }

  /**
   * Validate all configuration against schemas
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedConfig: Record<string, unknown> = {};

    // Validate against registered schemas
    for (const [key, schema] of Object.entries(this.schemas)) {
      const value = this.get(key);
      
      if (value === undefined) {
        errors.push(`Missing required configuration: ${key}`);
        continue;
      }

      const { error, value: validatedValue } = schema.validate(value);
      
      if (error) {
        errors.push(`${key}: ${error.message}`);
      } else {
        validatedConfig[key] = validatedValue;
      }
    }

    // Check for unused configuration keys
    const schemaKeys = new Set(Object.keys(this.schemas));
    const configKeys = new Set(this.config.keys());
    
    configKeys.forEach(key => {
      if (!schemaKeys.has(key)) {
        warnings.push(`Configuration key not in schema: ${key}`);
      }
    });

    // Check for missing configuration keys
    schemaKeys.forEach(key => {
      if (!configKeys.has(key)) {
        warnings.push(`Configuration key missing from config: ${key}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config: validatedConfig,
    };
  }

  /**
   * Validate specific configuration key
   */
  validateKey(key: string): { isValid: boolean; error?: string; value?: unknown } {
    const schema = this.schemas[key];
    if (!schema) {
      return { isValid: true }; // No schema means no validation needed
    }

    const value = this.get(key);
    if (value === undefined) {
      return { isValid: false, error: `Missing required configuration: ${key}` };
    }

    const { error, value: validatedValue } = schema.validate(value);
    
    if (error) {
      return { isValid: false, error: error.message, value };
    }

    return { isValid: true, value: validatedValue };
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: (change: ConfigChangeEvent) => void): () => void {
    this.on('change', callback);
    
    return () => {
      this.off('change', callback);
    };
  }

  /**
   * Watch configuration file for changes
   */
  watchFile(filePath: string, callback?: () => void): () => void {
    let timeoutId: NodeJS.Timeout;
    
    const watcher = async () => {
      if (this.isReloading) return;
      
      this.isReloading = true;
      
      try {
        await this.reloadFromFile(filePath);
        if (callback) callback();
      } catch (error) {
        logger.error('Error reloading configuration file', { filePath, error });
      } finally {
        this.isReloading = false;
      }
    };

    const fs = require('fs');
    const chokidar = require('chokidar'); // Dynamic import to avoid dependency issues
    
    const watcherInstance = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcherInstance.on('change', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(watcher, 1000); // Debounce changes
    });

    watcherInstance.on('error', (error: Error) => {
      logger.error('File watcher error', { filePath, error });
    });

    const unwatch = () => {
      watcherInstance.close();
      clearTimeout(timeoutId);
    };

    return unwatch;
  }

  /**
   * Reload configuration from file
   */
  private async reloadFromFile(filePath: string): Promise<void> {
    logger.info(`Reloading configuration from: ${filePath}`);
    
    try {
      await this.loadFromFile(filePath);
      logger.info('Configuration reloaded successfully');
    } catch (error) {
      logger.error('Failed to reload configuration', { filePath, error });
      throw error;
    }
  }

  /**
   * Create typed getter for configuration
   */
  typed<T = unknown>(key: string): {
    get: (defaultValue?: T) => T | undefined;
    getRequired: () => T;
    validate: () => { isValid: boolean; error?: string; value?: T };
  } {
    return {
      get: (defaultValue?: T) => this.get<T>(key, defaultValue),
      getRequired: () => this.getRequired<T>(key),
      validate: () => this.validateKey(key) as { isValid: boolean; error?: string; value?: T },
    };
  }

  /**
   * Merge configuration from multiple sources
   */
  merge(sources: Array<Record<string, unknown>>): void {
    for (const source of sources) {
      this.loadFromObject(source);
    }
  }

  /**
   * Export configuration for debugging (with sensitive data redacted)
   */
  export(redactSensitive = true): Record<string, unknown> {
    const exportObj: Record<string, unknown> = {};
    
    for (const [key, value] of this.config.entries()) {
      if (redactSensitive && this.isSensitiveKey(key)) {
        exportObj[key] = this.redactValue(value);
      } else {
        exportObj[key] = value;
      }
    }
    
    return exportObj;
  }

  /**
   * Check if a key is considered sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
      /private/i,
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Redact sensitive values
   */
  private redactValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***';
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.redactValue(item));
    }
    
    if (typeof value === 'object' && value !== null) {
      const redacted: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        redacted[key] = this.isSensitiveKey(key) ? '***' : this.redactValue(val);
      }
      return redacted;
    }
    
    return '***';
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.config.clear();
    logger.debug('Configuration cleared');
  }

  /**
   * Get configuration statistics
   */
  getStats(): {
    totalKeys: number;
    schemaCount: number;
    envConfigs: string[];
  } {
    return {
      totalKeys: this.config.size,
      schemaCount: Object.keys(this.schemas).length,
      envConfigs: Array.from(this.envConfigs.keys()),
    };
  }
}

// Create a singleton instance
export const config = new ConfigManager();

// Common configuration schemas
export const createCommonSchemas = () => ({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('localhost'),
  
  // Database configuration
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_MIN: Joi.number().min(0).default(0),
  DB_POOL_MAX: Joi.number().min(1).default(10),
  
  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),
  REDIS_DB: Joi.number().min(0).default(0),
  
  // Security configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(10).max(20).default(12),
  
  // Logging configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),
  
  // API configuration
  API_PREFIX: Joi.string().default('/api'),
  API_VERSION: Joi.string().default('v1'),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW: Joi.number().min(60000).default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),
  
  // External services
  OPENAI_API_KEY: Joi.string().allow(''),
  GROQ_API_KEY: Joi.string().allow(''),
  
  // Feature flags
  ENABLE_METRICS: Joi.boolean().default(false),
  ENABLE_PROFILING: Joi.boolean().default(false),
  ENABLE_SWAGGER: Joi.boolean().default(false),
});