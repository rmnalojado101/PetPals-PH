import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '@/types';
import { usersStorage, sessionStorage, initializeSeedData } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    role?: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize seed data on first load
    initializeSeedData();
    
    // Check for existing session
    const savedUser = sessionStorage.get();
    if (savedUser) {
      // Verify user still exists
      const currentUser = usersStorage.getById(savedUser.id);
      if (currentUser) {
        setUser(currentUser);
      } else {
        sessionStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const foundUser = usersStorage.getByEmail(email);
    
    if (!foundUser) {
      return { success: false, error: 'User not found. Please check your email.' };
    }

    if (foundUser.password !== password) {
      return { success: false, error: 'Invalid password. Please try again.' };
    }

    setUser(foundUser);
    sessionStorage.set(foundUser);
    return { success: true };
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    role?: UserRole;
  }) => {
    // Check if email already exists
    const existingUser = usersStorage.getByEmail(data.email);
    if (existingUser) {
      return { success: false, error: 'Email already registered. Please login instead.' };
    }

    // Create new user account
    const newUser = usersStorage.create({
      ...data,
      role: data.role || 'owner',
    });

    setUser(newUser);
    sessionStorage.set(newUser);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.clear();
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return false;
    
    const updated = usersStorage.update(user.id, data);
    if (updated) {
      setUser(updated);
      sessionStorage.set(updated);
      return true;
    }
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
