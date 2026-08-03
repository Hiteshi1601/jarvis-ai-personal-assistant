'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_URL } from '../config/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      let savedToken = typeof window !== 'undefined' ? localStorage.getItem('jarvis_token') : null;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        if (tokenParam) {
          savedToken = tokenParam;
          localStorage.setItem('jarvis_token', tokenParam);
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }

      const headers: Record<string, string> = {};
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }

      const res = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          if (data.token) {
            localStorage.setItem('jarvis_token', data.token);
          }
        } else {
          setUser(null);
          localStorage.removeItem('jarvis_token');
        }
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect browser directly to Google OAuth initiation
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const logout = async () => {
    try {
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('jarvis_token') : null;
      const headers: Record<string, string> = {};
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers
      });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jarvis_token');
      }
      setUser(null);
      window.location.reload();
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user,
        login,
        logout,
        checkAuthStatus
      }}
    >
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
