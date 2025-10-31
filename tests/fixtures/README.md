# Sample Test Projects for AI Code Agent

This directory contains three progressively complex TypeScript/JavaScript projects designed to test the AI Code Agent system's capabilities across different architectural patterns and complexity levels.

## Project Overview

### 1. Simple Todo App (`tests/fixtures/simple-project/`)
**Complexity**: Beginner to Intermediate  
**Focus**: Basic patterns, vanilla JS, simple architecture

#### Architecture
- **Component-based**: TodoApp, TodoList components
- **Service Layer**: TodoService with repository pattern
- **Models**: TodoModel with serialization
- **Utilities**: Helper functions for validation and formatting
- **DOM Manipulation**: Vanilla JavaScript with class-based components

#### Key Patterns Demonstrated
- Basic component architecture
- Repository pattern for data persistence
- Model-view separation
- Event-driven updates
- Input validation and error handling
- Local storage persistence
- Responsive design with CSS

#### File Structure
```
simple-project/
├── src/
│   ├── components/        # UI components
│   │   ├── TodoApp.ts    # Main application component
│   │   └── TodoList.ts   # Todo list component
│   ├── models/           # Data models
│   │   └── Todo.ts       # Todo domain model
│   ├── services/         # Business logic & persistence
│   │   └── TodoService.ts
│   └── utils/            # Utility functions
│       └── helpers.ts
├── public/
│   ├── index.html        # HTML template
│   └── styles.css        # Application styles
└── package.json
```

#### Features
- ✅ Add, edit, delete todos
- ✅ Mark todos as complete
- ✅ Filter todos (All, Active, Completed)
- ✅ Clear completed todos
- ✅ Local storage persistence
- ✅ Input validation
- ✅ Responsive design

---

### 2. Medium React App (`tests/fixtures/medium-project/`)
**Complexity**: Intermediate to Advanced  
**Focus**: Modern React patterns, state management, routing

#### Architecture
- **React 18**: Modern hooks, concurrent features
- **TypeScript**: Full type safety
- **State Management**: Zustand + React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form with validation
- **Styling**: Tailwind CSS + custom components
- **API Layer**: Axios with interceptors
- **Custom Hooks**: Encapsulated business logic

#### Key Patterns Demonstrated
- Custom hooks for data fetching and state
- Service layer for API communication
- Component composition patterns
- Query caching and synchronization
- Protected routes and authentication
- Form validation and error handling
- Responsive design with Tailwind
- Dark mode support
- Loading states and error boundaries

#### File Structure
```
medium-project/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── common/      # Generic components
│   │   ├── forms/       # Form-specific components
│   │   ├── layout/      # Layout components
│   │   └── listings/    # List and table components
│   ├── pages/           # Page components
│   │   ├── home/        # Home page
│   │   ├── about/       # About page
│   │   └── dashboard/   # Dashboard page
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API service layer
│   ├── store/           # Zustand state management
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utility functions
│   └── styles/          # Global styles & Tailwind
└── package.json
```

#### Features
- ✅ Modern React patterns
- ✅ TypeScript integration
- ✅ State management with Zustand
- ✅ Server state with React Query
- ✅ React Router v6 routing
- ✅ Form handling with React Hook Form
- ✅ Tailwind CSS styling
- ✅ Custom hook patterns
- ✅ API integration with Axios
- ✅ Responsive design
- ✅ Dark mode support

---

### 3. Advanced Project (`tests/fixtures/advanced-project/`)
**Complexity**: Advanced to Expert  
**Focus**: Full-stack architecture, microservices, enterprise patterns

#### Architecture
- **Full-Stack**: Node.js backend + React frontend
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io integration
- **Background Jobs**: Bull queue system
- **Caching**: Redis integration
- **File Storage**: AWS S3 integration
- **Payments**: Stripe integration
- **Monitoring**: Winston logging
- **Error Handling**: Comprehensive middleware
- **Testing**: Jest with coverage
- **Docker**: Containerization support

#### Key Patterns Demonstrated
- Full-stack application architecture
- Microservices patterns
- Advanced authentication & authorization
- Real-time communication
- Background job processing
- Caching strategies
- File upload and processing
- Payment integration
- Comprehensive error handling
- Logging and monitoring
- Database optimization
- API rate limiting
- Security best practices
- Testing strategies

#### File Structure
```
advanced-project/
├── server/              # Backend (Node.js/Express)
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   ├── config/         # Configuration
│   │   └── types/          # TypeScript types
│   └── tsconfig.json
├── client/              # Frontend (React)
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # UI components
│   │   │   ├── forms/      # Form components
│   │   │   ├── charts/     # Chart components
│   │   │   ├── tables/     # Table components
│   │   │   ├── layout/     # Layout components
│   │   │   └── auth/       # Auth components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utilities
│   │   ├── styles/         # Styles
│   │   └── assets/         # Static assets
│   └── tsconfig.json
├── shared/              # Shared code
│   ├── types/           # Common TypeScript types
│   ├── utils/           # Shared utilities
│   └── constants/       # Shared constants
├── docker-compose.yml   # Docker configuration
└── package.json
```

#### Features
- ✅ Full-stack architecture
- ✅ Advanced authentication & authorization
- ✅ Real-time features with Socket.io
- ✅ Background job processing
- ✅ Redis caching
- ✅ File upload and processing
- ✅ Payment integration
- ✅ Comprehensive logging
- ✅ Error handling middleware
- ✅ API rate limiting
- ✅ Database optimization
- ✅ Docker containerization
- ✅ Testing with Jest
- ✅ Security best practices

---

## Testing Scenarios

### Simple Project Testing
The simple todo app is perfect for testing:
- Basic code generation
- Component creation
- Model and service patterns
- DOM manipulation
- Event handling
- Form validation

### Medium Project Testing
The React app tests:
- Modern React patterns
- TypeScript integration
- State management
- API integration
- Custom hooks
- Routing
- Form handling
- Error boundaries

### Advanced Project Testing
The advanced project tests:
- Full-stack development
- Authentication systems
- Database operations
- Real-time features
- Background processing
- File handling
- Payment systems
- Microservices patterns
- Enterprise architecture

---

## Key Patterns Across Projects

### 1. Component Architecture
- **Simple**: Class-based components
- **Medium**: Functional components with hooks
- **Advanced**: Advanced composition patterns

### 2. State Management
- **Simple**: Local component state
- **Medium**: Zustand + React Query
- **Advanced**: Complex state orchestration

### 3. API Integration
- **Simple**: Local storage
- **Medium**: Axios with interceptors
- **Advanced**: Full API gateway patterns

### 4. Error Handling
- **Simple**: Basic error display
- **Medium**: Error boundaries + toast notifications
- **Advanced**: Comprehensive middleware stack

### 5. Testing
- **Simple**: Basic validation
- **Medium**: Component testing patterns
- **Advanced**: Full test suites with coverage

---

## Usage Instructions

### Simple Project
```bash
cd tests/fixtures/simple-project
npm install
npm run dev  # Start development server
npm run build  # Build for production
```

### Medium Project
```bash
cd tests/fixtures/medium-project
npm install
npm start  # Start React development server
npm run build  # Build for production
```

### Advanced Project
```bash
cd tests/fixtures/advanced-project
npm install
npm run dev  # Start both server and client
npm run docker:up  # Start with Docker
```

---

## Testing the AI Code Agent

These projects provide comprehensive test cases for:

1. **Code Generation**: Generate components, services, utilities
2. **Type Safety**: Test TypeScript integration
3. **Architecture Patterns**: Validate architectural approaches
4. **Best Practices**: Ensure coding standards
5. **Error Handling**: Test error scenarios
6. **Performance**: Analyze optimization opportunities
7. **Security**: Validate security implementations
8. **Testing**: Generate test cases

Each project demonstrates different complexity levels and architectural patterns, making them ideal for testing the AI Code Agent's ability to understand, generate, and improve code across various scenarios.

---

## Summary

These three projects provide a comprehensive suite for testing the AI Code Agent system:

- **Simple Project**: Foundation patterns and basic architecture
- **Medium Project**: Modern React development patterns
- **Advanced Project**: Enterprise-level full-stack architecture

Together, they cover the spectrum from beginner to expert-level development, providing comprehensive test scenarios for any AI code generation system.