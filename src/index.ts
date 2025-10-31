import http from 'http';
import path from 'path';
import { Express, Request, Response } from 'express';
import { initializeCore, getSystemHealth, eventBus } from './core';
import { initializeDatabase, closeDatabaseConnection, getModelRegistry } from './database';
import { logger } from './core/logger';
import { config } from './core/config';

/**
 * Application entry point that initializes all core systems
 */

interface AppOptions {
  port?: number;
  host?: string;
  environment?: string;
  enableHealthCheck?: boolean;
  enableCors?: boolean;
  healthCheckPath?: string;
}

/**
 * Main Application class
 */
export class Application {
  private server: http.Server | null = null;
  private express: Express | null = null;
  private isShuttingDown = false;
  private shutdownCallbacks: Array<() => Promise<void>> = [];

  constructor(private options: AppOptions = {}) {
    this.options = {
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || '0.0.0.0',
      environment: process.env.NODE_ENV || 'development',
      enableHealthCheck: true,
      enableCors: true,
      healthCheckPath: '/health',
      ...options,
    };
  }

  /**
   * Initialize the application and all its dependencies
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AI Code Agent application...', {
        port: this.options.port,
        host: this.options.host,
        environment: this.options.environment,
      });

      // Initialize core infrastructure
      await initializeCore({
        environment: this.options.environment,
        enableProfiling: this.options.environment !== 'production',
        registerCommonSchemas: true,
      });

      // Initialize database connection
      logger.info('Initializing database connection...');
      await initializeDatabase();
      await getModelRegistry(); // Initialize model registry
      logger.info('Database connection established');

      // Initialize Express application
      this.express = await this.initializeExpress();

      // Setup graceful shutdown handling
      this.setupGracefulShutdown();

      // Emit system start event
      await eventBus.emitAsync('system:start', {
        timestamp: new Date(),
        port: this.options.port,
        host: this.options.host,
        environment: this.options.environment,
        version: process.env.SERVICE_VERSION || '1.0.0',
      });

      logger.info('✅ Application initialized successfully', {
        port: this.options.port,
        host: this.options.host,
      });

    } catch (error) {
      logger.error('Failed to initialize application', { error });
      throw error;
    }
  }

  /**
   * Initialize Express application with middleware and routes
   */
  private async initializeExpress(): Promise<Express> {
    const express = (await import('express')).default;
    const app = express();

    // Security middleware
    app.use((await import('helmet')).default());
    
    // CORS
    if (this.options.enableCors) {
      const cors = (await import('cors')).default;
      app.use(cors({
        origin: config.get('CORS_ORIGIN', '*'),
        credentials: true,
      }));
    }

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    app.use((req: Request, res: Response, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.logRequest(req, res, duration);
      });
      
      next();
    });

    // Add correlation ID middleware
    app.use((req: Request, res: Response, next) => {
      const correlationId = req.headers['x-correlation-id'] as string || 
                           req.headers['x-request-id'] as string ||
                           `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      (global as any).__CORRELATION_ID__ = correlationId;
      res.setHeader('x-correlation-id', correlationId);
      
      next();
    });

    // Health check endpoint
    if (this.options.enableHealthCheck) {
      this.setupHealthCheckRoutes(app);
    }

    // API routes
    await this.setupApiRoutes(app);

    // Error handling middleware
    app.use(this.errorHandler);

    // 404 handler
    app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        correlationId: (global as any).__CORRELATION_ID__,
      });
    });

    return app;
  }

  /**
   * Setup health check routes
   */
  private setupHealthCheckRoutes(app: Express): void {
    const healthCheckPath = this.options.healthCheckPath!;

    // Basic health check
    app.get(healthCheckPath, (req: Request, res: Response) => {
      const health = getSystemHealth();
      
      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        uptime: health.uptime,
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: this.options.environment,
        checks: health.checks,
      });
    });

    // Detailed health check
    app.get(`${healthCheckPath}/detailed`, (req: Request, res: Response) => {
      const health = getSystemHealth();
      
      res.json({
        ...health,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      });
    });

    // Database health check
    app.get(`${healthCheckPath}/database`, async (req: Request, res: Response) => {
      try {
        const startTime = Date.now();
        // Simple database query to check connectivity
        const { getDatabaseClient } = await import('./database/client');
        const client = getDatabaseClient();
        await client.query('SELECT 1');
        const responseTime = Date.now() - startTime;

        res.json({
          status: 'healthy',
          database: 'connected',
          responseTime: `${responseTime}ms`,
          timestamp: new Date(),
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    });

    // Readiness probe
    app.get(`${healthCheckPath}/ready`, (req: Request, res: Response) => {
      const health = getSystemHealth();
      const isReady = health.status !== 'unhealthy';

      res.status(isReady ? 200 : 503).json({
        ready: isReady,
        timestamp: new Date(),
      });
    });

    // Liveness probe
    app.get(`${healthCheckPath}/live`, (req: Request, res: Response) => {
      res.json({
        alive: !this.isShuttingDown,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Setup API routes
   */
  private async setupApiRoutes(app: Express): Promise<void> {
    // API versioning
    const apiPrefix = config.get('API_PREFIX', '/api');
    const apiVersion = config.get('API_VERSION', 'v1');

    // API info route
    app.get(`${apiPrefix}`, (req: Request, res: Response) => {
      res.json({
        service: 'AI Code Agent',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: this.options.environment,
        apiVersion,
        documentation: `${apiPrefix}/${apiVersion}/docs`,
        healthCheck: this.options.healthCheckPath,
        timestamp: new Date(),
      });
    });

    // System information route
    app.get(`${apiPrefix}/system`, (req: Request, res: Response) => {
      const health = getSystemHealth();
      
      res.json({
        status: health.status,
        uptime: health.uptime,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: this.options.environment,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      });
    });

    // Configuration export (with sensitive data redacted)
    app.get(`${apiPrefix}/config`, (req: Request, res: Response) => {
      if (this.options.environment === 'production') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Configuration endpoint not available in production',
        });
      }

      res.json({
        configuration: config.export(true),
        timestamp: new Date(),
      });
    });

    // Plugin management routes (placeholder for plugin system)
    app.get(`${apiPrefix}/plugins`, async (req: Request, res: Response) => {
      // TODO: Implement plugin listing when plugin system is complete
      res.json({
        plugins: [],
        message: 'Plugin system not yet implemented',
      });
    });

    // TODO: Add more API routes as needed
    // - Agent management routes
    // - Task management routes
    // - Workflow management routes
    // - etc.
  }

  /**
   * Error handling middleware
   */
  private errorHandler = (error: any, req: Request, res: Response, next: any): void => {
    const correlationId = (global as any).__CORRELATION_ID__;
    
    logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      correlationId,
    });

    // Determine error type and status code
    let statusCode = 500;
    let message = 'Internal Server Error';

    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = error.message;
    } else if (error.name === 'NotFoundError') {
      statusCode = 404;
      message = error.message;
    } else if (error.name === 'UnauthorizedError' || error.name === 'AuthenticationError') {
      statusCode = 401;
      message = 'Unauthorized';
    } else if (error.name === 'ForbiddenError' || error.name === 'AuthorizationError') {
      statusCode = 403;
      message = 'Forbidden';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503;
      message = 'Service Unavailable';
    }

    res.status(statusCode).json({
      error: error.name || 'Error',
      message,
      correlationId,
      timestamp: new Date(),
      ...(this.options.environment !== 'production' && { stack: error.stack }),
    });
  };

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Run shutdown callbacks in reverse order
        for (const callback of this.shutdownCallbacks.reverse()) {
          await callback();
        }

        // Close HTTP server
        if (this.server) {
          await new Promise<void>((resolve) => {
            this.server!.close(() => {
              logger.info('HTTP server closed');
              resolve();
            });
          });
        }

        // Emit shutdown event
        await eventBus.emitAsync('system:shutdown', {
          signal,
          timestamp: new Date(),
          uptime: process.uptime(),
        });

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions during shutdown
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception during shutdown', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection during shutdown', { reason, promise });
      process.exit(1);
    });
  }

  /**
   * Add a shutdown callback
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (!this.express) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.express!);

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.options.port} is already in use`);
        } else {
          logger.error('Server error', { error });
        }
        reject(error);
      });

      this.server.listen(this.options.port, this.options.host, () => {
        logger.info(`🚀 Server listening on http://${this.options.host}:${this.options.port}`, {
          environment: this.options.environment,
          pid: process.pid,
        });
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info('HTTP server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Get the Express application instance
   */
  getExpress(): Express | null {
    return this.express;
  }

  /**
   * Get the HTTP server instance
   */
  getServer(): http.Server | null {
    return this.server;
  }
}

/**
 * Create and start the application
 */
export async function createAndStartApp(options?: AppOptions): Promise<Application> {
  const app = new Application(options);
  await app.initialize();
  await app.start();
  return app;
}

/**
 * Default application instance for direct usage
 */
export let application: Application | null = null;

/**
 * Main entry point for running the application
 */
export async function main(): Promise<void> {
  try {
    application = new Application();
    await application.initialize();
    await application.start();

    // Add shutdown callback for database
    application.onShutdown(async () => {
      logger.info('Closing database connection...');
      await closeDatabaseConnection();
      logger.info('Database connection closed');
    });

  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

// Run the application if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

// Export for testing and programmatic use
export { Application };
