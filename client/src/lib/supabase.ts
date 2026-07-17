import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function requireSupabaseEnvironmentVariable(
  value: string | undefined,
  variableName: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY',
): string {
  if (!value) {
    throw new Error(`[Supabase] Missing required environment variable: ${variableName}`);
  }

  return value;
}

function requireValidSupabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Unsupported protocol');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error('[Supabase] VITE_SUPABASE_URL must be a valid HTTP(S) URL');
  }
}

const validatedSupabaseUrl = requireValidSupabaseUrl(
  requireSupabaseEnvironmentVariable(supabaseUrl, 'VITE_SUPABASE_URL'),
);
const validatedSupabasePublishableKey = requireSupabaseEnvironmentVariable(
  supabasePublishableKey,
  'VITE_SUPABASE_PUBLISHABLE_KEY',
);

export const supabase = createClient(
  validatedSupabaseUrl,
  validatedSupabasePublishableKey,
);
