import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    timestamp: Date;
    read: boolean;
  }>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        sidebarOpen: true,
        sidebarCollapsed: false,
        notifications: [],
        
        setTheme: (theme) => set({ theme }),
        
        toggleSidebar: () => set((state) => ({ 
          sidebarOpen: !state.sidebarOpen 
        })),
        
        toggleSidebarCollapse: () => set((state) => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        })),
        
        addNotification: (notification) => set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              read: false,
            },
            ...state.notifications,
          ].slice(0, 50), // Keep only last 50 notifications
        })),
        
        markNotificationAsRead: (id) => set((state) => ({
          notifications: state.notifications.map((notif) =>
            notif.id === id ? { ...notif, read: true } : notif
          ),
        })),
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter((notif) => notif.id !== id),
        })),
        
        clearNotifications: () => set({ notifications: [] }),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);
