import axios, { AxiosResponse } from 'axios';
import { User, Post, Comment, ApiResponse, PaginatedResponse, FilterOptions } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Request interceptor for auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API response handler
const handleApiResponse = <T>(response: AxiosResponse): T => {
  return response.data;
};

// Generic error handler
const handleApiError = (error: any): never => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || 'Server error occurred';
    throw new Error(message);
  } else if (error.request) {
    // Request was made but no response received
    throw new Error('Network error occurred');
  } else {
    // Something else happened
    throw new Error(error.message || 'Unknown error occurred');
  }
};

// Auth Service
export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await axios.post('/auth/login', { email, password });
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async register(userData: Partial<User> & { password: string }): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await axios.post('/auth/register', userData);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await axios.post('/auth/logout');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await axios.post('/auth/refresh');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await axios.get('/auth/me');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Posts Service
export const postsService = {
  async getPosts(filters?: FilterOptions): Promise<PaginatedResponse<Post>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));

      const response = await axios.get(`/posts?${params.toString()}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getPost(id: string): Promise<ApiResponse<Post>> {
    try {
      const response = await axios.get(`/posts/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async createPost(postData: Partial<Post>): Promise<ApiResponse<Post>> {
    try {
      const response = await axios.post('/posts', postData);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async updatePost(id: string, updates: Partial<Post>): Promise<ApiResponse<Post>> {
    try {
      const response = await axios.put(`/posts/${id}`, updates);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async deletePost(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await axios.delete(`/posts/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async publishPost(id: string): Promise<ApiResponse<Post>> {
    try {
      const response = await axios.post(`/posts/${id}/publish`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Comments Service
export const commentsService = {
  async getComments(postId: string): Promise<ApiResponse<Comment[]>> {
    try {
      const response = await axios.get(`/posts/${postId}/comments`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async createComment(commentData: Partial<Comment>): Promise<ApiResponse<Comment>> {
    try {
      const response = await axios.post('/comments', commentData);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async updateComment(id: string, updates: Partial<Comment>): Promise<ApiResponse<Comment>> {
    try {
      const response = await axios.put(`/comments/${id}`, updates);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async deleteComment(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await axios.delete(`/comments/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getCommentReplies(commentId: string): Promise<ApiResponse<Comment[]>> {
    try {
      const response = await axios.get(`/comments/${commentId}/replies`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Users Service
export const usersService = {
  async getUsers(filters?: FilterOptions): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await axios.get(`/users?${params.toString()}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await axios.get(`/users/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await axios.put(`/users/${id}`, updates);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await axios.delete(`/users/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// File Upload Service
export const fileService = {
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<{ url: string; filename: string }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async deleteFile(filename: string): Promise<ApiResponse<null>> {
    try {
      const response = await axios.delete(`/upload/${filename}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Search Service
export const searchService = {
  async search(query: string, filters?: FilterOptions): Promise<ApiResponse<{
    posts: Post[];
    users: User[];
  }>> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));

      const response = await axios.get(`/search?${params.toString()}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
    try {
      const response = await axios.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Analytics Service
export const analyticsService = {
  async getDashboardStats(): Promise<ApiResponse<{
    totalPosts: number;
    totalUsers: number;
    totalComments: number;
    recentActivity: Array<{
      id: string;
      type: 'post' | 'comment' | 'user';
      title: string;
      timestamp: string;
    }>;
  }>> {
    try {
      const response = await axios.get('/analytics/dashboard');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getPostAnalytics(postId: string): Promise<ApiResponse<{
    views: number;
    likes: number;
    comments: number;
    shares: number;
    dailyViews: Array<{ date: string; views: number }>;
  }>> {
    try {
      const response = await axios.get(`/analytics/posts/${postId}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Health Check Service
export const healthService = {
  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await axios.get('/health');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
};