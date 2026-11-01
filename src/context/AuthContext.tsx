import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseMode: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_AUTH_KEY = 'masala_demo_auth_session';
const DEMO_PWD_KEY = 'masala_demo_user_password';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSupabase = isSupabaseConfigured();

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      try {
        if (isSupabase) {
          // Check existing Supabase session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession && currentSession.user && isMounted) {
            setSession(currentSession);
            setSupabaseUser(currentSession.user);
            
            const email = currentSession.user.email || 'admin@masalafactory.pk';
            const username = currentSession.user.user_metadata?.username || email.split('@')[0];
            const fullName = currentSession.user.user_metadata?.full_name || 'Factory Administrator';
            
            setUser({
              id: currentSession.user.id,
              email,
              username,
              fullName,
              role: 'Factory Admin'
            });
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!isMounted) return;
            setSession(newSession);
            setSupabaseUser(newSession?.user || null);

            if (newSession?.user) {
              const email = newSession.user.email || 'admin@masalafactory.pk';
              const username = newSession.user.user_metadata?.username || email.split('@')[0];
              const fullName = newSession.user.user_metadata?.full_name || 'Factory Administrator';
              setUser({
                id: newSession.user.id,
                email,
                username,
                fullName,
                role: 'Factory Admin'
              });
            } else {
              setUser(null);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Offline / Demo session check
          const stored = localStorage.getItem(DEMO_AUTH_KEY);
          if (stored && isMounted) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed);
            } catch {
              localStorage.removeItem(DEMO_AUTH_KEY);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [isSupabase]);

  /**
   * Log In with Username or Email and Password
   */
  const login = async (identifier: string, password: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, message: 'Please enter your username or email address.' };
    }
    if (!password) {
      return { success: false, message: 'Please enter your password.' };
    }

    if (isSupabase) {
      try {
        let emailToAuth = cleanId;

        // If not an email, lookup email by username in profiles table
        if (!cleanId.includes('@')) {
          try {
            const { data: profile, error: profError } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', cleanId.toLowerCase())
              .maybeSingle();

            if (profile && profile.email) {
              emailToAuth = profile.email;
            } else {
              // Try direct email fallback pattern or report error
              emailToAuth = `${cleanId.toLowerCase()}@masalafactory.pk`;
            }
          } catch {
            emailToAuth = `${cleanId.toLowerCase()}@masalafactory.pk`;
          }
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToAuth,
          password
        });

        if (error) {
          return { success: false, message: error.message || 'Invalid login credentials. Please check and try again.' };
        }

        if (data.session && data.user) {
          setSession(data.session);
          setSupabaseUser(data.user);
          const email = data.user.email || emailToAuth;
          const username = data.user.user_metadata?.username || cleanId;
          const fullName = data.user.user_metadata?.full_name || 'Factory Administrator';

          setUser({
            id: data.user.id,
            email,
            username,
            fullName,
            role: 'Factory Admin'
          });
          return { success: true, message: 'Login successful.' };
        }

        return { success: false, message: 'Authentication failed. Please verify credentials.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Connection error to Supabase. Check internet connection.' };
      }
    } else {
      // Demo authentication mode (while Supabase credentials are not configured in .env)
      const currentStoredPwd = localStorage.getItem(DEMO_PWD_KEY) || 'admin123';
      const validUsers = ['admin', 'manager', 'admin@masalafactory.pk', 'demo@masalafactory.pk'];

      const isUserMatch = validUsers.includes(cleanId.toLowerCase());
      const isPwdMatch = password === currentStoredPwd || password === 'admin' || password === '1234';

      if (!isUserMatch || !isPwdMatch) {
        return {
          success: false,
          message: 'Invalid Username or Password. Please check your credentials.'
        };
      }

      const adminUser: AuthUser = {
        id: 'usr-admin-01',
        email: cleanId.includes('@') ? cleanId : `${cleanId}@masalafactory.pk`,
        username: cleanId.includes('@') ? cleanId.split('@')[0] : cleanId,
        fullName: 'Factory Administrator',
        role: 'Factory Admin'
      };

      setUser(adminUser);
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(adminUser));
      return { success: true, message: 'Login successful.' };
    }
  };

  /**
   * Log Out
   */
  const logout = async () => {
    try {
      if (isSupabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Logout signOut error:', err);
    } finally {
      localStorage.removeItem(DEMO_AUTH_KEY);
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
    }
  };

  /**
   * Change Password securely
   */
  const changePassword = async (
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentPassword) {
      return { success: false, message: 'Current password is required.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }
    if (currentPassword === newPassword) {
      return { success: false, message: 'New password must be different from the current password.' };
    }

    if (isSupabase) {
      if (!user || !user.email) {
        return { success: false, message: 'No active authenticated session found. Please log in again.' };
      }

      try {
        // 1. Verify current password by attempting re-authentication
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });

        if (verifyError) {
          return {
            success: false,
            message: 'Current password verification failed. Please ensure your current password is correct.'
          };
        }

        // 2. Securely update password using Supabase Auth
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          return { success: false, message: updateError.message || 'Failed to update password in Supabase.' };
        }

        return { success: true, message: 'Password updated successfully via Supabase Auth.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Error communicating with Supabase.' };
      }
    } else {
      // Demo session password change
      const currentStoredPwd = localStorage.getItem(DEMO_PWD_KEY) || 'admin123';
      const validCurrent = currentPassword === currentStoredPwd || currentPassword === 'admin' || currentPassword === '1234';

      if (!validCurrent) {
        return { success: false, message: 'Current password verification failed.' };
      }

      localStorage.setItem(DEMO_PWD_KEY, newPassword);
      return { success: true, message: 'Password updated successfully.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseMode: isSupabase,
        login,
        logout,
        changePassword
      }}
    >
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
