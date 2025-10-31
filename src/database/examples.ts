import { initializeDatabaseForApp, getDatabaseContext } from './initializer';
import { Priority, SessionStatus } from './entities';
import { UserModel } from './models/user.model';
import { SessionModel } from './models/session.model';
import { ParsedRequestModel } from './models/parsed-request.model';
import { ProjectAnalysisModel } from './models/project-analysis.model';
import { TaskModel } from './models/task.model';
import { logger } from '@/utils/loggers';

/**
 * Example usage of the database models
 */
export class DatabaseExample {
  
  /**
   * Example: Create and manage users
   */
  static async exampleUserManagement(): Promise<void> {
    const dbContext = await getDatabaseContext();
    const userModel = dbContext.userModel;

    // Create a new user
    const createUserData = {
      email: 'user@example.com',
      username: 'testuser',
      password_hash: await UserModel.hashPassword('password123'),
      first_name: 'John',
      last_name: 'Doe',
      role: 'user'
    };

    const user = await userModel.create(createUserData);
    logger.info('Created user:', { id: user.id, email: user.email });

    // Find user by email
    const foundUser = await userModel.findByEmail('user@example.com');
    if (foundUser) {
      logger.info('Found user:', { id: foundUser.id, username: foundUser.username });
    }

    // Update user profile
    const updatedUser = await userModel.updateProfile(user.id, {
      first_name: 'Jane',
      avatar_url: 'https://example.com/avatar.jpg'
    });
    logger.info('Updated user:', { id: updatedUser.id, first_name: updatedUser.first_name });

    // Get user statistics
    const stats = await userModel.getUserStatistics();
    logger.info('User statistics:', stats);

    return user;
  }

  /**
   * Example: Manage sessions
   */
  static async exampleSessionManagement(userId: string): Promise<void> {
    const dbContext = await getDatabaseContext();
    const sessionModel = dbContext.sessionModel;

    // Create a new session
    const createSessionData = {
      user_id: userId,
      session_token: 'sample-session-token-' + Date.now(),
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    const session = await sessionModel.create(createSessionData);
    logger.info('Created session:', { id: session.id, user_id: session.user_id });

    // Find session by token
    const foundSession = await sessionModel.findByToken(session.session_token);
    if (foundSession) {
      logger.info('Found session:', { id: foundSession.id, status: foundSession.status });
    }

    // Update last accessed
    await sessionModel.updateLastAccessed(session.id);

    // Find user's active sessions
    const activeSessions = await sessionModel.findActiveByUserId(userId);
    logger.info('Active sessions:', activeSessions.length);

    // Terminate session
    const terminatedSession = await sessionModel.terminateSession(session.id);
    logger.info('Terminated session:', terminatedSession.status);

    return session;
  }

  /**
   * Example: Parse and process requests
   */
  static async exampleParsedRequests(sessionId: string): Promise<void> {
    const dbContext = await getDatabaseContext();
    const parsedRequestModel = dbContext.parsedRequestModel;

    // Create a parsed request
    const createRequestData = {
      session_id: sessionId,
      request_type: 'project_analysis',
      original_text: 'Please analyze this JavaScript project for code quality issues.',
      parsed_data: {
        intent: 'analyze',
        target: 'project',
        parameters: {
          language: 'javascript',
          focus: 'code_quality'
        }
      },
      parameters: {
        project_path: '/path/to/project',
        analysis_type: 'comprehensive'
      },
      priority: Priority.HIGH
    };

    const request = await parsedRequestModel.create(createRequestData);
    logger.info('Created parsed request:', { id: request.id, type: request.request_type });

    // Mark as processing
    const processingRequest = await parsedRequestModel.markAsInProgress(request.id);

    // Mark as completed with results
    const completedRequest = await parsedRequestModel.markAsProcessed(request.id, {
      complexity_score: 85,
      issues_found: [
        { type: 'warning', message: 'Unused variable', file: 'app.js', line: 45 }
      ]
    });

    logger.info('Completed request:', {
      id: completedRequest.id,
      status: completedRequest.status,
      processed_at: completedRequest.processed_at
    });

    // Get statistics
    const stats = await parsedRequestModel.getStatistics();
    logger.info('Request statistics:', stats);

    return request;
  }

  /**
   * Example: Project analysis workflow
   */
  static async exampleProjectAnalysis(parsedRequestId: string): Promise<void> {
    const dbContext = await getDatabaseContext();
    const projectAnalysisModel = dbContext.projectAnalysisModel;

    // Create a project analysis
    const createAnalysisData = {
      parsed_request_id: parsedRequestId,
      project_path: '/path/to/project',
      project_name: 'My Awesome Project',
      project_type: 'javascript',
      analysis_type: 'comprehensive'
    };

    const analysis = await projectAnalysisModel.create(createAnalysisData);
    logger.info('Created project analysis:', { id: analysis.id, project_name: analysis.project_name });

    // Start analysis
    const startedAnalysis = await projectAnalysisModel.startAnalysis(analysis.id);

    // Complete analysis with results
    const completedAnalysis = await projectAnalysisModel.completeAnalysis(analysis.id, {
      complexity_score: 75,
      quality_metrics: {
        maintainability: 8.5,
        test_coverage: 0.65,
        code_duplication: 0.12
      },
      files_analyzed: 150,
      lines_of_code: 15420
    }, {
      recommendations: [
        'Consider refactoring large functions',
        'Add more unit tests for critical components',
        'Remove dead code in utility files'
      ]
    });

    logger.info('Completed analysis:', {
      id: completedAnalysis.id,
      complexity_score: completedAnalysis.complexity_score,
      files_analyzed: completedAnalysis.file_count
    });

    // Get recent analyses
    const recentAnalyses = await projectAnalysisModel.getRecentAnalyses(5);
    logger.info('Recent analyses:', recentAnalyses.length);

    // Get statistics
    const stats = await projectAnalysisModel.getStatistics();
    logger.info('Analysis statistics:', stats);

    return analysis;
  }

  /**
   * Example: Task management workflow
   */
  static async exampleTaskManagement(parsedRequestId: string): Promise<void> {
    const dbContext = await getDatabaseContext();
    const taskModel = dbContext.taskModel;

    // Create tasks
    const tasks = await Promise.all([
      taskModel.create({
        parsed_request_id: parsedRequestId,
        task_type: 'code_analysis',
        title: 'Analyze JavaScript files',
        description: 'Perform static analysis on all JavaScript files',
        priority: Priority.HIGH,
        estimated_duration: 300000 // 5 minutes
      }),
      taskModel.create({
        parsed_request_id: parsedRequestId,
        task_type: 'generate_report',
        title: 'Generate analysis report',
        description: 'Create a comprehensive report of findings',
        priority: Priority.MEDIUM,
        estimated_duration: 60000 // 1 minute
      })
    ]);

    logger.info('Created tasks:', tasks.map(t => ({ id: t.id, title: t.title })));

    // Start first task
    const startedTask = await taskModel.startTask(tasks[0].id);
    logger.info('Started task:', { id: startedTask.id, status: startedTask.status });

    // Complete first task
    const completedTask = await taskModel.completeTask(tasks[0].id, {
      files_processed: 45,
      issues_found: 23,
      duration_ms: 280000
    });

    // Start second task
    const secondStartedTask = await taskModel.startTask(tasks[1].id);

    // Complete second task
    const secondCompletedTask = await taskModel.completeTask(tasks[1].id, {
      report_generated: true,
      format: 'pdf',
      size: '2.4MB'
    });

    logger.info('Completed tasks:', [completedTask.status, secondCompletedTask.status]);

    // Get task statistics
    const stats = await taskModel.getTaskStatistics();
    logger.info('Task statistics:', stats);

    // Get recent tasks
    const recentTasks = await taskModel.getRecentTasks(10);
    logger.info('Recent tasks:', recentTasks.length);

    return tasks;
  }

  /**
   * Example: Database transaction
   */
  static async exampleTransaction(): Promise<void> {
    const dbContext = await getDatabaseContext();
    const dbManager = dbContext.getDatabaseManager();

    try {
      await dbManager.transaction(async (client) => {
        // Create a user and session in a single transaction
        const userModel = dbContext.userModel;
        const sessionModel = dbContext.sessionModel;

        const user = await userModel.createInTransaction(client, {
          email: 'transaction@example.com',
          username: 'transuser',
          password_hash: await UserModel.hashPassword('password123')
        });

        await sessionModel.createInTransaction(client, {
          user_id: user.id,
          session_token: 'transaction-token-' + Date.now(),
          expires_at: new Date(Date.now() + 3600000) // 1 hour
        });

        logger.info('Transaction successful:', { userId: user.id });
      });
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Example: Database health check and statistics
   */
  static async exampleDatabaseMonitoring(): Promise<void> {
    const dbContext = await getDatabaseContext();
    const dbManager = dbContext.getDatabaseManager();

    // Check health
    const isHealthy = await dbManager.checkHealth();
    logger.info('Database health:', isHealthy);

    // Get connection pool statistics
    const poolStats = dbManager.getStats();
    logger.info('Pool statistics:', poolStats);

    // Get overall statistics
    const stats = await dbContext.userModel.getUserStatistics();
    logger.info('User statistics:', stats);
  }
}

/**
 * Run all examples
 */
export async function runDatabaseExamples(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabaseForApp();
    logger.info('Starting database examples...');

    // Run examples in sequence
    const user = await DatabaseExample.exampleUserManagement();
    const session = await DatabaseExample.exampleSessionManagement(user.id);
    const request = await DatabaseExample.exampleParsedRequests(session.id);
    const analysis = await DatabaseExample.exampleProjectAnalysis(request.id);
    await DatabaseExample.exampleTaskManagement(request.id);
    await DatabaseExample.exampleTransaction();
    await DatabaseExample.exampleDatabaseMonitoring();

    logger.info('All database examples completed successfully!');
  } catch (error) {
    logger.error('Database examples failed:', error);
    throw error;
  }
}

// Export individual examples
export {
  DatabaseExample as UserManagementExample,
  DatabaseExample as SessionManagementExample,
  DatabaseExample as ParsedRequestExample,
  DatabaseExample as ProjectAnalysisExample,
  DatabaseExample as TaskManagementExample,
  DatabaseExample as TransactionExample,
  DatabaseExample as MonitoringExample,
};