'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ScanResult = 'idle' | 'processing' | 'success' | 'warning' | 'error'

// ─── Sounds ───────────────────────────────────────────────────────────────────
function playSound(type: 'success' | 'warning' | 'error') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const note = (f: number, t: number, d: number, w: OscillatorType = 'sine', v = 0.35) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = w
      o.frequency.setValueAtTime(f, ctx.currentTime + t)
      g.gain.setValueAtTime(v, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d)
    }
    if (type === 'success')      { note(523,0,.12); note(659,.13,.12); note(784,.26,.25) }
    else if (type === 'warning') { note(440,0,.15); note(349,.18,.2) }
    else                         { note(220,0,.08,'sawtooth',.3); note(180,.1,.08,'sawtooth',.3); note(220,.2,.12,'sawtooth',.25) }
  } catch { /* silent */ }
}

// ─── jsQR Decoder ─────────────────────────────────────────────────────────────
async function decodeFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null> {
  if (video.videoWidth === 0 || video.readyState < 2) return null
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const jsQR = (await import('jsqr')).default
  return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const router = useRouter()

  const [result, setResult]           = useState<ScanResult>('idle')
  const [attendeeName, setAttendeeName] = useState('')
  const [cameraErr, setCameraErr]     = useState('')

  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number>()
  const lastCode   = useRef('')
  const lastTime   = useRef(0)
  const processing = useRef(false)

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraErr('Camera access denied. Allow camera and reload.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // ── Handle QR result ──────────────────────────────────────────────────────
  const handleQR = useCallback(async (qr_code: string) => {
    if (processing.current) return
    processing.current = true
    setResult('processing')

    try {
      const res  = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code }),
      })
      const data = await res.json()

      if (data.error) {
        setResult('error'); setAttendeeName(''); playSound('error')
      } else if (data.warning) {
        setResult('warning'); setAttendeeName(data.attendee?.full_name ?? ''); playSound('warning')
      } else {
        setResult('success'); setAttendeeName(data.attendee?.full_name ?? ''); playSound('success')
      }

      setTimeout(() => {
        setResult('idle'); setAttendeeName(''); processing.current = false
      }, 3000)
    } catch {
      setResult('error'); setAttendeeName(''); playSound('error')
      setTimeout(() => { setResult('idle'); processing.current = false }, 3000)
    }
  }, [])

  // ── Decode loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = async () => {
      if (!processing.current && videoRef.current && canvasRef.current) {
        const code = await decodeFrame(videoRef.current, canvasRef.current)
        if (code) {
          const now = Date.now()
          if (code !== lastCode.current || now - lastTime.current > 3000) {
            lastCode.current = code; lastTime.current = now
            await handleQR(code)
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [handleQR])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // ── Derived state ─────────────────────────────────────────────────────────
  const frameBorder =
    result === 'success'    ? '#00b894' :
    result === 'warning'    ? '#fdcb6e' :
    result === 'error'      ? '#e17055' :
    result === 'processing' ? '#a29bfe' : '#6c5ce7'

  const frameGlow =
    result === 'success'    ? 'rgba(0,184,148,0.5)' :
    result === 'warning'    ? 'rgba(253,203,110,0.5)' :
    result === 'error'      ? 'rgba(225,112,85,0.5)' :
    result === 'processing' ? 'rgba(162,155,254,0.4)' : 'rgba(108,92,231,0.4)'

  const frameAnim =
    result === 'success' ? 'qr-success' :
    result === 'warning' ? 'qr-warning' :
    result === 'error'   ? 'qr-error'   : ''

  const cards = [
    { id: 'success' as const, icon: '✅', label: 'Accepted',   color: '#00b894', bg: 'rgba(0,184,148,0.15)',    border: 'rgba(0,184,148,0.5)',    glow: 'rgba(0,184,148,0.4)'    },
    { id: 'warning' as const, icon: '⚠️', label: 'Already In', color: '#fdcb6e', bg: 'rgba(253,203,110,0.15)', border: 'rgba(253,203,110,0.5)',  glow: 'rgba(253,203,110,0.4)' },
    { id: 'error'   as const, icon: '❌', label: 'Invalid',    color: '#e17055', bg: 'rgba(225,112,85,0.15)',   border: 'rgba(225,112,85,0.5)',   glow: 'rgba(225,112,85,0.4)'  },
  ]

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d0d18 0%, #0a0a0f 100%)' }}
    >
      {/* ── Background grid ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: 'rgba(13,13,24,0.95)',
          borderBottom: '1px solid rgba(108,92,231,0.2)',
          backdropFilter: 'blur(20px)',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => { stopCamera(); router.push('/admin/dashboard') }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
          style={{ color: '#a29bfe', border: '1px solid rgba(108,92,231,0.3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="flex-1">
          <h1 className="font-syne font-black text-base text-[#f0f0ff] leading-none">QR Scanner</h1>
          <p
            className="font-dm text-xs mt-0.5 font-medium"
            style={{
              color:
                result === 'success' ? '#00b894' :
                result === 'warning' ? '#fdcb6e' :
                result === 'error'   ? '#e17055' : '#8888aa',
            }}
          >
            {result === 'idle'       && 'Ready — point at a QR code'}
            {result === 'processing' && '⏳ Verifying...'}
            {result === 'success'    && `✓ ${attendeeName} — Checked in!`}
            {result === 'warning'    && `⚠ ${attendeeName} — Already checked in`}
            {result === 'error'      && '✗ Invalid or unknown QR code'}
          </p>
        </div>

        {/* Pulse dot */}
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: frameBorder,
            boxShadow: `0 0 8px ${frameBorder}`,
            animation: result === 'idle' ? 'btnScanPulse 1.5s ease-in-out infinite' : 'none',
            transition: 'background 0.3s ease',
          }}
        />
      </div>

      {/* ── Main content — scrollable center ────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-between overflow-hidden px-4 py-5 gap-5">

        {/* Scanner title */}
        <div className="text-center shrink-0">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-dm font-semibold mb-2"
            style={{
              background: 'rgba(108,92,231,0.12)',
              border: '1px solid rgba(108,92,231,0.3)',
              color: '#a29bfe',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#6c5ce7',
                animation: result === 'idle' ? 'btnScanPulse 1.5s ease-in-out infinite' : 'none',
              }}
            />
            Scanner Mode
          </div>
          <p className="font-dm text-sm text-[#8888aa]">
            Scan attendee QR codes to verify entry
          </p>
        </div>

        {/* ── Camera box — CENTERED & PROMINENT ────────────────────────── */}
        <div
          className={`relative w-full shrink-0 ${frameAnim}`}
          style={{
            maxWidth: '400px',
            aspectRatio: '1 / 1',
            borderRadius: '24px',
            border: `3px solid ${frameBorder}`,
            boxShadow: `0 0 40px ${frameGlow}, 0 0 80px ${frameGlow}40, inset 0 0 20px rgba(0,0,0,0.5)`,
            overflow: 'hidden',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            background: '#000',
          }}
        >
          {/* Video feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Corner markers */}
          {[
            'top-3 left-3 border-t-[3px] border-l-[3px] rounded-tl-xl',
            'top-3 right-3 border-t-[3px] border-r-[3px] rounded-tr-xl',
            'bottom-3 left-3 border-b-[3px] border-l-[3px] rounded-bl-xl',
            'bottom-3 right-3 border-b-[3px] border-r-[3px] rounded-br-xl',
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-9 h-9 ${cls}`}
              style={{ borderColor: frameBorder, transition: 'border-color 0.3s', zIndex: 5 }}
            />
          ))}

          {/* Scan line */}
          {result === 'idle' && (
            <div
              className="absolute left-4 right-4 h-0.5 qr-scan-line"
              style={{
                background: 'linear-gradient(90deg, transparent, #6c5ce7, #a29bfe, #6c5ce7, transparent)',
                boxShadow: '0 0 12px rgba(108,92,231,0.9)',
                zIndex: 5,
              }}
            />
          )}

          {/* Processing spinner */}
          {result === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div
                className="w-16 h-16 rounded-full border-[3px] border-[#a29bfe] border-t-transparent"
                style={{ animation: 'spin 0.7s linear infinite' }}
              />
            </div>
          )}

          {/* Result overlay */}
          {(result === 'success' || result === 'warning' || result === 'error') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-3">
              <span className="qr-result-icon" style={{ fontSize: '72px', lineHeight: 1 }}>
                {result === 'success' ? '✅' : result === 'warning' ? '⚠️' : '❌'}
              </span>
              {attendeeName && (
                <p className="font-syne font-bold text-white text-lg text-center px-4 leading-tight">
                  {attendeeName}
                </p>
              )}
              <p
                className="font-dm text-sm font-semibold"
                style={{
                  color:
                    result === 'success' ? '#00b894' :
                    result === 'warning' ? '#fdcb6e' : '#e17055',
                }}
              >
                {result === 'success' ? 'Checked in!' :
                 result === 'warning' ? 'Already checked in' : 'Invalid QR code'}
              </p>
            </div>
          )}

          {/* Camera error */}
          {cameraErr && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-20 gap-4 p-6">
              <span className="text-5xl">📷</span>
              <div className="text-center">
                <p className="font-syne font-bold text-[#f0f0ff] mb-1">Camera Blocked</p>
                <p className="font-dm text-xs text-[#8888aa] leading-relaxed">{cameraErr}</p>
              </div>
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-full font-dm text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* ── 3 result cards ───────────────────────────────────────────── */}
        <div className="w-full shrink-0" style={{ maxWidth: '400px' }}>
          <div className="grid grid-cols-3 gap-3">
            {cards.map((card) => {
              const isActive = result === card.id
              return (
                <div
                  key={card.id}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl py-4 px-2 transition-all duration-300"
                  style={{
                    background: isActive ? card.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? card.border : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isActive ? `0 0 20px ${card.glow}` : 'none',
                    transform: isActive ? 'translateY(-2px) scale(1.04)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      lineHeight: 1,
                      filter: isActive ? 'none' : 'grayscale(0.8) opacity(0.3)',
                      transition: 'filter 0.3s',
                      animation: isActive ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
                    }}
                  >
                    {card.icon}
                  </span>
                  <span
                    className="font-dm text-xs font-semibold text-center"
                    style={{ color: isActive ? card.color : '#555570', transition: 'color 0.3s' }}
                  >
                    {card.label}
                  </span>
                  {isActive && attendeeName && (
                    <span
                      className="font-dm text-[10px] text-center leading-tight px-1 font-medium"
                      style={{ color: card.color }}
                    >
                      {attendeeName.split(' ')[0]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Bottom close button ──────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pb-6 pt-3"
        style={{
          background: 'rgba(13,13,24,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <button
          onClick={() => { stopCamera(); router.push('/admin/dashboard') }}
          className="w-full py-3.5 rounded-2xl font-dm font-semibold text-sm text-center transition-all duration-200 hover:text-white active:scale-[0.98]"
          style={{
            color: '#8888aa',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            maxWidth: '400px',
            margin: '0 auto',
            display: 'block',
          }}
        >
          Close Scanner
        </button>
      </div>
    </div>
  )
}
