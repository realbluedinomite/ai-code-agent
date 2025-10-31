#!/bin/bash
set -e

echo "Starting database initialization..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing initialization scripts"

# Create extensions that may be needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create necessary extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    
    -- Create additional schemas for organization
    CREATE SCHEMA IF NOT EXISTS audit;
    CREATE SCHEMA IF NOT EXISTS monitoring;
    
    -- Grant permissions on new schemas
    GRANT USAGE ON SCHEMA audit TO $POSTGRES_USER;
    GRANT USAGE ON SCHEMA monitoring TO $POSTGRES_USER;
    GRANT ALL ON SCHEMA audit TO $POSTGRES_USER;
    GRANT ALL ON SCHEMA monitoring TO $POSTGRES_USER;
    
    -- Create some useful functions
    CREATE OR REPLACE FUNCTION audit.log_action(
        p_table_name TEXT,
        p_action TEXT,
        p_user_id TEXT DEFAULT current_user,
        p_old_data JSONB DEFAULT NULL,
        p_new_data JSONB DEFAULT NULL
    ) RETURNS VOID AS \$\$
    BEGIN
        INSERT INTO audit.audit_log (
            table_name,
            action,
            user_id,
            old_data,
            new_data,
            timestamp
        ) VALUES (
            p_table_name,
            p_action,
            p_user_id,
            p_old_data,
            p_new_data,
            NOW()
        );
    END;
    \$\$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION audit.log_action TO $POSTGRES_USER;
    
    -- Create a function to get database size
    CREATE OR REPLACE FUNCTION public.get_db_size()
    RETURNS TABLE (
        database_name NAME,
        size_bytes BIGINT,
        size_human TEXT
    ) AS \$\$
    BEGIN
        RETURN QUERY
        SELECT 
            current_database()::NAME as database_name,
            pg_database_size(current_database())::BIGINT as size_bytes,
            CASE 
                WHEN pg_database_size(current_database()) > 1024^3 THEN 
                    round(pg_database_size(current_database())::DECIMAL / 1024^3, 2) || ' GB'
                WHEN pg_database_size(current_database()) > 1024^2 THEN 
                    round(pg_database_size(current_database())::DECIMAL / 1024^2, 2) || ' MB'
                WHEN pg_database_size(current_database()) > 1024 THEN 
                    round(pg_database_size(current_database())::DECIMAL / 1024, 2) || ' KB'
                ELSE 
                    pg_database_size(current_database())::TEXT || ' bytes'
            END as size_human;
    END;
    \$\$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.get_db_size TO $POSTGRES_USER;
    
    -- Create a function to get table statistics
    CREATE OR REPLACE FUNCTION public.get_table_stats()
    RETURNS TABLE (
        schemaname NAME,
        tablename NAME,
        attname NAME,
        inherited BOOLEAN,
        null_frac DECIMAL,
        avg_width INTEGER,
        n_distinct DECIMAL,
        correlation DECIMAL
    ) AS \$\$
    BEGIN
        RETURN QUERY
        SELECT 
            n.nspname as schemaname,
            c.relname as tablename,
            a.attname as attname,
            a.attinhcount > 0 as inherited,
            s.null_frac,
            s.avg_width,
            s.n_distinct,
            s.correlation
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        JOIN pg_stats s ON s.schemaname = n.nspname AND s.tablename = c.relname AND s.attname = a.attname
        WHERE a.attnum > 0 
        AND NOT a.attisdropped
        AND c.relkind = 'r'
        AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY n.nspname, c.relname, a.attnum;
    END;
    \$\$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.get_table_stats TO $POSTGRES_USER;
EOSQL

echo "Database initialization completed successfully!"