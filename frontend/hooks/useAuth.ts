import { useState, useEffect } from 'react';
import hydraAPI from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  profile: {
    subscriptionTier: string;
    creditBalance: number;
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (hydraAPI.isAuthenticated()) {
      try {
        const profile = await hydraAPI.getProfile();
        setAuthState({
          user: profile,
          isLoading: false,
          error: null
        });
      } catch (error) {
        setAuthState({
          user: null,
          isLoading: false,
          error: 'Failed to load profile'
        });
      }
    } else {
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
    }
  };

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await hydraAPI.login(email, password);
      await checkAuth();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await hydraAPI.register(email, password, name);
      await checkAuth();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  };

  const logout = () => {
    hydraAPI.logout();
    setAuthState({
      user: null,
      isLoading: false,
      error: null
    });
  };

  const refreshProfile = async () => {
    if (hydraAPI.isAuthenticated()) {
      try {
        const profile = await hydraAPI.getProfile();
        setAuthState(prev => ({ ...prev, user: profile, error: null }));
      } catch (error) {
        setAuthState(prev => ({ ...prev, error: 'Failed to refresh profile' }));
      }
    }
  };

  return {
    ...authState,
    login,
    register,
    logout,
    refreshProfile
  };
}