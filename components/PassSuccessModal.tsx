'use client'

import { useEffect, useState } from 'react'

interface PassSuccessModalProps {
  name: string
  qrCode: string
  onClose: () => void
}

export default function PassSuccessModal({ name, qrCode, onClose }: PassSuccessModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [generatingQr, setGeneratingQr] = useState(true)

  useEffect(() => {
    let cancelled = false
    const generate = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const dataUrl = await QRCode.toDataURL(qrCode, {
          width: 280,
          margin: 2,
          color: { dark: '#6c5ce7', light: '#13131a' },
        })
        if (!cancelled) {
          setQrDataUrl(dataUrl)
          setGeneratingQr(false)
        }
      } catch {
        if (!cancelled) setGeneratingQr(false)
      }
    }
    generate()
    return () => { cancelled = true }
  }, [qrCode])

  const handleDownload = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `pass-${name.replace(/\s+/g, '_').toLowerCase()}.png`
    link.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-3xl relative overflow-hidden animate-scaleIn"
        style={{
          background: '#13131a',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top gradient bar */}
        <div
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, #6c5ce7, #a29bfe, #00b894)' }}
        />

        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 rounded-full bg-[#6c5ce7]/8 blur-3xl" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all duration-200 z-10"
        >
          ✕
        </button>

        <div className="p-8 text-center relative">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: 'rgba(0,184,148,0.15)',
                border: '1px solid rgba(0,184,148,0.35)',
              }}
            >
              ✅
            </div>
          </div>

          <h2 className="font-syne font-black text-xl text-[#f0f0ff] mb-1">
            Registration Confirmed!
          </h2>
          <p className="font-dm text-sm text-[#8888aa] mb-6">
            Welcome{' '}
            <span className="text-[#a29bfe] font-semibold">{name.split(' ')[0]}</span>{' '}
            — here is your event pass
          </p>

          {/* Pass card */}
          <div
            className="rounded-2xl p-5 mb-5"
            style={{
              background: 'rgba(108,92,231,0.07)',
              border: '1px solid rgba(108,92,231,0.2)',
            }}
          >
            <div className="mb-4 space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-xs font-dm text-[#8888aa]">
                <span>📅</span><span>EVENT DATE</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-dm text-[#8888aa]">
                <span>📍</span><span>EVENT LOCATION</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-dm">
                <span>🎓</span>
                <span className="text-[#f0f0ff] font-medium">{name}</span>
              </div>
            </div>

            <div
              className="my-4 border-t border-dashed"
              style={{ borderColor: 'rgba(108,92,231,0.25)' }}
            />

            {/* QR Code */}
            <div className="flex justify-center">
              {generatingQr ? (
                <div
                  className="w-[160px] h-[160px] rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-[#6c5ce7] border-t-transparent"
                    style={{ animation: 'spin 0.8s linear infinite' }}
                  />
                </div>
              ) : qrDataUrl ? (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: '#13131a',
                    border: '2px solid rgba(108,92,231,0.4)',
                    boxShadow: '0 0 30px rgba(108,92,231,0.2)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Your event pass QR code"
                    width={160}
                    height={160}
                    className="block rounded-lg"
                  />
                </div>
              ) : (
                <div className="text-[#8888aa] text-sm font-dm">QR code unavailable</div>
              )}
            </div>
            <p className="font-dm text-xs text-[#8888aa] mt-3">
              Present this QR code at the entrance
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full font-dm font-semibold text-sm transition-all duration-200"
              style={
                qrDataUrl
                  ? {
                      background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                      color: 'white',
                      boxShadow: '0 0 20px rgba(108,92,231,0.3)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#8888aa',
                      cursor: 'not-allowed',
                    }
              }
            >
              <span>⬇️</span>
              <span>Download Pass</span>
            </button>

            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-dm"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#8888aa',
              }}
            >
              <span>📧</span>
              <span>A copy has also been sent to your email</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 font-dm text-sm text-[#8888aa] hover:text-white transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
