# AI Code Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A production-ready AI Code Agent system built with TypeScript, PostgreSQL, and modern web technologies. This system provides a robust framework for automating code analysis, task management, and agent orchestration.

## 🚀 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Contributing](#contributing)
- [License](#license)

## 📋 Overview

AI Code Agent is a comprehensive system designed to automate code analysis and task management through intelligent agent orchestration. It provides a scalable framework for handling complex development workflows, code analysis, and project management tasks.

### Key Capabilities

- **🤖 Intelligent Agent Orchestration**: Coordinate multiple AI agents for complex tasks
- **📊 Real-time Project Analysis**: Automated code analysis and project structure understanding
- **🔄 Workflow Management**: Define, execute, and monitor complex workflows
- **📝 Task Automation**: Automated task creation, assignment, and execution
- **🔌 Plugin System**: Extensible architecture with custom plugins
- **📈 Monitoring & Analytics**: Comprehensive logging and performance monitoring
- **🔒 Enterprise Security**: Built-in authentication, authorization, and security features

## ✨ Features

### Core Features

- **Event-Driven Architecture**: Built on a robust typed event bus system
- **Type-Safe Database Layer**: PostgreSQL with TypeScript models and validation
- **Structured Logging**: Comprehensive logging with Winston and multiple transports
- **Configuration Management**: Environment-based configuration with validation
- **Error Handling**: Comprehensive error hierarchy with context tracking
- **Real-time Communication**: WebSocket support for real-time updates
- **API Integration**: RESTful APIs with OpenAPI documentation

### Advanced Features

- **Multi-Agent Coordination**: Sophisticated agent lifecycle management
- **Resource Optimization**: Intelligent resource allocation and monitoring
- **Workflow Engine**: Advanced workflow definition and execution
- **Security Framework**: Authentication, authorization, and audit logging
- **Performance Monitoring**: Built-in health checks and performance metrics
- **Plugin Architecture**: Extensible plugin system for custom functionality
- **Database Migrations**: Version-controlled database schema management

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Code Agent System                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/Vue)                                       │
├─────────────────────────────────────────────────────────────┤
│  API Gateway (Express + WebSocket)                          │
├─────────────────────────────────────────────────────────────┤
│  Orchestrator Layer                                         │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │ Task Manager    │ Workflow Engine │ Agent Coordinator│   │
│  └─────────────────┴─────────────────┴─────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Core Infrastructure                                        │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │ Event Bus       │ Configuration   │ Logging System  │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Provider Layer                                             │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │ LLM Provider    │ Code Analysis   │ Database        │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           PostgreSQL Database                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Orchestrator Layer**: Manages tasks, workflows, and agent coordination
2. **Core Infrastructure**: Provides foundational services (events, logging, config)
3. **Provider Layer**: Abstracts external services and integrations
4. **Database Layer**: Persistent data storage and management
5. **API Layer**: RESTful APIs and WebSocket communication

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **PostgreSQL**: Version 13 or higher
- **Git**: For version control

### Optional Dependencies

- **Redis**: For caching and session management
- **Docker**: For containerized deployment
- **PM2**: For production process management

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ai-code-agent.git
cd ai-code-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Set Up Database

```bash
# Create database
createdb ai_code_agent

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 5. Build the Project

```bash
npm run build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent
DB_USER=postgres
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# External Services
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=your-openai-api-key

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Configuration Validation

The system validates all configuration on startup:

```bash
npm run validate:config
```

## 🚀 Quick Start

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Or use the watch mode
npm run build:watch
```

### Production Mode

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📚 API Documentation

### REST API Endpoints

#### Authentication

```http
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

#### Agents

```http
GET    /api/v1/agents
POST   /api/v1/agents
GET    /api/v1/agents/:id
PUT    /api/v1/agents/:id
DELETE /api/v1/agents/:id
POST   /api/v1/agents/:id/start
POST   /api/v1/agents/:id/stop
```

#### Tasks

```http
GET    /api/v1/tasks
POST   /api/v1/tasks
GET    /api/v1/tasks/:id
PUT    /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
POST   /api/v1/tasks/:id/start
POST   /api/v1/tasks/:id/complete
```

#### Projects

```http
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
POST   /api/v1/projects/:id/analyze
```

### WebSocket Events

#### Client → Server

```javascript
// Join a room
socket.emit('join', { roomId: 'project-123' });

// Start a task
socket.emit('task:start', { taskId: 'task-456' });

// Send agent command
socket.emit('agent:command', { agentId: 'agent-789', command: 'analyze' });
```

#### Server → Client

```javascript
// Task updates
socket.on('task:update', (data) => {
  console.log('Task updated:', data);
});

// Agent status changes
socket.on('agent:status', (data) => {
  console.log('Agent status:', data);
});

// System notifications
socket.on('notification', (data) => {
  console.log('System notification:', data);
});
```

### API Examples

#### Creating a Task

```typescript
import { TaskClient } from '@/api/clients';

const taskClient = new TaskClient();

// Create a new task
const task = await taskClient.create({
  title: 'Analyze Codebase',
  description: 'Perform comprehensive code analysis',
  priority: 'high',
  assigneeId: 'agent-123',
  metadata: {
    projectId: 'project-456',
    analysisType: 'comprehensive'
  }
});

console.log('Task created:', task.id);
```

#### Starting an Agent

```typescript
import { AgentClient } from '@/api/clients';

const agentClient = new AgentClient();

// Start an agent
const agent = await agentClient.start('agent-123', {
  configuration: {
    mode: 'analysis',
    maxConcurrency: 5
  }
});

console.log('Agent started:', agent.status);
```

## 💻 Development

### Code Standards

This project follows strict coding standards:

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with TypeScript support
- **Prettier**: Code formatting
- **Husky**: Git hooks for code quality
- **Conventional Commits**: Commit message format

### Development Scripts

```bash
# Development server
npm run dev

# Build with watch mode
npm run build:watch

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npm run type-check

# Clean build artifacts
npm run clean
```

### Adding New Features

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Feature**
   - Add TypeScript code in appropriate directories
   - Follow existing patterns and conventions
   - Write unit tests

3. **Write Tests**
   ```bash
   # Add tests in appropriate test directory
   npm run test
   ```

4. **Update Documentation**
   - Update this README if needed
   - Add API documentation
   - Update TypeScript definitions

5. **Submit Pull Request**
   - Follow conventional commit format
   - Ensure all tests pass
   - Request code review

### Core Development Patterns

#### Event-Driven Development

```typescript
// Subscribe to events
eventBus.on('task:created', (data) => {
  logger.info('New task created', data);
});

// Emit events
eventBus.emit('task:started', { taskId, timestamp: new Date() });
```

#### Database Operations

```typescript
// Use database context
const dbContext = await getDatabaseContext();
const userModel = dbContext.userModel;

// Create entity
const user = await userModel.create(userData);

// Query entities
const users = await userModel.findMany({ active: true });
```

#### Error Handling

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Validation failed', error.context);
  } else {
    logger.error('Unexpected error', error);
  }
  throw error;
}
```

## 🧪 Testing

### Testing Strategy

The project uses a comprehensive testing approach:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete user workflows
- **Performance Tests**: Test performance characteristics

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Database tests
npm run test:db:setup
npm run test:integration
npm run test:db:cleanup
```

### Test Configuration

Tests are configured in `jest.config.ts` and support:

- TypeScript compilation
- Coverage reporting
- Mock data and fixtures
- Database test utilities
- Environment-specific testing

### Writing Tests

```typescript
describe('ComponentName', () => {
  it('should handle valid input', async () => {
    const result = await component.process(validInput);
    expect(result.success).toBe(true);
  });

  it('should throw error for invalid input', async () => {
    await expect(component.process(invalidInput))
      .rejects.toThrow(ValidationError);
  });
});
```

## 🚢 Deployment

### Production Build

```bash
# Build for production
npm run build

# Validate build
npm run build:verify

# Check bundle size
npm run analyze:bundle
```

### Docker Deployment

```bash
# Build Docker image
docker build -t ai-code-agent:latest .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  ai-code-agent:latest
```

### Environment-Specific Deployment

#### Development
```bash
NODE_ENV=development npm run dev
```

#### Staging
```bash
NODE_ENV=staging npm run build && npm start
```

#### Production
```bash
NODE_ENV=production npm run build && npm start
```

### Health Checks

The system provides health check endpoints:

```bash
# System health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/database

# Detailed system status
curl http://localhost:3000/status
```

### Monitoring

Built-in monitoring features:

- **Health Checks**: System and component health
- **Metrics**: Performance and usage metrics
- **Logging**: Structured logging with correlation IDs
- **Alerts**: Configurable alert thresholds

## 📁 Project Structure

```
ai-code-agent/
├── src/                      # Source code
│   ├── components/           # UI and feature components
│   │   ├── agents/          # Agent management components
│   │   ├── tasks/           # Task-specific components
│   │   ├── workflows/       # Workflow management
│   │   └── integrations/    # Third-party integrations
│   ├── core/                # Core infrastructure
│   │   ├── event-bus/       # Event system
│   │   ├── state-manager/   # State management
│   │   ├── plugin-manager/  # Plugin system
│   │   └── security/        # Security utilities
│   ├── database/            # Database layer
│   │   ├── models/          # Data models
│   │   ├── migrations/      # Database migrations
│   │   └── seeders/         # Test data
│   ├── orchestrator/        # Orchestration logic
│   │   ├── task-manager/    # Task management
│   │   ├── workflow-engine/ # Workflow execution
│   │   ├── agent-coordinator/ # Agent coordination
│   │   └── resource-manager/ # Resource management
│   ├── providers/           # External service providers
│   │   ├── llm/             # LLM integrations
│   │   ├── code-analysis/   # Code analysis tools
│   │   └── file-system/     # File operations
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript definitions
├── tests/                   # Test suite
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Test fixtures
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── guides/             # User guides
│   ├── architecture/       # Architecture docs
│   └── examples/           # Code examples
├── scripts/                # Automation scripts
│   ├── deployment/         # Deployment scripts
│   ├── development/        # Development utilities
│   └── maintenance/        # Maintenance scripts
├── config/                 # Configuration files
│   ├── environments/       # Environment configs
│   ├── logging/           # Logging configuration
│   └── security/          # Security settings
└── public/                # Static assets
```

## 🔧 Core Components

### Event Bus System

A typed event system for loose coupling:

```typescript
import { eventBus, Events } from '@/core/event-bus';

// Subscribe to events
eventBus.on('task:created', (data) => {
  logger.info('Task created', data);
});

// Emit events
eventBus.emit('task:started', { taskId: '123' });
```

### Configuration Management

Environment-based configuration with validation:

```typescript
import { config } from '@/core/config';

// Load configuration
config.loadFromEnvironment('production');

// Get typed configuration
const port = config.get<number>('server.port', 3000);
```

### Database Layer

Type-safe database operations:

```typescript
import { getDatabaseContext } from '@/database';

const dbContext = await getDatabaseContext();
const userModel = dbContext.userModel;

const user = await userModel.create(userData);
```

### Logger System

Structured logging with multiple transports:

```typescript
import { logger } from '@/core/logger';

logger.info('User action', { userId: '123', action: 'login' });
logger.error('Error occurred', { error, correlationId });
```

### Error Handling

Comprehensive error hierarchy:

```typescript
import { ValidationError, NotFoundError } from '@/core/errors';

throw new ValidationError('Invalid input', { field: 'email' });
throw new NotFoundError('User', userId);
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Contribution Process

1. **Fork the Repository**
2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```
3. **Make Changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation
4. **Run Tests**
   ```bash
   npm test
   npm run lint
   ```
5. **Submit Pull Request**
   - Use conventional commit format
   - Include detailed description
   - Reference any related issues

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Write descriptive tests
- Document public APIs
- Use meaningful variable names

### Commit Messages

Follow conventional commit format:

```
feat: add new agent management API
fix: resolve database connection timeout
docs: update API documentation
test: add unit tests for task manager
refactor: improve error handling
```

### Pull Request Guidelines

- **Scope**: One feature/fix per PR
- **Tests**: Include tests for new features
- **Documentation**: Update docs for API changes
- **Backward Compatibility**: Maintain compatibility where possible
- **Performance**: Consider performance implications

### Reporting Issues

When reporting issues, please include:

- **Environment**: Node.js version, OS, etc.
- **Steps to Reproduce**: Clear reproduction steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant log entries

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- [API Documentation](docs/api/)
- [Architecture Guide](docs/architecture/)
- [Development Guide](docs/guides/)
- [Examples](docs/examples/)

### Community

- **Issues**: [GitHub Issues](https://github.com/your-org/ai-code-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ai-code-agent/discussions)
- **Wiki**: [Project Wiki](https://github.com/your-org/ai-code-agent/wiki)

### Getting Help

1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information
4. Join our community discussions

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## 🙏 Acknowledgments

- TypeScript team for excellent language support
- Node.js community for robust ecosystem
- PostgreSQL team for reliable database
- All contributors who have helped improve this project

---

**Made with ❤️ by the AI Code Agent Team**

For more information, visit our [official documentation](https://ai-code-agent.dev) or contact us at support@ai-code-agent.dev.
