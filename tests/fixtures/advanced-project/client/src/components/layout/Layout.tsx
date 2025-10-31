import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useUIStore } from '../../store/uiStore';

export const Layout: React.FC = () => {
  const { sidebarOpen, theme } = useUIStore();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        
        <div className="flex flex-1">
          {sidebarOpen && <Sidebar />}
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Outlet />
            </div>
          </main>
        </div>
        
        <Footer />
      </div>
    </div>
  );
};
