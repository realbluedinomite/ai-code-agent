import Queue from 'bull';
import { logger } from '../utils/logger';

interface JobData {
  type: string;
  payload: any;
}

export class QueueService {
  private static instance: QueueService;
  private queues: Map<string, Queue> = new Map();

  private constructor() {}

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Email queue
      const emailQueue = new Queue('email', {
        redis: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      emailQueue.process('send-welcome', async (job) => {
        logger.info('Processing welcome email:', job.data);
        // Email sending logic would go here
        return { success: true };
      });

      emailQueue.process('send-notification', async (job) => {
        logger.info('Processing notification email:', job.data);
        // Email sending logic would go here
        return { success: true };
      });

      this.queues.set('email', emailQueue);

      // Analytics queue
      const analyticsQueue = new Queue('analytics', {
        redis: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      analyticsQueue.process('process-event', async (job) => {
        logger.info('Processing analytics event:', job.data);
        // Analytics processing logic would go here
        return { success: true };
      });

      this.queues.set('analytics', analyticsQueue);

      // Cleanup queue
      const cleanupQueue = new Queue('cleanup', {
        redis: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      cleanupQueue.process('cleanup-expired', async (job) => {
        logger.info('Running cleanup job:', job.data);
        // Cleanup logic would go here
        return { success: true };
      });

      this.queues.set('cleanup', cleanupQueue);

      logger.info('Queue service initialized');
    } catch (error) {
      logger.error('Queue service initialization failed:', error);
      throw error;
    }
  }

  public getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  public async addJob(queueName: string, jobType: string, data: any): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.add(jobType, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  public async shutdown(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${name} closed`);
    }
  }
}

export default QueueService.getInstance();
