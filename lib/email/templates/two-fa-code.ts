export function twoFaCodeEmail(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DD Monitor — Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background-color:#111118;border:1px solid #1E1E2E;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #1E1E2E;">
              <span style="font-size:13px;font-weight:700;letter-spacing:0.12em;color:#AADD00;
                           font-family:'JetBrains Mono',Courier,monospace;">
                DD Monitor
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#F0F0F5;">
                Your verification code
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#6B6B80;line-height:1.5;">
                Enter this code to complete sign-in to DD Monitor.
              </p>

              <!-- Code block -->
              <div style="background:#0A0A0F;border:1px solid #1E1E2E;border-radius:10px;
                          padding:20px;text-align:center;margin-bottom:28px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:0.5em;
                             color:#AADD00;font-family:'JetBrains Mono',Courier,monospace;
                             display:inline-block;padding-right:-0.5em;">
                  ${code}
                </span>
              </div>

              <p style="margin:0;font-size:13px;color:#6B6B80;line-height:1.6;">
                This code expires in <strong style="color:#F0F0F5;">10 minutes</strong>.
                Do not share it with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px;border-top:1px solid #1E1E2E;">
              <p style="margin:0;font-size:12px;color:#6B6B80;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
