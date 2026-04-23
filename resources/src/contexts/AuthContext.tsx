import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '@/types';
import { api } from '@/lib/api';
import { initializeDataFromApi } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    password_confirmation?: string;
    name: string;
    phone?: string;
    address?: string;
    role?: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

type AuthResponse = { success: boolean; error?: string };
type RegisterInput = {
  email: string;
  password: string;
  password_confirmation?: string;
  name: string;
  phone?: string;
  address?: string;
  role?: UserRole;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
          initializeDataFromApi().catch((error) => console.error('Could not initialize backend data', error));
        } catch (error) {
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const data = await api.login({ email, password });
      setUser(data.user);
      initializeDataFromApi().catch((error) => console.error('Could not initialize backend data', error));
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, 'Login failed') };
    }
  }, []);

  const register = useCallback(async (data: RegisterInput): Promise<AuthResponse> => {
    try {
      // Ensure password_confirmation is sent if not present
      const registerData = {
        ...data,
        password_confirmation: data.password_confirmation || data.password
      };
      const responseData = await api.register(registerData);
      setUser(responseData.user);
      initializeDataFromApi().catch((error) => console.error('Could not initialize backend data', error));
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, 'Registration failed') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const response = await api.updateProfile(data);
      setUser(response.user);
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    try {
      await api.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPassword,
      });
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error, 'Failed to change password') };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
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
