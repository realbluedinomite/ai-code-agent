import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '../../../shared/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        
        setUser: (user) => set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        logout: () => set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          user: state.user,
          isAuthenticated: state.isAuthenticated 
        }),
      }
    )
  )
);
