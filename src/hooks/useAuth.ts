'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getClientAuthStack } from '@/lib/authStack';
import { 
  UserProfile, 
  getUserProfile, 
  signInWithDiscord, 
  signOut as authSignOut,
  updateDisplayName as authUpdateDisplayName
} from '@/lib/auth';

interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const timeoutPromise = new Promise<UserProfile | null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching profile')), 5000);
      });

      const userProfile = await Promise.race([
        getUserProfile(userId),
        timeoutPromise
      ]) as UserProfile | null;

      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Even if profile fetch fails/times out, we shouldn't block the UI forever
    }
  }, []);

  useEffect(() => {
    const authStack = getClientAuthStack();

    // PR-01 scaffold: v2 path is feature-flagged but not implemented yet.
    // Keep behavior unchanged by continuing to use v1 logic.
    if (authStack === 'v2') {
      // TODO(PR-02): replace with app-owned session endpoint.
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (redirectTo?: string) => {
    await signInWithDiscord(redirectTo);
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const updateDisplayName = async (name: string) => {
    if (!user) throw new Error('Not authenticated');
    await authUpdateDisplayName(user.id, name);
    setProfile(prev => prev ? { ...prev, display_name: name } : null);
  };

  const refresh = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    updateDisplayName,
    refresh,
  };
}

