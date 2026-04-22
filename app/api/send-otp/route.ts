import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { transporter } from '@/lib/mailer'
import crypto from 'crypto'

const OTP_COOLDOWN_SECONDS = 60
const OTP_EXPIRATION_MINUTES = 10

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient()
  try {
    const { full_name, email, school_id } = await req.json()

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Check if email is already registered
    const { data: existingAttendee } = await supabase
      .from('attendees')
      .select('id, email_verified, verification_token')
      .eq('email', email)
      .maybeSingle()

    // If fully verified, stop.
    if (existingAttendee && existingAttendee.email_verified) {
      return NextResponse.json({ error: 'This email is already registered and verified.' }, { status: 400 })
    }

    // Check cooldown if unverified but exists
    if (existingAttendee && existingAttendee.verification_token) {
      const parts = existingAttendee.verification_token.split(':')
      if (parts.length === 4) {
        const lastRequestTime = parseInt(parts[3])
        const secondsSinceLastRequest = (Date.now() - lastRequestTime) / 1000
        if (secondsSinceLastRequest < OTP_COOLDOWN_SECONDS) {
          return NextResponse.json({ 
            error: `Please wait ${Math.ceil(OTP_COOLDOWN_SECONDS - secondsSinceLastRequest)} seconds before requesting a new code.` 
          }, { status: 429 })
        }
      }
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hashed_otp = crypto.createHash('sha256').update(otp).digest('hex')
    const expires_at = Date.now() + OTP_EXPIRATION_MINUTES * 60000
    const attempts = 0
    const requestTime = Date.now()
    
    // Store data in verification_token column format: "hashedOtp:expiresAt:attempts:lastRequestTime"
    const tokenPayload = `${hashed_otp}:${expires_at}:${attempts}:${requestTime}`

    if (existingAttendee) {
      // Update existing unverified attendee
      const { error: updateError } = await supabase.from('attendees').update({
        full_name,
        school_id: school_id || null,
        verification_token: tokenPayload
      }).eq('email', email)

      if (updateError) throw updateError
    } else {
      // Insert new unverified attendee
      const { error: insertError } = await supabase.from('attendees').insert({
        full_name,
        email,
        school_id: school_id || null,
        qr_code: crypto.randomUUID(), // Assign QR code now, show it later
        email_verified: false,
        verification_token: tokenPayload
      })

      if (insertError) throw insertError
    }

    // 5. Send plain OTP via email (Nodemailer)
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#13131a);border-radius:24px 24px 0 0;padding:40px;text-align:center;border:1px solid rgba(255,255,255,0.08);border-bottom:none;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#f0f0ff;">Verify Your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#13131a;padding:40px;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 24px;font-size:16px;color:#8888aa;">Hello <strong style="color:#f0f0ff;">${full_name}</strong>,</p>
              <p style="margin:0 0 32px;font-size:15px;color:#8888aa;line-height:1.7;">
                Please use the following 6-digit code to verify your email address. This code will expire in 10 minutes.
              </p>
              
              <div style="text-align:center;margin-bottom:32px;background:rgba(108,92,231,0.1);border:1px solid rgba(108,92,231,0.3);border-radius:16px;padding:24px;">
                <span style="font-family:monospace;font-size:36px;font-weight:900;letter-spacing:8px;color:#a29bfe;">${otp}</span>
              </div>

              <p style="margin:0;font-size:13px;color:#555570;text-align:center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:rgba(255,255,255,0.02);padding:24px;text-align:center;border-radius:0 0 24px 24px;border:1px solid rgba(255,255,255,0.08);border-top:none;">
              <p style="margin:0;font-size:12px;color:#8888aa;">© ${new Date().getFullYear()} Tamansourte High School</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    await transporter.sendMail({
      from: `"Lycée Qualifiant Tamansourte" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${otp} is your verification code`,
      html: htmlBody,
    })

    return NextResponse.json({ success: true, message: 'OTP sent successfully' })
  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
