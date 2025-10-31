import { BaseEntity, BaseCreateEntity, BaseUpdateEntity, SessionStatus, Priority } from '@/database/types';

// User entity
export interface User extends BaseEntity {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login: Date | null;
  preferences: Record<string, any> | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUser extends BaseCreateEntity {
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  password_hash: string;
  role?: string;
}

export interface UpdateUser extends BaseUpdateEntity {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active?: boolean;
  preferences?: Record<string, any>;
  role?: string;
}

// Session entity
export interface Session extends BaseEntity {
  id: string;
  user_id: string | null;
  session_token: string;
  refresh_token: string | null;
  status: SessionStatus;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, any> | null;
  metadata: Record<string, any> | null;
  expires_at: Date | null;
  last_accessed: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSession extends BaseCreateEntity {
  user_id?: string;
  session_token: string;
  refresh_token?: string;
  status?: SessionStatus;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, any>;
  metadata?: Record<string, any>;
  expires_at?: Date;
}

export interface UpdateSession extends BaseUpdateEntity {
  session_token?: string;
  refresh_token?: string;
  status?: SessionStatus;
  user_agent?: string;
  device_info?: Record<string, any>;
  metadata?: Record<string, any>;
  expires_at?: Date;
  last_accessed?: Date;
}

// ParsedRequest entity
export interface ParsedRequest extends BaseEntity {
  id: string;
  session_id: string;
  request_type: string;
  original_text: string;
  parsed_data: Record<string, any> | null;
  parameters: Record<string, any> | null;
  context: Record<string, any> | null;
  priority: Priority;
  status: string;
  processed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateParsedRequest extends BaseCreateEntity {
  session_id: string;
  request_type: string;
  original_text: string;
  parsed_data?: Record<string, any>;
  parameters?: Record<string, any>;
  context?: Record<string, any>;
  priority?: Priority;
  status?: string;
}

export interface UpdateParsedRequest extends BaseUpdateEntity {
  parsed_data?: Record<string, any>;
  parameters?: Record<string, any>;
  context?: Record<string, any>;
  priority?: Priority;
  status?: string;
  processed_at?: Date;
  error_message?: string;
}

// ProjectAnalysis entity
export interface ProjectAnalysis extends BaseEntity {
  id: string;
  parsed_request_id: string;
  project_path: string | null;
  project_name: string | null;
  project_type: string | null;
  analysis_type: string;
  results: Record<string, any> | null;
  recommendations: Record<string, any> | null;
  file_count: number | null;
  line_count: number | null;
  complexity_score: number | null;
  quality_metrics: Record<string, any> | null;
  issues_found: number | null;
  warnings_count: number | null;
  status: string;
  started_at: Date | null;
  completed_at: Date | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectAnalysis extends BaseCreateEntity {
  parsed_request_id: string;
  project_path?: string;
  project_name?: string;
  project_type?: string;
  analysis_type: string;
  results?: Record<string, any>;
  recommendations?: Record<string, any>;
  file_count?: number;
  line_count?: number;
  complexity_score?: number;
  quality_metrics?: Record<string, any>;
  issues_found?: number;
  warnings_count?: number;
  status?: string;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
}

export interface UpdateProjectAnalysis extends BaseUpdateEntity {
  project_path?: string;
  project_name?: string;
  project_type?: string;
  results?: Record<string, any>;
  recommendations?: Record<string, any>;
  file_count?: number;
  line_count?: number;
  complexity_score?: number;
  quality_metrics?: Record<string, any>;
  issues_found?: number;
  warnings_count?: number;
  status?: string;
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
  error_message?: string;
}

// Task entity
export interface Task extends BaseEntity {
  id: string;
  parsed_request_id: string;
  task_type: string;
  title: string;
  description: string | null;
  parameters: Record<string, any> | null;
  status: string;
  priority: Priority;
  assigned_to: string | null;
  estimated_duration: number | null;
  actual_duration: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  due_date: Date | null;
  dependencies: string[] | null;
  results: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTask extends BaseCreateEntity {
  parsed_request_id: string;
  task_type: string;
  title: string;
  description?: string;
  parameters?: Record<string, any>;
  status?: string;
  priority?: Priority;
  assigned_to?: string;
  estimated_duration?: number;
  due_date?: Date;
  dependencies?: string[];
  max_retries?: number;
}

export interface UpdateTask extends BaseUpdateEntity {
  title?: string;
  description?: string;
  parameters?: Record<string, any>;
  status?: string;
  priority?: Priority;
  assigned_to?: string;
  estimated_duration?: number;
  actual_duration?: number;
  started_at?: Date;
  completed_at?: Date;
  due_date?: Date;
  dependencies?: string[];
  results?: Record<string, any>;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
}

// CodeFile entity
export interface CodeFile extends BaseEntity {
  id: string;
  project_analysis_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  line_count: number | null;
  language: string | null;
  content_hash: string | null;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCodeFile extends BaseCreateEntity {
  project_analysis_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  line_count?: number;
  language?: string;
  content_hash?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCodeFile extends BaseUpdateEntity {
  file_size?: number;
  line_count?: number;
  content_hash?: string;
  content?: string;
  metadata?: Record<string, any>;
}

// Configuration entity
export interface Configuration extends BaseEntity {
  id: string;
  key: string;
  value: Record<string, any> | null;
  description: string | null;
  category: string | null;
  is_public: boolean;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConfiguration extends BaseCreateEntity {
  key: string;
  value?: Record<string, any>;
  description?: string;
  category?: string;
  is_public?: boolean;
  is_system?: boolean;
}

export interface UpdateConfiguration extends BaseUpdateEntity {
  value?: Record<string, any>;
  description?: string;
  category?: string;
  is_public?: boolean;
  is_system?: boolean;
}

// AuditLog entity
export interface AuditLog extends BaseEntity {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  user_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface CreateAuditLog extends BaseCreateEntity {
  entity_type: string;
  entity_id?: string;
  action: string;
  user_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// API key entity for integrations
export interface ApiKey extends BaseEntity {
  id: string;
  user_id: string | null;
  key_hash: string;
  key_name: string;
  provider: string | null;
  permissions: string[] | null;
  last_used: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApiKey extends BaseCreateEntity {
  user_id?: string;
  key_hash: string;
  key_name: string;
  provider?: string;
  permissions?: string[];
  expires_at?: Date;
  is_active?: boolean;
}

export interface UpdateApiKey extends BaseUpdateEntity {
  key_name?: string;
  provider?: string;
  permissions?: string[];
  last_used?: Date;
  expires_at?: Date;
  is_active?: boolean;
}

// Entity type mapping for dynamic queries
export type EntityType = 
  | 'user' 
  | 'session' 
  | 'parsed_request' 
  | 'project_analysis' 
  | 'task' 
  | 'code_file' 
  | 'configuration' 
  | 'audit_log' 
  | 'api_key';

export interface EntityCreateMap {
  user: CreateUser;
  session: CreateSession;
  parsed_request: CreateParsedRequest;
  project_analysis: CreateProjectAnalysis;
  task: CreateTask;
  code_file: CreateCodeFile;
  configuration: CreateConfiguration;
  audit_log: CreateAuditLog;
  api_key: CreateApiKey;
}

export interface EntityUpdateMap {
  user: UpdateUser;
  session: UpdateSession;
  parsed_request: UpdateParsedRequest;
  project_analysis: UpdateProjectAnalysis;
  task: UpdateTask;
  code_file: UpdateCodeFile;
  configuration: UpdateConfiguration;
  api_key: UpdateApiKey;
}

export interface EntityMap {
  user: User;
  session: Session;
  parsed_request: ParsedRequest;
  project_analysis: ProjectAnalysis;
  task: Task;
  code_file: CodeFile;
  configuration: Configuration;
  audit_log: AuditLog;
  api_key: ApiKey;
}