import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../services/api';
import { User, LoginCredentials, ApiResponse, AuthTokens } from '../../../shared/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading } = useQuery<User>(
    ['auth', 'me'],
    async () => {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (!response.data.success || !response.data.data) {
        throw new Error('Failed to get user');
      }
      return response.data.data;
    },
    {
      enabled: isInitialized,
      retry: false,
      onError: () => {
        // Token might be expired, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },
    }
  );

  // Login mutation
  const loginMutation = useMutation(
    async (credentials: LoginCredentials) => {
      const response = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
        '/auth/login',
        credentials
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Login failed');
      }
      
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        queryClient.setQueryData(['auth', 'me'], data.user);
        toast.success('Login successful!');
        navigate('/app/dashboard');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Login failed');
      },
    }
  );

  // Register mutation
  const registerMutation = useMutation(
    async (data: RegisterData) => {
      const response = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
        '/auth/register',
        data
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Registration failed');
      }
      
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        queryClient.setQueryData(['auth', 'me'], data.user);
        toast.success('Registration successful!');
        navigate('/app/dashboard');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Registration failed');
      },
    }
  );

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      queryClient.prefetchQuery(['auth', 'me']);
    }
    setIsInitialized(true);
  }, [queryClient]);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    queryClient.clear();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const updateUser = (data: Partial<User>) => {
    queryClient.setQueryData(['auth', 'me'], (old: User | undefined) => 
      old ? { ...old, ...data } : undefined
    );
  };

  const value: AuthContextType = {
    user: user || null,
    isAuthenticated: !!user,
    isLoading: isLoading || !isInitialized,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
