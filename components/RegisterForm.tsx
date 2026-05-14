'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getSchoolGradient, getSchoolColor } from '@/lib/theme'

interface RegisterFormProps {
  onClose: () => void
  onSuccess: (name: string, qrCode: string, email: string, schoolName: string) => void
}

interface School {
  id: string
  name: string
}

export default function RegisterForm({ onClose, onSuccess }: RegisterFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [error, setError] = useState('')
  const [emailExists, setEmailExists] = useState(false)

  useEffect(() => {
    const fetchSchools = async () => {
      const { data, error } = await supabase.from('schools').select('id, name').order('name')
      if (!error && data) setSchools(data)
      setLoadingSchools(false)
    }
    fetchSchools()
  }, [])

  // Check email in real-time as user types
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailExists(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`)
        const data = await res.json()
        setEmailExists(data.exists)
      } catch (err) {
        console.error('Email check failed:', err)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [email])
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (emailExists) {
      setError('This email is already registered for this event.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          school_id: schoolId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to register. Please try again.')
        setLoading(false)
        return
      }

      // Success! Show pass directly.
      onSuccess(data.data.full_name, data.data.qr_code, email, data.data.school_name)
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  const schoolThemeColor = schoolId ? getSchoolColor(schools.find(s => s.id === schoolId)?.name || '') : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[700px] rounded-[24px] p-4 sm:p-6 relative animate-scaleIn transition-all duration-500 flex flex-col md:flex-row gap-5 items-center"
        style={{
          background: '#13131a',
          border: schoolThemeColor ? `1px solid ${schoolThemeColor}40` : '1px solid rgba(255,255,255,0.1)',
          boxShadow: schoolThemeColor ? `0 20px 60px rgba(0,0,0,0.5), 0 0 60px ${schoolThemeColor}15` : '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all duration-200 z-10"
        >
          ✕
        </button>

        {/* Form Column */}
        <div className="w-full flex-1 order-2 md:order-1">
          <div className="animate-fadeIn">
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#6c5ce7]/20 flex items-center justify-center text-2xl mb-3 shadow-inner">
                🎟️
              </div>
              <h2 className="font-syne font-black text-2xl text-[#f0f0ff] mb-1 tracking-tight">
                Join the Event
              </h2>
              <p className="font-dm text-xs text-[#8888aa] leading-relaxed">
                Register to receive your digital pass.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-dm text-[11px] text-[#8888aa] mb-1.5 font-bold uppercase tracking-wider">Full Name</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: Ahmed Alami" className="input-field py-2.5 text-sm" />
              </div>

              <div>
                <label className="block font-dm text-[11px] text-[#8888aa] mb-1.5 font-bold uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="your@email.com" className="input-field py-2.5 text-sm pr-10" />
                  {email.includes('@') && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">{emailExists ? '❌' : '✅'}</span>}
                </div>
                {emailExists && <div className="mt-2 text-[10px] text-[#e17055] font-medium">⚠️ Email already registered.</div>}
              </div>

              <div>
                <label className="block font-dm text-[11px] text-[#8888aa] mb-1.5 font-bold uppercase tracking-wider">School</label>
                {loadingSchools ? (
                  <div className="input-field py-2.5 flex items-center gap-2 text-[#8888aa] text-sm"><div className="spinner w-3 h-3 opacity-60" /><span>Loading...</span></div>
                ) : (
                  <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="input-field py-2.5 text-sm cursor-pointer">
                    <option value="">Select your school</option>
                    {schools.map((school) => <option key={school.id} value={school.id} style={{ background: '#13131a' }}>{school.name}</option>)}
                  </select>
                )}
              </div>

              {error && <div className="px-4 py-2 rounded-xl text-[11px] font-dm bg-[#e17055]/10 border border-[#e17055]/30 text-[#e17055] animate-shake">⚠️ {error}</div>}

              <button type="submit" disabled={loading || emailExists} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2 text-sm font-bold shadow-lg"
                style={loading || emailExists ? { opacity: 0.6, cursor: 'not-allowed' } : schoolThemeColor ? { background: `linear-gradient(135deg, ${schoolThemeColor}, ${schoolThemeColor}dd)`, boxShadow: `0 8px 30px ${schoolThemeColor}30` } : {}}>
                {loading ? <><div className="spinner w-4 h-4" /><span>Processing...</span></> : <><span>Get My Pass</span><span>→</span></>}
              </button>
            </form>
          </div>
        </div>

        {/* Pass Preview Column */}
        <div className="hidden md:block w-full md:w-[280px] shrink-0 animate-fadeIn order-1 md:order-2">
          <div className="mb-3 flex items-center gap-2 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6c5ce7] animate-pulse"></span>
            <span className="text-[9px] font-dm font-bold text-white/40 uppercase tracking-[0.2em]">Preview</span>
          </div>
          
          <div 
            className="relative w-full aspect-[3/4.2] rounded-[20px] p-4 shadow-2xl flex flex-col border border-white/5 overflow-hidden group"
            style={{ background: schoolId ? getSchoolGradient(schools.find(s => s.id === schoolId)?.name || '') : 'linear-gradient(135deg, #1a1a2e, #13131a)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <span className="font-dm text-[6px] tracking-widest text-white/50 font-bold uppercase mb-0.5">Event Pass</span>
                <h2 className="font-syne font-black text-[14px] text-white leading-tight uppercase text-left">TAMANSOURTE<br/>2026</h2>
              </div>
              <div className="relative w-8 h-8">
                <Image
                  src="/lycee-logo.png"
                  alt="Logo"
                  fill
                  className="object-contain brightness-0 invert opacity-50"
                />
              </div>
            </div>

            <div className="mt-auto mb-3">
              <h1 className="font-syne font-black text-[18px] text-center text-white uppercase leading-none break-words min-h-[36px]">
                {fullName || 'YOUR NAME'}
              </h1>
            </div>

            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center relative shadow-inner">
                <div className="w-14 h-14 border border-white/10 border-dashed rounded-md flex items-center justify-center">
                  <span className="text-[6px] text-white/20 font-bold uppercase text-center px-1">QR Code</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex flex-col flex-1 pr-2">
                <span className="font-dm text-[6px] tracking-widest text-white/50 uppercase font-bold mb-0.5">School</span>
                <span className="font-dm text-[8px] text-white font-medium line-clamp-1">
                  {schoolId ? schools.find(s => s.id === schoolId)?.name : 'YOUR SCHOOL'}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-dm text-[6px] tracking-widest text-white/50 uppercase font-bold mb-0.5">Date</span>
                <span className="font-dm text-[8px] text-white font-medium uppercase">May 2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
