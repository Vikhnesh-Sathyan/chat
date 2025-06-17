import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email: string, password: string) => {
    // TODO: Replace with actual API call
    // For now, we'll just simulate a successful login
    if (email && password) {
      setIsAuthenticated(true);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const register = async (email: string, password: string) => {
    // TODO: Replace with actual API call
    // For now, we'll just simulate a successful registration
    if (email && password) {
      setIsAuthenticated(true);
    } else {
      throw new Error('Invalid registration data');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}; 