import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'business_nexus_user';
const TOKEN_STORAGE_KEY = 'business_nexus_token';

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        try {
          // Fetch current user from server
          const response = await api.get('/auth/me');
          setUser(response.data);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
        } catch (error) {
          console.error('Failed to load user info on init:', error);
          // Token expired or invalid
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string, role?: UserRole): Promise<{ require2FA?: boolean; requiresVerification?: boolean; userId?: string; email?: string; role?: UserRole } | void> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password, role });
      
      if (response.data.require2FA) {
        toast.success('2FA code has been emailed to you!');
        return {
          require2FA: true,
          userId: response.data.userId
        };
      }

      const { token, user: loggedUser } = response.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
      setUser(loggedUser);
      toast.success('Successfully logged in!');
      return { role: loggedUser.role };
    } catch (error: any) {
      if (error.response?.data?.requiresVerification) {
        toast.error(error.response.data.message || 'Please verify your email.');
        return {
          requiresVerification: true,
          userId: error.response.data.userId,
          email: error.response.data.email
        };
      }
      const msg = !error.response
        ? 'Cannot reach the server. Make sure the backend is running on port 5000.'
        : (error.response?.data?.message || 'Invalid credentials or user not found');
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify 2FA function
  const verify2FA = async (userId: string, code: string): Promise<{ role?: UserRole } | void> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', { userId, code });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
      setUser(loggedUser);
      toast.success('2FA Verified! Successfully logged in.');
      return { role: loggedUser.role };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Invalid OTP code';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, role: UserRole): Promise<{ requiresVerification?: boolean; tempToken?: string; email?: string } | void> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      if (response.data.requiresVerification) {
        toast.success('Email verification code sent to your Gmail!');
        return {
          requiresVerification: true,
          tempToken: response.data.tempToken,
          email: response.data.email
        };
      }

      const { token, user: newUser } = response.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      toast.success('Account created successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Email (Registration OTP) function
  const verifyEmail = async (tempToken: string, code: string): Promise<{ role?: UserRole } | void> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-email', { tempToken, code });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
      setUser(loggedUser);
      toast.success('Email verified successfully! Welcome to Nexus.');
      return { role: loggedUser.role };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Invalid verification OTP code';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset instructions sent to your email');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to request password reset';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // Reset password function
  const resetPassword = async (email: string, token: string, newPassword: string): Promise<void> => {
    try {
      await api.post('/auth/reset-password', { email, code: token, newPassword });
      toast.success('Password reset successfully');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to reset password';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // Logout function
  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      console.log('Updating profile for user:', userId);
      const response = await api.put('/users/profile', updates);
      const updatedUser = response.data;
      
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
    verify2FA,
    verifyEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};