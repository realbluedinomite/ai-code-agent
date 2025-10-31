# Medium React App

A medium-complexity React application demonstrating modern React patterns, state management, routing, and API integration.

## Features

### Core Features
- ✅ React 18 with TypeScript
- ✅ React Router v6 for navigation
- ✅ React Query for server state management
- ✅ Zustand for client state management
- ✅ React Hook Form for form handling
- ✅ Tailwind CSS for styling
- ✅ Axios for API communication

### Components & Patterns
- ✅ Custom hooks for data fetching and state
- ✅ Modal, Card, Button, Input components
- ✅ Form validation and error handling
- ✅ Loading states and error boundaries
- ✅ Responsive design with mobile support
- ✅ Dark mode support

### Architecture
- ✅ Component composition patterns
- ✅ Custom hook patterns
- ✅ Service layer for API calls
- ✅ State management with Zustand
- ✅ Query caching with React Query
- ✅ Type-safe API integration

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Modal, Card)
│   ├── forms/          # Form-specific components
│   ├── layout/         # Layout components
│   └── listings/       # List and table components
├── pages/              # Page components
│   ├── home/           # Home page
│   ├── about/          # About page
│   └── dashboard/      # Dashboard page
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
├── styles/             # Global styles and Tailwind config
└── App.tsx             # Main application component
```

## Key Technologies

### State Management
- **Zustand**: Lightweight state management for client state
- **React Query**: Server state management with caching
- **Custom Hooks**: Encapsulate business logic

### Routing & Navigation
- **React Router v6**: Declarative routing
- **Protected Routes**: Authentication-based route protection
- **Nested Routes**: Complex routing patterns

### Form Handling
- **React Hook Form**: Performant forms with validation
- **Custom Validation**: Reusable validation patterns
- **Error Handling**: Comprehensive error display

### API Integration
- **Axios**: HTTP client with interceptors
- **Type-safe APIs**: Full TypeScript integration
- **Request/Response Interceptors**: Automatic token handling
- **Error Handling**: Centralized error management

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Component Design**: Reusable component patterns
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Automatic theme switching

## Usage Examples

### Using Custom Hooks
```tsx
import { usePostsQuery, usePostMutation } from './hooks';

const PostsComponent = () => {
  const { data: posts, isLoading, error } = usePostsQuery(filters);
  const createPost = usePostMutation();

  const handleCreatePost = async (postData) => {
    await createPost.mutateAsync(postData);
  };

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {posts?.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};
```

### State Management
```tsx
import { useAuth, useUI } from './store';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useUI();

  return (
    <header>
      <h1>Welcome {user?.firstName}</h1>
      <button onClick={toggleTheme}>
        Switch to {theme === 'light' ? 'dark' : 'light'} mode
      </button>
    </header>
  );
};
```

### Service Layer
```tsx
import { postsService } from './services/api';

const PostDetail = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await postsService.getPost(id);
        setPost(response.data);
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);
};
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Key Patterns Demonstrated

1. **Custom Hooks**: Encapsulate complex logic and state
2. **Service Layer**: Separate API concerns from components
3. **State Management**: Centralized client state with Zustand
4. **Query Caching**: Efficient server state with React Query
5. **Component Composition**: Reusable component patterns
6. **Type Safety**: Full TypeScript integration
7. **Error Boundaries**: Graceful error handling
8. **Loading States**: User-friendly loading indicators
9. **Responsive Design**: Mobile-first responsive layouts
10. **Accessibility**: ARIA labels and keyboard navigation