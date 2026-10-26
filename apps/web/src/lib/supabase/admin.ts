import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Client administrativo (service role). Ignora RLS.
 * Use SOMENTE em Server Actions já autorizadas — nunca em código de cliente.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
