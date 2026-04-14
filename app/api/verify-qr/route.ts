import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { qr_code } = await req.json()

    if (!qr_code) {
      return NextResponse.json({ error: 'Missing qr_code' }, { status: 400 })
    }

    // Use service role client to bypass RLS
    const supabase = createServiceRoleClient()

    // Find attendee by QR code
    const { data: attendee, error: findError } = await supabase
      .from('attendees')
      .select('*, schools(name)')
      .eq('qr_code', qr_code)
      .single()

    if (findError || !attendee) {
      return NextResponse.json({ error: 'Participant introuvable' }, { status: 404 })
    }

    // Already checked in?
    if (attendee.checked_in) {
      return NextResponse.json(
        { warning: 'Déjà enregistré', attendee },
        { status: 200 }
      )
    }

    // Mark as checked in
    const { error: updateError } = await supabase
      .from('attendees')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq('qr_code', qr_code)

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ success: true, attendee }, { status: 200 })
  } catch (err) {
    console.error('verify-qr error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
