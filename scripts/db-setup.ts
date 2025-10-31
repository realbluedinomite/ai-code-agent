#!/usr/bin/env ts-node
/**
 * Database Setup Script
 * 
 * This script performs initial database setup including:
 * - Database creation
 * - User creation and permissions
 * - Initial schema setup
 * - Running migrations
 * - Seeding initial data
 * 
 * Usage:
 *   ts-node scripts/db-setup.ts --create-db       # Create database and user
 *   ts-node scripts/db-setup.ts --run-migrations  # Run database migrations
 *   ts-node scripts/db-setup.ts --seed           # Seed initial data
 *   ts-node scripts/db-setup.ts --full           # Full setup (create + migrate + seed)
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { DatabaseConnectionManager, getDatabaseClient } from '@/database/client';
import { logger } from '@/utils/loggers';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  adminUser: string;
  adminPassword: string;
}

interface SetupOptions {
  createDatabase?: boolean;
  createUser?: boolean;
  runMigrations?: boolean;
  seedData?: boolean;
  full?: boolean;
  skipConfirmation?: boolean;
  verbose?: boolean;
}

class DatabaseSetupManager {
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_code_agent',
      user: process.env.DB_USER || 'ai_agent_user',
      password: process.env.DB_PASSWORD || 'ai_agent_password',
      adminUser: process.env.DB_ADMIN_USER || 'postgres',
      adminPassword: process.env.DB_ADMIN_PASSWORD || 'postgres'
    };
  }

  /**
   * Get PostgreSQL connection string for admin operations
   */
  private getAdminConnectionString(): string {
    return `postgresql://${this.config.adminUser}:${this.config.adminPassword}@${this.config.host}:${this.config.port}/postgres`;
  }

  /**
   * Get application database connection string
   */
  private getApplicationConnectionString(): string {
    return `postgresql://${this.config.user}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
  }

  /**
   * Test connection to PostgreSQL server
   */
  async testConnection(): Promise<boolean> {
    const spinner = ora('Testing database connection...').start();

    try {
      // Try to connect using admin credentials
      const { stdout } = await execAsync(
        `psql "${this.getAdminConnectionString()}" -c "SELECT 1;" -t`
      );
      
      spinner.succeed('Database connection successful');
      return true;
    } catch (error) {
      spinner.fail('Database connection failed');
      logger.error('Failed to connect to PostgreSQL', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        config: {
          host: this.config.host,
          port: this.config.port,
          adminUser: this.config.adminUser
        }
      });
      return false;
    }
  }

  /**
   * Create database if it doesn't exist
   */
  async createDatabase(): Promise<void> {
    const spinner = ora(`Creating database "${this.config.database}"...`).start();

    try {
      const { stdout } = await execAsync(
        `psql "${this.getAdminConnectionString()}" -c "CREATE DATABASE ${this.config.database};"`
      );

      spinner.succeed(`Database "${this.config.database}" created successfully`);
      logger.info('Database created', { database: this.config.database });
    } catch (error) {
      // Check if database already exists
      if (error instanceof Error && error.message.includes('already exists')) {
        spinner.info(`Database "${this.config.database}" already exists`);
        logger.info('Database already exists', { database: this.config.database });
      } else {
        spinner.fail('Failed to create database');
        logger.error('Failed to create database', { error });
        throw error;
      }
    }
  }

  /**
   * Create database user with appropriate permissions
   */
  async createUser(): Promise<void> {
    const spinner = ora(`Creating user "${this.config.user}"...`).start();

    try {
      // Create user
      const createUserSQL = `
        CREATE USER ${this.config.user} WITH PASSWORD '${this.config.password}';
      `;

      await execAsync(
        `psql "${this.getAdminConnectionString()}" -c "${createUserSQL}"`
      );

      // Grant permissions
      const grantPermissionsSQL = `
        GRANT ALL PRIVILEGES ON DATABASE ${this.config.database} TO ${this.config.user};
        GRANT ALL ON SCHEMA public TO ${this.config.user};
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${this.config.user};
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${this.config.user};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${this.config.user};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${this.config.user};
      `;

      await execAsync(
        `psql "${this.getAdminConnectionString()}" -c "${grantPermissionsSQL}"`
      );

      spinner.succeed(`User "${this.config.user}" created and granted permissions`);
      logger.info('Database user created', { user: this.config.user, database: this.config.database });
    } catch (error) {
      // Check if user already exists
      if (error instanceof Error && error.message.includes('already exists')) {
        spinner.info(`User "${this.config.user}" already exists`);
        logger.info('User already exists', { user: this.config.user });
      } else {
        spinner.fail('Failed to create user');
        logger.error('Failed to create database user', { error });
        throw error;
      }
    }
  }

  /**
   * Create database extensions
   */
  async createExtensions(): Promise<void> {
    const spinner = ora('Creating database extensions...').start();

    try {
      const extensions = ['uuid-ossp', 'pgcrypto', 'pg_stat_statements'];
      const extensionSQL = extensions
        .map(ext => `CREATE EXTENSION IF NOT EXISTS "${ext}";`)
        .join('\n');

      await execAsync(
        `psql "${this.getApplicationConnectionString()}" -c "${extensionSQL}"`
      );

      spinner.succeed('Database extensions created');
      logger.info('Database extensions created', { extensions });
    } catch (error) {
      spinner.fail('Failed to create extensions');
      logger.error('Failed to create extensions', { error });
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    const spinner = ora('Running database migrations...').start();

    try {
      // Import and run the migration manager
      const { MigrationManager } = await import('./migrate');
      const db = await getDatabaseClient();
      const migrationManager = new MigrationManager(db);
      
      await migrationManager.runMigrations();
      
      spinner.succeed('Database migrations completed successfully');
      logger.info('Migrations completed');
    } catch (error) {
      spinner.fail('Migration failed');
      logger.error('Migration failed', { error });
      throw error;
    }
  }

  /**
   * Seed initial data
   */
  async seedData(): Promise<void> {
    const spinner = ora('Seeding initial data...').start();

    try {
      // Import and run the seeder
      const { DatabaseSeeder } = await import('./seed');
      const db = await getDatabaseClient();
      const seeder = new DatabaseSeeder(db);
      
      await seeder.seedAll({ verbose: true });
      
      spinner.succeed('Initial data seeded successfully');
      logger.info('Seeding completed');
    } catch (error) {
      spinner.fail('Seeding failed');
      logger.error('Seeding failed', { error });
      throw error;
    }
  }

  /**
   * Verify database setup
   */
  async verifySetup(): Promise<boolean> {
    const spinner = ora('Verifying database setup...').start();

    try {
      const db = await getDatabaseClient();
      
      // Test basic query
      const result = await db.query({ text: 'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'' });
      const tableCount = parseInt(result.rows[0].table_count);

      if (tableCount === 0) {
        spinner.fail('No tables found in database');
        return false;
      }

      spinner.succeed(`Database setup verified - ${tableCount} tables found`);
      logger.info('Database setup verified', { tableCount });
      return true;
    } catch (error) {
      spinner.fail('Database verification failed');
      logger.error('Database verification failed', { error });
      return false;
    }
  }

  /**
   * Display configuration summary
   */
  displayConfiguration(): void {
    console.log(chalk.blue.bold('\n📋 Database Configuration Summary\n'));
    
    console.log(chalk.gray('Host:'), this.config.host);
    console.log(chalk.gray('Port:'), this.config.port.toString());
    console.log(chalk.gray('Database:'), this.config.database);
    console.log(chalk.gray('User:'), this.config.user);
    console.log(chalk.gray('Admin User:'), this.config.adminUser);
    
    console.log(chalk.yellow('\n⚠️  Make sure to set the following environment variables:'));
    console.log(chalk.gray('  DB_HOST='), this.config.host);
    console.log(chalk.gray('  DB_PORT='), this.config.port.toString());
    console.log(chalk.gray('  DB_NAME='), this.config.database);
    console.log(chalk.gray('  DB_USER='), this.config.user);
    console.log(chalk.gray('  DB_PASSWORD='), this.config.password);
    console.log(chalk.gray('  DB_ADMIN_USER='), this.config.adminUser);
    console.log(chalk.gray('  DB_ADMIN_PASSWORD='), this.config.adminPassword);
  }

  /**
   * Full database setup process
   */
  async fullSetup(options: SetupOptions = {}): Promise<void> {
    console.log(chalk.blue.bold('\n🚀 Starting Full Database Setup\n'));

    // Display configuration
    this.displayConfiguration();

    if (!options.skipConfirmation) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise<void>((resolve) => {
        rl.question('\nDo you want to continue with the setup? (y/N): ', (answer: string) => {
          rl.close();
          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log(chalk.yellow('Setup cancelled'));
            process.exit(0);
          }
          resolve();
        });
      });
    }

    try {
      // Test connection first
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('Cannot connect to database server');
      }

      // Create database and user
      await this.createDatabase();
      await this.createUser();
      await this.createExtensions();

      // Run migrations
      await this.runMigrations();

      // Seed data
      if (options.seedData) {
        await this.seedData();
      }

      // Verify setup
      const verified = await this.verifySetup();
      if (!verified) {
        throw new Error('Database setup verification failed');
      }

      console.log(chalk.green.bold('\n✅ Database setup completed successfully!\n'));
      
      if (options.verbose) {
        console.log(chalk.blue('Next steps:'));
        console.log('  1. Update your environment variables');
        console.log('  2. Start your application: npm run dev');
        console.log('  3. Monitor logs: tail -f logs/app.log');
      }

    } catch (error) {
      console.log(chalk.red.bold('\n❌ Database setup failed!\n'));
      logger.error('Database setup failed', { error });
      process.exit(1);
    }
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('Database Setup Manager')
    .description('Initial database setup and configuration')
    .version('1.0.0');

  program
    .option('--create-db', 'Create database and user')
    .option('--create-user', 'Create database user only')
    .option('--run-migrations', 'Run database migrations')
    .option('--seed', 'Seed initial data')
    .option('--full', 'Full setup (create + migrate + seed)')
    .option('--verify', 'Verify database setup')
    .option('--skip-confirmation', 'Skip confirmation prompts')
    .option('--verbose', 'Show detailed output')
    .action(async (options) => {
      try {
        const setupManager = new DatabaseSetupManager();

        if (options.full) {
          await setupManager.fullSetup({
            seedData: true,
            skipConfirmation: options.skipConfirmation,
            verbose: options.verbose
          });
        } else if (options.verify) {
          await setupManager.verifySetup();
        } else if (options.createDb) {
          await setupManager.testConnection();
          await setupManager.createDatabase();
          await setupManager.createUser();
          await setupManager.createExtensions();
        } else if (options.createUser) {
          await setupManager.testConnection();
          await setupManager.createUser();
        } else if (options.runMigrations) {
          await setupManager.runMigrations();
        } else if (options.seed) {
          await setupManager.seedData();
        } else {
          // Default: show help and configuration
          setupManager.displayConfiguration();
          console.log(chalk.yellow('\nUse --help for available options'));
        }
      } catch (error) {
        logger.error('Database setup failed', { error });
        process.exit(1);
      }
    });

  program.parse();
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
    logger.error('Setup script failed', { error });
    process.exit(1);
  });
}

export { DatabaseSetupManager };