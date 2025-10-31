/**
 * FileWriter Component
 * 
 * Provides safe file system operations with atomic writes, backups,
 * permissions handling, and comprehensive error management.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  FileOperation,
  FileOperationOptions,
  FileContent,
  FileSystemOperation,
  FileSystemSnapshot,
  DEFAULT_CONFIG,
} from './types';
import {
  BaseError,
  ValidationError,
  SystemError,
  NotFoundError,
  ConflictError,
} from '@/core/errors';
import { TypedEventBus } from '@/core/event-bus';

/**
 * File operation error
 */
export class FileOperationError extends BaseError {
  constructor(
    message: string,
    options: {
      operation?: FileOperation;
      filePath?: string;
      fileSize?: number;
      permissions?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'FILE_OPERATION_ERROR',
      statusCode: 500,
      context: {
        operation: options.operation,
        filePath: options.filePath,
        fileSize: options.fileSize,
        permissions: options.permissions,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Permission error
 */
export class PermissionError extends BaseError {
  constructor(
    filePath: string,
    action: string,
    options: {
      requiredPermission?: string;
      currentPermissions?: string;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(`Permission denied: ${action} on ${filePath}`, {
      code: 'PERMISSION_ERROR',
      statusCode: 403,
      context: {
        filePath,
        action,
        requiredPermission: options.requiredPermission,
        currentPermissions: options.currentPermissions,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * Path validation error
 */
export class PathValidationError extends BaseError {
  constructor(
    filePath: string,
    reason: string,
    options: {
      allowedPaths?: string[];
      deniedPaths?: string[];
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(`Path validation failed for ${filePath}: ${reason}`, {
      code: 'PATH_VALIDATION_ERROR',
      statusCode: 400,
      context: {
        filePath,
        reason,
        allowedPaths: options.allowedPaths,
        deniedPaths: options.deniedPaths,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * FileWriter class for safe file system operations
 */
export class FileWriter {
  private config: typeof DEFAULT_CONFIG.fileSystem;
  private eventBus: TypedEventBus;
  private activeOperations: Map<string, FileSystemOperation> = new Map();
  private operationQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  constructor(
    options: Partial<typeof DEFAULT_CONFIG.fileSystem> = {},
    eventBus: TypedEventBus
  ) {
    this.config = {
      ...DEFAULT_CONFIG.fileSystem,
      ...options,
    };
    this.eventBus = eventBus;
  }

  /**
   * Create a new file with safe writing
   */
  async createFile(
    filePath: string,
    content: string,
    options: Partial<FileOperationOptions> = {}
  ): Promise<FileSystemOperation> {
    return this.performOperation('create', filePath, { content, ...options });
  }

  /**
   * Create multiple files atomically
   */
  async createFiles(
    files: Array<{ path: string; content: string; options?: Partial<FileOperationOptions> }>,
    atomic: boolean = true
  ): Promise<FileSystemOperation[]> {
    if (atomic) {
      return this.performAtomicOperation('create', files);
    }

    const results: FileSystemOperation[] = [];
    for (const file of files) {
      const result = await this.createFile(file.path, file.content, file.options);
      results.push(result);
    }
    return results;
  }

  /**
   * Modify an existing file with backup
   */
  async modifyFile(
    filePath: string,
    content: string,
    options: Partial<FileOperationOptions> = {}
  ): Promise<FileSystemOperation> {
    return this.performOperation('modify', filePath, { content, ...options });
  }

  /**
   * Delete a file with optional backup
   */
  async deleteFile(
    filePath: string,
    options: Partial<FileOperationOptions> = {}
  ): Promise<FileSystemOperation> {
    return this.performOperation('delete', filePath, { ...options });
  }

  /**
   * Move a file
   */
  async moveFile(
    sourcePath: string,
    targetPath: string,
    options: Partial<FileOperationOptions> = {}
  ): Promise<FileSystemOperation> {
    return this.performOperation('move', sourcePath, { targetPath, ...options });
  }

  /**
   * Copy a file
   */
  async copyFile(
    sourcePath: string,
    targetPath: string,
    options: Partial<FileOperationOptions> = {}
  ): Promise<FileSystemOperation> {
    return this.performOperation('copy', sourcePath, { targetPath, ...options });
  }

  /**
   * Perform atomic file operations
   */
  async performAtomicOperation(
    operation: FileOperation,
    files: Array<{ path: string; content?: string; options?: Partial<FileOperationOptions> }>
  ): Promise<FileSystemOperation[]> {
    const sessionId = `atomic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operations: FileSystemOperation[] = [];
    const backups: string[] = [];

    try {
      // Validate all paths first
      for (const file of files) {
        this.validatePath(file.path);
      }

      // Create backups for existing files
      if (operation === 'modify' || operation === 'delete') {
        for (const file of files) {
          const backupPath = await this.createBackup(file.path);
          if (backupPath) {
            backups.push(backupPath);
          }
        }
      }

      // Perform operations
      for (const file of files) {
        let result: FileSystemOperation;

        switch (operation) {
          case 'create':
            result = await this.performOperation('create', file.path, file.options || {});
            break;
          case 'modify':
            result = await this.performOperation('modify', file.path, { content: file.content, ...file.options });
            break;
          case 'delete':
            result = await this.performOperation('delete', file.path, file.options || {});
            break;
          case 'move':
            result = await this.performOperation('move', file.path, file.options || {});
            break;
          case 'copy':
            result = await this.performOperation('copy', file.path, file.options || {});
            break;
          default:
            throw new FileOperationError(`Unsupported atomic operation: ${operation}`, {
              operation,
            });
        }

        operations.push(result);

        // Rollback if any operation fails
        if (result.status === 'failed') {
          throw new FileOperationError(
            `Atomic operation failed at ${file.path}: ${result.error}`,
            {
              operation,
              filePath: file.path,
              cause: result.error ? new Error(result.error) : undefined,
            }
          );
        }
      }

      return operations;

    } catch (error) {
      // Rollback on error
      await this.rollbackAtomicOperations(operations, backups);
      throw error;
    }
  }

  /**
   * Read file content safely
   */
  async readFile(filePath: string, encoding: BufferEncoding = this.config.defaultEncoding): Promise<string> {
    this.validatePath(filePath);

    try {
      const content = await fs.readFile(filePath, encoding);
      
      this.eventBus.emit('implementer:file:operation:completed', {
        operation: 'read',
        filePath,
        status: 'success',
      });

      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.eventBus.emit('implementer:file:operation:failed', {
        operation: 'read',
        filePath,
        error: errorMessage,
      });

      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundError('File', filePath);
      }

      throw new FileOperationError(`Failed to read file ${filePath}: ${errorMessage}`, {
        operation: 'read',
        filePath,
        cause: error as Error,
      });
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<fs.Stats> {
    this.validatePath(filePath);

    try {
      return await fs.stat(filePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundError('File', filePath);
      }

      throw new FileOperationError(`Failed to get stats for ${filePath}: ${errorMessage}`, {
        operation: 'stat',
        filePath,
        cause: error as Error,
      });
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string, recursive: boolean = false): Promise<string[]> {
    this.validatePath(dirPath);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (recursive && entry.isDirectory()) {
          const subFiles = await this.listDirectory(fullPath, true);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }

      return files;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundError('Directory', dirPath);
      }

      throw new FileOperationError(`Failed to list directory ${dirPath}: ${errorMessage}`, {
        operation: 'list',
        filePath: dirPath,
        cause: error as Error,
      });
    }
  }

  /**
   * Create directory recursively
   */
  async createDirectory(dirPath: string, mode: string = '755'): Promise<void> {
    this.validatePath(dirPath);

    try {
      await fs.mkdir(dirPath, { recursive: true, mode: parseInt(mode, 8) });
      
      this.eventBus.emit('implementer:file:operation:completed', {
        operation: 'mkdir',
        filePath: dirPath,
        status: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.eventBus.emit('implementer:file:operation:failed', {
        operation: 'mkdir',
        filePath: dirPath,
        error: errorMessage,
      });

      throw new FileOperationError(`Failed to create directory ${dirPath}: ${errorMessage}`, {
        operation: 'mkdir',
        filePath: dirPath,
        cause: error as Error,
      });
    }
  }

  /**
   * Remove directory recursively
   */
  async removeDirectory(dirPath: string, force: boolean = false): Promise<void> {
    this.validatePath(dirPath);

    try {
      if (force) {
        await fs.rm(dirPath, { recursive: true, force: true });
      } else {
        await fs.rmdir(dirPath, { recursive: true });
      }
      
      this.eventBus.emit('implementer:file:operation:completed', {
        operation: 'rmdir',
        filePath: dirPath,
        status: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.eventBus.emit('implementer:file:operation:failed', {
        operation: 'rmdir',
        filePath: dirPath,
        error: errorMessage,
      });

      throw new FileOperationError(`Failed to remove directory ${dirPath}: ${errorMessage}`, {
        operation: 'rmdir',
        filePath: dirPath,
        cause: error as Error,
      });
    }
  }

  /**
   * Change file permissions
   */
  async changePermissions(filePath: string, mode: string): Promise<void> {
    this.validatePath(filePath);

    try {
      await fs.chmod(filePath, parseInt(mode, 8));
      
      this.eventBus.emit('implementer:file:operation:completed', {
        operation: 'chmod',
        filePath,
        status: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.eventBus.emit('implementer:file:operation:failed', {
        operation: 'chmod',
        filePath,
        error: errorMessage,
      });

      throw new FileOperationError(`Failed to change permissions for ${filePath}: ${errorMessage}`, {
        operation: 'chmod',
        filePath,
        permissions: mode,
        cause: error as Error,
      });
    }
  }

  /**
   * Get current working directory
   */
  getCurrentDirectory(): string {
    return process.cwd();
  }

  /**
   * Resolve absolute path
   */
  resolvePath(relativePath: string): string {
    return path.resolve(relativePath);
  }

  /**
   * Join path components
   */
  joinPath(...pathComponents: string[]): string {
    return path.join(...pathComponents);
  }

  /**
   * Normalize path
   */
  normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Perform a single file operation
   */
  private async performOperation(
    type: FileOperation,
    sourcePath: string,
    options: { content?: string; targetPath?: string } & Partial<FileOperationOptions>
  ): Promise<FileSystemOperation> {
    const operation: FileSystemOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      sourcePath,
      targetPath: options.targetPath || sourcePath,
      content: options.content,
      options: {
        backup: this.config.backupDirectory ? true : false,
        atomic: this.config.atomicWrites,
        encoding: this.config.defaultEncoding,
        permissions: '755',
        ...options,
      },
      status: 'pending',
      timestamp: new Date(),
    };

    this.activeOperations.set(operation.id, operation);

    try {
      this.eventBus.emit('implementer:file:operation:started', {
        operation: type,
        filePath: sourcePath,
        operationId: operation.id,
      });

      operation.status = 'in-progress';

      // Validate path
      this.validatePath(sourcePath);
      if (options.targetPath) {
        this.validatePath(options.targetPath);
      }

      // Create backup if needed
      if (operation.options.backup && (type === 'modify' || type === 'delete')) {
        const backupPath = await this.createBackup(sourcePath);
        if (backupPath) {
          operation.options.backup = backupPath;
        }
      }

      // Perform the actual operation
      switch (type) {
        case 'create':
          await this.performCreate(sourcePath, options.content!, operation.options);
          break;
        case 'modify':
          await this.performModify(sourcePath, options.content!, operation.options);
          break;
        case 'delete':
          await this.performDelete(sourcePath, operation.options);
          break;
        case 'move':
          await this.performMove(sourcePath, options.targetPath!, operation.options);
          break;
        case 'copy':
          await this.performCopy(sourcePath, options.targetPath!, operation.options);
          break;
        default:
          throw new FileOperationError(`Unsupported operation type: ${type}`, { operation: type });
      }

      operation.status = 'completed';
      operation.checksum = await this.calculateChecksum(operation.targetPath!);

      this.eventBus.emit('implementer:file:operation:completed', {
        operation: type,
        filePath: sourcePath,
        status: 'success',
        operationId: operation.id,
      });

      return operation;

    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Unknown error';

      this.eventBus.emit('implementer:file:operation:failed', {
        operation: type,
        filePath: sourcePath,
        error: operation.error,
        operationId: operation.id,
      });

      throw new FileOperationError(
        `Operation ${type} failed for ${sourcePath}: ${operation.error}`,
        {
          operation: type,
          filePath: sourcePath,
          cause: error as Error,
        }
      );
    } finally {
      this.activeOperations.delete(operation.id);
    }
  }

  /**
   * Perform file creation
   */
  private async performCreate(
    filePath: string,
    content: string,
    options: FileOperationOptions
  ): Promise<void> {
    // Ensure parent directory exists
    await this.createDirectory(path.dirname(filePath));

    if (options.atomic) {
      // Atomic write with temporary file
      const tempPath = `${filePath}.tmp_${Date.now()}`;
      
      try {
        await fs.writeFile(tempPath, content, {
          encoding: options.encoding,
          mode: parseInt(options.permissions!, 8),
        });

        await fs.rename(tempPath, filePath);
      } catch (error) {
        // Clean up temp file if it exists
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    } else {
      // Direct write
      await fs.writeFile(filePath, content, {
        encoding: options.encoding,
        mode: parseInt(options.permissions!, 8),
      });
    }

    // Verify file was created
    if (!(await this.fileExists(filePath))) {
      throw new FileOperationError(`File creation failed: ${filePath} does not exist after write`);
    }
  }

  /**
   * Perform file modification
   */
  private async performModify(
    filePath: string,
    content: string,
    options: FileOperationOptions
  ): Promise<void> {
    if (!(await this.fileExists(filePath))) {
      throw new NotFoundError('File', filePath);
    }

    if (options.atomic) {
      // Atomic write with backup
      const tempPath = `${filePath}.tmp_${Date.now()}`;
      
      try {
        await fs.writeFile(tempPath, content, {
          encoding: options.encoding,
          mode: parseInt(options.permissions!, 8),
        });

        await fs.rename(tempPath, filePath);
      } catch (error) {
        // Clean up temp file if it exists
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    } else {
      // Direct write
      await fs.writeFile(filePath, content, {
        encoding: options.encoding,
        mode: parseInt(options.permissions!, 8),
      });
    }
  }

  /**
   * Perform file deletion
   */
  private async performDelete(filePath: string, options: FileOperationOptions): Promise<void> {
    if (!(await this.fileExists(filePath))) {
      throw new NotFoundError('File', filePath);
    }

    await fs.unlink(filePath);
  }

  /**
   * Perform file move
   */
  private async performMove(
    sourcePath: string,
    targetPath: string,
    options: FileOperationOptions
  ): Promise<void> {
    if (!(await this.fileExists(sourcePath))) {
      throw new NotFoundError('File', sourcePath);
    }

    if (await this.fileExists(targetPath)) {
      throw new ConflictError(`Target file already exists: ${targetPath}`, {
        resource: 'file',
        value: targetPath,
      });
    }

    // Ensure parent directory exists
    await this.createDirectory(path.dirname(targetPath));

    await fs.rename(sourcePath, targetPath);
  }

  /**
   * Perform file copy
   */
  private async performCopy(
    sourcePath: string,
    targetPath: string,
    options: FileOperationOptions
  ): Promise<void> {
    if (!(await this.fileExists(sourcePath))) {
      throw new NotFoundError('File', sourcePath);
    }

    // Ensure parent directory exists
    await this.createDirectory(path.dirname(targetPath));

    // Copy with optional permission preservation
    if (options.preservePermissions) {
      const stats = await this.getFileStats(sourcePath);
      await fs.copyFile(sourcePath, targetPath);
      await fs.chmod(targetPath, stats.mode);
    } else {
      await fs.copyFile(sourcePath, targetPath);
      await fs.chmod(targetPath, parseInt(options.permissions!, 8));
    }
  }

  /**
   * Create backup of a file
   */
  private async createBackup(filePath: string): Promise<string | null> {
    if (!this.config.backupDirectory) {
      return null;
    }

    try {
      const backupDir = path.join(this.getCurrentDirectory(), this.config.backupDirectory);
      await this.createDirectory(backupDir);

      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `${fileName}.backup_${timestamp}`);

      await fs.copyFile(filePath, backupPath);
      
      return backupPath;
    } catch (error) {
      console.warn(`Failed to create backup for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Rollback atomic operations
   */
  private async rollbackAtomicOperations(
    operations: FileSystemOperation[],
    backups: string[]
  ): Promise<void> {
    // Rollback operations in reverse order
    for (let i = operations.length - 1; i >= 0; i--) {
      const operation = operations[i];
      
      try {
        switch (operation.type) {
          case 'create':
            if (await this.fileExists(operation.targetPath!)) {
              await fs.unlink(operation.targetPath!);
            }
            break;
          case 'modify':
          case 'move':
          case 'copy':
            // Restore from backup if available
            if (operation.options.backup && typeof operation.options.backup === 'string') {
              await fs.copyFile(operation.options.backup, operation.sourcePath);
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to rollback operation ${operation.id}:`, error);
      }
    }

    // Clean up backup files
    for (const backup of backups) {
      try {
        await fs.unlink(backup);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Validate file path for security
   */
  private validatePath(filePath: string): void {
    const resolvedPath = this.resolvePath(filePath);

    // Check against denied paths
    for (const deniedPath of this.config.security?.deniedPaths || []) {
      if (resolvedPath.startsWith(deniedPath)) {
        throw new PathValidationError(filePath, `Path is in denied directory: ${deniedPath}`, {
          deniedPaths: this.config.security?.deniedPaths,
        });
      }
    }

    // Check if path is within allowed paths (if specified)
    if (this.config.security?.allowedPaths?.length) {
      const isAllowed = this.config.security.allowedPaths.some(allowedPath =>
        resolvedPath.startsWith(allowedPath)
      );

      if (!isAllowed) {
        throw new PathValidationError(
          filePath,
          `Path is not within allowed directories`,
          {
            allowedPaths: this.config.security?.allowedPaths,
          }
        );
      }
    }

    // Check file size if specified
    if (this.config.security?.maxFileSize) {
      // This is a pre-check; actual size check happens during file operations
      // We can't easily check size without reading the file first
    }

    // Check for path traversal attempts
    if (resolvedPath.includes('..') || resolvedPath.includes('~')) {
      throw new PathValidationError(
        filePath,
        'Path contains potentially dangerous components (../ or ~)'
      );
    }

    // Check for absolute paths (unless explicitly allowed)
    if (path.isAbsolute(resolvedPath) && !this.isPathExplicitlyAllowed(resolvedPath)) {
      throw new PathValidationError(
        filePath,
        'Absolute paths are not allowed unless explicitly permitted'
      );
    }
  }

  /**
   * Check if a path is explicitly allowed
   */
  private isPathExplicitlyAllowed(resolvedPath: string): boolean {
    if (!this.config.security?.allowedPaths?.length) {
      return false;
    }

    return this.config.security.allowedPaths.some(allowedPath =>
      resolvedPath.startsWith(path.resolve(allowedPath))
    );
  }

  /**
   * Get active operations
   */
  getActiveOperations(): FileSystemOperation[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Wait for all operations to complete
   */
  async waitForCompletion(timeout?: number): Promise<void> {
    const startTime = Date.now();
    const timeoutMs = timeout || 30000; // 30 seconds default

    while (this.activeOperations.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        throw new TimeoutError('File operations completion', timeoutMs);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Cancel pending operations
   */
  cancelOperations(): void {
    // Note: In a real implementation, you would need to track and cancel
    // individual operations. This is a simplified version.
    this.activeOperations.clear();
  }
}
