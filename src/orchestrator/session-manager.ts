/**
 * Session Manager
 * 
 * Manages user sessions for the orchestrator.
 * Handles session creation, lifecycle management, and persistence.
 */

import { Logger } from '../core/logger';
import { SessionState } from './types';

export class SessionManager {
  private readonly logger = new Logger('SessionManager');
  private readonly sessions = new Map<string, SessionState>();
  private readonly config: {
    enablePersistence: boolean;
    sessionTimeoutMs: number;
    maxConcurrentSessions: number;
  };

  constructor(config: {
    enablePersistence: boolean;
    sessionTimeoutMs: number;
    maxConcurrentSessions: number;
  }) {
    this.config = config;
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    this.logger.info('SessionManager initialized');
    
    if (this.config.enablePersistence) {
      await this.loadPersistedSessions();
    }
  }

  /**
   * Create a new session
   */
  async createSession(workspacePath: string = process.cwd(), userId?: string): Promise<string> {
    // Check concurrent session limit
    if (this.sessions.size >= this.config.maxConcurrentSessions) {
      // Clean up expired sessions first
      this.cleanupExpiredSessions();
      
      // Check again after cleanup
      if (this.sessions.size >= this.config.maxConcurrentSessions) {
        throw new Error(`Maximum concurrent sessions limit reached (${this.config.maxConcurrentSessions})`);
      }
    }

    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: SessionState = {
      sessionId,
      status: 'active',
      activeWorkflows: [],
      metadata: {
        createdAt: now,
        lastActivityAt: now,
        userId,
        workspacePath
      }
    };

    this.sessions.set(sessionId, session);
    this.logger.info(`Created session: ${sessionId}`);

    if (this.config.enablePersistence) {
      await this.persistSession(session);
    }

    return sessionId;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | null {
    const session = this.sessions.get(sessionId);
    
    if (session && session.status === 'expired') {
      this.logger.warn(`Accessing expired session: ${sessionId}`);
      return null;
    }

    return session || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    const activeSessions: SessionState[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.status === 'active' && !this.isSessionExpired(session)) {
        activeSessions.push(session);
      }
    }
    
    return activeSessions;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, newStatus?: 'active' | 'idle'): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.metadata.lastActivityAt = new Date();
    
    if (newStatus) {
      session.status = newStatus;
    }

    this.sessions.set(sessionId, session);
    
    if (this.config.enablePersistence) {
      await this.persistSession(session);
    }

    this.logger.debug(`Updated session activity: ${sessionId}`);
  }

  /**
   * Add workflow to session
   */
  addWorkflowToSession(sessionId: string, workflowId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.activeWorkflows.includes(workflowId)) {
      session.activeWorkflows.push(workflowId);
      this.sessions.set(sessionId, session);
      
      if (this.config.enablePersistence) {
        this.persistSession(session);
      }
      
      this.logger.debug(`Added workflow ${workflowId} to session ${sessionId}`);
    }
  }

  /**
   * Remove workflow from session
   */
  removeWorkflowFromSession(sessionId: string, workflowId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    const index = session.activeWorkflows.indexOf(workflowId);
    if (index >= 0) {
      session.activeWorkflows.splice(index, 1);
      this.sessions.set(sessionId, session);
      
      if (this.config.enablePersistence) {
        this.persistSession(session);
      }
      
      this.logger.debug(`Removed workflow ${workflowId} from session ${sessionId}`);
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'terminated';
    session.activeWorkflows = [];
    
    this.sessions.set(sessionId, session);
    
    if (this.config.enablePersistence) {
      await this.persistSession(session);
    }
    
    this.logger.info(`Terminated session: ${sessionId}`);
  }

  /**
   * Expire session
   */
  async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    session.status = 'expired';
    this.sessions.set(sessionId, session);
    
    if (this.config.enablePersistence) {
      await this.persistSession(session);
    }
    
    this.logger.info(`Expired session: ${sessionId}`);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        session.status = 'expired';
        cleanedCount++;
        this.logger.debug(`Cleaned up expired session: ${sessionId}`);
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
    
    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    idle: number;
    expired: number;
    terminated: number;
    totalWorkflows: number;
  } {
    let active = 0, idle = 0, expired = 0, terminated = 0;
    let totalWorkflows = 0;
    
    for (const session of this.sessions.values()) {
      switch (session.status) {
        case 'active':
          active++;
          break;
        case 'idle':
          idle++;
          break;
        case 'expired':
          expired++;
          break;
        case 'terminated':
          terminated++;
          break;
      }
      
      totalWorkflows += session.activeWorkflows.length;
    }
    
    return {
      total: this.sessions.size,
      active,
      idle,
      expired,
      terminated,
      totalWorkflows
    };
  }

  /**
   * Get session by user ID
   */
  getSessionsByUser(userId: string): SessionState[] {
    return Array.from(this.sessions.values()).filter(
      session => session.metadata.userId === userId && session.status !== 'terminated'
    );
  }

  /**
   * Get workspace sessions
   */
  getSessionsByWorkspace(workspacePath: string): SessionState[] {
    return Array.from(this.sessions.values()).filter(
      session => session.metadata.workspacePath === workspacePath && session.status !== 'terminated'
    );
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: SessionState): boolean {
    if (session.status === 'terminated' || session.status === 'expired') {
      return true;
    }
    
    const now = Date.now();
    const lastActivity = session.metadata.lastActivityAt.getTime();
    const timeSinceActivity = now - lastActivity;
    
    return timeSinceActivity > this.config.sessionTimeoutMs;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `session_${timestamp}_${randomStr}`;
  }

  /**
   * Persist session to storage (placeholder implementation)
   */
  private async persistSession(session: SessionState): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }
    
    try {
      // Placeholder for persistence implementation
      // In a real implementation, this would save to a database or file system
      this.logger.debug(`Persisted session: ${session.sessionId}`);
    } catch (error) {
      this.logger.warn(`Failed to persist session ${session.sessionId}`, error);
    }
  }

  /**
   * Load persisted sessions (placeholder implementation)
   */
  private async loadPersistedSessions(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }
    
    try {
      // Placeholder for loading persisted sessions
      // In a real implementation, this would load from a database or file system
      this.logger.debug('Loaded persisted sessions');
    } catch (error) {
      this.logger.warn('Failed to load persisted sessions', error);
    }
  }

  /**
   * Validate session
   */
  validateSession(sessionId: string): { valid: boolean; reason?: string } {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }
    
    if (session.status === 'terminated') {
      return { valid: false, reason: 'Session is terminated' };
    }
    
    if (session.status === 'expired') {
      return { valid: false, reason: 'Session is expired' };
    }
    
    if (this.isSessionExpired(session)) {
      return { valid: false, reason: 'Session has expired due to inactivity' };
    }
    
    return { valid: true };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up SessionManager');
    
    // Clean up all sessions
    this.sessions.clear();
    
    this.logger.info('SessionManager cleanup complete');
  }
}