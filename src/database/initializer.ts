import { DatabaseConnectionManager, initializeDatabase } from './client';
import { DatabaseModelFactory, getModelRegistry } from './index';
import { logger } from '@/utils/loggers';

/**
 * Database initialization and setup utilities
 */
export class DatabaseInitializer {
  private static instance: DatabaseInitializer | null = null;
  private dbManager: DatabaseConnectionManager | null = null;
  private modelFactory: DatabaseModelFactory | null = null;

  private constructor() {}

  public static getInstance(): DatabaseInitializer {
    if (!DatabaseInitializer.instance) {
      DatabaseInitializer.instance = new DatabaseInitializer();
    }
    return DatabaseInitializer.instance;
  }

  /**
   * Initialize database connection and models
   */
  public async initialize(config?: any): Promise<void> {
    try {
      logger.info('Initializing database connection...');
      
      // Initialize database connection manager
      this.dbManager = await initializeDatabase(config);
      
      // Create model factory
      this.modelFactory = new DatabaseModelFactory(this.dbManager);
      
      // Initialize model registry
      await getModelRegistry(this.dbManager);
      
      logger.info('Database initialization completed successfully');
    } catch (error) {
      logger.error('Failed to initialize database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get database connection manager
   */
  public getDatabaseManager(): DatabaseConnectionManager {
    if (!this.dbManager) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dbManager;
  }

  /**
   * Get model factory
   */
  public getModelFactory(): DatabaseModelFactory {
    if (!this.modelFactory) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.modelFactory;
  }

  /**
   * Check database health
   */
  public async checkHealth(): Promise<boolean> {
    if (!this.dbManager) {
      return false;
    }

    try {
      return await this.dbManager.checkHealth();
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public getStatistics(): any {
    if (!this.dbManager) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return this.dbManager.getStats();
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.dbManager) {
      await this.dbManager.close();
      this.dbManager = null;
      this.modelFactory = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Reset database connection (for testing)
   */
  public async reset(): Promise<void> {
    await this.close();
    DatabaseInitializer.instance = null;
  }
}

/**
 * Database context for dependency injection
 */
export class DatabaseContext {
  private dbManager: DatabaseConnectionManager;
  private modelFactory: DatabaseModelFactory;

  constructor(dbManager: DatabaseConnectionManager) {
    this.dbManager = dbManager;
    this.modelFactory = new DatabaseModelFactory(dbManager);
  }

  public getDatabaseManager(): DatabaseConnectionManager {
    return this.dbManager;
  }

  public getModelFactory(): DatabaseModelFactory {
    return this.modelFactory;
  }

  // Convenience methods for accessing models
  public get userModel() {
    return this.modelFactory.userModel();
  }

  public get sessionModel() {
    return this.modelFactory.sessionModel();
  }

  public get parsedRequestModel() {
    return this.modelFactory.parsedRequestModel();
  }

  public get projectAnalysisModel() {
    return this.modelFactory.projectAnalysisModel();
  }

  public get taskModel() {
    return this.modelFactory.taskModel();
  }

  public get codeFileModel() {
    return this.modelFactory.codeFileModel();
  }

  public get configurationModel() {
    return this.modelFactory.configurationModel();
  }

  public get auditLogModel() {
    return this.modelFactory.auditLogModel();
  }

  public get apiKeyModel() {
    return this.modelFactory.apiKeyModel();
  }
}

/**
 * Create database context
 */
export async function createDatabaseContext(config?: any): Promise<DatabaseContext> {
  const initializer = DatabaseInitializer.getInstance();
  
  if (!initializer.getDatabaseManager()) {
    await initializer.initialize(config);
  }

  const dbManager = initializer.getDatabaseManager();
  return new DatabaseContext(dbManager);
}

// Global database context
let globalDbContext: DatabaseContext | null = null;

/**
 * Get global database context
 */
export async function getDatabaseContext(config?: any): Promise<DatabaseContext> {
  if (!globalDbContext) {
    globalDbContext = await createDatabaseContext(config);
  }
  return globalDbContext;
}

/**
 * Initialize database for the application
 */
export async function initializeDatabaseForApp(config?: any): Promise<void> {
  const initializer = DatabaseInitializer.getInstance();
  await initializer.initialize(config);
}

/**
 * Cleanup database resources
 */
export async function cleanupDatabase(): Promise<void> {
  const initializer = DatabaseInitializer.getInstance();
  await initializer.close();
}

// Export singleton instance
export const databaseInitializer = DatabaseInitializer.getInstance();