import { createBrowserClient } from '@supabase/ssr';

// Browser-safe Supabase instance (singleton for client components, safe for server pre-renders)
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
};
