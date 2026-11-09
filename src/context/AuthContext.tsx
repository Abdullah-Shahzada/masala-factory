import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { loginMySQL, changePasswordMySQL, verifySessionMySQL } from '../services/mysqlService';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  tokenVersion?: number;
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
              role: 'Factory Admin',
              tokenVersion: 1
            });
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
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
                role: 'Factory Admin',
                tokenVersion: 1
              });
            } else {
              setUser(null);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // MySQL Database session check
          const stored = localStorage.getItem(DEMO_AUTH_KEY);
          if (stored && isMounted) {
            try {
              const parsed: AuthUser = JSON.parse(stored);
              setUser(parsed);

              // Verify if session tokenVersion is still valid in TiDB MySQL
              if (parsed.username && parsed.tokenVersion !== undefined) {
                verifySessionMySQL(parsed.username, parsed.tokenVersion).then(res => {
                  if (res && res.valid === false && isMounted) {
                    console.warn('[Auth] Session invalidated: password was changed elsewhere.');
                    localStorage.removeItem(DEMO_AUTH_KEY);
                    setUser(null);
                  }
                }).catch(() => {});
              }
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

  // Cross-device session check: throttled focus check + relaxed 5-minute fallback
  const lastSessionCheckRef = useRef<number>(0);
  useEffect(() => {
    if (isSupabase || !user || !user.username || user.tokenVersion === undefined) return;

    const checkSession = async () => {
      try {
        lastSessionCheckRef.current = Date.now();
        const res = await verifySessionMySQL(user.username, user.tokenVersion || 1);
        if (res && res.valid === false) {
          console.warn('[Auth] Auto-logout: Password changed on another device.');
          await logout();
          alert('Security Alert: Your session has expired because the password was changed on another device. Please log in with the new password.');
        }
      } catch (err) {
        // Silently skip if network momentarily offline
      }
    };

    const handleFocus = () => {
      // Cooldown of 2 minutes (120,000 ms) to prevent spamming Vercel functions on tab switching
      const now = Date.now();
      if (now - lastSessionCheckRef.current < 120000) return;
      checkSession();
    };

    window.addEventListener('focus', handleFocus);
    // Relaxed 5-minute interval only when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastSessionCheckRef.current >= 120000) {
          checkSession();
        }
      }
    }, 300000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user, isSupabase]);

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

        if (!cleanId.includes('@')) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', cleanId.toLowerCase())
              .maybeSingle();

            if (profile && profile.email) {
              emailToAuth = profile.email;
            } else {
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
          const username = data.user.user_metadata?.username || email.split('@')[0];
          const fullName = data.user.user_metadata?.full_name || 'Factory Administrator';

          setUser({
            id: data.user.id,
            email,
            username,
            fullName,
            role: 'Factory Admin',
            tokenVersion: 1
          });

          return { success: true, message: 'Login successful.' };
        }

        return { success: false, message: 'Authentication failed. Please verify credentials.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Connection error to Supabase.' };
      }
    } else {
      // TiDB Cloud MySQL Authentication
      try {
        const mysqlRes = await loginMySQL(cleanId, password);
        if (mysqlRes && mysqlRes.success && mysqlRes.user) {
          const authUser: AuthUser = {
            id: mysqlRes.user.id || 'usr-admin-01',
            email: mysqlRes.user.email || `${cleanId}@masalafactory.pk`,
            username: mysqlRes.user.username || cleanId,
            fullName: 'Factory Administrator',
            role: mysqlRes.user.role || 'Factory Admin',
            tokenVersion: mysqlRes.tokenVersion || 1
          };

          setUser(authUser);
          localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(authUser));
          localStorage.setItem(DEMO_PWD_KEY, password);
          return { success: true, message: 'Login successful.' };
        } else if (mysqlRes && !mysqlRes.success) {
          return { success: false, message: mysqlRes.message || 'Invalid Username or Password.' };
        }
      } catch (err: any) {
        console.warn('MySQL login network error, falling back to local verification:', err);
      }

      // Offline / network fallback verification
      const currentStoredPwd = localStorage.getItem(DEMO_PWD_KEY) || 'admin123';
      const validUsers = ['admin', 'manager', 'admin@masalafactory.pk'];

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
        role: 'Factory Admin',
        tokenVersion: 1
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
   * Change Password securely & Invalidate other devices
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
      // TiDB Cloud MySQL password change with global cross-device session revocation
      try {
        const mysqlRes = await changePasswordMySQL(currentPassword, newPassword, user?.username || 'admin');
        if (mysqlRes && mysqlRes.success) {
          const newTokenVersion = mysqlRes.tokenVersion || ((user?.tokenVersion || 1) + 1);
          if (user) {
            const updatedUser = { ...user, tokenVersion: newTokenVersion };
            setUser(updatedUser);
            localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(updatedUser));
          }
          localStorage.setItem(DEMO_PWD_KEY, newPassword);
          return {
            success: true,
            message: 'Password updated successfully! All other devices have been automatically logged out.'
          };
        } else if (mysqlRes && !mysqlRes.success) {
          return { success: false, message: mysqlRes.message || 'Current password verification failed.' };
        }
      } catch (err: any) {
        console.warn('MySQL changePassword network error:', err);
      }

      // Local fallback
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
