import { createClient } from '@supabase/supabase-js'
import { getAdminClient } from '@/lib/supabase/admin'
import {
  querySelectUserProfile,
  querySelectAllUserProfiles,
  queryUpsertUserProfile,
  queryUpdateUserProfile,
  querySelectSystemSettings,
  queryUpsertSystemSetting,
} from '@/lib/supabase/queries/settings'
import type { UserProfile, SystemSetting, UserRole } from '@/types/dashboard'

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getCurrentProfile(userId: string): Promise<UserProfile | null> {
  const { data: { user }, error } = await getAdminClient().auth.admin.getUserById(userId)
  if (error || !user) return null

  let profile = await querySelectUserProfile(userId)
  if (!profile) {
    profile = await queryUpsertUserProfile(userId, { role: 'viewer', is_active: true })
  }

  return {
    id:         user.id,
    email:      user.email ?? '',
    full_name:  profile.full_name,
    role:       profile.role as UserRole,
    is_active:  profile.is_active,
    created_at: user.created_at,
  }
}

export async function updateCurrentProfile(
  userId: string,
  fullName: string
): Promise<void> {
  await queryUpdateUserProfile(userId, { full_name: fullName })
}

// ── Password ──────────────────────────────────────────────────────────────────

export async function verifyAndChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data: { user }, error: lookupError } =
    await getAdminClient().auth.admin.getUserById(userId)
  if (lookupError || !user?.email) {
    throw new Error('USER_NOT_FOUND')
  }

  // Verify current password by attempting a sign-in
  const verifyClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email:    user.email,
    password: currentPassword,
  })
  if (signInError) throw new Error('WRONG_PASSWORD')

  const { error: updateError } = await getAdminClient().auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (updateError) throw new Error('UPDATE_FAILED')
}

// ── Users (admin only) ────────────────────────────────────────────────────────

export async function listUsers(): Promise<UserProfile[]> {
  const [profiles, authResult] = await Promise.all([
    querySelectAllUserProfiles(),
    getAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profileMap = new Map(profiles.map(p => [p.id, p]))
  const { users } = authResult.data

  return users.map(u => ({
    id:         u.id,
    email:      u.email ?? '',
    full_name:  profileMap.get(u.id)?.full_name ?? null,
    role:       (profileMap.get(u.id)?.role ?? 'viewer') as UserRole,
    is_active:  profileMap.get(u.id)?.is_active ?? true,
    created_at: u.created_at,
  }))
}

export interface CreateUserInput {
  email:     string
  password:  string
  full_name: string
  role:      UserRole
}

export async function createUser(input: CreateUserInput): Promise<UserProfile> {
  const { data: { user }, error: createError } =
    await getAdminClient().auth.admin.createUser({
      email:          input.email,
      password:       input.password,
      email_confirm:  true,
    })
  if (createError || !user) {
    throw new Error(createError?.message ?? 'CREATE_FAILED')
  }

  try {
    await queryUpsertUserProfile(user.id, {
      full_name: input.full_name,
      role:      input.role,
      is_active: true,
    })
  } catch {
    // Roll back auth user on profile failure
    await getAdminClient().auth.admin.deleteUser(user.id)
    throw new Error('PROFILE_CREATE_FAILED')
  }

  return {
    id:         user.id,
    email:      user.email ?? input.email,
    full_name:  input.full_name,
    role:       input.role,
    is_active:  true,
    created_at: user.created_at,
  }
}

export interface UpdateUserInput {
  full_name?: string | null
  role?:      UserRole
  is_active?: boolean
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<void> {
  await queryUpdateUserProfile(userId, {
    full_name: input.full_name,
    role:      input.role,
    is_active: input.is_active,
  })
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await getAdminClient().auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

// ── System settings ───────────────────────────────────────────────────────────

export async function getSystemSettings(): Promise<SystemSetting[]> {
  const rows = await querySelectSystemSettings()
  return rows.map(r => ({
    key:         r.key,
    value:       r.value,
    description: r.description,
    updated_at:  r.updated_at,
  }))
}

export async function updateSystemSetting(
  key: string,
  value: string,
  updatedBy: string | null
): Promise<SystemSetting> {
  const row = await queryUpsertSystemSetting(key, value, updatedBy)
  return {
    key:         row.key,
    value:       row.value,
    description: row.description,
    updated_at:  row.updated_at,
  }
}
