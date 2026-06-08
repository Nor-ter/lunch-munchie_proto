import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type LunchieDatabase = Record<string, never>;

export function createSupabaseBrowserClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required. Use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createClient(url, anonKey);
}
