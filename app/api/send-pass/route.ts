import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { resend } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, qr_code } = await req.json()

    if (!full_name || !email || !qr_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate QR code as base64 PNG
    const qrDataUrl = await QRCode.toDataURL(qr_code, {
      width: 300,
      margin: 2,
      color: {
        dark: '#6c5ce7',
        light: '#13131a',
      },
    })

    // Build professional dark-themed HTML email
    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre Pass Événement</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#13131a);border-radius:24px 24px 0 0;padding:40px;text-align:center;border:1px solid rgba(255,255,255,0.08);border-bottom:none;">
              <div style="display:inline-block;width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#a29bfe);line-height:70px;font-size:28px;font-weight:900;color:white;font-family:Georgia,serif;margin-bottom:20px;">LQ</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#f0f0ff;letter-spacing:-0.5px;">EVENT NAME</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#8888aa;">Lycée Qualifiant Tamansourte</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#13131a;padding:40px;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              
              <p style="margin:0 0 24px;font-size:16px;color:#8888aa;">Bonjour <strong style="color:#f0f0ff;">${full_name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:15px;color:#8888aa;line-height:1.7;">
                Votre inscription à l'événement a été confirmée. Voici votre pass numérique personnel.
                Présentez le QR code ci-dessous à l'entrée de l'événement.
              </p>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:rgba(108,92,231,0.08);border:1px solid rgba(108,92,231,0.2);border-radius:16px;padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#8888aa;font-size:13px;">📅 Date</span>
                          <span style="float:right;color:#f0f0ff;font-weight:600;font-size:14px;">EVENT DATE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#8888aa;font-size:13px;">📍 Lieu</span>
                          <span style="float:right;color:#f0f0ff;font-weight:600;font-size:14px;">EVENT LOCATION</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#8888aa;font-size:13px;">🎓 Participant</span>
                          <span style="float:right;color:#a29bfe;font-weight:600;font-size:14px;">${full_name}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Code -->
              <div style="text-align:center;margin-bottom:32px;">
                <p style="font-size:13px;color:#8888aa;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">Votre QR Code d'accès</p>
                <div style="display:inline-block;padding:20px;background:#0a0a0f;border-radius:20px;border:2px solid rgba(108,92,231,0.4);box-shadow:0 0 40px rgba(108,92,231,0.2);">
                  <img src="${qrDataUrl}" alt="QR Code" width="220" height="220" style="display:block;border-radius:8px;" />
                </div>
                <p style="margin:16px 0 0;font-size:11px;color:#8888aa;font-family:monospace;letter-spacing:0.5px;">${qr_code}</p>
              </div>

              <p style="margin:0;font-size:13px;color:#8888aa;text-align:center;line-height:1.7;">
                ⚠️ Ce pass est personnel et nominatif. Merci de ne pas le partager.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.02);padding:24px;text-align:center;border-radius:0 0 24px 24px;border:1px solid rgba(255,255,255,0.08);border-top:none;">
              <p style="margin:0;font-size:12px;color:#8888aa;">
                © ${new Date().getFullYear()} Lycée Qualifiant Tamansourte — Tous droits réservés
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Lycée Qualifiant Tamansourte <noreply@yourdomain.com>',
      to: email,
      subject: 'Votre Pass Événement est prêt 🎟️',
      html: htmlBody,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-pass error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
