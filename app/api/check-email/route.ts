import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  try {
    // 1. Check verified attendees
    const { data: verified, error: verifiedError } = await supabase
      .from('attendees')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (verifiedError) throw verifiedError

    if (verified) {
      return NextResponse.json({ exists: true, status: 'verified' })
    }

    // 2. Check pending requests (optional but good for context)
    const { data: pending, error: pendingError } = await supabase
      .from('otp_requests')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (pendingError) throw pendingError

    if (pending) {
      return NextResponse.json({ exists: true, status: 'pending' })
    }

    return NextResponse.json({ exists: false })
  } catch (err) {
    console.error('check-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
