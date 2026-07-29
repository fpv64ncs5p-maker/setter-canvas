import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL

// Supabase replaced the JWT `anon` key with a publishable key
// (sb_publishable_...). Legacy anon keys still work but are deprecated at the
// end of 2026, so we accept either — whichever the dashboard gave you.
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True once the Supabase project exists and .env.local is filled in.
 *
 * SetterCanvas is local-first: the whole app works offline with no backend.
 * Supabase adds sign-in and sync on top. So everything here degrades quietly
 * when it isn't configured — `supabase` is simply null and the UI hides the
 * account features rather than erroring.
 */
export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export default supabase
