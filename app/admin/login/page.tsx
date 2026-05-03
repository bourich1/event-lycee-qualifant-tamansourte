'use client'

import Image from 'next/image'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid credentials. Please try again.')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0f' }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(108,92,231,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      <div className="w-full max-w-[360px] relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-5">
            <Image
              src="/lycee-logo.png"
              alt="LQ Tamansourte Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="font-syne font-black text-2xl text-[#f0f0ff] mb-1">Administration</h1>
          <p className="font-dm text-sm text-[#8888aa]">Restricted access — administrators only</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: '#13131a',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">Email</label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block font-dm text-sm text-[#8888aa] mb-2 font-medium">Password</label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                autoComplete="current-password"
              />
            </div>

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

            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-3 mt-2"
              style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center font-dm text-xs text-[#8888aa] mt-6">
          Restricted access — Tamansourte High School
        </p>
      </div>
    </div>
  )
}
