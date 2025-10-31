#!/usr/bin/env ts-node
/**
 * Database Seeding Script
 * 
 * This script seeds the database with test data for development and testing.
 * Supports different seed data sets and can be used for development or CI testing.
 * 
 * Usage:
 *   npm run db:seed                    # Run all seeders
 *   ts-node scripts/seed.ts users      # Seed only users
 *   ts-node scripts/seed.ts --reset    # Reset and reseed all data
 */

import { DatabaseConnectionManager, getDatabaseClient } from '@/database/client';
import { logger } from '@/utils/loggers';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

interface SeedData {
  [key: string]: any[];
}

interface SeederOptions {
  reset?: boolean;
  verbose?: boolean;
}

class DatabaseSeeder {
  private db: DatabaseConnectionManager;
  private seedDataDir: string;

  constructor(db: DatabaseConnectionManager) {
    this.db = db;
    this.seedDataDir = process.cwd();
  }

  /**
   * Generate mock session data
   */
  private generateMockSessions(count: number = 5) {
    const sessions = [];
    const users = ['user1@example.com', 'user2@example.com', 'user3@example.com', 'admin@example.com', 'test@example.com'];
    
    for (let i = 0; i < count; i++) {
      const userId = users[i % users.length];
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      
      sessions.push({
        id: uuidv4(),
        user_id: userId,
        session_token: `session_${uuidv4().replace(/-/g, '')}`,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status: Math.random() > 0.1 ? 'active' : 'expired',
        created_at: createdAt,
        updated_at: createdAt,
        expires_at: Math.random() > 0.3 ? expiresAt : null,
        metadata: {
          device_type: Math.random() > 0.5 ? 'desktop' : 'mobile',
          browser: 'Chrome',
          os: 'Windows 10'
        }
      });
    }
    
    return sessions;
  }

  /**
   * Generate mock parsed requests
   */
  private generateMockParsedRequests(sessions: any[], count: number = 20) {
    const requests = [];
    const intents = ['analyze_project', 'create_component', 'refactor_code', 'write_tests', 'optimize_performance'];
    const requestTypes = ['analysis', 'implementation', 'review', 'optimization'];
    const statuses = ['pending', 'processed', 'failed'];
    
    for (let i = 0; i < count; i++) {
      const session = sessions[Math.floor(Math.random() * sessions.length)];
      const createdAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Last 24 hours
      
      requests.push({
        id: uuidv4(),
        session_id: session.id,
        original_request: `Please ${intents[Math.floor(Math.random() * intents.length)]} for my project`,
        parsed_intent: intents[Math.floor(Math.random() * intents.length)],
        parsed_parameters: {
          project_path: '/workspace/my-project',
          target_files: ['src/components/App.tsx', 'src/utils/helpers.ts'],
          options: {
            strict_mode: Math.random() > 0.5,
            include_tests: Math.random() > 0.3
          }
        },
        confidence_score: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        request_type: requestTypes[Math.floor(Math.random() * requestTypes.length)],
        priority: Math.floor(Math.random() * 11),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_at: createdAt,
        updated_at: createdAt,
        processed_at: Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * 3600000) : null,
        error_message: null,
        metadata: {
          processing_time_ms: Math.floor(Math.random() * 5000) + 1000,
          agent_version: '1.0.0'
        }
      });
    }
    
    return requests;
  }

  /**
   * Generate mock project analyses
   */
  private generateMockProjectAnalyses(requests: any[], sessions: any[], count: number = 15) {
    const analyses = [];
    const analysisTypes = ['full_analysis', 'security_scan', 'performance_review', 'dependency_check'];
    const statuses = ['pending', 'in_progress', 'completed', 'failed'];
    const projectTypes = ['react', 'nodejs', 'typescript', 'vue', 'angular'];
    
    for (let i = 0; i < count; i++) {
      const request = requests[Math.floor(Math.random() * requests.length)];
      const session = sessions.find(s => s.id === request.session_id);
      const startedAt = new Date(request.created_at.getTime() + Math.random() * 60000); // 1 minute after request
      const isCompleted = Math.random() > 0.2;
      const completedAt = isCompleted ? new Date(startedAt.getTime() + Math.random() * 1800000) : null; // Up to 30 minutes
      
      analyses.push({
        id: uuidv4(),
        session_id: request.session_id,
        parsed_request_id: request.id,
        project_path: `/workspace/projects/${projectTypes[Math.floor(Math.random() * projectTypes.length)]}-app`,
        project_type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
        analysis_type: analysisTypes[Math.floor(Math.random() * analysisTypes.length)],
        analysis_status: isCompleted ? 'completed' : statuses[Math.floor(Math.random() * statuses.length)],
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: completedAt ? Math.floor((completedAt.getTime() - startedAt.getTime())) : null,
        file_count: Math.floor(Math.random() * 100) + 10,
        line_count: Math.floor(Math.random() * 5000) + 500,
        complexity_score: Math.random() * 10,
        dependencies: [
          { name: 'react', version: '^18.2.0', type: 'dependency' },
          { name: 'typescript', version: '^5.0.0', type: 'devDependency' }
        ],
        file_structure: {
          src: { files: 25, directories: 3 },
          tests: { files: 15, directories: 2 },
          docs: { files: 5, directories: 1 }
        },
        code_metrics: {
          cyclomatic_complexity: Math.random() * 15 + 1,
          code_coverage: Math.random() * 40 + 60,
          maintainability_index: Math.random() * 30 + 70
        },
        issues_found: [
          {
            type: 'security',
            severity: 'medium',
            file: 'src/components/UserInput.tsx',
            line: 45,
            message: 'Potential XSS vulnerability'
          }
        ],
        recommendations: [
          {
            category: 'performance',
            priority: 'high',
            description: 'Optimize bundle size by code splitting',
            estimated_impact: 'medium'
          }
        ],
        error_message: null,
        metadata: {
          tools_used: ['eslint', 'prettier', 'sonarqube'],
          analysis_version: '2.1.0'
        }
      });
    }
    
    return analyses;
  }

  /**
   * Generate mock audit logs
   */
  private generateMockAuditLogs(sessions: any[], count: number = 50) {
    const logs = [];
    const actions = ['login', 'logout', 'create_session', 'analyze_project', 'execute_plan', 'view_report'];
    const resources = ['session', 'project', 'analysis', 'user', 'system'];
    const severities = ['info', 'warning', 'error'];
    
    for (let i = 0; i < count; i++) {
      const session = sessions[Math.floor(Math.random() * sessions.length)];
      const createdAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      logs.push({
        id: uuidv4(),
        session_id: session.id,
        user_id: session.user_id,
        action: actions[Math.floor(Math.random() * actions.length)],
        resource_type: resources[Math.floor(Math.random() * resources.length)],
        resource_id: uuidv4(),
        details: {
          ip_address: session.ip_address,
          user_agent: session.user_agent,
          request_id: uuidv4()
        },
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        success: Math.random() > 0.1,
        error_message: null,
        severity: severities[Math.floor(Math.random() * severities.length)],
        created_at: createdAt,
        duration_ms: Math.floor(Math.random() * 2000) + 100,
        before_state: null,
        after_state: { action_completed: true },
        metadata: {
          request_id: uuidv4(),
          correlation_id: uuidv4()
        }
      });
    }
    
    return logs;
  }

  /**
   * Get all seed data
   */
  private generateAllSeedData(): SeedData {
    const sessions = this.generateMockSessions(5);
    const requests = this.generateMockParsedRequests(sessions, 20);
    const analyses = this.generateMockProjectAnalyses(requests, sessions, 15);
    const auditLogs = this.generateMockAuditLogs(sessions, 50);

    return {
      sessions,
      parsed_requests: requests,
      project_analyses: analyses,
      audit_logs: auditLogs
    };
  }

  /**
   * Clear all seed data (use with caution!)
   */
  private async clearSeedData(): Promise<void> {
    const tables = [
      'audit_logs',
      'project_analyses', 
      'parsed_requests',
      'sessions'
    ];

    for (const table of tables) {
      await this.db.query({ text: `DELETE FROM ${table}` });
    }

    logger.info('All seed data cleared');
  }

  /**
   * Insert seed data into database
   */
  private async insertSeedData(seedData: SeedData): Promise<void> {
    for (const [tableName, records] of Object.entries(seedData)) {
      if (records.length === 0) continue;

      const table = tableName; // Already matches database table names
      const keys = Object.keys(records[0]);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders})
      `;

      for (const record of records) {
        const values = keys.map(key => record[key]);
        await this.db.query({ text: query, params: values });
      }

      logger.info(`Seeded ${records.length} records in ${table}`);
    }
  }

  /**
   * Run all seeders
   */
  async seedAll(options: SeederOptions = {}): Promise<void> {
    const spinner = ora('Generating seed data...').start();

    try {
      if (options.reset) {
        spinner.text = 'Clearing existing seed data...';
        await this.clearSeedData();
      }

      spinner.text = 'Creating mock data...';
      const seedData = this.generateAllSeedData();

      spinner.text = 'Inserting data into database...';
      await this.insertSeedData(seedData);

      spinner.succeed('Database seeded successfully!');
      
      if (options.verbose) {
        console.log(chalk.blue('\n📊 Seed Data Summary:'));
        Object.entries(seedData).forEach(([table, records]) => {
          console.log(`  ${table}: ${records.length} records`);
        });
      }

    } catch (error) {
      spinner.fail('Seeding failed');
      throw error;
    }
  }

  /**
   * Seed specific table(s)
   */
  async seedTable(tableName: string, options: SeederOptions = {}): Promise<void> {
    const spinner = ora(`Seeding ${tableName}...`).start();

    try {
      if (options.reset) {
        await this.db.query({ text: `DELETE FROM ${tableName}` });
      }

      let seedData: SeedData = {};

      switch (tableName) {
        case 'sessions':
          seedData.sessions = this.generateMockSessions();
          break;
        case 'parsed_requests':
          const sessions = this.generateMockSessions();
          seedData.parsed_requests = this.generateMockParsedRequests(sessions);
          break;
        case 'project_analyses':
          const reqSessions = this.generateMockSessions();
          const reqRequests = this.generateMockParsedRequests(reqSessions);
          seedData.project_analyses = this.generateMockProjectAnalyses(reqRequests, reqSessions);
          break;
        case 'audit_logs':
          const logSessions = this.generateMockSessions();
          seedData.audit_logs = this.generateMockAuditLogs(logSessions);
          break;
        default:
          throw new Error(`Unknown seed table: ${tableName}`);
      }

      await this.insertSeedData(seedData);
      spinner.succeed(`Successfully seeded ${tableName}`);

    } catch (error) {
      spinner.fail(`Failed to seed ${tableName}`);
      throw error;
    }
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('Database Seeder')
    .description('Seed database with test data')
    .version('1.0.0');

  program
    .option('-r, --reset', 'Clear existing data before seeding')
    .option('-v, --verbose', 'Show detailed output')
    .description('Seed all tables with test data')
    .action(async (options) => {
      try {
        const db = await getDatabaseClient();
        const seeder = new DatabaseSeeder(db);
        await seeder.seedAll({
          reset: options.reset,
          verbose: options.verbose
        });
      } catch (error) {
        logger.error('Seeding failed', { error });
        process.exit(1);
      }
    });

  program
    .command('table <name>')
    .option('-r, --reset', 'Clear existing data before seeding')
    .description('Seed specific table with test data')
    .action(async (tableName, options) => {
      try {
        const db = await getDatabaseClient();
        const seeder = new DatabaseSeeder(db);
        await seeder.seedTable(tableName, {
          reset: options.reset
        });
      } catch (error) {
        logger.error(`Seeding table ${tableName} failed`, { error });
        process.exit(1);
      }
    });

  program
    .command('reset')
    .description('Clear all seed data')
    .action(async () => {
      try {
        const db = await getDatabaseClient();
        const seeder = new DatabaseSeeder(db);
        await seeder.clearSeedData();
        console.log(chalk.green('All seed data cleared'));
      } catch (error) {
        logger.error('Failed to clear seed data', { error });
        process.exit(1);
      }
    });

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // Default: seed all
    try {
      const db = await getDatabaseClient();
      const seeder = new DatabaseSeeder(db);
      await seeder.seedAll({ verbose: true });
    } catch (error) {
      logger.error('Seeding failed', { error });
      process.exit(1);
    }
  } else {
    program.parse(args);
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
    logger.error('Seed script failed', { error });
    process.exit(1);
  });
}

export { DatabaseSeeder };