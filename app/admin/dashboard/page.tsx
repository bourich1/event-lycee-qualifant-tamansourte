'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import StatsBar from '@/components/admin/StatsBar'
import AttendeeTable from '@/components/admin/AttendeeTable'
import QRScanner from '@/components/admin/QRScanner'

interface Attendee {
  id: string
  full_name: string
  email: string
  school_id: string | null
  qr_code: string
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
  schools?: { name: string } | null
}

interface Toast {
  id: string
  type: 'success' | 'warning' | 'error'
  message: string
}

interface ScanEvent {
  id: string
  type: 'success' | 'warning' | 'error'
  name: string
  message: string
  time: Date
}

type Tab = 'users' | 'scan'

export default function AdminDashboard() {
  const [attendees, setAttendees]         = useState<Attendee[]>([])
  const [loading, setLoading]             = useState(true)
  const [toasts, setToasts]               = useState<Toast[]>([])
  const [activeTab, setActiveTab]         = useState<Tab>('users')
  const [scanEvents, setScanEvents]       = useState<ScanEvent[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

  const router          = useRouter()
  const toastTimers     = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ── Toasts ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    const t = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id))
      toastTimers.current.delete(id)
    }, 4000)
    toastTimers.current.set(id, t)
  }, [])

  // ── Fetch attendees ─────────────────────────────────────────────────────────
  const fetchAttendees = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendees')
      .select('*, schools(name)')
      .order('created_at', { ascending: false })
    if (!error && data) setAttendees(data as Attendee[])
    setLoading(false)
  }, [])

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      fetchAttendees()
    }
    check()
  }, [router, fetchAttendees])

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('attendees-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendees' }, (payload) => {
        setAttendees(prev => [payload.new as Attendee, ...prev])
        addToast('success', `New registration: ${(payload.new as Attendee).full_name}`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attendees' }, (payload) => {
        setAttendees(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'attendees' }, (payload) => {
        setAttendees(prev => prev.filter(a => a.id !== payload.old.id))
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error')
      })
    return () => { supabase.removeChannel(channel) }
  }, [addToast])

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => () => { toastTimers.current.forEach(t => clearTimeout(t)) }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const handleScanResult = useCallback((result: { type: 'success' | 'warning' | 'error'; message: string }) => {
    addToast(result.type, result.message)
    // Add to scan log
    setScanEvents(prev => [{
      id: crypto.randomUUID(),
      type: result.type,
      name: result.message.split(' — ')[0] ?? result.message,
      message: result.message.split(' — ')[1] ?? result.message,
      time: new Date(),
    }, ...prev].slice(0, 20)) // Keep last 20
    if (result.type === 'success') fetchAttendees()
  }, [addToast, fetchAttendees])

  const handleDeleteAttendee = (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id))
    addToast('success', 'Attendee deleted successfully')
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const total      = attendees.length
  const checkedIn  = attendees.filter(a => a.checked_in).length
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0
  const successScans = scanEvents.filter(e => e.type === 'success').length
  const warningScans = scanEvents.filter(e => e.type === 'warning').length
  const errorScans   = scanEvents.filter(e => e.type === 'error').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-dm text-[#8888aa]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-syne font-black text-sm text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
          >
            LQ
          </div>
          <div>
            <h1 className="font-syne font-bold text-sm text-[#f0f0ff] leading-none">
              Admin Dashboard
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: realtimeStatus === 'connected' ? '#00b894' : realtimeStatus === 'error' ? '#e17055' : '#fdcb6e',
                  boxShadow: `0 0 5px ${realtimeStatus === 'connected' ? '#00b894' : '#fdcb6e'}`,
                }}
              />
              <span className="font-dm text-xs text-[#8888aa]">
                {realtimeStatus === 'connected' ? 'Realtime' : realtimeStatus === 'error' ? 'Error' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-2">
          <QRScanner onScanResult={handleScanResult} />
          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="px-3 py-2 rounded-xl font-dm font-medium text-xs text-[#8888aa] hover:text-white transition-all duration-200"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-[57px] z-30 px-4 sm:px-6"
        style={{
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex gap-1 max-w-7xl mx-auto">
          {([
            { id: 'users' as Tab, label: 'Users', icon: '👥', count: total },
            { id: 'scan'  as Tab, label: 'Scan',  icon: '📷', count: scanEvents.length },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-2 px-5 py-3.5 font-dm font-semibold text-sm transition-all duration-200"
              style={{
                color: activeTab === tab.id ? '#f0f0ff' : '#8888aa',
                borderBottom: activeTab === tab.id ? '2px solid #6c5ce7' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: activeTab === tab.id ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.06)',
                  color: activeTab === tab.id ? '#a29bfe' : '#8888aa',
                  minWidth: '22px',
                  textAlign: 'center',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ══ USERS TAB ══════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <>
            <StatsBar attendees={attendees} />
            <AttendeeTable attendees={attendees} onDelete={handleDeleteAttendee} />
          </>
        )}

        {/* ══ SCAN TAB ═══════════════════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <div className="space-y-5">

            {/* Scan summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Accepted',     count: successScans, icon: '✅', color: '#00b894', bg: 'rgba(0,184,148,0.1)',    border: 'rgba(0,184,148,0.25)' },
                { label: 'Already In',   count: warningScans, icon: '⚠️', color: '#fdcb6e', bg: 'rgba(253,203,110,0.1)', border: 'rgba(253,203,110,0.25)' },
                { label: 'Invalid',      count: errorScans,   icon: '❌', color: '#e17055', bg: 'rgba(225,112,85,0.1)',   border: 'rgba(225,112,85,0.25)' },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <p className="font-syne font-black text-3xl mb-1" style={{ color: s.color }}>
                    {s.count}
                  </p>
                  <p className="font-dm text-xs font-medium" style={{ color: s.color }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Check-in progress */}
            <div
              className="rounded-2xl p-5"
              style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-syne font-bold text-base text-[#f0f0ff]">Entry Progress</h3>
                  <p className="font-dm text-xs text-[#8888aa] mt-0.5">
                    {checkedIn} of {total} attendees checked in
                  </p>
                </div>
                <span className="font-syne font-black text-2xl text-[#a29bfe]">{percentage}%</span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, #6c5ce7, #00b894)' }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-dm text-xs text-[#8888aa]">0%</span>
                <span className="font-dm text-xs text-[#8888aa]">100%</span>
              </div>
            </div>

            {/* Open scanner CTA */}
            <div
              className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(162,155,254,0.08))',
                border: '1px solid rgba(108,92,231,0.3)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#6c5ce7] blur-3xl" />
              </div>
              <div className="relative flex-1 text-center sm:text-left">
                <h3 className="font-syne font-black text-lg text-[#f0f0ff] mb-1">
                  Ready to scan?
                </h3>
                <p className="font-dm text-sm text-[#8888aa]">
                  Open the QR scanner to check in attendees at the entrance.
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/scan')}
                className="relative btn-scan-idle flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-dm font-bold text-white text-sm shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', border: 'none', cursor: 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M16 16v.01" strokeWidth="2.8" />
                </svg>
                Open Scanner
              </button>
            </div>

            {/* Scan log */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-syne font-bold text-base text-[#f0f0ff]">
                  Recent Scans
                </h3>
                {scanEvents.length > 0 && (
                  <button
                    onClick={() => setScanEvents([])}
                    className="font-dm text-xs text-[#8888aa] hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {scanEvents.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-4xl mb-3">📷</p>
                  <p className="font-dm text-sm text-[#8888aa]">No scans yet this session</p>
                  <p className="font-dm text-xs text-[#555570] mt-1">
                    Open the scanner to start checking in attendees
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {scanEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{
                          background:
                            event.type === 'success' ? 'rgba(0,184,148,0.15)' :
                            event.type === 'warning' ? 'rgba(253,203,110,0.15)' : 'rgba(225,112,85,0.15)',
                          border:
                            event.type === 'success' ? '1px solid rgba(0,184,148,0.3)' :
                            event.type === 'warning' ? '1px solid rgba(253,203,110,0.3)' : '1px solid rgba(225,112,85,0.3)',
                        }}
                      >
                        {event.type === 'success' ? '✅' : event.type === 'warning' ? '⚠️' : '❌'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-dm font-semibold text-sm text-[#f0f0ff] truncate">
                          {event.name}
                        </p>
                        <p
                          className="font-dm text-xs mt-0.5"
                          style={{
                            color:
                              event.type === 'success' ? '#00b894' :
                              event.type === 'warning' ? '#fdcb6e' : '#e17055',
                          }}
                        >
                          {event.message || (
                            event.type === 'success' ? 'Checked in' :
                            event.type === 'warning' ? 'Already checked in' : 'Invalid QR'
                          )}
                        </p>
                      </div>

                      {/* Time */}
                      <span className="font-dm text-xs text-[#555570] shrink-0">
                        {event.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Toast stack ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast ${
              toast.type === 'success' ? 'toast-success' :
              toast.type === 'warning' ? 'toast-warning' : 'toast-error'
            } pointer-events-auto`}
          >
            <span>
              {toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : '❌'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
