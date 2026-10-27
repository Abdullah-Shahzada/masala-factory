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
 * Check if valid Supabase URL and Anon / Publishable Key are configured.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('http') && 
    !supabaseUrl.includes('placeholder')
  );
};

/**
 * Initialize real Supabase client if configured, otherwise initialize placeholder client
 * that warns gracefully without throwing fatal frontend exceptions on startup.
 */
export const supabase: SupabaseClient = isSupabaseConfigured()
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
