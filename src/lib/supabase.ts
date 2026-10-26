import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable credentials (safely handles Vite browser & Node test runner)
const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || (typeof process !== 'undefined' ? process.env : {}) || {};
const supabaseUrl = (env.VITE_SUPABASE_URL || '') as string;
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '') as string;

/**
 * Check if valid Supabase URL and Anon Key are configured.
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
