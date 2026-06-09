import { getAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/brevo'
import { twoFaCodeEmail } from '@/lib/email/templates/two-fa-code'

const CODE_TTL_MS  = 10 * 60 * 1000  // 10 minutes
const MAX_ATTEMPTS = 5

interface TwoFaDetails {
  code:       string
  expires_at: string
  user_id:    string
  used:       boolean
  attempts:   number
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function generateAndStore2faCode(userId: string, userEmail: string): Promise<string> {
  const code       = generateCode()
  const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString()

  const { error } = await getAdminClient()
    .from('system_logs')
    .insert({
      event_type: '2FA_CODE',
      message:    '2FA code generated',
      severity:   'INFO',
      details:    { code, expires_at, user_id: userId, used: false, attempts: 0 },
    })

  if (error) {
    console.error('[auth] generateAndStore2faCode DB insert failed:', error.message)
    throw new Error('Failed to store 2FA code')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[2FA] Code for ${userEmail}: ${code}`)
  }

  await sendTransactionalEmail({
    to:      userEmail,
    subject: 'DD Monitor — Your verification code',
    html:    twoFaCodeEmail(code),
  })

  return code
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'max_attempts' | 'not_found' }

export async function verify2faCode(userId: string, inputCode: string): Promise<VerifyResult> {
  const since = new Date(Date.now() - CODE_TTL_MS - 60_000).toISOString()

  const { data, error } = await getAdminClient()
    .from('system_logs')
    .select('id, details, created_at')
    .eq('event_type', '2FA_CODE')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error('DB error verifying 2FA code')

  const row = data?.find(r => {
    const d = r.details as Record<string, unknown> | null
    return d?.user_id === userId && d?.used === false
  })

  if (!row) return { ok: false, reason: 'not_found' }

  const d = row.details as unknown as TwoFaDetails

  if (d.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'max_attempts' }
  if (new Date(d.expires_at) < new Date()) return { ok: false, reason: 'expired' }

  if (d.code !== inputCode) {
    await getAdminClient()
      .from('system_logs')
      .update({ details: { ...d, attempts: d.attempts + 1 } })
      .eq('id', row.id)
    return { ok: false, reason: 'invalid' }
  }

  await getAdminClient()
    .from('system_logs')
    .update({ details: { ...d, used: true } })
    .eq('id', row.id)

  return { ok: true }
}
