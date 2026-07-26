import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileExists = async (u) => {
    if (!u?.id || !u?.email) return;
    try {
      await supabase.from('profiles').upsert([
        { id: u.id, full_name: u.email }
      ]);
    } catch (err) {
      console.error('Error syncing profile:', err);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfileExists(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfileExists(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginOrRegister = async (email, password) => {
    // Try sign in first
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // If sign in failed, attempt signup (for auto-creation of new accounts)
      const signupRes = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupRes.error) {
        if (signupRes.error.message.includes('User already registered')) {
          throw new Error('Kata sandi salah. Akun ini sudah terdaftar di Supabase.');
        }
        throw new Error(signupRes.error.message || error.message);
      }

      data = signupRes.data;
    }

    // Set full_name in profiles to email
    if (data?.user) {
      await ensureProfileExists(data.user);
    }

    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, loginOrRegister, logout, ensureProfileExists }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
