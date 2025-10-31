// Base database entity interface
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// Entity creation interface (without id and timestamps)
export interface BaseCreateEntity {
  // Empty interface for entities that can be created without additional fields
}

// Entity update interface (all fields optional)
export interface BaseUpdateEntity {
  updated_at?: Date;
}

// Pagination and filtering interfaces
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface FilteringOptions {
  search?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query options combining pagination and filtering
export interface QueryOptions extends PaginationOptions, FilteringOptions {}

// Common query result interface
export interface QueryResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
}

// Database operation result interfaces
export interface CreateResult<T> {
  data: T;
  affectedRows: number;
}

export interface UpdateResult<T> {
  data?: T;
  affectedRows: number;
}

export interface DeleteResult {
  affectedRows: number;
}

// Transaction interface
export interface TransactionClient {
  query<T>(config: { text: string; params?: any[] }): Promise<any>;
  release(): void;
}

// Model options for configuration
export interface ModelOptions {
  tableName: string;
  primaryKey?: string;
  timestamps?: boolean;
  softDelete?: boolean;
  createdAtField?: string;
  updatedAtField?: string;
  deletedAtField?: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Common field types
export type JsonValue = string | number | boolean | object | null;
export type DatabaseId = string;
export type Timestamp = Date;

// Status enums
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  DELETED = 'deleted',
  ARCHIVED = 'archived'
}

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  ERROR = 'error'
}

export enum AnalysisStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum RequestType {
  ANALYSIS = 'analysis',
  GENERATION = 'generation',
  REVIEW = 'review',
  OPTIMIZATION = 'optimization',
  OTHER = 'other'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error types
export class DatabaseError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = 'DATABASE_ERROR', details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error {
  public errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends DatabaseError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND');
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}