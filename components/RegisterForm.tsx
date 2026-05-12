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
  const [isVerificationSent, setIsVerificationSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (isVerificationSent && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [isVerificationSent, timeLeft])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedData = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      pastedData.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char
      })
      setOtp(newOtp)
      const focusIndex = Math.min(index + pastedData.length, 5)
      inputRefs.current[focusIndex]?.focus()
      return
    }
    
    if (value && !/^\d+$/.test(value)) return // only numbers

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      
      const data = await res.json()
      
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to verify code.')
        setLoading(false)
        return
      }
      
      // Success! Show pass.
      onSuccess(data.data.full_name, data.data.qr_code, email, data.data.school_name)
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (timeLeft > 0) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, school_id: schoolId || null }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to resend code.')
      } else {
        setTimeLeft(60)
        setOtp(['', '', '', '', '', ''])
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

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
        // Only mark as "exists" if they are fully verified
        setEmailExists(data.exists && data.status === 'verified')
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
      const res = await fetch('/api/send-otp', {
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

      // Show OTP input UI
      setIsVerificationSent(true)
      setTimeLeft(60)
      setLoading(false)
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  const schoolThemeColor = schoolId ? getSchoolColor(schools.find(s => s.id === schoolId)?.name || '') : null
  const isOtpIncomplete = otp.some(d => d === '')

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
          {isVerificationSent ? (
            <div className="text-center animate-fadeIn py-4">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg" style={{ background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.2)' }}>
                🔒
              </div>
              <h3 className="font-syne font-black text-2xl text-[#f0f0ff] mb-2 tracking-tight">Verify Email</h3>
              <p className="font-dm text-[#8888aa] text-xs leading-relaxed mb-6 max-w-[250px] mx-auto">
                Enter the 6-digit code sent to <strong className="text-white break-all">{email}</strong>.
              </p>

              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { inputRefs.current[idx] = el }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 h-12 rounded-xl bg-[#1a1a2e] border border-white/10 text-center text-xl font-syne font-black text-white focus:border-[#6c5ce7] focus:ring-4 focus:ring-[#6c5ce7]/10 outline-none transition-all shadow-md"
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-dm animate-shake" style={{ background: 'rgba(225,112,85,0.1)', border: '1px solid rgba(225,112,85,0.3)', color: '#e17055' }}>
                  <span>⚠️ {error}</span>
                </div>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || isOtpIncomplete}
                className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 mb-4"
                style={(loading || isOtpIncomplete) ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                {loading ? <div className="flex items-center gap-2"><div className="spinner w-4 h-4" /><span>Verifying...</span></div> : <span>Verify Code</span>}
              </button>

              <button onClick={handleResendOtp} disabled={timeLeft > 0 || loading} className="text-[11px] font-dm text-[#8888aa] hover:text-[#a29bfe] transition-colors disabled:opacity-50">
                {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend Code'}
              </button>
            </div>
          ) : (
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
          )}
        </div>

        {/* Pass Preview Column */}
        {!isVerificationSent && (
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
        )}
      </div>
    </div>
  )
}
