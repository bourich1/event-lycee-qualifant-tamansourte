import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import crypto from 'crypto'

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient()
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch the unverified attendee
    const { data: attendee, error: fetchError } = await supabase
      .from('attendees')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (fetchError || !attendee || attendee.email_verified || !attendee.verification_token) {
      return NextResponse.json({ error: 'No pending verification found for this email.' }, { status: 400 })
    }

    // Decode token payload
    const parts = attendee.verification_token.split(':')
    if (parts.length !== 4) {
      return NextResponse.json({ error: 'Invalid verification data.' }, { status: 400 })
    }
    
    const [storedHashedOtp, expiresAtStr, attemptsStr, lastRequestStr] = parts
    const expiresAt = parseInt(expiresAtStr)
    const attempts = parseInt(attemptsStr)

    // 2. Check if locked out
    if (attempts >= MAX_ATTEMPTS) {
      await supabase.from('attendees').delete().eq('email', email)
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 })
    }

    // 3. Check expiration
    if (Date.now() > expiresAt) {
      await supabase.from('attendees').delete().eq('email', email)
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
    }

    // 4. Verify OTP
    const hashedInputOtp = crypto.createHash('sha256').update(code).digest('hex')
    
    if (hashedInputOtp !== storedHashedOtp) {
      const newAttempts = attempts + 1
      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase.from('attendees').delete().eq('email', email)
        return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 })
      } else {
        const newToken = `${storedHashedOtp}:${expiresAt}:${newAttempts}:${lastRequestStr}`
        await supabase.from('attendees').update({ verification_token: newToken }).eq('email', email)
        
        const remaining = MAX_ATTEMPTS - newAttempts
        return NextResponse.json({ error: `Invalid verification code. ${remaining} attempts remaining.` }, { status: 400 })
      }
    }

    // 5. Code is VALID. Mark as verified!
    const { error: verifyError } = await supabase.from('attendees').update({
      email_verified: true,
      verification_token: null
    }).eq('email', email)

    if (verifyError) {
      console.error('Failed to verify attendee:', verifyError)
      return NextResponse.json({ error: 'Failed to complete registration.' }, { status: 500 })
    }

    // 6. Get school name for the frontend response
    let schoolName = 'Tamansourte High School'
    if (attendee.school_id) {
      const { data: school } = await supabase.from('schools').select('name').eq('id', attendee.school_id).maybeSingle()
      if (school) schoolName = school.name
    }

    // 7. Trigger pass email delivery in background
    const baseUrl = new URL('/', req.url).toString().slice(0, -1)
    fetch(`${baseUrl}/api/send-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: attendee.full_name,
        email: attendee.email,
        qr_code: attendee.qr_code,
      }),
    }).catch(err => console.error('Failed to trigger send-pass:', err))

    // 8. Return success data to frontend to show the pass
    return NextResponse.json({
      success: true,
      data: {
        full_name: attendee.full_name,
        qr_code: attendee.qr_code,
        school_name: schoolName,
      }
    })

  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
