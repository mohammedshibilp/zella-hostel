import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '../types';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hostel_token'));
  const [role, setRole] = useState<UserRole | null>(() => (localStorage.getItem('hostel_role') as UserRole) || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('hostel_token');
    localStorage.removeItem('hostel_role');
    localStorage.removeItem('hostel_user');
    setUser(null);
    setToken(null);
    setRole(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setRole(currentUser.role);
      localStorage.setItem('hostel_role', currentUser.role);
    } catch (err) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('hostel_token', data.access_token);
      localStorage.setItem('hostel_role', data.role);
      setToken(data.access_token);
      setRole(data.role as UserRole);
      
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF' || role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        isAdmin,
        isStaff,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
