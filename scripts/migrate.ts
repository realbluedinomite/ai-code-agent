#!/usr/bin/env ts-node
/**
 * Database Migration Script
 * 
 * This script manages database migrations for the AI Code Agent system.
 * Supports running migrations up, down, and status checking.
 * 
 * Usage:
 *   npm run db:migrate        # Run all pending migrations
 *   npm run db:migrate:down   # Rollback last migration
 *   ts-node scripts/migrate.ts status  # Check migration status
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { DatabaseConnectionManager, getDatabaseClient } from '@/database/client';
import { logger } from '@/utils/loggers';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

interface MigrationFile {
  filename: string;
  version: number;
  name: string;
  executed: boolean;
}

interface MigrationResult {
  version: number;
  name: string;
  filename: string;
  executedAt: Date;
  status: 'success' | 'failed';
}

class MigrationManager {
  private db: DatabaseConnectionManager;
  private migrationsDir: string;
  private migrationsTable = 'schema_migrations';

  constructor(db: DatabaseConnectionManager) {
    this.db = db;
    this.migrationsDir = resolve(process.cwd(), 'src', 'database', 'migrations');
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64),
        execution_time INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_version ON ${this.migrationsTable}(version);
    `;

    await this.db.query({ text: createTableSQL });
    logger.info('Migrations table initialized');
  }

  /**
   * Get all migration files from the migrations directory
   */
  private async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql') && /^\d+_/.test(file))
        .map(file => {
          const match = file.match(/^(\d+)_(.+)\.sql$/);
          if (!match) {
            throw new Error(`Invalid migration file format: ${file}`);
          }
          const [, version, name] = match;
          return {
            filename: file,
            version: parseInt(version, 10),
            name: name.replace(/_/g, ' '),
            executed: false
          };
        })
        .sort((a, b) => a.version - b.version);

      return migrationFiles;
    } catch (error) {
      logger.error('Failed to read migration files', { error });
      throw error;
    }
  }

  /**
   * Get executed migrations from the database
   */
  private async getExecutedMigrations(): Promise<MigrationFile[]> {
    try {
      const result = await this.db.query<{ version: number; name: string; filename: string }>({
        text: `SELECT version, name, filename FROM ${this.migrationsTable} ORDER BY version`
      });

      return result.rows.map(row => ({
        filename: row.filename,
        version: row.version,
        name: row.name,
        executed: true
      }));
    } catch (error) {
      logger.error('Failed to get executed migrations', { error });
      throw error;
    }
  }

  /**
   * Get migration status (executed vs pending)
   */
  async getStatus(): Promise<{ executed: MigrationFile[]; pending: MigrationFile[] }> {
    const [allFiles, executedMigrations] = await Promise.all([
      this.getMigrationFiles(),
      this.getExecutedMigrations()
    ]);

    const executed = executedMigrations;
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    const pending = allFiles.filter(file => !executedVersions.has(file.version));

    return { executed, pending };
  }

  /**
   * Run a single migration file
   */
  private async runMigration(migration: MigrationFile): Promise<void> {
    const migrationPath = join(this.migrationsDir, migration.filename);
    const startTime = Date.now();

    try {
      const sql = await fs.readFile(migrationPath, 'utf-8');
      
      // Execute migration in a transaction
      await this.db.transaction(async (client) => {
        // Split SQL into individual statements and execute them
        const statements = sql
          .split(/;\s*\n/g)
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
      });

      const executionTime = Date.now() - startTime;

      // Record migration as executed
      await this.db.query({
        text: `
          INSERT INTO ${this.migrationsTable} (version, name, filename, execution_time)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (version) DO UPDATE SET
            executed_at = NOW(),
            execution_time = $4
        `,
        params: [migration.version, migration.name, migration.filename, executionTime]
      });

      logger.info(`Migration executed: ${migration.version}_${migration.name}`, {
        filename: migration.filename,
        executionTime
      });

    } catch (error) {
      logger.error(`Migration failed: ${migration.version}_${migration.name}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: migration.filename
      });
      throw error;
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: MigrationFile): Promise<void> {
    try {
      // For now, we'll just mark the migration as rolled back
      // In a production system, you would want to store rollback scripts
      await this.db.query({
        text: `DELETE FROM ${this.migrationsTable} WHERE version = $1`,
        params: [migration.version]
      });

      logger.info(`Migration rolled back: ${migration.version}_${migration.name}`);

    } catch (error) {
      logger.error(`Rollback failed: ${migration.version}_${migration.name}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationResult[]> {
    await this.createMigrationsTable();
    
    const { pending } = await this.getStatus();
    
    if (pending.length === 0) {
      logger.info('No pending migrations found');
      return [];
    }

    const results: MigrationResult[] = [];
    const spinner = ora(`Running ${pending.length} migrations...`).start();

    try {
      for (const migration of pending) {
        spinner.text = `Running migration ${migration.version}_${migration.name}`;
        await this.runMigration(migration);
        
        results.push({
          version: migration.version,
          name: migration.name,
          filename: migration.filename,
          executedAt: new Date(),
          status: 'success'
        });
      }

      spinner.succeed(`Successfully ran ${pending.length} migrations`);
      return results;

    } catch (error) {
      spinner.fail('Migration failed');
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    await this.createMigrationsTable();
    
    const { executed } = await this.getStatus();
    
    if (executed.length === 0) {
      logger.warn('No migrations to rollback');
      return;
    }

    const lastMigration = executed[executed.length - 1];
    const spinner = ora(`Rolling back migration ${lastMigration.version}_${lastMigration.name}`).start();

    try {
      await this.rollbackMigration(lastMigration);
      spinner.succeed(`Successfully rolled back migration ${lastMigration.version}_${lastMigration.name}`);
    } catch (error) {
      spinner.fail('Rollback failed');
      throw error;
    }
  }

  /**
   * Print migration status
   */
  async printStatus(): Promise<void> {
    await this.createMigrationsTable();
    const { executed, pending } = await this.getStatus();

    console.log(chalk.blue.bold('\n📊 Migration Status\n'));

    if (executed.length > 0) {
      console.log(chalk.green.bold(`✅ Executed Migrations (${executed.length})`));
      executed.forEach(migration => {
        console.log(chalk.gray(`  ${migration.version}. ${migration.name}`));
      });
      console.log();
    }

    if (pending.length > 0) {
      console.log(chalk.yellow.bold(`⏳ Pending Migrations (${pending.length})`));
      pending.forEach(migration => {
        console.log(chalk.yellow(`  ${migration.version}. ${migration.name}`));
      });
      console.log();
    }

    if (executed.length === 0 && pending.length === 0) {
      console.log(chalk.gray('No migrations found'));
    }

    const total = executed.length + pending.length;
    if (total > 0) {
      console.log(chalk.blue(`Total migrations: ${total}`));
    }
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('Database Migration Manager')
    .description('Manage database schema migrations')
    .version('1.0.0');

  program
    .command('up')
    .description('Run all pending migrations')
    .action(async () => {
      try {
        const db = await getDatabaseClient();
        const migrationManager = new MigrationManager(db);
        await migrationManager.runMigrations();
      } catch (error) {
        logger.error('Migration failed', { error });
        process.exit(1);
      }
    });

  program
    .command('down')
    .description('Rollback the last migration')
    .action(async () => {
      try {
        const db = await getDatabaseClient();
        const migrationManager = new MigrationManager(db);
        await migrationManager.rollbackLastMigration();
      } catch (error) {
        logger.error('Rollback failed', { error });
        process.exit(1);
      }
    });

  program
    .command('status')
    .description('Show migration status')
    .action(async () => {
      try {
        const db = await getDatabaseClient();
        const migrationManager = new MigrationManager(db);
        await migrationManager.printStatus();
      } catch (error) {
        logger.error('Failed to get migration status', { error });
        process.exit(1);
      }
    });

  // Default command (run migrations)
  if (process.argv.length <= 2) {
    try {
      const db = await getDatabaseClient();
      const migrationManager = new MigrationManager(db);
      await migrationManager.runMigrations();
    } catch (error) {
      logger.error('Migration failed', { error });
      process.exit(1);
    }
  } else {
    program.parse();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error('Migration script failed', { error });
    process.exit(1);
  });
}

export { MigrationManager };