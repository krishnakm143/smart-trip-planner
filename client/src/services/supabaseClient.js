import { createClient } from '@supabase/supabase-js'
import { withBase } from '../utils/basePath'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

// Primary database and auth client for Supabase.
export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const usesSupabaseAuth = Boolean(supabase)

export function toAppUser(user) {
  const meta = user.user_metadata || {}
  const rawName = meta.name || meta.full_name || meta.display_name
  const name =
    typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : user.email
      ? user.email.split('@')[0]
      : 'Traveler'
  return {
    id: user.id,
    name,
    email: user.email,
    role: user.app_metadata?.role === 'admin' ? 'admin' : 'traveler',
    createdAt: user.created_at,
  }
}

export async function sendSupabasePasswordReset(email) {
  if (!supabase) throw new Error('Supabase client is not available')
  const redirectTo = `${window.location.origin}${withBase('/login?mode=recovery')}`
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  if (error) throw error
  return data
}

export async function updateSupabasePassword(newPassword) {
  if (!supabase) throw new Error('Supabase client is not available')
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  return data
}
