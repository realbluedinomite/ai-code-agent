# Database Setup Guide

This guide covers the complete database setup process for the AI Code Agent system, including development and production configurations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Database Scripts](#database-scripts)
- [Docker Configuration](#docker-configuration)
- [Production Setup](#production-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js** 18+ and npm 8+
- **Docker** and **Docker Compose**
- **PostgreSQL** 15+ (if not using Docker)
- **Git** for cloning the repository

### System Requirements

- **Memory**: Minimum 4GB RAM recommended
- **Storage**: 10GB free space for database and logs
- **Network**: Ports 5432, 6379, 8080 available

## Development Setup

### 1. Quick Start with Docker

The fastest way to set up the development environment:

```bash
# Clone the repository
git clone <repository-url>
cd ai-code-agent

# Make the dev script executable (if needed)
chmod +x docker/dev.sh

# Run initial setup (starts Docker, creates database, runs migrations, seeds data)
./docker/dev.sh setup
```

This will:
- ✅ Start PostgreSQL, Redis, and pgAdmin containers
- ✅ Create the database and user
- ✅ Run database migrations
- ✅ Seed with sample data
- ✅ Open pgAdmin in your browser

### 2. Manual Setup

If you prefer manual setup or need to troubleshoot:

#### Step 1: Start Docker Services

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings (if needed)
nano .env
```

#### Step 3: Run Database Setup

```bash
# Full setup (create database + run migrations + seed data)
npm run db:setup -- --full

# Or step by step:
npm run db:setup -- --create-db  # Create database and user
npm run db:migrate               # Run migrations
npm run db:seed                  # Seed test data
```

### 3. Access Services

- **Database**: `localhost:5432`
- **pgAdmin**: http://localhost:8080
- **Redis**: `localhost:6379`

#### pgAdmin Configuration

- **Email**: `admin@ai-code-agent.local`
- **Password**: `admin123`
- **Server**: Pre-configured to connect to PostgreSQL container

## Database Scripts

### Migration Management

Run database schema migrations:

```bash
# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:rollback

# Check migration status
ts-node scripts/migrate.ts status

# Run specific migration command
ts-node scripts/migrate.ts up
ts-node scripts/migrate.ts down
```

### Seeding Data

Populate database with test data:

```bash
# Seed all tables with test data
npm run db:seed

# Seed specific table
ts-node scripts/seed.ts sessions
ts-node scripts/seed.ts parsed_requests
ts-node scripts/seed.ts project_analyses

# Reset and reseed
ts-node scripts/seed.ts --reset

# Verbose output
ts-node scripts/seed.ts --verbose
```

### Database Setup

Initial database configuration:

```bash
# Full setup
npm run db:setup -- --full

# Individual steps
npm run db:setup -- --create-db    # Create database and user
npm run db:setup -- --run-migrations # Run migrations only
npm run db:setup -- --seed         # Seed data only
npm run db:setup -- --verify       # Verify setup

# Skip confirmation prompts
npm run db:setup -- --full --skip-confirmation --verbose
```

### Database Operations

Common database management tasks:

```bash
# Reset entire database (WARNING: deletes all data)
npm run db:reset

# View database in pgAdmin
./docker/dev.sh pgadmin

# Create backup
./docker/dev.sh backup

# Restore from backup
./docker/dev.sh restore backups/backup_20241201_120000.sql

# Reset database
./docker/dev.sh reset
```

## Docker Configuration

### Services Overview

| Service | Port | Purpose | Data Volume |
|---------|------|---------|-------------|
| PostgreSQL | 5432 | Primary database | `postgres_data` |
| Redis | 6379 | Caching & sessions | `redis_data` |
| pgAdmin | 8080 | Database administration | `pgadmin_data` |

### Docker Management

Use the provided management script:

```bash
# Start services
./docker/dev.sh start

# Stop services
./docker/dev.sh stop

# Restart services
./docker/dev.sh restart

# Check status
./docker/dev.sh status

# View logs
./docker/dev.sh logs          # All services
./docker/dev.sh logs postgres # Specific service

# Service-specific operations
./docker/dev.sh backup        # Create database backup
./docker/dev.sh restore <file> # Restore from backup
./docker/dev.sh reset         # Reset database
./docker/dev.sh pgadmin       # Open pgAdmin
```

### Manual Docker Commands

If you prefer direct Docker commands:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f pgadmin

# Access PostgreSQL
docker-compose exec postgres psql -U ai_agent_user -d ai_code_agent

# Create manual backup
docker-compose exec postgres pg_dump -U ai_agent_user -d ai_code_agent > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U ai_agent_user -d ai_code_agent < backup.sql

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Production Setup

### Environment Configuration

For production, create `.env.production`:

```bash
# Production database settings
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=ai_code_agent_prod
DB_USER=ai_agent_prod_user
DB_PASSWORD=secure-production-password

# Security settings
JWT_SECRET=very-secure-production-jwt-secret
NODE_ENV=production
```

### Production Docker Compose

```bash
# Use production override
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Database Security

In production:

1. **Use strong passwords**: Generate secure passwords for database users
2. **Enable SSL**: Configure PostgreSQL for SSL connections
3. **Limit access**: Restrict network access to database
4. **Regular backups**: Set up automated backup procedures
5. **Monitor logs**: Enable comprehensive logging and monitoring

### Backup Strategy

Set up automated backups:

```bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup database
pg_dump -h localhost -U ai_agent_user -d ai_code_agent | gzip > "$BACKUP_DIR/database.sql.gz"

# Backup Redis
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis.rdb"

# Cleanup old backups (keep 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} +
EOF

# Make executable
chmod +x scripts/backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/ai-code-agent/scripts/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres
docker-compose logs postgres

# Test connection manually
docker-compose exec postgres pg_isready -U ai_agent_user
```

#### Port Already in Use

```bash
# Find what's using the port
lsof -i :5432

# Stop conflicting service or change ports in docker-compose.yml
```

#### Migration Errors

```bash
# Check migration status
ts-node scripts/migrate.ts status

# Reset migrations table (WARNING: will re-run all migrations)
docker-compose exec postgres psql -U ai_agent_user -d ai_code_agent -c "DELETE FROM schema_migrations;"
npm run db:migrate
```

#### Docker Space Issues

```bash
# Clean up Docker resources
docker system prune -a
docker volume prune

# Check disk usage
docker system df
```

### Performance Tuning

#### PostgreSQL Optimization

Edit `docker/postgres/postgresql.conf`:

```ini
# For larger datasets
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 8MB
maintenance_work_mem = 128MB

# For better performance
random_page_cost = 1.1
effective_io_concurrent = 200
```

#### Redis Optimization

Edit `docker/redis/redis.conf`:

```conf
# Increase memory limit
maxmemory 1gb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

### Getting Help

If you encounter issues:

1. Check the logs: `./docker/dev.sh logs`
2. Verify configuration: `npm run db:setup -- --verify`
3. Review the [main README](../README.md) for general setup
4. Check Docker container health: `docker-compose ps`
5. Test individual services: `docker-compose exec postgres pg_isready`

### Useful Commands

```bash
# Database size and usage
docker-compose exec postgres psql -U ai_agent_user -d ai_code_agent -c "
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
    FROM pg_stat_user_tables;"

# Check database connections
docker-compose exec postgres psql -U ai_agent_user -d ai_code_agent -c "
    SELECT count(*) as active_connections 
    FROM pg_stat_activity 
    WHERE state = 'active';"

# View table sizes
docker-compose exec postgres psql -U ai_agent_user -d ai_code_agent -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

## Environment Variables Reference

See `.env.example` for a complete list of environment variables with descriptions. Key variables:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `NODE_ENV`: Application environment
- `LOG_LEVEL`: Logging verbosity
- `JWT_SECRET`: Authentication secret

## Database Schema

The system uses the following main tables:

- **sessions**: User session tracking
- **parsed_requests**: User request processing
- **project_analyses**: Project analysis results
- **execution_plans**: Task execution planning
- **implementation_results**: Code implementation tracking
- **review_results**: Code review and quality metrics
- **audit_logs**: System activity logging
- **file_rollback_data**: File backup and rollback information

For detailed schema information, see `src/database/migrations/001_initial_schema.sql`.