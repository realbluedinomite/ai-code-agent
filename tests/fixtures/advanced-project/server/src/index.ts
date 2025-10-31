import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Controllers
import authController from './controllers/AuthController';
import userController from './controllers/UserController';
import postController from './controllers/PostController';
import commentController from './controllers/CommentController';
import analyticsController from './controllers/AnalyticsController';

// Services
import { logger } from './utils/logger';
import { DatabaseService } from './services/DatabaseService';
import { RedisService } from './services/RedisService';
import { QueueService } from './services/QueueService';

class Server {
  private app: Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDatabase();
    this.initializeSocketHandlers();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/api/', limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API routes
    const apiRouter = express.Router();

    // Public routes
    apiRouter.use('/auth', authController);
    apiRouter.use('/public', (req, res) => {
      res.json({ message: 'Public API endpoint' });
    });

    // Protected routes
    apiRouter.use(authMiddleware);
    apiRouter.use('/users', userController);
    apiRouter.use('/posts', postController);
    apiRouter.use('/comments', commentController);
    apiRouter.use('/analytics', analyticsController);

    this.app.use('/api', apiRouter);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await DatabaseService.connect();
      await RedisService.connect();
      await QueueService.initialize();
      logger.info('Database services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database services:', error);
      process.exit(1);
    }
  }

  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user to personal room
      socket.on('authenticate', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      });

      // Handle post comments in real-time
      socket.on('join_post', (postId: string) => {
        socket.join(`post:${postId}`);
      });

      socket.on('leave_post', (postId: string) => {
        socket.leave(`post:${postId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public listen(): void {
    this.httpServer.listen(this.port, () => {
      logger.info(`🚀 Server running on port ${this.port}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default Server;
