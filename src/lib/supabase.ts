import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Clean and sanitize Supabase URL (strips trailing /rest/v1 or trailing slashes if user included them)
export const cleanSupabaseUrl = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
};

// Environment variable credentials (safely handles Vite browser & Node test runner)
const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || (typeof process !== 'undefined' ? process.env : {}) || {};
const rawUrl = (env.VITE_SUPABASE_URL || '') as string;
export const supabaseUrl = cleanSupabaseUrl(rawUrl);
export const supabaseAnonKey = ((env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_KEY || '') as string).trim();

/**
 * Check if real Supabase credentials exist and are valid.
 */
export const isRealSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('http') && 
    !supabaseUrl.includes('placeholder')
  );
};

export const isSupabaseConfigured = isRealSupabaseConfigured;

/**
 * Check if any database backend (MySQL or Supabase) is active.
 */
export const isDatabaseConnected = (): boolean => {
  const dbMode = ((env.VITE_DATABASE || '') as string).trim().toLowerCase();
  if (dbMode === 'mysql') return true;
  return isRealSupabaseConfigured();
};

/**
 * Initialize real Supabase client ONLY if real Supabase credentials exist,
 * otherwise initialize placeholder client that warns gracefully without throwing fatal frontend exceptions on startup.
 */
export const supabase: SupabaseClient = isRealSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createClient(
      'https://placeholder-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

export default supabase;
