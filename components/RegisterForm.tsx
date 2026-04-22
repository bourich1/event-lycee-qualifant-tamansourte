'use client'

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
      const { data } = await supabase
        .from('attendees')
        .select('email_verified')
        .eq('email', email)
        .maybeSingle()
      setEmailExists(data ? data.email_verified : false)
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[400px] rounded-3xl p-6 relative animate-scaleIn transition-all duration-500"
        style={{
          background: '#13131a',
          border: schoolThemeColor ? `1px solid ${schoolThemeColor}` : '1px solid rgba(255,255,255,0.1)',
          boxShadow: schoolThemeColor ? `0 20px 60px rgba(0,0,0,0.5), 0 0 60px ${schoolThemeColor}30` : '0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(108,92,231,0.08)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          ✕
        </button>

        {isVerificationSent ? (
          <div className="text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-3xl" style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.3)' }}>
              🔒
            </div>
            <h3 className="font-syne font-black text-2xl text-[#f0f0ff] mb-2">Enter OTP Code</h3>
            <p className="font-dm text-[#8888aa] text-sm leading-relaxed mb-6">
              We've sent a 6-digit code to <strong className="text-white">{email}</strong>.
            </p>

            <div className="flex justify-center gap-2 sm:gap-3 mb-6">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl bg-[#13131a] border border-white/10 text-center text-xl font-syne font-black text-white focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/20 outline-none transition-all"
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-dm" style={{ background: 'rgba(225,112,85,0.1)', border: '1px solid rgba(225,112,85,0.3)', color: '#e17055' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || isOtpIncomplete}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
              style={(loading || isOtpIncomplete) ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              {loading ? (
                <div className="flex items-center gap-2"><div className="spinner" /><span>Verifying...</span></div>
              ) : (
                <span>Verify Code</span>
              )}
            </button>

            <div className="text-sm font-dm">
              <button
                onClick={handleResendOtp}
                disabled={timeLeft > 0 || loading}
                className="text-[#8888aa] hover:text-[#a29bfe] transition-colors disabled:opacity-50 disabled:hover:text-[#8888aa]"
              >
                {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className="form-container">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#6c5ce7]/20 flex items-center justify-center text-2xl mb-4">
                🎟️
              </div>
              <h2 className="font-syne font-black text-2xl text-[#f0f0ff] mb-1">
                Get My Pass
              </h2>
              <p className="font-dm text-sm text-[#8888aa]">
                Fill in the form to register and receive your QR code.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">
                  Full Name <span className="text-[#6c5ce7]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="input-field"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">
                  Email Address <span className="text-[#6c5ce7]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="your@email.com"
                    className="input-field pr-10"
                    style={
                      emailExists
                        ? { borderColor: 'rgba(225,112,85,0.6)', boxShadow: '0 0 0 3px rgba(225,112,85,0.1)' }
                        : {}
                    }
                  />
                  {email.includes('@') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
                      {emailExists ? '❌' : '✅'}
                    </span>
                  )}
                </div>
                {emailExists && (
                  <div
                    className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-dm"
                    style={{
                      background: 'rgba(225,112,85,0.08)',
                      border: '1px solid rgba(225,112,85,0.25)',
                      color: '#e17055',
                    }}
                  >
                    <span>⚠️</span>
                    <span>This email is already registered for this event.</span>
                  </div>
                )}
              </div>

              {/* School */}
              <div>
                <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">
                  School
                </label>
                {loadingSchools ? (
                  <div className="input-field flex items-center gap-3 text-[#8888aa]">
                    <div className="spinner opacity-60" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : (
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Select a school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id} style={{ background: '#13131a' }}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-dm"
                  style={{
                    background: 'rgba(225,112,85,0.1)',
                    border: '1px solid rgba(225,112,85,0.3)',
                    color: '#e17055',
                  }}
                >
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || emailExists}
                className="btn-primary w-full flex items-center justify-center gap-3 mt-6"
                style={
                  loading || emailExists 
                    ? { opacity: 0.6, cursor: 'not-allowed' } 
                    : schoolThemeColor 
                      ? { background: `linear-gradient(135deg, ${schoolThemeColor}, ${schoolThemeColor}dd)`, boxShadow: `0 0 30px ${schoolThemeColor}50` }
                      : {}
                }
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    <span>Registering...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Register</span>
                    <span>→</span>
                  </div>
                )}
              </button>
            </form>

            <p className="text-center font-dm text-xs text-[#8888aa] mt-5">
              Your pass will be sent after you verify your email address.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
