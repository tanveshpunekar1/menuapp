import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User, Restaurant } from '../types';
import { api, syncClientJournalToServer } from '../lib/api';

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('restoqr_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [restaurant, setRestaurant] = useState<Restaurant | null>(() => {
    try {
      const saved = localStorage.getItem('restoqr_restaurant');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('restoqr_token'));
  const [loading, setLoading] = useState<boolean>(() => {
    const hasToken = !!localStorage.getItem('restoqr_token');
    const hasSavedUser = !!localStorage.getItem('restoqr_user');
    return hasToken && !hasSavedUser;
  });

  // Track latest auth action epoch so an in-flight initAuth() never overwrites a newer login()
  const authEpochRef = useRef(0);

  useEffect(() => {
    const currentEpoch = ++authEpochRef.current;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('restoqr_token');
      if (!storedToken) {
        if (authEpochRef.current === currentEpoch) {
          setLoading(false);
        }
        return;
      }

      try {
        await syncClientJournalToServer();
        const res = await api.getMe();
        if (authEpochRef.current !== currentEpoch) return;
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem('restoqr_user', JSON.stringify(res.user));
          if (res.restaurant) {
            setRestaurant(res.restaurant);
            localStorage.setItem('restoqr_restaurant', JSON.stringify(res.restaurant));
          }
        }
      } catch (err: any) {
        if (authEpochRef.current !== currentEpoch) return;
        const savedUserStr = localStorage.getItem('restoqr_user');
        if (!savedUserStr && (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Authentication required'))) {
          localStorage.removeItem('restoqr_token');
          localStorage.removeItem('restoqr_user');
          localStorage.removeItem('restoqr_restaurant');
          setToken(null);
          setUser(null);
          setRestaurant(null);
        }
      } finally {
        if (authEpochRef.current === currentEpoch) {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<string> => {
    authEpochRef.current += 1;
    const res = await api.login({ email: email.trim(), password: password.trim() });

    localStorage.setItem('restoqr_token', res.token);
    localStorage.setItem('restoqr_user', JSON.stringify(res.user));
    if (res.restaurant) {
      localStorage.setItem('restoqr_restaurant', JSON.stringify(res.restaurant));
    } else {
      localStorage.removeItem('restoqr_restaurant');
    }

    setToken(res.token);
    setUser(res.user);
    setRestaurant(res.restaurant || null);
    setLoading(false);

    if (res.user.role === 'platform_admin') {
      return '/admin';
    }
    if (res.user.role === 'waiter' || res.user.role === 'kitchen_staff') {
      return '/restaurant/pos';
    }
    return '/restaurant';
  };

  const logout = () => {
    authEpochRef.current += 1;
    localStorage.removeItem('restoqr_token');
    localStorage.removeItem('restoqr_user');
    localStorage.removeItem('restoqr_restaurant');
    setToken(null);
    setUser(null);
    setRestaurant(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, token, loading, login, logout, setRestaurant }}>
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
