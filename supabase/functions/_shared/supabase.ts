import { createClient } from 'jsr:@supabase/supabase-js@2';

// Create Supabase client for Edge Functions
export function createSupabaseClient(authToken?: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      },
    }
  );
}

// Create service role client to bypass RLS for system operations
export function createServiceSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Get user from JWT token
export async function getUser(authToken: string) {
  const supabase = createSupabaseClient(authToken);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}
