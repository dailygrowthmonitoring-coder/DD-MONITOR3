import { BrevoClient } from '@getbrevo/brevo'

interface SendEmailParams {
  to:      string
  subject: string
  html:    string
}

let _client: BrevoClient | null = null

function getClient(): BrevoClient {
  if (_client) return _client
  _client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY ?? '' })
  return _client
}

export async function sendTransactionalEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    await getClient().transactionalEmails.sendTransacEmail({
      to:          [{ email: to }],
      subject,
      htmlContent: html,
      sender: {
        name:  process.env.BREVO_FROM_NAME  ?? 'DD Monitor',
        email: process.env.BREVO_FROM_EMAIL ?? 'noreply@ddmonitor.com',
      },
    })
    return true
  } catch (err) {
    console.error('[brevo] Failed to send email to', to, ':', err instanceof Error ? err.message : err)
    return false
  }
}
