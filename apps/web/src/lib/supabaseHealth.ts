import { supabase } from './supabase';

export async function checkSupabaseConnection() {
  const { error } = await supabase.from('profiles').select('id').limit(1);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Supabase connection is working.',
  };
}
