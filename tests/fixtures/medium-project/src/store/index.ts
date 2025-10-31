import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Post, Comment, FilterOptions, AsyncState } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

interface PostsState extends AsyncState<Post[]> {
  filters: FilterOptions;
  selectedPost: Post | null;
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  setSelectedPost: (post: Post | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  clearFilters: () => void;
  filteredPosts: Post[];
}

interface CommentsState extends AsyncState<Comment[]> {
  postComments: Record<string, Comment[]>;
  setPostComments: (postId: string, comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  deleteComment: (id: string) => void;
  getCommentsForPost: (postId: string) => Comment[];
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface AppStore {
  auth: AuthState;
  posts: PostsState;
  comments: CommentsState;
  ui: UIState;
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        
        login: (user, token) => set({
          user,
          token,
          isAuthenticated: true
        }),
        
        logout: () => set({
          user: null,
          token: null,
          isAuthenticated: false
        }),
        
        updateUser: (updates) => set(state => ({
          user: state.user ? { ...state.user, ...updates } : null
        }))
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated
        })
      }
    )
  )
);

// Posts Store
export const usePostsStore = create<PostsState>()(
  devtools(
    (set, get) => ({
      data: null,
      isLoading: false,
      error: null,
      filters: {},
      selectedPost: null,
      
      setPosts: (posts) => set({
        data: posts,
        isLoading: false,
        error: null
      }),
      
      addPost: (post) => set(state => ({
        data: state.data ? [post, ...state.data] : [post]
      })),
      
      updatePost: (id, updates) => set(state => ({
        data: state.data?.map(post => 
          post.id === id ? { ...post, ...updates } : post
        ) || []
      })),
      
      deletePost: (id) => set(state => ({
        data: state.data?.filter(post => post.id !== id) || []
      })),
      
      setSelectedPost: (post) => set({ selectedPost: post }),
      
      setFilters: (filters) => set(state => ({
        filters: { ...state.filters, ...filters }
      })),
      
      clearFilters: () => set({ filters: {} }),
      
      get filteredPosts() {
        const { data, filters } = get();
        if (!data) return [];
        
        let filtered = [...data];
        
        // Apply search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filtered = filtered.filter(post => 
            post.title.toLowerCase().includes(searchTerm) ||
            post.content.toLowerCase().includes(searchTerm) ||
            post.excerpt.toLowerCase().includes(searchTerm)
          );
        }
        
        // Apply status filter
        if (filters.status) {
          filtered = filtered.filter(post => post.status === filters.status);
        }
        
        // Apply tags filter
        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter(post =>
            filters.tags!.some(tag => post.tags.includes(tag))
          );
        }
        
        // Apply sorting
        if (filters.sortBy) {
          const sortKey = filters.sortBy as keyof Post;
          const sortOrder = filters.sortOrder || 'desc';
          filtered.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        
        return filtered;
      }
    })
  )
);

// Comments Store
export const useCommentsStore = create<CommentsState>()(
  devtools(
    (set, get) => ({
      data: null,
      isLoading: false,
      error: null,
      postComments: {},
      
      setPostComments: (postId, comments) => set(state => ({
        postComments: { ...state.postComments, [postId]: comments }
      })),
      
      addComment: (comment) => set(state => {
        const postComments = { ...state.postComments };
        const comments = postComments[comment.postId] || [];
        postComments[comment.postId] = [...comments, comment];
        return { postComments };
      }),
      
      updateComment: (id, updates) => set(state => {
        const postComments = { ...state.postComments };
        
        Object.keys(postComments).forEach(postId => {
          postComments[postId] = postComments[postId].map(comment =>
            comment.id === id ? { ...comment, ...updates } : comment
          );
        });
        
        return { postComments };
      }),
      
      deleteComment: (id) => set(state => {
        const postComments = { ...state.postComments };
        
        Object.keys(postComments).forEach(postId => {
          postComments[postId] = postComments[postId].filter(comment => comment.id !== id);
        });
        
        return { postComments };
      }),
      
      getCommentsForPost: (postId) => {
        const { postComments } = get();
        return postComments[postId] || [];
      }
    })
  )
);

// UI Store
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'light',
        sidebarOpen: true,
        notifications: [],
        
        setTheme: (theme) => set({ theme }),
        
        toggleSidebar: () => set(state => ({
          sidebarOpen: !state.sidebarOpen
        })),
        
        addNotification: (notification) => set(state => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date()
            }
          ]
        })),
        
        removeNotification: (id) => set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        
        clearNotifications: () => set({ notifications: [] })
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen
        })
      }
    )
  )
);

// App Store (combined)
export const useAppStore = create<AppStore>()(
  devtools((set, get) => ({
    auth: useAuthStore.getState(),
    posts: usePostsStore.getState(),
    comments: useCommentsStore.getState(),
    ui: useUIStore.getState()
  }))
);

// Selectors
export const useAuth = () => useAuthStore();
export const usePosts = () => usePostsStore();
export const useComments = () => useCommentsStore();
export const useUI = () => useUIStore();