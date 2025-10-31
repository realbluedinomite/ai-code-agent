import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Post, User, Comment, FilterOptions } from '../types';
import { useAuth, usePosts, useComments, useUI } from '../store';
import { storage, debouncedSearch } from '../utils';

// Generic hooks
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.get(key, initialValue);
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useClickOutside = (ref: React.RefObject<HTMLElement>) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);

  return [isOpen, setIsOpen] as const;
};

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

// API hooks
export const usePostsQuery = (filters?: FilterOptions) => {
  const queryClient = useQueryClient();
  const { addNotification } = useUI();

  return useQuery(
    ['posts', filters],
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockPosts: Post[] = [
        {
          id: '1',
          title: 'Introduction to React Hooks',
          content: 'React Hooks are functions that let you use state and lifecycle features in functional components...',
          excerpt: 'Learn about React Hooks and how they revolutionize functional components.',
          authorId: '1',
          status: 'published',
          tags: ['react', 'hooks', 'javascript'],
          publishedAt: '2023-01-15T10:00:00Z',
          createdAt: '2023-01-14T15:30:00Z',
          updatedAt: '2023-01-15T10:00:00Z'
        },
        {
          id: '2',
          title: 'TypeScript Best Practices',
          content: 'TypeScript provides static typing to JavaScript, making your code more robust and maintainable...',
          excerpt: 'Essential TypeScript patterns for better code quality.',
          authorId: '2',
          status: 'published',
          tags: ['typescript', 'best-practices', 'javascript'],
          publishedAt: '2023-01-20T14:00:00Z',
          createdAt: '2023-01-19T09:15:00Z',
          updatedAt: '2023-01-20T14:00:00Z'
        },
        {
          id: '3',
          title: 'State Management with Zustand',
          content: 'Zustand is a small, fast and scalable bearbones state-management solution...',
          excerpt: 'Discover how Zustand simplifies state management in React applications.',
          authorId: '1',
          status: 'draft',
          tags: ['zustand', 'state-management', 'react'],
          createdAt: '2023-01-22T11:45:00Z',
          updatedAt: '2023-01-22T11:45:00Z'
        }
      ];

      return mockPosts;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        addNotification({
          type: 'error',
          message: 'Failed to load posts'
        });
      }
    }
  );
};

export const usePostMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUI();

  return useMutation(
    async (postData: Partial<Post>) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPost: Post = {
        id: Math.random().toString(36).substr(2, 9),
        title: postData.title || '',
        content: postData.content || '',
        excerpt: postData.excerpt || '',
        authorId: postData.authorId || '',
        status: postData.status || 'draft',
        tags: postData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return newPost;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('posts');
        addNotification({
          type: 'success',
          message: 'Post created successfully'
        });
      },
      onError: () => {
        addNotification({
          type: 'error',
          message: 'Failed to create post'
        });
      }
    }
  );
};

export const useUpdatePostMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUI();

  return useMutation(
    async ({ id, updates }: { id: string; updates: Partial<Post> }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { id, updates: { ...updates, updatedAt: new Date().toISOString() } };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('posts');
        addNotification({
          type: 'success',
          message: 'Post updated successfully'
        });
      },
      onError: () => {
        addNotification({
          type: 'error',
          message: 'Failed to update post'
        });
      }
    }
  );
};

export const useDeletePostMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUI();

  return useMutation(
    async (id: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return id;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('posts');
        addNotification({
          type: 'success',
          message: 'Post deleted successfully'
        });
      },
      onError: () => {
        addNotification({
          type: 'error',
          message: 'Failed to delete post'
        });
      }
    }
  );
};

export const useCommentsQuery = (postId: string) => {
  const { addNotification } = useUI();

  return useQuery(
    ['comments', postId],
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockComments: Comment[] = [
        {
          id: '1',
          postId,
          authorId: '1',
          content: 'Great article! Very informative.',
          createdAt: '2023-01-15T12:00:00Z',
          updatedAt: '2023-01-15T12:00:00Z'
        },
        {
          id: '2',
          postId,
          authorId: '2',
          content: 'I learned a lot from this post. Thanks for sharing!',
          createdAt: '2023-01-15T14:30:00Z',
          updatedAt: '2023-01-15T14:30:00Z'
        }
      ];

      return mockComments;
    },
    {
      enabled: !!postId,
      onError: () => {
        addNotification({
          type: 'error',
          message: 'Failed to load comments'
        });
      }
    }
  );
};

export const useCommentMutation = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUI();

  return useMutation(
    async (commentData: Partial<Comment>) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newComment: Comment = {
        id: Math.random().toString(36).substr(2, 9),
        postId: commentData.postId || '',
        authorId: commentData.authorId || '',
        content: commentData.content || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return newComment;
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['comments', variables.postId]);
        addNotification({
          type: 'success',
          message: 'Comment added successfully'
        });
      },
      onError: () => {
        addNotification({
          type: 'error',
          message: 'Failed to add comment'
        });
      }
    }
  );
};

// Auth hooks
export const useAuth = () => {
  const auth = useAuthStore();
  const { addNotification } = useUI();

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: '1',
        email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      const token = 'mock-jwt-token';

      auth.login(mockUser, token);
      addNotification({
        type: 'success',
        message: 'Login successful'
      });

      return { user: mockUser, token };
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Login failed'
      });
      throw error;
    }
  }, [auth, addNotification]);

  const logout = useCallback(() => {
    auth.logout();
    addNotification({
      type: 'info',
      message: 'Logged out successfully'
    });
  }, [auth, addNotification]);

  return {
    ...auth,
    login,
    logout
  };
};

// Form hooks
export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationRules?: Partial<Record<keyof T, (value: any) => string | null>>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name] && validationRules?.[name]) {
      const error = validationRules[name]!(value);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  }, [touched, validationRules]);

  const setFieldTouched = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const validate = useCallback(() => {
    if (!validationRules) return true;

    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach(key => {
      const error = validationRules[key]!(values[key]);
      if (error) {
        newErrors[key as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validate,
    reset
  };
};

// Theme and UI hooks
export const useTheme = () => {
  const { theme, setTheme } = useUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme: toggleTheme };
};

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) setScreenSize('mobile');
      else if (window.innerWidth < 1024) setScreenSize('tablet');
      else setScreenSize('desktop');
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
};