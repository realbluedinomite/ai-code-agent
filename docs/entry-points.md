# Application Entry Points

This document describes the main entry points for the AI Code Agent application.

## Overview

The AI Code Agent system provides two main entry points:

1. **Main Application Entry Point** (`src/index.ts`) - HTTP server and API endpoints
2. **CLI Entry Point** (`src/cli/index.ts`) - Command-line interface for administration

## Main Application Entry Point (`src/index.ts`)

The main entry point initializes and runs the HTTP server that provides the AI Code Agent API and web interface.

### Features

- **HTTP Server**: Express.js-based server with security middleware
- **Core Systems Initialization**: 
  - Database connection and model registry
  - Event bus system
  - Logging system
  - Configuration management
  - Plugin system (when implemented)
- **Health Check Endpoints**: Multiple health monitoring endpoints
- **API Routes**: RESTful API endpoints for system management
- **Graceful Shutdown**: Proper cleanup and shutdown handling
- **Security**: CORS, Helmet, request logging, correlation IDs

### Usage

#### Starting the Server

```bash
# Using npm scripts
npm start

# Using the CLI
ai-code-agent start

# Programmatically
import { main, createAndStartApp } from './src/index';

async function start() {
  const app = await createAndStartApp({
    port: 3000,
    host: '0.0.0.0',
    environment: 'production'
  });
}
```

#### Health Check Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information
- `GET /health/database` - Database connectivity check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

#### API Endpoints

- `GET /api` - API information
- `GET /api/system` - System information
- `GET /api/config` - Configuration (development only)
- `GET /api/plugins` - Plugin management (placeholder)

### Configuration

The application can be configured through environment variables:

```bash
# Server configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent
DB_USER=username
DB_PASSWORD=password

# Security configuration
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key

# Logging configuration
LOG_LEVEL=info
```

## CLI Entry Point (`src/cli/index.ts`)

The CLI provides a comprehensive command-line interface for managing the AI Code Agent system.

### Installation

The CLI is automatically available after installing the package:

```bash
npm install -g ai-code-agent
```

Or run directly with npx:

```bash
npx ai-code-agent <command>
```

### Available Commands

#### Server Management

```bash
# Start the server
ai-code-agent start [options]

# Stop the server
ai-code-agent stop [options]

# Restart the server
ai-code-agent restart [options]

# Check server status
ai-code-agent status
```

#### Database Operations

```bash
# Run migrations
ai-code-agent migrate [options]

# Seed database with initial data
ai-code-agent seed [options]

# Reset database
ai-code-agent db:reset [options]

# Show database information
ai-code-agent db:info
```

#### Plugin Management

```bash
# List installed plugins
ai-code-agent plugins:list

# Install a plugin
ai-code-agent plugins:install <plugin-name>

# Remove a plugin
ai-code-agent plugins:remove <plugin-name>

# Enable a plugin
ai-code-agent plugins:enable <plugin-name>

# Disable a plugin
ai-code-agent plugins:disable <plugin-name>
```

#### System Information

```bash
# Check system health
ai-code-agent health [options]

# Show system information
ai-code-agent info [options]

# View application logs
ai-code-agent logs [options]
```

#### Configuration Management

```bash
# Show current configuration
ai-code-agent config:show [options]

# Validate configuration
ai-code-agent config:validate
```

#### Development Commands

```bash
# Start development server
ai-code-agent dev [options]

# Run tests
ai-code-agent test [options]

# Build application
ai-code-agent build
```

#### Utility Commands

```bash
# Generate API keys
ai-code-agent generate:apikey [options]

# Create database backup
ai-code-agent backup [options]

# Restore from backup
ai-code-agent restore <backup-file>

# Show help
ai-code-agent help

# Show version
ai-code-agent version
```

### CLI Options

Each command supports various options:

```bash
# General options
--port, -p          Port number
--host, -h          Host address
--env, -e           Environment (development, production, test)
--json              Output as JSON
--verbose           Verbose output

# Command-specific options
--force, -f         Force operation (for destructive commands)
--detailed, -d      Show detailed information
--follow, -f        Follow output (for logs)
--lines, -n         Number of lines to show
--level, -l         Log level filter
```

### Example Usage

```bash
# Start the server in production mode
ai-code-agent start --env production --port 8080

# Check system health with detailed output
ai-code-agent health --detailed --json

# Show configuration in development
ai-code-agent config:show --env development

# Reset database with confirmation
ai-code-agent db:reset

# Install a plugin
ai-code-agent plugins:install code-analysis-plugin

# Show system information
ai-code-agent info
```

## Error Handling

Both entry points include comprehensive error handling:

- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
- **Error Logging**: Structured error logging with context
- **Health Checks**: Monitoring system health and readiness
- **Validation**: Configuration and input validation
- **Recovery**: Automatic recovery from common errors

## Development

### Running in Development Mode

```bash
# Using the CLI (recommended)
npm run cli:dev -- start --env development

# Using ts-node directly
ts-node src/cli/index.ts start --env development

# Main application with hot reload
npm run dev
```

### Testing the Entry Points

```bash
# Test main application
npm test -- tests/integration/core-integration.test.ts

# Test CLI commands
npm test -- tests/unit/cli/

# Manual testing
npm run cli:dev -- help
```

## Best Practices

1. **Always validate configuration** before starting services
2. **Use health checks** to monitor system status
3. **Enable graceful shutdown** for production deployments
4. **Log appropriately** at different levels (debug, info, warn, error)
5. **Use environment variables** for configuration in production
6. **Test health endpoints** before deployment
7. **Use the CLI for maintenance** tasks and automation

## Integration

The entry points are designed to work together:

- The CLI can start/stop the main application
- Health check endpoints can be used by monitoring systems
- Both use the same core systems (database, event bus, logging)
- Configuration is shared between both entry points
- Plugin system will integrate with both (when implemented)

## Troubleshooting

### Common Issues

1. **Port already in use**: Use a different port or stop the existing process
2. **Database connection failed**: Check database configuration and connectivity
3. **Configuration validation failed**: Check environment variables and configuration files
4. **Plugin system not ready**: Plugin commands will show placeholder messages

### Getting Help

```bash
# Show general help
ai-code-agent help

# Show command-specific help
ai-code-agent <command> --help

# Check system health
ai-code-agent health

# Show system information
ai-code-agent info
```
