/**
 * Practical example demonstrating core infrastructure usage
 */

import { 
  eventBus, 
  Events, 
  logger, 
  config, 
  createCommonSchemas,
  ValidationError,
  NotFoundError,
  initializeCore,
  getSystemHealth
} from './index';

/**
 * Example: User Service using core infrastructure
 */
class UserService {
  private users = new Map<string, { id: string; name: string; email: string }>();

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for system events
    eventBus.on(Events.SYSTEM_START, () => {
      logger.info('UserService starting', { component: 'UserService' });
      this.seedData();
    });

    eventBus.on(Events.SYSTEM_STOP, () => {
      logger.info('UserService stopping', { component: 'UserService' });
    });

    // Listen for database events
    eventBus.on(Events.DB_ERROR, (data) => {
      logger.error('Database error affecting UserService', data);
    });

    // Listen for config changes
    config.watch((change) => {
      if (change.key.startsWith('user.')) {
        logger.info('User service config changed', {
          key: change.key,
          oldValue: change.oldValue,
          newValue: change.newValue
        });
      }
    });
  }

  private seedData(): void {
    const defaultUsers = [
      { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
      { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
      { id: '3', name: 'Carol Davis', email: 'carol@example.com' },
    ];

    defaultUsers.forEach(user => {
      this.users.set(user.id, user);
    });

    logger.info('UserService seeded with default data', { 
      count: defaultUsers.length 
    });
  }

  async createUser(userData: { name: string; email: string }): Promise<{ id: string; name: string; email: string }> {
    const operationId = `create-user-${Date.now()}`;
    logger.startTimer(operationId);

    try {
      // Validate input
      if (!userData.name?.trim()) {
        throw new ValidationError('Name is required', {
          field: 'name',
          value: userData.name,
          context: { operationId }
        });
      }

      if (!userData.email?.includes('@')) {
        throw new ValidationError('Valid email is required', {
          field: 'email',
          value: userData.email,
          context: { operationId }
        });
      }

      // Check for duplicates
      const existingUser = Array.from(this.users.values())
        .find(u => u.email === userData.email);
      
      if (existingUser) {
        throw new ValidationError('Email already exists', {
          field: 'email',
          value: userData.email,
          existingUserId: existingUser.id,
          context: { operationId }
        });
      }

      // Create user
      const id = `user-${Date.now()}`;
      const newUser = { id, ...userData };
      
      await logger.profile('user-creation', async () => {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 100));
        this.users.set(id, newUser);
      });

      // Emit event
      await eventBus.emitAsync(Events.TASK_COMPLETED, {
        taskType: 'user:create',
        userId: id,
        operationId,
        success: true
      });

      const duration = logger.endTimer(operationId);
      logger.info('User created successfully', {
        userId: id,
        email: userData.email,
        duration,
        context: { operationId }
      });

      return newUser;

    } catch (error) {
      const duration = logger.endTimer(operationId);
      
      // Emit failure event
      await eventBus.emitAsync(Events.TASK_FAILED, {
        taskType: 'user:create',
        error: error instanceof Error ? error.message : 'Unknown error',
        operationId,
        duration
      });

      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : error,
        userData: { name: userData.name, email: '***' }, // Don't log email
        duration,
        context: { operationId }
      });

      throw error;
    }
  }

  async getUser(id: string): Promise<{ id: string; name: string; email: string }> {
    logger.debug('Getting user', { userId: id });

    const user = this.users.get(id);
    
    if (!user) {
      throw new NotFoundError('User', id, {
        context: { operation: 'getUser' }
      });
    }

    return user;
  }

  async listUsers(): Promise<Array<{ id: string; name: string; email: string }>> {
    const users = Array.from(this.users.values());
    logger.info('Listing users', { count: users.length });
    return users;
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.users.get(id);
    
    if (!user) {
      throw new NotFoundError('User', id, {
        context: { operation: 'deleteUser' }
      });
    }

    await logger.profile('user-deletion', async () => {
      // Simulate database operation
      await new Promise(resolve => setTimeout(resolve, 50));
      this.users.delete(id);
    });

    logger.info('User deleted', { 
      userId: id, 
      email: user.email 
    });

    // Emit event
    eventBus.emit('user:deleted', {
      userId: id,
      email: user.email,
      timestamp: new Date()
    });
  }

  getStats(): { totalUsers: number } {
    return { totalUsers: this.users.size };
  }
}

/**
 * Example: API Server using core infrastructure
 */
class ApiServer {
  private port: number;
  private userService: UserService;

  constructor() {
    this.port = config.get<number>('server.port', 3000);
    this.userService = new UserService();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for user events
    eventBus.on('user:deleted', async (data) => {
      logger.info('Handling user deletion event', data);
      // Could trigger cleanup, notifications, etc.
    });

    // Monitor system health
    setInterval(() => {
      const health = getSystemHealth();
      if (health.status !== 'healthy') {
        logger.warn('System health degraded', {
          status: health.status,
          checks: health.checks
        });
      }
    }, 30000); // Check every 30 seconds
  }

  async start(): Promise<void> {
    logger.info('API Server starting', { port: this.port });

    // Start the server (pseudo-code)
    // await this.listen(this.port);

    // Emit started event
    eventBus.emit(Events.SYSTEM_START, {
      component: 'ApiServer',
      port: this.port,
      timestamp: new Date()
    });

    logger.info('API Server started successfully', { port: this.port });
  }

  async stop(): Promise<void> {
    logger.info('API Server stopping');

    eventBus.emit(Events.SYSTEM_STOP, {
      component: 'ApiServer',
      timestamp: new Date()
    });

    logger.info('API Server stopped');
  }

  // Example API route handlers
  async handleGetUsers(): Promise<void> {
    try {
      const users = await this.userService.listUsers();
      logger.info('Get users request completed', { count: users.length });
    } catch (error) {
      logger.error('Get users request failed', { error });
      throw error;
    }
  }

  async handleCreateUser(userData: { name: string; email: string }): Promise<void> {
    try {
      const user = await this.userService.createUser(userData);
      logger.info('Create user request completed', { userId: user.id });
    } catch (error) {
      logger.error('Create user request failed', { 
        error,
        userData: { name: userData.name, email: '***' }
      });
      throw error;
    }
  }

  async handleGetUser(userId: string): Promise<void> {
    try {
      const user = await this.userService.getUser(userId);
      logger.info('Get user request completed', { userId });
    } catch (error) {
      logger.error('Get user request failed', { userId, error });
      throw error;
    }
  }
}

/**
 * Example: Application bootstrap
 */
async function bootstrap() {
  try {
    console.log('🚀 Starting Application...\n');

    // Initialize core infrastructure
    await initializeCore({
      environment: process.env.NODE_ENV || 'development',
      enableProfiling: process.env.NODE_ENV !== 'production',
      registerCommonSchemas: true
    });

    // Setup configuration
    config.loadFromEnvironment();
    config.registerSchemas(createCommonSchemas());

    // Create and start server
    const server = new ApiServer();
    await server.start();

    console.log('\n✅ Application started successfully');
    console.log(`📊 System Health: ${getSystemHealth().status}`);
    console.log(`👥 User Service Stats:`, server['userService'].getStats());

    // Example usage
    console.log('\n📝 Example Usage:');
    
    // Create a user
    const newUser = await server['userService'].createUser({
      name: 'David Wilson',
      email: 'david@example.com'
    });
    console.log('Created user:', newUser);

    // Get the user
    const user = await server['userService'].getUser(newUser.id);
    console.log('Retrieved user:', user);

    // List all users
    const users = await server['userService'].listUsers();
    console.log('All users:', users);

    console.log('\n🎉 Example completed successfully!');
    console.log('\n📊 Final System Health:', getSystemHealth());

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Application startup failed:', error);
    
    if (error instanceof Error) {
      logger.error('Bootstrap failed', {
        error: error.message,
        stack: error.stack
      });
    }
    
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  bootstrap();
}

export { bootstrap, UserService, ApiServer };