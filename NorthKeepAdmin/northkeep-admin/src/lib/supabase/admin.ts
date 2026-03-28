/**
 * Service-role Supabase client for all admin API operations.
 * Uses the service role key which bypasses RLS — safe because
 * all API routes are protected by middleware auth guards.
 */
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  return createClient(url, key);
}

/**
 * Alias for createAdminClient — kept for backward compatibility
 * in storage/image upload routes.
 */
export const createServiceClient = createAdminClient;
