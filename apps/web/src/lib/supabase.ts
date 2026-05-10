import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

const supabaseFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);

  if (!headers.has('apikey')) {
    headers.set('apikey', supabaseAnonKey);
  }

  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
    headers: {
      apikey: supabaseAnonKey,
    },
  },
});
