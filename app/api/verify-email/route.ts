import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return new NextResponse('Missing verification token', { status: 400 })
    }

    // Find the attendee with this token
    const { data: attendee, error: fetchError } = await supabase
      .from('attendees')
      .select('id, full_name, email, qr_code, email_verified')
      .eq('verification_token', token)
      .maybeSingle()

    if (fetchError || !attendee) {
      return getStyledResponse('Invalid or expired verification token.', false)
    }

    if (attendee.email_verified) {
      return getStyledResponse('Email already confirmed! Your QR pass was already sent.', true)
    }

    // Update the attendee to verified
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ email_verified: true, verification_token: null })
      .eq('id', attendee.id)

    if (updateError) {
      console.error('Failed to verify email in DB:', updateError)
      return getStyledResponse('Failed to verify email. Please try again.', false)
    }

    // Trigger the send-pass API to send the actual QR code pass
    const baseUrl = new URL('/', req.url).toString().slice(0, -1)
    
    // We send a non-blocking fetch so the user sees the success page immediately
    fetch(`${baseUrl}/api/send-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: attendee.full_name,
        email: attendee.email,
        qr_code: attendee.qr_code,
      }),
    }).catch(err => console.error('Failed to trigger send-pass:', err))

    return getStyledResponse('Email confirmed! Your QR pass has been sent.', true)
  } catch (err) {
    console.error('verify-email error:', err)
    return getStyledResponse('An unexpected error occurred.', false)
  }
}

// Helper to generate a dark-themed HTML response
function getStyledResponse(message: string, isSuccess: boolean) {
  const icon = isSuccess ? '✅' : '❌'
  const color = isSuccess ? '#00b894' : '#e17055'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Status</title>
  <style>
    body { background: #0a0a0f; color: #f0f0ff; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #13131a; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); text-align: center; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { margin: 0 0 16px; font-size: 24px; color: ${color}; }
    p { margin: 0 0 32px; color: #8888aa; line-height: 1.5; }
    a { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; text-decoration: none; border-radius: 9999px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>Status</h1>
    <p>${message}</p>
    <a href="/">Return to Homepage</a>
  </div>
</body>
</html>
  `
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
