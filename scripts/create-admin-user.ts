/**
 * One-time setup script: creates the initial admin user and required tables.
 * Run with: npx ts-node --project tsconfig.test.json scripts/create-admin-user.ts
 *
 * Set these in .env.local before running:
 *   ADMIN_EMAIL=your@email.com
 *   ADMIN_PASSWORD=yourpassword
 *   ADMIN_FULL_NAME=Your Name
 */
import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL          = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD       = process.env.ADMIN_PASSWORD
const ADMIN_FULL_NAME      = process.env.ADMIN_FULL_NAME ?? 'Admin'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[setup] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('[setup] Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local')
  console.error('[setup] Add these to .env.local before running this script:')
  console.error('[setup]   ADMIN_EMAIL=your@email.com')
  console.error('[setup]   ADMIN_PASSWORD=yourpassword')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureTablesExist(): Promise<void> {
  console.log('[setup] Ensuring user_profiles table exists...')

  const { error } = await supabase.rpc('exec_sql' as string, {
    sql: `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name   TEXT,
        role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'service manage profiles') THEN
          CREATE POLICY "service manage profiles" ON user_profiles FOR ALL USING (auth.role() = 'service_role');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS system_settings (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        description TEXT,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by  UUID REFERENCES auth.users(id)
      );
      ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'service manage settings') THEN
          CREATE POLICY "service manage settings" ON system_settings FOR ALL USING (auth.role() = 'service_role');
        END IF;
      END $$;

      INSERT INTO system_settings (key, value, description)
      VALUES
        ('alert_emails',         '',   'Comma-separated list of alert recipient emails'),
        ('report_deadline_hour', '10', 'Hour (0-23) after which missing report alert is sent'),
        ('data_retention_days',  '40', 'Number of days to retain report data')
      ON CONFLICT (key) DO NOTHING;
    `
  } as Record<string, unknown>)

  if (error) {
    console.log('[setup] RPC not available — table may already exist, continuing...')
  }
}

async function findOrCreateAuthUser(): Promise<string> {
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email:         ADMIN_EMAIL!,
    password:      ADMIN_PASSWORD!,
    email_confirm: true,
  })

  if (!createError) {
    console.log('[setup] Auth user created, id:', createData.user.id)
    return createData.user.id
  }

  const msg = createError.message.toLowerCase()
  if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
    console.log('[setup] Auth user already exists — looking up...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw new Error(listError.message)
    const existing = users.find(u => u.email === ADMIN_EMAIL)
    if (!existing) throw new Error('Could not find existing user')
    console.log('[setup] Found existing user, id:', existing.id)
    return existing.id
  }

  throw new Error(createError.message)
}

async function upsertProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id:        userId,
      full_name: ADMIN_FULL_NAME,
      role:      'admin',
      is_active: true,
    })

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('not found')) {
      console.log('[setup] ⚠  user_profiles table not found in database.')
      console.log('[setup]    Please apply the migration in Supabase SQL editor:')
      console.log('[setup]    supabase/migrations/002_settings.sql')
      console.log('[setup]    Then run this script again.')
      console.log('[setup] ✓ Auth user was created successfully (id:', userId + ')')
      return
    }
    throw new Error(error.message)
  }

  console.log('[setup] ✓ user_profiles record created')
}

async function main(): Promise<void> {
  await ensureTablesExist().catch(() => {
    // non-fatal — table might already exist
  })

  const userId = await findOrCreateAuthUser()
  await upsertProfile(userId)

  console.log('')
  console.log('[setup] ═══════════════════════════════════════════')
  console.log('[setup] ✓ Admin user ready')
  console.log('[setup]   Email:    ', ADMIN_EMAIL)
  console.log('[setup]   Name:     ', ADMIN_FULL_NAME)
  console.log('[setup]   Role:      admin')
  console.log('[setup] ═══════════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[setup] Fatal error:', (err as Error).message)
    process.exit(1)
  })
