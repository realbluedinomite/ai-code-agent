import React from 'react';
import { User } from '../../types';

interface UserListProps {
  users: User[];
  onUserClick?: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onUserClick }) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {users.map((user) => (
          <li
            key={user.id}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onUserClick?.(user)}
          >
            <div className="flex items-center space-x-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-lg">
                  {user.firstName.charAt(0)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'moderator'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
