import { useAuthStore } from '../store';

export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    login: loginStore,
    logout: logoutStore,
    updateUser
  } = useAuthStore();

  const login = async (email: string, password: string) => {
    // This would typically call an API
    // For demo purposes, we'll simulate a login
    const mockUser = {
      id: '1',
      email,
      firstName: 'John',
      lastName: 'Doe',
      avatar: undefined,
      role: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const mockToken = 'mock-jwt-token';
    
    loginStore(mockUser, mockToken);
    localStorage.setItem('auth_token', mockToken);
  };

  const logout = () => {
    logoutStore();
    localStorage.removeItem('auth_token');
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser
  };
};
