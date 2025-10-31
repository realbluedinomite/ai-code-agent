# Advanced Project - Full Stack Enterprise Application

## Overview

This is a comprehensive full-stack application demonstrating enterprise-level architecture with microservices, real-time features, and modern development practices.

## Architecture

```
┌─────────────────┐
│   Client App    │  (React + TypeScript)
│   (Port 3001)   │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         ▼
┌─────────────────┐
│  API Server     │  (Node.js + Express)
│   (Port 3000)   │
└────────┬────────┘
         │
         ├─────────────┬──────────────┐
         ▼             ▼              ▼
┌──────────┐    ┌─────────┐    ┌──────────┐
│ MongoDB  │    │  Redis  │    │  Queue   │
│ Database │    │   Cache │    │ Service  │
└──────────┘    └─────────┘    └──────────┘
```

## Features

### Frontend
- **React 18** with TypeScript
- **React Query** for data fetching and caching
- **Zustand** for state management
- **React Router** for navigation
- **Socket.io** for real-time features
- **Tailwind CSS** for styling
- **React Hook Form** for form handling
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **Redis** for caching and session management
- **Bull Queue** for background jobs
- **Winston** for logging
- **JWT** for authentication
- **Socket.io** for real-time communication
- **Joi** for validation
- **Helmet** for security

### DevOps
- **Docker** containerization
- **Docker Compose** for orchestration
- **Nginx** reverse proxy
- **ESLint** and **Prettier** for code quality
- **Jest** for testing

## Project Structure

```
advanced-project/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # Global styles
│   └── public/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Utility functions
│   │   ├── tests/          # Test files
│   │   └── index.ts        # Entry point
│   └── logs/               # Application logs
├── shared/                 # Shared types and utilities
│   ├── types/              # TypeScript types
│   └── utils/              # Shared utilities
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd advanced-project
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables:
```bash
# Server (.env)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/advanced-project
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000

# Client (.env)
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SERVER_URL=http://localhost:3000
```

4. Start with Docker Compose:
```bash
docker-compose up -d
```

5. Or start services individually:

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Start Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Start server
cd server
npm run dev

# Start client (in another terminal)
cd client
npm start
```

### Development

```bash
# Run server in development mode
cd server
npm run dev

# Run client in development mode
cd client
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Docker Commands

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Remove volumes (fresh start)
docker-compose down -v
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

### User Endpoints

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Post Endpoints

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

## Environment Variables

### Server
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT expiration time
- `CLIENT_URL` - Frontend URL for CORS

### Client
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SERVER_URL` - WebSocket server URL

## Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test

# Run all tests
npm run test:all

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Using Docker

1. Build production images:
```bash
docker-compose -f docker-compose.prod.yml build
```

2. Deploy to production:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build client:
```bash
cd client
npm run build
```

2. Build server:
```bash
cd server
npm run build
```

3. Start production server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
