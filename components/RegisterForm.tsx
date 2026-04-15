'use client'

import { useState, useEffect } from 'react'
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
      const { data } = await supabase
        .from('attendees')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      setEmailExists(!!data)
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
      const qr_code = crypto.randomUUID()

      const { error: insertError } = await supabase.from('attendees').insert({
        full_name: fullName,
        email: email,
        school_id: schoolId || null,
        qr_code,
      })

      if (insertError) {
        if (insertError.message.includes('unique') || insertError.code === '23505') {
          setError('This email is already registered for this event.')
        } else {
          setError('An error occurred. Please try again.')
        }
        setLoading(false)
        return
      }

      // Send pass email (non-blocking)
      fetch('/api/send-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, qr_code }),
      }).catch(() => console.error('Email sending failed'))

      const schoolName = schools.find((s) => s.id === schoolId)?.name || 'Tamansourte High School'
      onSuccess(fullName, qr_code, email, schoolName)
    } catch {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  const schoolThemeColor = schoolId ? getSchoolColor(schools.find(s => s.id === schoolId)?.name || '') : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 relative animate-scaleIn transition-all duration-500"
        style={{
          background: '#13131a',
          border: `1px solid ${schoolThemeColor ? schoolThemeColor : 'rgba(255,255,255,0.1)'}`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 80px ${schoolThemeColor ? schoolThemeColor + '40' : 'rgba(108,92,231,0.1)'}`,
        }}
      >
        {schoolThemeColor && (
          <style dangerouslySetInnerHTML={{ __html: `
            .input-field:focus {
              border-color: ${schoolThemeColor} !important;
              box-shadow: 0 0 0 3px ${schoolThemeColor}40 !important;
            }
          `}} />
        )}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          ✕
        </button>

        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#6c5ce7]/20 flex items-center justify-center text-2xl mb-4">
            🎟️
          </div>
          <h2 className="font-syne font-black text-2xl text-[#f0f0ff] mb-1">
            Get My Pass
          </h2>
          <p className="font-dm text-sm text-[#8888aa]">
            Fill in the form and receive your QR code by email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              <>
                <div className="spinner" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center font-dm text-xs text-[#8888aa] mt-5">
          Your pass will be sent to the email address provided.
        </p>
      </div>
    </div>
  )
}
