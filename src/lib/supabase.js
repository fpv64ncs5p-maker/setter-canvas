import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True once the Supabase project exists and .env.local is filled in.
 *
 * SetterCanvas is local-first: the whole app works offline with no backend.
 * Supabase adds sign-in and sync on top. So everything here degrades quietly
 * when it isn't configured — `supabase` is simply null and the UI hides the
 * account features rather than erroring.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export default supabase
