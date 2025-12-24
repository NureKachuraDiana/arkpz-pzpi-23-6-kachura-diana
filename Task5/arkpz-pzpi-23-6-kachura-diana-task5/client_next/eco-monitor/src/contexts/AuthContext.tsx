'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiService } from '@/api';
import type { User, Role } from '@/api/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for persisting auth state
const AUTH_STORAGE_KEY = 'ecomonitor_auth_state';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isCheckingAuth = useRef(false);
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const justLoggedIn = useRef(false);

  // Load persisted user state on mount (optimistic UI)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsedUser = JSON.parse(stored);
          setUser(parsedUser);
          // Set loading to false immediately for better UX
          // Real auth check will happen in checkAuth()
        }
      } catch (error) {
        console.error('Failed to load persisted auth state:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const checkAuth = useCallback(async (skipLoading = false) => {
    if (isCheckingAuth.current) {
      return;
    }

    isCheckingAuth.current = true;

    if (!skipLoading) {
      setIsLoading(true);
    }

    try {
      const currentUser = await apiService.getCurrentUser();
      setUser(currentUser);

      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      }
    } catch (error: any) {
      // Если ошибка 401 - очищаем состояние
      if (error.response?.status === 401) {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }

        // Редирект на логин только если не на публичной странице
        const publicPaths = ['/', '/login', '/registration', '/signup'];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
      } else {
        // Для других ошибок просто сбрасываем пользователя
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  }, []);

  // Initial auth check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Periodic session validation (every 5 minutes)
  // This ensures session stays alive and validates it regularly
  useEffect(() => {
    if (user) {
      // Only run periodic checks if user is authenticated
      sessionCheckInterval.current = setInterval(() => {
        // Silently check and extend session
        checkAuth(true).catch(() => {
          // If check fails, user will be logged out automatically
        });
      }, 5 * 60 * 1000); // Every 5 minutes

      return () => {
        if (sessionCheckInterval.current) {
          clearInterval(sessionCheckInterval.current);
        }
      };
    } else {
      // Clear interval if user is not authenticated
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
        sessionCheckInterval.current = null;
      }
    }
  }, [user, checkAuth]);

  // Re-check auth on route changes (but not on public pages)
  // Skip check if we just logged in (user is set but we're navigating from login)
  useEffect(() => {
    const publicPaths = ['/login', '/signup', '/registration'];
    // Skip auth check if we just logged in (to avoid 401 error before cookie is set)
    if (!publicPaths.includes(pathname) && !isLoading && user && !justLoggedIn.current) {
      // Debounce auth check to avoid excessive API calls
      const timeoutId = setTimeout(() => {
        checkAuth(true);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [pathname, checkAuth, isLoading, user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Login returns user data directly, no need to call getCurrentUser
      const authResponse = await apiService.login({ email, password });
      
      if (!authResponse.user) {
        throw new Error('Invalid server response: user data not provided');
      }

      // Mark that we just logged in to skip immediate auth check
      justLoggedIn.current = true;

      // Use user data from login response directly
      setUser(authResponse.user);

      // Persist user state
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authResponse.user));
      }

      // Navigate to home page
      // Cookie is set by server, no need to verify immediately
      router.push('/');
      router.refresh();

      // Reset flag after navigation (cookie should be set by now)
      setTimeout(() => {
        justLoggedIn.current = false;
      }, 1000);
    } catch (error) {
      justLoggedIn.current = false;
      throw error;
    }
  }, [router]);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      await apiService.register({ email, password, firstName, lastName });
      router.push('/login');
    } catch (error) {
      throw error;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);

      // Clear persisted state
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }

      router.push('/');
      router.refresh();
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    await checkAuth(false);
  }, [checkAuth]);

  const hasRole = useCallback((role: Role | Role[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

