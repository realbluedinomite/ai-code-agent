/**
 * RollbackManager Component
 * 
 * Provides transaction-like operations with comprehensive rollback capabilities,
 * backup management, and recovery mechanisms for file system changes.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  RollbackOperation,
  RollbackSession,
  RollbackStrategy,
  FileSystemOperation,
  DEFAULT_CONFIG,
} from './types';
import {
  BaseError,
  ValidationError,
  SystemError,
  NotFoundError,
  TimeoutError,
} from '@/core/errors';
import { TypedEventBus } from '@/core/event-bus';

/**
 * Rollback error
 */
export class RollbackError extends BaseError {
  constructor(
    message: string,
    options: {
      sessionId?: string;
      operation?: string;
      filePath?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'ROLLBACK_ERROR',
      statusCode: 500,
      context: {
        sessionId: options.sessionId,
        operation: options.operation,
        filePath: options.filePath,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends BaseError {
  constructor(sessionId: string) {
    super(`Rollback session not found: ${sessionId}`, {
      code: 'SESSION_NOT_FOUND_ERROR',
      statusCode: 404,
      context: {
        sessionId,
      },
    });
  }
}

/**
 * Invalid session state error
 */
export class InvalidSessionStateError extends BaseError {
  constructor(
    sessionId: string,
    currentState: string,
    expectedState: string
  ) {
    super(`Invalid session state: ${currentState}, expected: ${expectedState}`, {
      code: 'INVALID_SESSION_STATE_ERROR',
      statusCode: 400,
      context: {
        sessionId,
        currentState,
        expectedState,
      },
    });
  }
}

/**
 * RollbackManager class for transaction-like file operations
 */
export class RollbackManager {
  private config: typeof DEFAULT_CONFIG.rollback;
  private eventBus: TypedEventBus;
  private activeSessions: Map<string, RollbackSession> = new Map();
  private sessionsDirectory: string;
  private maxSessions: number;
  private maxSessionAge: number; // in milliseconds

  constructor(
    options: Partial<typeof DEFAULT_CONFIG.rollback> = {},
    eventBus: TypedEventBus
  ) {
    this.config = {
      ...DEFAULT_CONFIG.rollback,
      ...options,
    };
    this.eventBus = eventBus;
    this.maxSessions = this.config.maxSessions;
    this.maxSessionAge = this.config.maxSessionAge * 60 * 60 * 1000; // Convert hours to milliseconds
    this.sessionsDirectory = '.rollback_sessions';

    // Initialize sessions directory
    this.initializeSessionsDirectory();
  }

  /**
   * Create a new rollback session
   */
  async createSession(
    name: string,
    description?: string,
    metadata: Record<string, any> = {}
  ): Promise<RollbackSession> {
    // Clean up old sessions if at capacity
    await this.cleanupOldSessions();

    if (this.activeSessions.size >= this.maxSessions) {
      throw new RollbackError(
        `Maximum number of sessions reached: ${this.maxSessions}`,
        {
          context: {
            activeSessions: this.activeSessions.size,
            maxSessions: this.maxSessions,
          },
        }
      );
    }

    const session: RollbackSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      operations: [],
      status: 'active',
      startTime: new Date(),
      metadata,
    };

    this.activeSessions.set(session.id, session);
    
    // Persist session to disk
    await this.persistSession(session);

    this.eventBus.emit('implementer:rollback:started', {
      sessionId: session.id,
      name,
      description,
      metadata,
    });

    return session;
  }

  /**
   * Add operation to an active session
   */
  async addOperation(
    sessionId: string,
    operation: Omit<RollbackOperation, 'id' | 'timestamp'>
  ): Promise<RollbackOperation> {
    const session = await this.getSession(sessionId);
    this.validateSessionState(session, 'active');

    const rollbackOp: RollbackOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...operation,
    };

    session.operations.push(rollbackOp);

    // Persist changes
    await this.persistSession(session);

    this.eventBus.emit('implementer:progress:updated', {
      sessionId,
      operationAdded: rollbackOp.id,
      totalOperations: session.operations.length,
    });

    return rollbackOp;
  }

  /**
   * Create backup for a file as part of a rollback session
   */
  async createBackup(
    sessionId: string,
    filePath: string,
    originalContent?: string
  ): Promise<string> {
    const session = await this.getSession(sessionId);
    this.validateSessionState(session, 'active');

    // If content is provided, use it; otherwise read from file
    let content = originalContent;
    if (!content) {
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        throw new NotFoundError('File', filePath);
      }
    }

    // Create backup directory within session
    const sessionDir = this.getSessionDirectory(sessionId);
    const backupDir = path.join(sessionDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Generate backup filename
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const backupPath = path.join(backupDir, `${fileName}.backup_${timestamp}`);

    // Write backup file
    await fs.writeFile(backupPath, content, 'utf8');

    // Add to session operations
    await this.addOperation(sessionId, {
      type: 'create', // Create backup operation
      targetPath: backupPath,
      originalContent: content,
    });

    return backupPath;
  }

  /**
   * Commit a rollback session
   */
  async commitSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    this.validateSessionState(session, 'active');

    session.status = 'committed';
    session.endTime = new Date();

    // Clean up backup files if not configured to keep them
    if (!this.config.backupRetention || this.config.backupRetention <= 0) {
      await this.cleanupSessionBackups(sessionId);
    }

    await this.persistSession(session);
    this.activeSessions.delete(sessionId);

    this.eventBus.emit('implementer:rollback:completed', {
      sessionId,
      status: 'committed',
      operationsCount: session.operations.length,
      duration: session.endTime.getTime() - session.startTime.getTime(),
    });
  }

  /**
   * Rollback a session
   */
  async rollbackSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    this.validateSessionState(session, 'active');

    session.status = 'rolled-back';
    session.endTime = new Date();

    try {
      // Perform rollback operations in reverse order
      for (let i = session.operations.length - 1; i >= 0; i--) {
        const operation = session.operations[i];
        
        await this.executeRollbackOperation(operation);
        
        // Emit progress
        this.eventBus.emit('implementer:progress:updated', {
          sessionId,
          rollbackProgress: (session.operations.length - i) / session.operations.length * 100,
          currentOperation: operation.id,
        });
      }

      await this.persistSession(session);

      this.eventBus.emit('implementer:rollback:completed', {
        sessionId,
        status: 'rolled-back',
        operationsCount: session.operations.length,
        duration: session.endTime.getTime() - session.startTime.getTime(),
      });

    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : 'Unknown error occurred';
      session.endTime = new Date();

      await this.persistSession(session);

      this.eventBus.emit('implementer:rollback:failed', {
        sessionId,
        error: session.error,
        cause: error,
      });

      throw new RollbackError(
        `Rollback failed for session ${sessionId}: ${session.error}`,
        {
          sessionId,
          cause: error as Error,
        }
      );
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Force rollback a session even if it's committed
   */
  async forceRollback(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (session.status === 'failed') {
      throw new InvalidSessionStateError(sessionId, session.status, 'active');
    }

    session.status = 'rolled-back';
    session.endTime = new Date();

    try {
      // Perform rollback operations in reverse order
      for (let i = session.operations.length - 1; i >= 0; i--) {
        const operation = session.operations[i];
        await this.executeRollbackOperation(operation);
      }

      await this.persistSession(session);

      this.eventBus.emit('implementer:rollback:completed', {
        sessionId,
        status: 'force-rolled-back',
        operationsCount: session.operations.length,
      });

    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : 'Unknown error occurred';
      session.endTime = new Date();

      await this.persistSession(session);

      throw new RollbackError(
        `Force rollback failed for session ${sessionId}: ${session.error}`,
        {
          sessionId,
          cause: error as Error,
        }
      );
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<RollbackSession> {
    // Check active sessions first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Load from disk
    try {
      const sessionPath = this.getSessionFilePath(sessionId);
      const sessionData = await fs.readFile(sessionPath, 'utf8');
      const session = JSON.parse(sessionData) as RollbackSession;

      // Convert date strings back to Date objects
      session.startTime = new Date(session.startTime);
      if (session.endTime) {
        session.endTime = new Date(session.endTime);
      }
      session.operations = session.operations.map(op => ({
        ...op,
        timestamp: new Date(op.timestamp),
      }));

      // Add to active sessions if it's still active
      if (session.status === 'active') {
        this.activeSessions.set(sessionId, session);
      }

      return session;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new SessionNotFoundError(sessionId);
      }
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<RollbackSession[]> {
    // Clean up old sessions first
    await this.cleanupOldSessions();

    const sessions: RollbackSession[] = [];

    // Get active sessions
    sessions.push(...Array.from(this.activeSessions.values()));

    // Get persisted sessions
    try {
      const sessionFiles = await fs.readdir(this.sessionsDirectory);
      
      for (const fileName of sessionFiles) {
        if (!fileName.endsWith('.json')) continue;
        
        try {
          const sessionPath = path.join(this.sessionsDirectory, fileName);
          const sessionData = await fs.readFile(sessionPath, 'utf8');
          const session = JSON.parse(sessionData) as RollbackSession;

          // Convert date strings back to Date objects
          session.startTime = new Date(session.startTime);
          if (session.endTime) {
            session.endTime = new Date(session.endTime);
          }
          session.operations = session.operations.map(op => ({
            ...op,
            timestamp: new Date(op.timestamp),
          }));

          // Skip if already in active sessions
          if (!this.activeSessions.has(session.id)) {
            sessions.push(session);
          }
        } catch (error) {
          console.warn(`Failed to load session from ${fileName}:`, error);
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get sessions by status
   */
  async getSessionsByStatus(status: RollbackSession['status']): Promise<RollbackSession[]> {
    const sessions = await this.getAllSessions();
    return sessions.filter(session => session.status === status);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Remove from disk
    try {
      const sessionPath = this.getSessionFilePath(sessionId);
      await fs.unlink(sessionPath);
    } catch (error) {
      // File might not exist
    }

    // Clean up session directory
    try {
      const sessionDir = this.getSessionDirectory(sessionId);
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    this.eventBus.emit('implementer:rollback:session:deleted', {
      sessionId,
    });
  }

  /**
   * Export session data
   */
  async exportSession(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    
    const exportData = {
      session,
      backups: await this.getSessionBackups(sessionId),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import session data
   */
  async importSession(sessionData: string): Promise<string> {
    const importData = JSON.parse(sessionData);

    if (!importData.session) {
      throw new ValidationError('Invalid session data: missing session object');
    }

    const session = importData.session as RollbackSession;
    
    // Generate new session ID to avoid conflicts
    const newSessionId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    session.id = newSessionId;
    session.status = 'active';
    session.startTime = new Date();

    // Save session
    await this.persistSession(session);

    return newSessionId;
  }

  /**
   * Create a snapshot of current file system state
   */
  async createSnapshot(
    sessionId: string,
    filePaths: string[]
  ): Promise<FileSystemSnapshot> {
    const session = await this.getSession(sessionId);
    this.validateSessionState(session, 'active');

    const operations: FileSystemOperation[] = [];
    let checksumData = '';

    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        const operation: FileSystemOperation = {
          id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'create',
          sourcePath: filePath,
          targetPath: filePath,
          content,
          options: {},
          status: 'completed',
          checksum: crypto.createHash('sha256').update(content).digest('hex'),
          timestamp: new Date(),
        };

        operations.push(operation);
        checksumData += operation.checksum!;
      } catch (error) {
        // Skip files that don't exist
        continue;
      }
    }

    const snapshot: FileSystemSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      operations,
      checksum: crypto.createHash('sha256').update(checksumData).digest('hex'),
      metadata: {
        sessionId,
        fileCount: filePaths.length,
      },
    };

    // Save snapshot to session directory
    const sessionDir = this.getSessionDirectory(sessionId);
    const snapshotPath = path.join(sessionDir, 'snapshots', `${snapshot.id}.json`);
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

    return snapshot;
  }

  /**
   * Restore from a snapshot
   */
  async restoreFromSnapshot(sessionId: string, snapshotId: string): Promise<void> {
    const sessionDir = this.getSessionDirectory(sessionId);
    const snapshotPath = path.join(sessionDir, 'snapshots', `${snapshotId}.json`);

    const snapshotData = await fs.readFile(snapshotPath, 'utf8');
    const snapshot = JSON.parse(snapshotData) as FileSystemSnapshot;

    // Restore files from snapshot
    for (const operation of snapshot.operations) {
      if (operation.type === 'create' && operation.content) {
        await fs.writeFile(operation.sourcePath, operation.content, 'utf8');
      }
    }

    this.eventBus.emit('implementer:rollback:snapshot:restored', {
      sessionId,
      snapshotId,
      filesRestored: snapshot.operations.length,
    });
  }

  /**
   * Get statistics about rollback sessions
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalOperations: number;
    oldestSession: Date | null;
    newestSession: Date | null;
    diskUsage: number;
  }> {
    const sessions = await this.getAllSessions();
    
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const totalOperations = sessions.reduce((sum, s) => sum + s.operations.length, 0);
    
    const dates = sessions.map(s => s.startTime.getTime());
    const oldestSession = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const newestSession = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    // Calculate disk usage
    let diskUsage = 0;
    try {
      const stat = await fs.stat(this.sessionsDirectory);
      diskUsage = stat.size;
    } catch {
      diskUsage = 0;
    }

    return {
      totalSessions,
      activeSessions,
      totalOperations,
      oldestSession,
      newestSession,
      diskUsage,
    };
  }

  /**
   * Initialize sessions directory
   */
  private async initializeSessionsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDirectory, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Execute a single rollback operation
   */
  private async executeRollbackOperation(operation: RollbackOperation): Promise<void> {
    const { type, targetPath, originalContent, newContent, backupPath } = operation;

    switch (type) {
      case 'create':
        // Remove created files
        if (await this.fileExists(targetPath)) {
          await fs.unlink(targetPath);
        }
        break;

      case 'modify':
        // Restore original content
        if (originalContent) {
          await fs.writeFile(targetPath, originalContent, 'utf8');
        }
        break;

      case 'delete':
        // Restore deleted files from backup
        if (backupPath && await this.fileExists(backupPath)) {
          const content = await fs.readFile(backupPath, 'utf8');
          await fs.writeFile(targetPath, content, 'utf8');
        }
        break;

      case 'move':
        // Move file back to original location
        if (await this.fileExists(targetPath)) {
          // File is already at target location (during rollback, this was the source)
          // So we don't need to do anything
        }
        break;

      default:
        throw new RollbackError(`Unknown rollback operation type: ${type}`, {
          operation: type,
          filePath: targetPath,
        });
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate session state
   */
  private validateSessionState(
    session: RollbackSession,
    expectedState: RollbackSession['status']
  ): void {
    if (session.status !== expectedState) {
      throw new InvalidSessionStateError(session.id, session.status, expectedState);
    }
  }

  /**
   * Get session directory path
   */
  private getSessionDirectory(sessionId: string): string {
    return path.join(this.sessionsDirectory, sessionId);
  }

  /**
   * Get session file path
   */
  private getSessionFilePath(sessionId: string): string {
    return path.join(this.sessionsDirectory, `${sessionId}.json`);
  }

  /**
   * Persist session to disk
   */
  private async persistSession(session: RollbackSession): Promise<void> {
    const sessionPath = this.getSessionFilePath(session.id);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf8');
  }

  /**
   * Clean up old sessions
   */
  private async cleanupOldSessions(): Promise<void> {
    const now = Date.now();
    const sessions = await this.getAllSessions();
    
    for (const session of sessions) {
      if (session.status === 'active') continue;
      
      const age = now - session.startTime.getTime();
      if (age > this.maxSessionAge) {
        await this.deleteSession(session.id);
      }
    }

    // Clean up backup files based on retention policy
    if (this.config.autoCleanup && this.config.backupRetention) {
      await this.cleanupBackups();
    }
  }

  /**
   * Clean up backups based on retention policy
   */
  private async cleanupBackups(): Promise<void> {
    // Implementation would clean up old backup files
    // This is a simplified version
  }

  /**
   * Clean up session backups
   */
  private async cleanupSessionBackups(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDirectory(sessionId);
    const backupDir = path.join(sessionDir, 'backups');
    
    try {
      await fs.rm(backupDir, { recursive: true, force: true });
    } catch {
      // Backup directory might not exist
    }
  }

  /**
   * Get session backups
   */
  private async getSessionBackups(sessionId: string): Promise<string[]> {
    const sessionDir = this.getSessionDirectory(sessionId);
    const backupDir = path.join(sessionDir, 'backups');
    
    try {
      const files = await fs.readdir(backupDir);
      return files.map(file => path.join(backupDir, file));
    } catch {
      return [];
    }
  }
}
