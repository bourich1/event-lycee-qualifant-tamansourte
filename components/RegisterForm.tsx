'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface RegisterFormProps {
  onClose: () => void
  onSuccess: (name: string, qrCode: string) => void
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
    }, 600) // debounce 600ms
    return () => clearTimeout(timer)
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Block if email already exists
    if (emailExists) {
      setError('Cet email est déjà inscrit à l\'événement.')
      return
    }

    setLoading(true)

    try {
      // 1. Generate unique QR token
      const qr_code = crypto.randomUUID()

      // 2. Insert attendee into Supabase
      const { error: insertError } = await supabase.from('attendees').insert({
        full_name: fullName,
        email: email,
        school_id: schoolId || null,
        qr_code,
      })

      if (insertError) {
        if (insertError.message.includes('unique') || insertError.code === '23505') {
          setError('Cet email est déjà inscrit à l\'événement.')
        } else {
          setError('Une erreur est survenue. Veuillez réessayer.')
        }
        setLoading(false)
        return
      }

      // 3. Send pass email via API (non-blocking)
      fetch('/api/send-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, qr_code }),
      }).catch(() => console.error('Email sending failed'))

      // 4. Success — pass qr_code so parent can show the pass
      onSuccess(fullName, qr_code)
    } catch {
      setError('Une erreur inattendue est survenue.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 relative animate-scaleIn"
        style={{
          background: '#13131a',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(108,92,231,0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#6c5ce7]/20 flex items-center justify-center text-2xl mb-4">
            🎟️
          </div>
          <h2 className="font-syne font-black text-2xl text-[#f0f0ff] mb-1">
            Obtenir mon pass
          </h2>
          <p className="font-dm text-sm text-[#8888aa]">
            Remplissez le formulaire et recevez votre QR code par email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">
              Nom complet <span className="text-[#6c5ce7]">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom et prénom"
              className="input-field"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">
              Adresse email <span className="text-[#6c5ce7]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="votre@email.com"
                className="input-field pr-10"
                style={
                  emailExists
                    ? { borderColor: 'rgba(225,112,85,0.6)', boxShadow: '0 0 0 3px rgba(225,112,85,0.1)' }
                    : {}
                }
              />
              {/* Live indicator */}
              {email.includes('@') && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
                  {emailExists ? '❌' : '✅'}
                </span>
              )}
            </div>
            {/* Already registered inline warning */}
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
                <span>Cet email est déjà inscrit à l&apos;événement.</span>
              </div>
            )}
          </div>

          {/* School */}
          <div>
            <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">
              Établissement
            </label>
            {loadingSchools ? (
              <div className="input-field flex items-center gap-3 text-[#8888aa]">
                <div className="spinner opacity-60" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : (
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="">Sélectionner un établissement</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id} style={{ background: '#13131a' }}>
                    {school.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Submission Error */}
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
            style={loading || emailExists ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Inscription en cours...</span>
              </>
            ) : (
              <>
                <span>S&apos;inscrire</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center font-dm text-xs text-[#8888aa] mt-5">
          Votre pass sera envoyé à l&apos;adresse email fournie.
        </p>
      </div>
    </div>
  )
}
