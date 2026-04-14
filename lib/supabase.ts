/**
 * lib/supabase.ts
 *
 * Pages Router compatible Supabase clients.
 * - NO `next/headers` or any server-only API is used here.
 * - `supabase` → singleton browser client (anon key, safe for client-side use)
 * - `createServiceRoleClient` → service-role client for API routes (server-side only,
 *   never import this in a component/page — only in pages/api/* files)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Browser / Client-side client (singleton) ────────────────────────────────
// Safe to use in components, pages, hooks — anywhere client-side code runs.
let browserClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

// Convenience default export for the browser client
export const supabase = getSupabaseClient()

// ─── Server-side / API Route client (service role) ───────────────────────────
// ⚠️  Only call this inside `pages/api/*` route handlers — NEVER in components.
// The service role key bypasses Row Level Security.
export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
