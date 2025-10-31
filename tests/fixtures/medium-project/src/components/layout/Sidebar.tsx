import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUI } from '../../store';

interface SidebarItem {
  label: string;
  path: string;
  icon?: string;
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Posts', path: '/dashboard/posts' },
  { label: 'Create Post', path: '/dashboard/posts/new' },
  { label: 'Users', path: '/dashboard/users' },
  { label: 'Settings', path: '/dashboard/settings' }
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen } = useUI();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {item.icon && (
                  <span className="mr-3 text-lg">{item.icon}</span>
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Additional Sidebar Content */}
      <div className="mt-8 px-2">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick Stats
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Posts</span>
              <span className="font-medium text-gray-900">24</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Users</span>
              <span className="font-medium text-gray-900">156</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Comments</span>
              <span className="font-medium text-gray-900">89</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
