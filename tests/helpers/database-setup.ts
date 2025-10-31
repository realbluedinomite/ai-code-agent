/**
 * Test Database Setup and Teardown
 * 
 * Handles creation, migration, and cleanup of test databases
 */

import { execSync, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const exec = promisify(execSync);

export interface TestDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface DatabaseSetupResult {
  success: boolean;
  connection?: any;
  error?: string;
}

/**
 * Test database manager
 */
export class TestDatabaseManager {
  private config: TestDatabaseConfig;

  constructor(config: TestDatabaseConfig) {
    this.config = config;
  }

  /**
   * Create and setup test database
   */
  async setup(): Promise<DatabaseSetupResult> {
    try {
      console.log('🗄️  Setting up test database...');

      // Create database if it doesn't exist
      await this.createDatabase();

      // Run migrations
      await this.runMigrations();

      // Seed test data
      await this.seedTestData();

      console.log('✅ Test database setup complete');
      return { success: true };
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clean up test database
   */
  async teardown(): Promise<void> {
    try {
      console.log('🧹 Cleaning up test database...');

      // Drop test database
      await this.dropDatabase();

      console.log('✅ Test database cleanup complete');
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error);
    }
  }

  /**
   * Create database connection
   */
  async createConnection(): Promise<any> {
    const { Client } = await import('pg');
    
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });

    await client.connect();
    return client;
  }

  /**
   * Create test database
   */
  private async createDatabase(): Promise<void> {
    const { Client } = await import('pg');
    
    // Connect to postgres database to create our test database
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: 'postgres', // Default database
      user: this.config.user,
      password: this.config.password,
    });

    await client.connect();

    // Drop database if exists, then create
    try {
      await client.query(`DROP DATABASE IF EXISTS "${this.config.database}"`);
    } catch (error) {
      // Ignore error if database doesn't exist
    }

    await client.query(`CREATE DATABASE "${this.config.database}"`);
    await client.end();
  }

  /**
   * Drop test database
   */
  private async dropDatabase(): Promise<void> {
    const { Client } = await import('pg');
    
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: 'postgres',
      user: this.config.user,
      password: this.config.password,
    });

    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS "${this.config.database}"`);
    await client.end();
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      // Look for migration files
      const migrationsDir = path.join(process.cwd(), 'src/database/migrations');
      
      if (!fs.existsSync(migrationsDir)) {
        console.log('  ⚠️  No migrations directory found, skipping migrations');
        return;
      }

      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const client = await this.createConnection();

      for (const migrationFile of migrationFiles) {
        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        
        console.log(`  📄 Running migration: ${migrationFile}`);
        
        // Split SQL into individual statements
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await client.query(statement);
        }
      }

      await client.end();
      console.log('  ✅ Migrations completed');
    } catch (error) {
      console.error('  ❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Seed test data
   */
  private async seedTestData(): Promise<void> {
    try {
      const seedersDir = path.join(process.cwd(), 'src/database/seeders');
      
      if (!fs.existsSync(seedersDir)) {
        console.log('  ⚠️  No seeders directory found, skipping test data seeding');
        return;
      }

      const seedFiles = fs.readdirSync(seedersDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      const client = await this.createConnection();

      for (const seedFile of seedFiles) {
        const seedPath = path.join(seedersDir, seedFile);
        const seedSQL = fs.readFileSync(seedPath, 'utf-8');
        
        console.log(`  🌱 Seeding test data: ${seedFile}`);
        
        // Split SQL into individual statements
        const statements = seedSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await client.query(statement);
        }
      }

      await client.end();
      console.log('  ✅ Test data seeding completed');
    } catch (error) {
      console.error('  ❌ Test data seeding failed:', error);
      // Don't throw error for seeding failures - tests should still run
    }
  }

  /**
   * Get database configuration
   */
  getConfig(): TestDatabaseConfig {
    return { ...this.config };
  }

  /**
   * Check if database is accessible
   */
  async isAccessible(): Promise<boolean> {
    try {
      const client = await this.createConnection();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Database migration runner for tests
 */
export class TestMigrationRunner {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Create migrations table if not exists
   */
  async createMigrationsTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Check if migration was already executed
   */
  async isMigrationExecuted(filename: string): Promise<boolean> {
    const result = await this.client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [filename]
    );
    return result.rows.length > 0;
  }

  /**
   * Mark migration as executed
   */
  async markMigrationExecuted(filename: string): Promise<void> {
    await this.client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
  }

  /**
   * Run pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    await this.createMigrationsTable();

    const migrationsDir = path.join(process.cwd(), 'src/database/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const migrationFile of migrationFiles) {
      if (await this.isMigrationExecuted(migrationFile)) {
        continue;
      }

      console.log(`  📄 Running migration: ${migrationFile}`);
      
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      try {
        // Run migration in a transaction
        await this.client.query('BEGIN');
        
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await this.client.query(statement);
        }

        await this.markMigrationExecuted(migrationFile);
        await this.client.query('COMMIT');
        
        console.log(`  ✅ Migration completed: ${migrationFile}`);
      } catch (error) {
        await this.client.query('ROLLBACK');
        throw new Error(`Migration failed: ${migrationFile} - ${error}`);
      }
    }
  }
}

/**
 * Redis test setup (if used)
 */
export class TestRedisManager {
  private config: {
    host: string;
    port: number;
    database: number;
  };

  constructor(config: { host: string; port: number; database?: number }) {
    this.config = {
      host: config.host,
      port: config.port,
      database: config.database || 0,
    };
  }

  async setup(): Promise<void> {
    console.log('🔄 Setting up test Redis...');
    
    // Clear Redis database
    try {
      const redis = require('redis');
      const client = redis.createClient({
        host: this.config.host,
        port: this.config.port,
        db: this.config.database,
      });
      
      await client.flushdb();
      await client.quit();
      
      console.log('✅ Test Redis setup complete');
    } catch (error) {
      console.warn('⚠️  Redis setup failed (Redis might not be available):', error);
    }
  }

  async teardown(): Promise<void> {
    console.log('🧹 Cleaning up test Redis...');
    
    try {
      const redis = require('redis');
      const client = redis.createClient({
        host: this.config.host,
        port: this.config.port,
        db: this.config.database,
      });
      
      await client.flushdb();
      await client.quit();
      
      console.log('✅ Test Redis cleanup complete');
    } catch (error) {
      console.warn('⚠️  Redis cleanup failed:', error);
    }
  }
}

/**
 * Factory for creating test database instances
 */
export class TestDatabaseFactory {
  /**
   * Create database manager from environment variables
   */
  static createFromEnv(): TestDatabaseManager {
    const config: TestDatabaseConfig = {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'ai_code_agent_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    };

    return new TestDatabaseManager(config);
  }

  /**
   * Create Redis manager from environment variables
   */
  static createRedisFromEnv(): TestRedisManager {
    return new TestRedisManager({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
      database: parseInt(process.env.TEST_REDIS_DB || '0'),
    });
  }
}

// Export default instances
export const testDbManager = TestDatabaseFactory.createFromEnv();
export const testRedisManager = TestDatabaseFactory.createRedisFromEnv();
