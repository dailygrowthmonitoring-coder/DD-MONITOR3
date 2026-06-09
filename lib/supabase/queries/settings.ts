import { getAdminClient } from '../admin'
import type {
  UserProfileRow,
  UserProfileUpdate,
  SystemSettingRow,
} from '../types'

const PROFILE_COLS = 'id, full_name, role, is_active, created_at, updated_at' as const
const SETTING_COLS = 'key, value, description, updated_at, updated_by' as const

// ── User profiles ──────────────────────────────────────────────────────────────

export async function querySelectUserProfile(userId: string): Promise<UserProfileRow | null> {
  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .select(PROFILE_COLS)
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`querySelectUserProfile: ${error.message}`)
  return data
}

export async function querySelectAllUserProfiles(): Promise<UserProfileRow[]> {
  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .select(PROFILE_COLS)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`querySelectAllUserProfiles: ${error.message}`)
  return data ?? []
}

export async function queryUpsertUserProfile(
  id: string,
  values: { full_name?: string | null; role?: string; is_active?: boolean }
): Promise<UserProfileRow> {
  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .upsert({ id, ...values })
    .select(PROFILE_COLS)
    .single()
  if (error) throw new Error(`queryUpsertUserProfile: ${error.message}`)
  return data
}

export async function queryUpdateUserProfile(
  id: string,
  update: UserProfileUpdate
): Promise<UserProfileRow> {
  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .update(update)
    .eq('id', id)
    .select(PROFILE_COLS)
    .single()
  if (error) throw new Error(`queryUpdateUserProfile: ${error.message}`)
  return data
}

// ── System settings ───────────────────────────────────────────────────────────

export async function querySelectSystemSettings(): Promise<SystemSettingRow[]> {
  const { data, error } = await getAdminClient()
    .from('system_settings')
    .select(SETTING_COLS)
    .order('key', { ascending: true })
  if (error) throw new Error(`querySelectSystemSettings: ${error.message}`)
  return data ?? []
}

export async function queryUpsertSystemSetting(
  key: string,
  value: string,
  updatedBy: string | null
): Promise<SystemSettingRow> {
  const { data, error } = await getAdminClient()
    .from('system_settings')
    .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .select(SETTING_COLS)
    .single()
  if (error) throw new Error(`queryUpsertSystemSetting: ${error.message}`)
  return data
}
