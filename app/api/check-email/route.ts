import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const cleanEmail = email.trim().toLowerCase()

  try {
    // Check verified attendees ONLY
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (attendeeError) {
      console.error('check-email database error:', attendeeError)
      throw attendeeError
    }

    if (attendee) {
      return NextResponse.json({ exists: true, status: 'verified' })
    }

    return NextResponse.json({ exists: false })
  } catch (err) {
    console.error('check-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
