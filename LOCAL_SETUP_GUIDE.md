# AI Code Agent - Local Setup Guide

Since the current environment has npm permission issues, here's how to set up and run the AI Code Agent on your local machine:

## Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org)
2. **PostgreSQL 15** - Download from [postgresql.org](https://postgresql.org)
3. **Git** - For cloning the repository

## Step 1: Environment Setup

1. **Clone/Get the project files**
   ```bash
   # Copy all files from /workspace to your local machine
   # Or if using git, clone your repository
   ```

2. **Navigate to project directory**
   ```bash
   cd ai-code-agent
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

## Step 2: Database Setup

1. **Start PostgreSQL**
   ```bash
   # On macOS with Homebrew:
   brew services start postgresql
   
   # On Ubuntu/Debian:
   sudo systemctl start postgresql
   
   # On Windows:
   # Start PostgreSQL service from Services panel
   ```

2. **Create database and user**
   ```bash
   # Connect to PostgreSQL as postgres user
   psql -U postgres
   
   # In PostgreSQL shell:
   CREATE DATABASE ai_code_agent;
   CREATE USER ai_agent_user WITH PASSWORD 'ai_agent_password';
   GRANT ALL PRIVILEGES ON DATABASE ai_code_agent TO ai_agent_user;
   \q
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

## Step 3: Environment Configuration

1. **Update .env file**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env file with your settings:**
   ```env
   # Required
   GROQ_API_KEY=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
   
   # Database (match your PostgreSQL setup)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ai_code_agent
   DB_USER=ai_agent_user
   DB_PASSWORD=ai_agent_password
   
   # Optional
   NODE_ENV=development
   LOG_LEVEL=info
   ```

## Step 4: Test the Installation

1. **Run quick smoke tests**
   ```bash
   npm run test:quick:smoke
   ```

2. **Try a demo workflow**
   ```bash
   npm run demo:simple
   ```

3. **Interactive testing dashboard**
   ```bash
   npm run test:dashboard
   ```

## Step 5: Development Commands

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Database operations
npm run db:migrate     # Run migrations
npm run db:rollback    # Rollback migrations
npm run db:status      # Check migration status
```

## Step 6: Docker Alternative (Optional)

If you prefer Docker:

```bash
# Start with Docker
docker-compose up -d

# Run migrations
npm run db:migrate

# Access PostgreSQL web interface
# http://localhost:8080 (admin credentials in docker-compose.yml)
```

## Troubleshooting

### Common Issues:

1. **Permission errors with npm**
   ```bash
   # Fix npm permissions
   sudo chown -R $(whoami) ~/.npm
   ```

2. **PostgreSQL connection errors**
   - Check PostgreSQL is running
   - Verify database/user exists
   - Check firewall settings

3. **Groq API errors**
   - Verify API key is correct
   - Check internet connection
   - Ensure API key has sufficient credits

4. **TypeScript compilation errors**
   ```bash
   npm run type-check
   ```

### Getting Help:

1. **Check logs**
   ```bash
   npm run logs
   ```

2. **Run diagnostic tests**
   ```bash
   npm run test:setup -- --verbose
   ```

3. **Interactive debugging**
   ```bash
   npm run test:dashboard
   ```

## Project Structure

```
ai-code-agent/
├── src/                    # Source code
│   ├── core/              # Core infrastructure
│   ├── components/        # AI components
│   ├── database/          # Database models
│   └── orchestrator/      # Main coordinator
├── tests/                 # Test suites
├── scripts/               # Automation scripts
├── docs/                  # Documentation
└── docker/                # Docker configuration
```

## Next Steps

Once everything is working:

1. **Explore the testing dashboard**
2. **Try different demo workflows**
3. **Start with the quick smoke tests**
4. **Build your own coding tasks**

The system is designed to handle natural language coding requests through a complete AI-powered workflow from analysis to implementation to review.