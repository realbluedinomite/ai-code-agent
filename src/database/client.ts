import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';
import { EventEmitter } from 'events';
import { logger } from '@/utils/loggers';
import { isDevelopment, isProduction } from '@/config/environments';

export interface DatabaseConfig extends PoolConfig {
  enableLogging?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueryConfig {
  text: string;
  params?: any[];
  name?: string;
}

export interface QueryResultWithTiming<T = any> extends QueryResult<T> {
  executionTime?: number;
}

export class DatabaseConnectionManager extends EventEmitter {
  private pool: Pool;
  private config: DatabaseConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    super();
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_code_agent',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      enableLogging: process.env.DB_LOGGING === 'true',
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
      ...config,
    };

    this.pool = new Pool(this.config);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.pool.on('connect', (client: PoolClient) => {
      if (this.config.enableLogging) {
        logger.info('New database client connected', { 
          clientId: client.processID 
        });
      }
      this.emit('connect', client);
    });

    this.pool.on('acquire', (client: PoolClient) => {
      if (this.config.enableLogging) {
        logger.debug('Client acquired from pool', { 
          clientId: client.processID 
        });
      }
      this.emit('acquire', client);
    });

    this.pool.on('error', (error: Error, client: PoolClient | undefined) => {
      logger.error('Database pool error', { 
        error: error.message, 
        clientId: client?.processID,
        stack: error.stack 
      });
      this.emit('error', error, client);
    });

    this.pool.on('remove', (client: PoolClient) => {
      if (this.config.enableLogging) {
        logger.info('Client removed from pool', { 
          clientId: client.processID 
        });
      }
      this.emit('remove', client);
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isInitialized = true;
      
      // Start health check
      this.startHealthCheck();
      
      logger.info('Database connection pool initialized successfully', {
        max: this.config.max,
        min: this.config.min,
        host: this.config.host,
        port: this.config.port,
        database: this.config.database
      });

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize database connection pool', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public async query<T = any>(config: QueryConfig): Promise<QueryResultWithTiming<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (this.config.retryAttempts || 1); attempt++) {
      try {
        const client = await this.pool.connect();
        try {
          const result = await client.query<T>(config);
          const executionTime = Date.now() - startTime;
          
          if (this.config.enableLogging && isDevelopment()) {
            logger.debug('Database query executed', {
              query: config.text,
              params: config.params,
              executionTime,
              rowCount: result.rowCount
            });
          }

          const resultWithTiming = {
            ...result,
            executionTime
          };

          return resultWithTiming;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < (this.config.retryAttempts || 1)) {
          const delay = this.config.retryDelay || 1000;
          logger.warn('Database query failed, retrying', {
            attempt,
            maxAttempts: this.config.retryAttempts,
            error: lastError.message,
            delay
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error('Database query failed after all retry attempts', {
            attempts: attempt - 1,
            error: lastError.message,
            query: config.text.substring(0, 100)
          });
        }
      }
    }

    throw lastError;
  }

  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check database health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.checkHealth();
      this.emit('healthCheck', isHealthy);
      
      if (!isHealthy && isProduction()) {
        logger.error('Database health check failed, attempting to recover connection');
        // Could implement additional recovery logic here
      }
    }, 30000);
  }

  public async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    await this.pool.end();
    this.isInitialized = false;
    
    logger.info('Database connection pool closed');
    this.emit('closed');
  }

  public getPool(): Pool {
    return this.pool;
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  public getStats(): { 
    totalCount: number; 
    idleCount: number; 
    waitingCount: number;
    activeCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      activeCount: this.pool.totalCount - this.pool.idleCount
    };
  }
}

// Singleton instance
let dbManager: DatabaseConnectionManager | null = null;

export async function getDatabaseClient(): Promise<DatabaseConnectionManager> {
  if (!dbManager) {
    dbManager = new DatabaseConnectionManager({});
    await dbManager.initialize();
  }
  return dbManager;
}

export async function initializeDatabase(config?: DatabaseConfig): Promise<DatabaseConnectionManager> {
  if (dbManager && dbManager.isInitialized) {
    return dbManager;
  }

  dbManager = new DatabaseConnectionManager(config || {});
  await dbManager.initialize();
  return dbManager;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (dbManager) {
    await dbManager.close();
    dbManager = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await closeDatabaseConnection();
  process.exit(0);
});