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

type Tab = 'users' | 'scan'

export default function AdminDashboard() {
  const [attendees, setAttendees]           = useState<Attendee[]>([])
  const [loading, setLoading]               = useState(true)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const [activeTab, setActiveTab]           = useState<Tab>('users')
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

  const router      = useRouter()
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ── Toasts ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    const t = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id))
      toastTimers.current.delete(id)
    }, 4000)
    toastTimers.current.set(id, t)
  }, [])

  // ── Fetch attendees ──────────────────────────────────────────────────────────
  const fetchAttendees = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendees')
      .select('*, schools(name)')
      .order('created_at', { ascending: false })
    if (!error && data) setAttendees(data as Attendee[])
    setLoading(false)
  }, [])

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      fetchAttendees()
    }
    check()
  }, [router, fetchAttendees])

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('attendees-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendees' },
        (payload) => {
          setAttendees(prev => [payload.new as Attendee, ...prev])
          addToast('success', `New registration: ${(payload.new as Attendee).full_name}`)
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'attendees' },
        (payload) => {
          setAttendees(prev =>
            prev.map(a => a.id === payload.new.id ? { ...a, ...(payload.new as Attendee) } : a)
          )
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'attendees' },
        (payload) => {
          const deleted = payload.old as { id: string }
          setAttendees(prev => prev.filter(a => a.id !== deleted.id))
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error')
      })

    return () => { supabase.removeChannel(channel) }
  }, [addToast])

  // ── Cleanup timers ───────────────────────────────────────────────────────────
  useEffect(() => () => { toastTimers.current.forEach(t => clearTimeout(t)) }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const handleDeleteAttendee = (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id))
    addToast('success', 'Attendee deleted successfully')
  }

  // ── Derived stats (used in Scan tab) ─────────────────────────────────────────
  const total     = attendees.length
  const checkedIn = attendees.filter(a => a.checked_in).length
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  // Recently checked-in, sorted by checked_in_at descending
  const recentlyCheckedIn = attendees
    .filter(a => a.checked_in && a.checked_in_at)
    .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
    .slice(0, 20)

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

  // ── Tab config ───────────────────────────────────────────────────────────────
  const tabs: Array<{ id: Tab; label: string; icon: string; count: number }> = [
    { id: 'users', label: 'Users', icon: '👥', count: total },
    { id: 'scan',  label: 'Scan',  icon: '📷', count: checkedIn },
  ]

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

      {/* ── Navbar ────────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
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
                  background:
                    realtimeStatus === 'connected' ? '#00b894' :
                    realtimeStatus === 'error'     ? '#e17055' : '#fdcb6e',
                  boxShadow: `0 0 5px ${realtimeStatus === 'connected' ? '#00b894' : '#fdcb6e'}`,
                }}
              />
              <span className="font-dm text-xs text-[#8888aa]">
                {realtimeStatus === 'connected' ? 'Realtime' :
                 realtimeStatus === 'error'     ? 'Error' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-2 rounded-xl font-dm font-medium text-xs text-[#8888aa] hover:text-white transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            🏠 Home
          </button>
          {/* QRScanner is a simple nav button — no props needed */}
          <QRScanner />
          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="px-3 py-2 rounded-xl font-dm font-medium text-xs text-[#8888aa] hover:text-white transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div
        className="sticky z-30 px-4 sm:px-6"
        style={{
          top: '57px',
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex gap-1 max-w-7xl mx-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-3.5 font-dm font-semibold text-sm transition-all duration-200"
              style={{
                color: activeTab === tab.id ? '#f0f0ff' : '#8888aa',
                borderBottom: activeTab === tab.id ? '2px solid #6c5ce7' : '2px solid transparent',
                marginBottom: '-1px',
                background: 'none',
                cursor: 'pointer',
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

      {/* ── Page content ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ══ USERS TAB ════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <>
            <StatsBar attendees={attendees} />
            <AttendeeTable attendees={attendees} onDelete={handleDeleteAttendee} />
          </>
        )}

        {/* ══ SCAN TAB ═════════════════════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <div className="space-y-5">

            {/* ── 3 stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
              {([
                {
                  label: 'Checked In',
                  value: checkedIn,
                  icon: '✅',
                  color: '#00b894',
                  bg: 'rgba(0,184,148,0.1)',
                  border: 'rgba(0,184,148,0.25)',
                },
                {
                  label: 'Pending',
                  value: total - checkedIn,
                  icon: '⏳',
                  color: '#fdcb6e',
                  bg: 'rgba(253,203,110,0.1)',
                  border: 'rgba(253,203,110,0.25)',
                },
                {
                  label: 'Total',
                  value: total,
                  icon: '👥',
                  color: '#a29bfe',
                  bg: 'rgba(162,155,254,0.1)',
                  border: 'rgba(162,155,254,0.25)',
                },
              ] as const).map(s => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 sm:p-5 text-center transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <div className="text-2xl sm:text-3xl mb-2">{s.icon}</div>
                  <p className="font-syne font-black text-2xl sm:text-3xl mb-1" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="font-dm text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Entry progress bar ────────────────────────────────────────── */}
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
                  style={{
                    width: `${percentage}%`,
                    background: 'linear-gradient(90deg, #6c5ce7, #00b894)',
                  }}
                />
              </div>
            </div>

            {/* ── Open scanner CTA ──────────────────────────────────────────── */}
            <div
              className="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(162,155,254,0.08))',
                border: '1px solid rgba(108,92,231,0.3)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#6c5ce7]/20 blur-3xl" />
              </div>
              <div className="relative flex-1 text-center sm:text-left">
                <h3 className="font-syne font-black text-lg text-[#f0f0ff] mb-1">Ready to scan?</h3>
                <p className="font-dm text-sm text-[#8888aa]">
                  Open the full-screen QR scanner to check in attendees.
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/scan')}
                className="relative btn-scan-idle flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-dm font-bold text-white text-sm shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  border: 'none',
                  cursor: 'pointer',
                }}
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

            {/* ── Recently checked-in log (from DB) ─────────────────────────── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="font-syne font-bold text-base text-[#f0f0ff]">
                  Check-in Log
                </h3>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-dm font-semibold"
                  style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894', border: '1px solid rgba(0,184,148,0.25)' }}
                >
                  {recentlyCheckedIn.length} entries
                </span>
              </div>

              {recentlyCheckedIn.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-4xl mb-3">📷</p>
                  <p className="font-dm text-sm text-[#8888aa]">No one checked in yet</p>
                  <p className="font-dm text-xs text-[#555570] mt-1">
                    Use the scanner to start checking in attendees
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentlyCheckedIn.map(attendee => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-syne font-bold shrink-0"
                        style={{
                          background: 'rgba(0,184,148,0.15)',
                          border: '1px solid rgba(0,184,148,0.3)',
                          color: '#00b894',
                        }}
                      >
                        {attendee.full_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-dm font-semibold text-sm text-[#f0f0ff] truncate">
                          {attendee.full_name}
                        </p>
                        <p className="font-dm text-xs text-[#8888aa] truncate">
                          {attendee.schools?.name ?? attendee.email}
                        </p>
                      </div>

                      {/* Time */}
                      <div className="text-right shrink-0">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-dm font-semibold"
                          style={{
                            background: 'rgba(0,184,148,0.1)',
                            color: '#00b894',
                            border: '1px solid rgba(0,184,148,0.2)',
                          }}
                        >
                          ✓ In
                        </span>
                        <p className="font-dm text-xs text-[#555570] mt-1">
                          {formatTime(attendee.checked_in_at!)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Toast stack ───────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast ${
              toast.type === 'success' ? 'toast-success' :
              toast.type === 'warning' ? 'toast-warning' : 'toast-error'
            } pointer-events-auto`}
          >
            <span>{toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : '❌'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
