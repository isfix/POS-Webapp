'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ensureMockDataInitialized } from '@/lib/mock-data';

export type AppUser = {
  id: string;
  email?: string;
  displayName?: string;
  user_metadata?: Record<string, any>;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginDemo: (role?: 'kasir' | 'admin') => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  loginDemo: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure offline mock data is populated on first app load
    ensureMockDataInitialized();

    // Check initial active session
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user && !error) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              displayName: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              user_metadata: session.user.user_metadata,
            });
            setLoading(false);
            return;
          }
        }

        // Check offline demo session if present
        if (typeof window !== 'undefined') {
          const demoSaved = localStorage.getItem('rotikita_auth_demo');
          if (demoSaved) {
            setUser(JSON.parse(demoSaved));
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth session check error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to Supabase auth state changes if configured
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            user_metadata: session.user.user_metadata,
          });
        } else {
          // Explicit sign-out: clear active user completely
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const loginDemo = async (role: 'kasir' | 'admin' = 'kasir') => {
    const demoUser: AppUser = {
      id: `demo-${role}`,
      email: role === 'admin' ? 'admin@rotikita.local' : 'kasir@rotikita.local',
      displayName: role === 'admin' ? 'Manager Toko (Demo)' : 'Staf Kasir (Demo)',
      user_metadata: { role, is_demo: true },
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('rotikita_auth_demo', JSON.stringify(demoUser));
    }
    setUser(demoUser);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rotikita_auth_demo');
    }
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signOut error:", err);
      }
    }
    setUser(null);
  };

  const value = {
    user,
    loading,
    logout,
    loginDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
