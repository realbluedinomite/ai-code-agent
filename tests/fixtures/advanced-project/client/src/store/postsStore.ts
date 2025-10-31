import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Post, PaginatedResponse, FilterOptions } from '../../../shared/types';

interface PostsState {
  posts: Post[];
  selectedPost: Post | null;
  isLoading: boolean;
  error: string | null;
  filters: FilterOptions;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  setSelectedPost: (post: Post | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  clearFilters: () => void;
  setPagination: (pagination: PostsState['pagination']) => void;
}

export const usePostsStore = create<PostsState>()(
  devtools(
    persist(
      (set, get) => ({
        posts: [],
        selectedPost: null,
        isLoading: false,
        error: null,
        filters: {},
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        
        setPosts: (posts) => set({ posts }),
        
        addPost: (post) => set((state) => ({
          posts: [post, ...state.posts],
        })),
        
        updatePost: (id, updates) => set((state) => ({
          posts: state.posts.map((post) =>
            post.id === id ? { ...post, ...updates } : post
          ),
          selectedPost: state.selectedPost?.id === id
            ? { ...state.selectedPost, ...updates }
            : state.selectedPost,
        })),
        
        deletePost: (id) => set((state) => ({
          posts: state.posts.filter((post) => post.id !== id),
          selectedPost: state.selectedPost?.id === id ? null : state.selectedPost,
        })),
        
        setSelectedPost: (post) => set({ selectedPost: post }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        setError: (error) => set({ error }),
        
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
        
        clearFilters: () => set({ filters: {} }),
        
        setPagination: (pagination) => set({ pagination }),
      }),
      {
        name: 'posts-storage',
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    )
  )
);
