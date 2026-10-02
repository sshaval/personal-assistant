'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'
import { getSessionUser, type SessionUser } from '@/lib/auth'
import { sanitizeTabs } from '@/lib/tabs'

async function assertAdmin(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u || u.role !== 'admin') throw new Error('Not authorized')
  return u
}

const tempPassword = () => 'Claudia-' + randomBytes(9).toString('base64url')

export async function setUserRole(
  userId: string,
  role: 'admin' | 'user',
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await assertAdmin()
    if (userId === me.id && role !== 'admin') {
      return { ok: false, error: "You can't remove your own admin access." }
    }
    const { error } = await getSupabase()
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not change role' }
  }
}

/** Set which app tabs a user can access (Summary / Day's View / Tasks). */
export async function setUserTabs(
  userId: string,
  tabs: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdmin()
    const clean = sanitizeTabs(tabs)
    const { error } = await getSupabase()
      .from('profiles')
      .update({ allowed_tabs: clean, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin')
    revalidatePath('/', 'layout') // refresh the sidebar's tab list app-wide
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update tab access' }
  }
}

export async function addUser(
  formData: FormData,
): Promise<{ ok: true; email: string; password: string } | { ok: false; error: string }> {
  try {
    await assertAdmin()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const displayName = String(formData.get('display_name') ?? '').trim() || null
    const role = String(formData.get('role') ?? 'user') === 'admin' ? 'admin' : 'user'
    if (!email) return { ok: false, error: 'Email is required.' }

    const supabase = getSupabase()
    const password = tempPassword()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw new Error(error.message)

    const { error: pe } = await supabase.from('profiles').upsert(
      { id: data.user.id, email, display_name: displayName, role, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    if (pe) throw new Error(pe.message)

    revalidatePath('/admin')
    return { ok: true, email, password }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not add user' }
  }
}

export async function removeUser(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await assertAdmin()
    if (userId === me.id) return { ok: false, error: "You can't remove yourself." }
    const { error } = await getSupabase().auth.admin.deleteUser(userId)
    if (error) throw new Error(error.message) // profiles row cascades via FK
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove user' }
  }
}
