import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { transporter } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, school_id } = await req.json()

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const qr_code = crypto.randomUUID()
    const verification_token = crypto.randomUUID()

    // Insert the attendee with email_verified = false
    const { error: insertError } = await supabase.from('attendees').insert({
      full_name,
      email,
      school_id: school_id || null,
      qr_code,
      email_verified: false,
      verification_token,
    })

    if (insertError) {
      if (insertError.message.includes('unique') || insertError.code === '23505') {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to insert record' }, { status: 500 })
    }

    // Build absolute URL for the verification link
    const baseUrl = new URL('/', req.url).toString().slice(0, -1) // remove trailing slash
    const verifyLink = `${baseUrl}/api/verify-email?token=${verification_token}`

    // Build professional dark-themed HTML email
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your registration</title>
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
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#f0f0ff;letter-spacing:-0.5px;">Verify Your Email</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#8888aa;">Tamansourte High School</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#13131a;padding:40px;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              
              <p style="margin:0 0 24px;font-size:16px;color:#8888aa;">Hello <strong style="color:#f0f0ff;">${full_name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:15px;color:#8888aa;line-height:1.7;">
                Thank you for registering for our event. Please confirm your email address by clicking the button below. Once confirmed, you will receive your digital QR pass.
              </p>

              <!-- Verification Button -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${verifyLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:white;text-decoration:none;border-radius:9999px;font-weight:bold;font-size:16px;box-shadow:0 4px 14px rgba(108, 92, 231, 0.3);">
                  Verify Email Address
                </a>
              </div>

              <p style="margin:0;font-size:13px;color:#555570;text-align:center;line-height:1.7;">
                If you did not request this, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.02);padding:24px;text-align:center;border-radius:0 0 24px 24px;border:1px solid rgba(255,255,255,0.08);border-top:none;">
              <p style="margin:0;font-size:12px;color:#8888aa;">
                © ${new Date().getFullYear()} Tamansourte High School — All rights reserved
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

    // Send email via Nodemailer
    await transporter.sendMail({
      from: `"Lycée Qualifiant Tamansourte" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ Confirm your registration',
      html: htmlBody,
    })

    return NextResponse.json({ success: true, qr_code }) // Return qr_code just in case the client needs it (though it shouldn't show it yet)
  } catch (err) {
    console.error('send-verification error:', err)
    return NextResponse.json({ error: 'Internal server error or failed to send email' }, { status: 500 })
  }
}
