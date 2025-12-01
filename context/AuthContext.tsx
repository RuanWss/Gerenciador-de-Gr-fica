import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { STORAGE_KEY_USER } from '../constants';
import { getUsers } from '../services/mockStorage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Initialize DB if needed
    getUsers(); 
  }, []);

  const login = (email: string, password?: string): boolean => {
    const allUsers = getUsers();
    // Simulating password check. In real app, hash checking.
    // For now, checks if user exists and if password matches (if provided). 
    // If mocking without password input in some scenarios, we might be lenient, 
    // but the requirement asks for Login & Password creation.
    
    const foundUser = allUsers.find(u => u.email === email);
    
    if (foundUser) {
      if (password && foundUser.password && foundUser.password !== password) {
        return false;
      }
      setUser(foundUser);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};