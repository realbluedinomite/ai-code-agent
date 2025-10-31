# Simple Todo App

A straightforward todo application demonstrating basic TypeScript patterns and vanilla JavaScript DOM manipulation.

## Features

- ✅ Add, edit, and delete todos
- ✅ Mark todos as complete/incomplete
- ✅ Filter todos (All, Active, Completed)
- ✅ Clear completed todos
- ✅ Local storage persistence
- ✅ Input validation
- ✅ Responsive design

## Architecture

### Components
- `TodoApp` - Main application component orchestrating everything
- `TodoList` - Handles rendering and interactions for the todo list

### Services
- `TodoService` - Business logic for todo operations
- `LocalStorageTodoRepository` - Data persistence layer

### Models
- `TodoModel` - Domain model for todo items

### Utilities
- Helper functions for validation, formatting, and DOM utilities

## Project Structure

```
src/
├── components/          # UI components
│   ├── TodoApp.ts      # Main app component
│   └── TodoList.ts     # Todo list component
├── models/             # Data models
│   └── Todo.ts         # Todo domain model
├── services/           # Business logic
│   └── TodoService.ts  # Todo operations and repository
├── utils/              # Utility functions
│   └── helpers.ts      # Common helper functions
└── index.ts            # Application entry point

public/
├── index.html          # HTML template
└── styles.css          # Application styles
```

## Key Patterns Demonstrated

1. **Component-based Architecture**: Clear separation of UI components
2. **Service Layer**: Business logic separated from UI
3. **Repository Pattern**: Data access abstraction
4. **Model-View Separation**: Clear data and presentation boundaries
5. **Event-driven Updates**: Components respond to data changes

## Usage

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```