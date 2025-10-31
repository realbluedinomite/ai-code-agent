#!/usr/bin/env node

import { Command } from 'commander';
import { initializeDatabase, closeDatabaseConnection } from '../database';
import { initializeCore, logger } from '../core';
import { Application } from '../index';
import path from 'path';
import fs from 'fs/promises';

/**
 * CLI Entry Point for AI Code Agent
 * 
 * Provides command-line interface for various operations:
 * - Server management (start, stop, restart)
 * - Database operations (migrate, seed, reset)
 * - Plugin management (install, list, remove)
 * - System information and health checks
 * - Configuration management
 */

const program = new Command();
const packageJson = require('../../package.json');

program
  .name('ai-code-agent')
  .description('AI Code Agent CLI')
  .version(packageJson.version || '1.0.0');

/**
 * Common initialization for commands that need database/core
 */
async function initializeServices() {
  await initializeCore({
    environment: process.env.NODE_ENV || 'development',
    enableProfiling: true,
    registerCommonSchemas: true,
  });
  
  await initializeDatabase();
}

/**
 * Cleanup function
 */
async function cleanup() {
  try {
    await closeDatabaseConnection();
  } catch (error) {
    logger.warn('Error during cleanup', { error });
  }
}

// ============================================================================
// SERVER COMMANDS
// ============================================================================

/**
 * Start the server
 */
program
  .command('start')
  .description('Start the AI Code Agent server')
  .option('-p, --port <port>', 'Port to listen on', process.env.PORT)
  .option('-h, --host <host>', 'Host to bind to', process.env.HOST)
  .option('-e, --env <environment>', 'Environment (development, production, test)', process.env.NODE_ENV)
  .option('--no-health-check', 'Disable health check endpoints')
  .option('--no-cors', 'Disable CORS')
  .action(async (options) => {
    try {
      logger.info('Starting AI Code Agent server...', options);

      const app = new Application({
        port: options.port ? Number(options.port) : undefined,
        host: options.host,
        environment: options.env,
        enableHealthCheck: options.healthCheck,
        enableCors: options.cors,
      });

      await app.initialize();
      await app.start();

      // Handle graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down...');
        await app.stop();
        await cleanup();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down...');
        await app.stop();
        await cleanup();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  });

/**
 * Stop the server
 */
program
  .command('stop')
  .description('Stop the running server')
  .option('-f, --force', 'Force kill the process')
  .action(async (options) => {
    try {
      // In a real implementation, this would communicate with a running server
      // For now, we'll just log a message
      logger.info('Stop command received', {
        force: options.force,
        message: 'Server stop functionality requires process management system'
      });

    } catch (error) {
      logger.error('Failed to stop server', { error });
      process.exit(1);
    }
  });

/**
 * Restart the server
 */
program
  .command('restart')
  .description('Restart the server')
  .option('-p, --port <port>', 'Port to listen on')
  .option('-h, --host <host>', 'Host to bind to')
  .action(async (options) => {
    try {
      logger.info('Restarting server...', options);
      
      // TODO: Implement server restart logic
      logger.info('Server restart functionality not yet implemented');

    } catch (error) {
      logger.error('Failed to restart server', { error });
      process.exit(1);
    }
  });

/**
 * Server status
 */
program
  .command('status')
  .description('Check server status')
  .action(async () => {
    try {
      // TODO: Check if server is running and get status
      logger.info('Server status command received');
      logger.info('Status check functionality not yet implemented');

    } catch (error) {
      logger.error('Failed to check server status', { error });
      process.exit(1);
    }
  });

// ============================================================================
// DATABASE COMMANDS
// ============================================================================

/**
 * Run database migrations
 */
program
  .command('migrate')
  .description('Run database migrations')
  .option('-f, --force', 'Force run migrations')
  .option('-r, --rollback', 'Rollback migrations')
  .action(async (options) => {
    try {
      await initializeServices();
      
      logger.info('Database migration command received', options);
      logger.info('Migration functionality not yet implemented');

      await cleanup();

    } catch (error) {
      logger.error('Migration failed', { error });
      process.exit(1);
    }
  });

/**
 * Seed database with initial data
 */
program
  .command('seed')
  .description('Seed database with initial data')
  .option('-f, --force', 'Force seed even if data exists')
  .action(async (options) => {
    try {
      await initializeServices();
      
      logger.info('Database seeding command received', options);
      logger.info('Seeding functionality not yet implemented');

      await cleanup();

    } catch (error) {
      logger.error('Seeding failed', { error });
      process.exit(1);
    }
  });

/**
 * Reset database
 */
program
  .command('db:reset')
  .description('Reset database (drop and recreate all tables)')
  .option('-f, --force', 'Force reset without confirmation')
  .action(async (options) => {
    try {
      await initializeServices();
      
      if (!options.force) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('Are you sure you want to reset the database? This will delete all data! (y/N): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          logger.info('Database reset cancelled');
          return;
        }
      }

      logger.info('Database reset command received');
      logger.info('Reset functionality not yet implemented');

      await cleanup();

    } catch (error) {
      logger.error('Database reset failed', { error });
      process.exit(1);
    }
  });

/**
 * Database info
 */
program
  .command('db:info')
  .description('Show database information')
  .action(async () => {
    try {
      await initializeServices();
      
      logger.info('Database info command received');
      logger.info('Database info functionality not yet implemented');

      await cleanup();

    } catch (error) {
      logger.error('Failed to get database info', { error });
      process.exit(1);
    }
  });

// ============================================================================
// PLUGIN COMMANDS
// ============================================================================

/**
 * List installed plugins
 */
program
  .command('plugins:list')
  .description('List installed plugins')
  .action(async () => {
    try {
      logger.info('List plugins command received');
      logger.info('Plugin system not yet implemented');

    } catch (error) {
      logger.error('Failed to list plugins', { error });
      process.exit(1);
    }
  });

/**
 * Install a plugin
 */
program
  .command('plugins:install')
  .description('Install a plugin')
  .argument('<plugin-name>', 'Name or path of the plugin to install')
  .action(async (pluginName) => {
    try {
      logger.info('Install plugin command received', { pluginName });
      logger.info('Plugin installation not yet implemented');

    } catch (error) {
      logger.error('Failed to install plugin', { error });
      process.exit(1);
    }
  });

/**
 * Remove a plugin
 */
program
  .command('plugins:remove')
  .description('Remove an installed plugin')
  .argument('<plugin-name>', 'Name of the plugin to remove')
  .action(async (pluginName) => {
    try {
      logger.info('Remove plugin command received', { pluginName });
      logger.info('Plugin removal not yet implemented');

    } catch (error) {
      logger.error('Failed to remove plugin', { error });
      process.exit(1);
    }
  });

/**
 * Enable a plugin
 */
program
  .command('plugins:enable')
  .description('Enable a plugin')
  .argument('<plugin-name>', 'Name of the plugin to enable')
  .action(async (pluginName) => {
    try {
      logger.info('Enable plugin command received', { pluginName });
      logger.info('Plugin enable/disable not yet implemented');

    } catch (error) {
      logger.error('Failed to enable plugin', { error });
      process.exit(1);
    }
  });

/**
 * Disable a plugin
 */
program
  .command('plugins:disable')
  .description('Disable a plugin')
  .argument('<plugin-name>', 'Name of the plugin to disable')
  .action(async (pluginName) => {
    try {
      logger.info('Disable plugin command received', { pluginName });
      logger.info('Plugin enable/disable not yet implemented');

    } catch (error) {
      logger.error('Failed to disable plugin', { error });
      process.exit(1);
    }
  });

// ============================================================================
// SYSTEM COMMANDS
// ============================================================================

/**
 * Check system health
 */
program
  .command('health')
  .description('Check system health')
  .option('-d, --detailed', 'Show detailed health information')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await initializeServices();
      
      const health = await import('../core').then(m => m.getSystemHealth());
      
      if (options.json) {
        console.log(JSON.stringify(health, null, 2));
      } else {
        console.log(`System Status: ${health.status}`);
        console.log(`Uptime: ${Math.floor(health.uptime / 60)} minutes`);
        console.log(`Memory Usage: ${(health.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        
        if (options.detailed) {
          console.log('\nHealth Checks:');
          health.checks.forEach(check => {
            const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
            console.log(`  ${icon} ${check.name}: ${check.message || check.status}`);
          });
        }
      }

      const exitCode = health.status === 'healthy' ? 0 : health.status === 'degraded' ? 1 : 2;
      process.exit(exitCode);

    } catch (error) {
      logger.error('Health check failed', { error });
      process.exit(3);
    } finally {
      await cleanup();
    }
  });

/**
 * Show system information
 */
program
  .command('info')
  .description('Show system information')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await initializeServices();
      
      const info = {
        service: 'AI Code Agent',
        version: packageJson.version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: process.cpuUsage(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        workingDirectory: process.cwd(),
      };

      if (options.json) {
        console.log(JSON.stringify(info, null, 2));
      } else {
        console.log('AI Code Agent System Information');
        console.log('================================');
        console.log(`Version: ${info.version}`);
        console.log(`Environment: ${info.environment}`);
        console.log(`Node.js: ${info.nodeVersion}`);
        console.log(`Platform: ${info.platform} (${info.arch})`);
        console.log(`Uptime: ${Math.floor(info.uptime / 60)} minutes`);
        console.log(`Memory: ${(info.memory.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(info.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Working Directory: ${info.workingDirectory}`);
      }

    } catch (error) {
      logger.error('Failed to get system info', { error });
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

/**
 * Show logs
 */
program
  .command('logs')
  .description('Show application logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('-l, --level <level>', 'Log level filter (error, warn, info, debug)')
  .action(async (options) => {
    try {
      logger.info('Logs command received', options);
      logger.info('Log viewing functionality not yet implemented');

    } catch (error) {
      logger.error('Failed to show logs', { error });
      process.exit(1);
    }
  });

// ============================================================================
// CONFIGURATION COMMANDS
// ============================================================================

/**
 * Show configuration
 */
program
  .command('config:show')
  .description('Show current configuration')
  .option('--env', 'Show environment variables')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await initializeServices();
      
      const config = await import('../core/config').then(m => m.config);
      const configData = config.export(true);

      if (options.json) {
        console.log(JSON.stringify(configData, null, 2));
      } else {
        console.log('Current Configuration:');
        console.log('=====================');
        Object.entries(configData).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });
      }

    } catch (error) {
      logger.error('Failed to show configuration', { error });
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

/**
 * Validate configuration
 */
program
  .command('config:validate')
  .description('Validate configuration')
  .action(async () => {
    try {
      await initializeServices();
      
      const config = await import('../core/config').then(m => m.config);
      const validation = config.validate();
      
      if (validation.isValid) {
        console.log('✅ Configuration is valid');
        if (validation.warnings.length > 0) {
          console.log('\nWarnings:');
          validation.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
        }
      } else {
        console.log('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }

    } catch (error) {
      logger.error('Failed to validate configuration', { error });
      process.exit(1);
    } finally {
      await cleanup();
    }
  });

// ============================================================================
// DEVELOPMENT COMMANDS
// ============================================================================

/**
 * Development server with hot reload
 */
program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async (options) => {
    try {
      logger.info('Starting development server...', options);
      logger.info('Development mode functionality not yet implemented');

    } catch (error) {
      logger.error('Failed to start development server', { error });
      process.exit(1);
    }
  });

/**
 * Run tests
 */
program
  .command('test')
  .description('Run tests')
  .option('--watch', 'Watch for changes')
  .option('--coverage', 'Generate coverage report')
  .action(async (options) => {
    try {
      logger.info('Test command received', options);
      logger.info('Test runner functionality not yet implemented');

    } catch (error) {
      logger.error('Tests failed', { error });
      process.exit(1);
    }
  });

/**
 * Build application
 */
program
  .command('build')
  .description('Build application for production')
  .action(async () => {
    try {
      logger.info('Build command received');
      logger.info('Build functionality not yet implemented');

    } catch (error) {
      logger.error('Build failed', { error });
      process.exit(1);
    }
  });

// ============================================================================
// UTILITY COMMANDS
// ============================================================================

/**
 * Generate API keys
 */
program
  .command('generate:apikey')
  .description('Generate a new API key')
  .option('-d, --description <desc>', 'Description for the API key')
  .action(async (options) => {
    try {
      logger.info('Generate API key command received', options);
      logger.info('API key generation not yet implemented');

    } catch (error) {
      logger.error('Failed to generate API key', { error });
      process.exit(1);
    }
  });

/**
 * Create backup
 */
program
  .command('backup')
  .description('Create a backup of the database')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      logger.info('Backup command received', options);
      logger.info('Backup functionality not yet implemented');

    } catch (error) {
      logger.error('Backup failed', { error });
      process.exit(1);
    }
  });

/**
 * Restore backup
 */
program
  .command('restore')
  .description('Restore from backup')
  .argument('<backup-file>', 'Backup file to restore from')
  .action(async (backupFile) => {
    try {
      logger.info('Restore command received', { backupFile });
      logger.info('Restore functionality not yet implemented');

    } catch (error) {
      logger.error('Restore failed', { error });
      process.exit(1);
    }
  });

// ============================================================================
// HELP AND DOCUMENTATION
// ============================================================================

/**
 * Show help
 */
program
  .command('help')
  .description('Show help information')
  .action(() => {
    program.help();
  });

/**
 * Show version
 */
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(`AI Code Agent CLI v${packageJson.version || '1.0.0'}`);
  });

/**
 * Interactive mode
 */
program
  .command('interactive')
  .description('Start interactive mode')
  .action(async () => {
    try {
      logger.info('Starting interactive mode...');
      logger.info('Interactive mode not yet implemented');

    } catch (error) {
      logger.error('Failed to start interactive mode', { error });
      process.exit(1);
    }
  });

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main CLI entry point
 */
async function main() {
  try {
    // Handle special cases
    if (process.argv.length === 2) {
      // No command provided, show help
      program.help();
      return;
    }

    // Parse and execute command
    await program.parseAsync(process.argv);

  } catch (error) {
    logger.error('CLI execution failed', { error });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run CLI
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to run CLI:', error);
    process.exit(1);
  });
}

// Export for testing and programmatic use
export { program, initializeServices, cleanup };
