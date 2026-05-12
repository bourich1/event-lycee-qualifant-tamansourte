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

    // 1. Fetch the pending request
    const { data: request, error: fetchError } = await supabase
      .from('otp_requests')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (fetchError || !request) {
      return NextResponse.json({ error: 'No pending verification found for this email.' }, { status: 400 })
    }

    const { hashed_otp: storedHashedOtp, expires_at, attempts, user_data } = request
    const expiresAt = new Date(expires_at).getTime()

    // 2. Check if locked out
    if (attempts >= MAX_ATTEMPTS) {
      await supabase.from('otp_requests').delete().eq('email', email)
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 })
    }

    // 3. Check expiration
    if (Date.now() > expiresAt) {
      await supabase.from('otp_requests').delete().eq('email', email)
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
    }

    // 4. Verify OTP
    const hashedInputOtp = crypto.createHash('sha256').update(code).digest('hex')
    
    if (hashedInputOtp !== storedHashedOtp) {
      const newAttempts = attempts + 1
      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase.from('otp_requests').delete().eq('email', email)
        return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 })
      } else {
        await supabase.from('otp_requests').update({ attempts: newAttempts }).eq('email', email)
        const remaining = MAX_ATTEMPTS - newAttempts
        return NextResponse.json({ error: `Invalid verification code. ${remaining} attempts remaining.` }, { status: 400 })
      }
    }

    // 5. Code is VALID. Insert into attendees table!
    const userData = user_data as { full_name: string, school_id: string | null }
    const qr_code = crypto.randomUUID()
    
    const { data: newAttendee, error: insertError } = await supabase.from('attendees').insert({
      full_name: userData.full_name,
      email,
      school_id: userData.school_id,
      qr_code,
      email_verified: true
    }).select().single()

    if (insertError) {
      console.error('Failed to insert attendee:', insertError)
      return NextResponse.json({ 
        error: 'Failed to complete registration.',
        details: insertError.message || 'Database insertion error'
      }, { status: 500 })
    }

    // 6. Delete the OTP request
    await supabase.from('otp_requests').delete().eq('email', email)

    // 7. Get school name for response
    let schoolName = 'Tamansourte High School'
    if (newAttendee.school_id) {
      const { data: school } = await supabase.from('schools').select('name').eq('id', newAttendee.school_id).maybeSingle()
      if (school) schoolName = school.name
    }

    // 8. Trigger pass email delivery
    const baseUrl = new URL('/', req.url).toString().slice(0, -1)
    try {
      await fetch(`${baseUrl}/api/send-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newAttendee.full_name,
          email: newAttendee.email,
          qr_code: newAttendee.qr_code,
        }),
      })
    } catch (err) {
      console.error('Failed to trigger send-pass:', err)
    }

    return NextResponse.json({
      success: true,
      data: {
        full_name: newAttendee.full_name,
        qr_code: newAttendee.qr_code,
        school_name: schoolName,
      }
    })
  } catch (err: any) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: err.message || 'Unknown error' 
    }, { status: 500 })
  }
}
