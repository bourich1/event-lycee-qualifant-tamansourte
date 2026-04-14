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

export default function AdminDashboard() {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const router = useRouter()
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Show toast
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      toastTimersRef.current.delete(id)
    }, 4000)
    toastTimersRef.current.set(id, timer)
  }, [])

  // Fetch attendees
  const fetchAttendees = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendees')
      .select('*, schools(name)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAttendees(data as Attendee[])
    }
    setLoading(false)
  }, [supabase])

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/admin/login')
        return
      }
      fetchAttendees()
    }
    checkAuth()
  }, [supabase, router, fetchAttendees])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('attendees-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendees' },
        (payload) => {
          setAttendees((prev) => [payload.new as Attendee, ...prev])
          addToast('success', `Nouvel inscrit : ${(payload.new as Attendee).full_name}`)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'attendees' },
        (payload) => {
          setAttendees((prev) =>
            prev.map((a) => (a.id === payload.new.id ? { ...a, ...payload.new } : a))
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, addToast])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const handleScanResult = (result: { type: 'success' | 'warning' | 'error'; message: string }) => {
    addToast(result.type, result.message)
    if (result.type === 'success') {
      fetchAttendees() // Refresh table on successful check-in
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-dm text-[#8888aa]">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-syne font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
          >
            LQ
          </div>
          <div>
            <h1 className="font-syne font-bold text-base text-[#f0f0ff] leading-none">
              Admin Dashboard
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: realtimeStatus === 'connected' ? '#00b894' : realtimeStatus === 'error' ? '#e17055' : '#fdcb6e',
                  boxShadow: `0 0 6px ${realtimeStatus === 'connected' ? '#00b894' : '#fdcb6e'}`,
                }}
              />
              <span className="font-dm text-xs text-[#8888aa]">
                {realtimeStatus === 'connected' ? 'Temps réel' : realtimeStatus === 'error' ? 'Erreur' : 'Connexion...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* QR Scanner button — opens modal */}
          <QRScanner onScanResult={handleScanResult} />

          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-full font-dm font-medium text-sm text-[#8888aa] hover:text-white transition-all duration-200"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <StatsBar attendees={attendees} />

        {/* Attendee table — full width now that scanner is in navbar */}
        <AttendeeTable attendees={attendees} />
      </div>

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${
              toast.type === 'success'
                ? 'toast-success'
                : toast.type === 'warning'
                ? 'toast-warning'
                : 'toast-error'
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
