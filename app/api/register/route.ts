import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient()
  try {
    const { full_name, email, school_id } = await req.json()

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Check if already registered
    const { data: existingAttendee } = await supabase
      .from('attendees')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingAttendee) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 })
    }

    // 2. Insert into attendees table
    const qr_code = crypto.randomUUID()
    
    const { data: newAttendee, error: insertError } = await supabase.from('attendees').insert({
      full_name,
      email,
      school_id: school_id || null,
      qr_code,
      email_verified: true // We're skipping verification
    }).select().single()

    if (insertError) {
      console.error('Failed to insert attendee:', insertError)
      return NextResponse.json({ 
        error: 'Failed to complete registration.',
        details: insertError.message || 'Database insertion error'
      }, { status: 500 })
    }

    // 3. Get school name for response
    let schoolName = 'Tamansourte High School'
    if (newAttendee.school_id) {
      const { data: school } = await supabase.from('schools').select('name').eq('id', newAttendee.school_id).maybeSingle()
      if (school) schoolName = school.name
    }

    // 4. Trigger pass email delivery
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
    console.error('register error:', err)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: err.message || 'Unknown error' 
    }, { status: 500 })
  }
}
