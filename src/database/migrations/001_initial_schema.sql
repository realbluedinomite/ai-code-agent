-- =============================================================================
-- AI Code Agent System - Initial Database Schema
-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Creates the initial database schema for the AI Code Agent system
-- Created: 2025-10-31
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLE: sessions
-- Description: Tracks user sessions and session metadata
-- =============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(512) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- =============================================================================
-- TABLE: parsed_requests
-- Description: Stores parsed user requests and their metadata
-- =============================================================================
CREATE TABLE parsed_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    original_request TEXT NOT NULL,
    parsed_intent VARCHAR(100),
    parsed_parameters JSONB DEFAULT '{}'::jsonb,
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    request_type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for parsed_requests
CREATE INDEX idx_parsed_requests_session_id ON parsed_requests(session_id);
CREATE INDEX idx_parsed_requests_status ON parsed_requests(status);
CREATE INDEX idx_parsed_requests_request_type ON parsed_requests(request_type);
CREATE INDEX idx_parsed_requests_priority ON parsed_requests(priority DESC);
CREATE INDEX idx_parsed_requests_created_at ON parsed_requests(created_at);

-- =============================================================================
-- TABLE: project_analyses
-- Description: Stores project analysis results and metadata
-- =============================================================================
CREATE TABLE project_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parsed_request_id UUID REFERENCES parsed_requests(id) ON DELETE SET NULL,
    project_path TEXT NOT NULL,
    project_type VARCHAR(100),
    analysis_type VARCHAR(100) NOT NULL,
    analysis_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    file_count INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,
    complexity_score DECIMAL(10,2),
    dependencies JSONB DEFAULT '[]'::jsonb,
    file_structure JSONB DEFAULT '{}'::jsonb,
    code_metrics JSONB DEFAULT '{}'::jsonb,
    issues_found JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for project_analyses
CREATE INDEX idx_project_analyses_session_id ON project_analyses(session_id);
CREATE INDEX idx_project_analyses_parsed_request_id ON project_analyses(parsed_request_id);
CREATE INDEX idx_project_analyses_project_path ON project_analyses(project_path);
CREATE INDEX idx_project_analyses_analysis_type ON project_analyses(analysis_type);
CREATE INDEX idx_project_analyses_status ON project_analyses(analysis_status);
CREATE INDEX idx_project_analyses_completed_at ON project_analyses(completed_at);

-- =============================================================================
-- TABLE: execution_plans
-- Description: Stores execution plans generated for tasks
-- =============================================================================
CREATE TABLE execution_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parsed_request_id UUID REFERENCES parsed_requests(id) ON DELETE SET NULL,
    project_analysis_id UUID REFERENCES project_analyses(id) ON DELETE SET NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_description TEXT,
    plan_type VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'failed', 'cancelled')),
    estimated_duration_minutes INTEGER,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    resources_required JSONB DEFAULT '{}'::jsonb,
    rollback_plan JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for execution_plans
CREATE INDEX idx_execution_plans_session_id ON execution_plans(session_id);
CREATE INDEX idx_execution_plans_parsed_request_id ON execution_plans(parsed_request_id);
CREATE INDEX idx_execution_plans_project_analysis_id ON execution_plans(project_analysis_id);
CREATE INDEX idx_execution_plans_status ON execution_plans(status);
CREATE INDEX idx_execution_plans_plan_type ON execution_plans(plan_type);
CREATE INDEX idx_execution_plans_priority ON execution_plans(priority DESC);
CREATE INDEX idx_execution_plans_created_at ON execution_plans(created_at);

-- =============================================================================
-- TABLE: implementation_results
-- Description: Stores results from code implementation tasks
-- =============================================================================
CREATE TABLE implementation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_plan_id UUID NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    step_id VARCHAR(100),
    implementation_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (implementation_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    files_modified JSONB DEFAULT '[]'::jsonb,
    files_created JSONB DEFAULT '[]'::jsonb,
    files_deleted JSONB DEFAULT '[]'::jsonb,
    changes_summary TEXT,
    code_changes JSONB DEFAULT '[]'::jsonb,
    test_results JSONB DEFAULT '{}'::jsonb,
    quality_metrics JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    warnings JSONB DEFAULT '[]'::jsonb,
    rollback_data JSONB DEFAULT '{}'::jsonb,
    verified BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for implementation_results
CREATE INDEX idx_implementation_results_execution_plan_id ON implementation_results(execution_plan_id);
CREATE INDEX idx_implementation_results_session_id ON implementation_results(session_id);
CREATE INDEX idx_implementation_results_status ON implementation_results(implementation_status);
CREATE INDEX idx_implementation_results_step_id ON implementation_results(step_id);
CREATE INDEX idx_implementation_results_started_at ON implementation_results(started_at);
CREATE INDEX idx_implementation_results_completed_at ON implementation_results(completed_at);

-- =============================================================================
-- TABLE: review_results
-- Description: Stores code review results and feedback
-- =============================================================================
CREATE TABLE review_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    implementation_result_id UUID NOT NULL REFERENCES implementation_results(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    execution_plan_id UUID REFERENCES execution_plans(id) ON DELETE SET NULL,
    review_type VARCHAR(100) NOT NULL,
    review_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 10),
    quality_score DECIMAL(5,2) CHECK (quality_score >= 0 AND quality_score <= 10),
    security_score DECIMAL(5,2) CHECK (security_score >= 0 AND security_score <= 10),
    performance_score DECIMAL(5,2) CHECK (performance_score >= 0 AND performance_score <= 10),
    maintainability_score DECIMAL(5,2) CHECK (maintainability_score >= 0 AND maintainability_score <= 10),
    findings JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    code_quality_metrics JSONB DEFAULT '{}'::jsonb,
    security_issues JSONB DEFAULT '[]'::jsonb,
    performance_issues JSONB DEFAULT '[]'::jsonb,
    style_violations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_agent VARCHAR(100),
    approved BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for review_results
CREATE INDEX idx_review_results_implementation_result_id ON review_results(implementation_result_id);
CREATE INDEX idx_review_results_session_id ON review_results(session_id);
CREATE INDEX idx_review_results_execution_plan_id ON review_results(execution_plan_id);
CREATE INDEX idx_review_results_review_type ON review_results(review_type);
CREATE INDEX idx_review_results_status ON review_results(review_status);
CREATE INDEX idx_review_results_overall_score ON review_results(overall_score);
CREATE INDEX idx_review_results_created_at ON review_results(created_at);

-- =============================================================================
-- TABLE: messages
-- Description: Stores system messages, notifications, and communications
-- =============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(100) NOT NULL,
    sender VARCHAR(100) NOT NULL,
    recipient VARCHAR(100),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'archived', 'deleted')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    related_request_id UUID REFERENCES parsed_requests(id) ON DELETE SET NULL,
    related_execution_plan_id UUID REFERENCES execution_plans(id) ON DELETE SET NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for messages
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_messages_recipient ON messages(recipient);
CREATE INDEX idx_messages_priority ON messages(priority);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);

-- =============================================================================
-- TABLE: audit_logs
-- Description: Comprehensive audit logging for system activities
-- =============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- =============================================================================
-- TABLE: file_rollback_data
-- Description: Stores file rollback information and backup data
-- =============================================================================
CREATE TABLE file_rollback_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    implementation_result_id UUID NOT NULL REFERENCES implementation_results(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(128) NOT NULL,
    original_file_path TEXT,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('create', 'modify', 'delete', 'move', 'copy')),
    file_size BIGINT,
    file_permissions VARCHAR(10),
    content_snapshot BYTEA,
    diff_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    checksum VARCHAR(128),
    compression_type VARCHAR(50),
    retention_until TIMESTAMP WITH TIME ZONE,
    compressed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for file_rollback_data
CREATE INDEX idx_file_rollback_implementation_result_id ON file_rollback_data(implementation_result_id);
CREATE INDEX idx_file_rollback_session_id ON file_rollback_data(session_id);
CREATE INDEX idx_file_rollback_file_path ON file_rollback_data(file_path);
CREATE INDEX idx_file_rollback_operation_type ON file_rollback_data(operation_type);
CREATE INDEX idx_file_rollback_file_hash ON file_rollback_data(file_hash);
CREATE INDEX idx_file_rollback_created_at ON file_rollback_data(created_at);
CREATE INDEX idx_file_rollback_retention_until ON file_rollback_data(retention_until);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_requests_updated_at BEFORE UPDATE ON parsed_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_execution_plans_updated_at BEFORE UPDATE ON execution_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_results_updated_at BEFORE UPDATE ON review_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate duration and update completion timestamps
CREATE OR REPLACE FUNCTION update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Update completion timestamp if it's being set
    IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at != NEW.completed_at) THEN
        -- Calculate duration based on table
        IF TG_TABLE_NAME = 'project_analyses' THEN
            IF NEW.started_at IS NOT NULL THEN
                NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
            END IF;
        ELSIF TG_TABLE_NAME = 'execution_plans' THEN
            IF NEW.started_at IS NOT NULL THEN
                NEW.actual_duration_minutes = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
            END IF;
        ELSIF TG_TABLE_NAME = 'implementation_results' THEN
            IF NEW.started_at IS NOT NULL THEN
                NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER update_project_analyses_timestamps 
    BEFORE UPDATE ON project_analyses
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER update_execution_plans_timestamps 
    BEFORE UPDATE ON execution_plans
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER update_implementation_results_timestamps 
    BEFORE UPDATE ON implementation_results
    FOR EACH ROW EXECUTE FUNCTION update_timestamps();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for active sessions with user information
CREATE VIEW active_sessions AS
SELECT 
    s.id,
    s.user_id,
    s.session_token,
    s.ip_address,
    s.status,
    s.created_at,
    s.expires_at,
    COUNT(pr.id) as total_requests,
    COUNT(CASE WHEN pr.status = 'processed' THEN 1 END) as processed_requests,
    COUNT(CASE WHEN pr.status = 'pending' THEN 1 END) as pending_requests
FROM sessions s
LEFT JOIN parsed_requests pr ON s.id = pr.session_id
WHERE s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())
GROUP BY s.id, s.user_id, s.session_token, s.ip_address, s.status, s.created_at, s.expires_at;

-- View for request workflow status
CREATE VIEW request_workflow_status AS
SELECT 
    pr.id as request_id,
    pr.session_id,
    pr.original_request,
    pr.parsed_intent,
    pr.status as request_status,
    pr.created_at as request_created_at,
    pa.id as analysis_id,
    pa.analysis_status,
    pa.completed_at as analysis_completed_at,
    ep.id as plan_id,
    ep.plan_name,
    ep.status as plan_status,
    ep.approved_at,
    ir.id as implementation_id,
    ir.implementation_status,
    ir.completed_at as implementation_completed_at,
    rr.id as review_id,
    rr.review_status,
    rr.overall_score,
    rr.created_at as review_created_at
FROM parsed_requests pr
LEFT JOIN project_analyses pa ON pr.id = pa.parsed_request_id
LEFT JOIN execution_plans ep ON pr.id = ep.parsed_request_id
LEFT JOIN implementation_results ir ON ep.id = ir.execution_plan_id
LEFT JOIN review_results rr ON ir.id = rr.implementation_result_id;

-- View for system metrics
CREATE VIEW system_metrics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_requests,
    AVG(CASE WHEN status = 'processed' THEN 
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 
    END) as avg_processing_time_minutes
FROM parsed_requests
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour;

-- =============================================================================
-- INITIAL PERMISSIONS (Optional - adjust for your security model)
-- =============================================================================

-- Note: These permissions should be adjusted based on your application's
-- authentication and authorization model

-- CREATE ROLE ai_agent_app;
-- GRANT CONNECT ON DATABASE current_database() TO ai_agent_app;
-- GRANT USAGE ON SCHEMA public TO ai_agent_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ai_agent_app;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE sessions IS 'User session tracking and management';
COMMENT ON TABLE parsed_requests IS 'Parsed user requests and intent recognition';
COMMENT ON TABLE project_analyses IS 'Project analysis results and code metrics';
COMMENT ON TABLE execution_plans IS 'Generated execution plans for tasks';
COMMENT ON TABLE implementation_results IS 'Code implementation results and changes';
COMMENT ON TABLE review_results IS 'Code review results and quality assessments';
COMMENT ON TABLE messages IS 'System messages and notifications';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE file_rollback_data IS 'File backup and rollback information';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
