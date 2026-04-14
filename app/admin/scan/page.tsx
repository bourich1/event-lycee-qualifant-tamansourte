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

// ─── jsQR decoder ─────────────────────────────────────────────────────────────
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
  const [result, setResult]       = useState<ScanResult>('idle')
  const [attendeeName, setAttendeeName] = useState('')
  const [cameraErr, setCameraErr] = useState('')

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
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
    } catch {
      setCameraErr('Camera access denied. Please allow camera access and reload.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // ── Handle scan result ────────────────────────────────────────────────────
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

      setTimeout(() => { setResult('idle'); setAttendeeName(''); processing.current = false }, 3000)
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

  useEffect(() => { startCamera(); return () => stopCamera() }, [startCamera, stopCamera])

  // ── Frame border color ─────────────────────────────────────────────────────
  const frameBorder =
    result === 'success'    ? '#00b894' :
    result === 'warning'    ? '#fdcb6e' :
    result === 'error'      ? '#e17055' :
    result === 'processing' ? '#a29bfe' : '#6c5ce7'

  const frameAnim =
    result === 'success' ? 'qr-success' :
    result === 'warning' ? 'qr-warning' :
    result === 'error'   ? 'qr-error'   : ''

  // ── Result cards config ───────────────────────────────────────────────────
  const cards = [
    {
      id:     'success' as const,
      icon:   '✅',
      label:  'Accepted',
      color:  '#00b894',
      bg:     'rgba(0,184,148,0.12)',
      border: 'rgba(0,184,148,0.4)',
      shadow: 'rgba(0,184,148,0.35)',
    },
    {
      id:     'warning' as const,
      icon:   '⚠️',
      label:  'Already In',
      color:  '#fdcb6e',
      bg:     'rgba(253,203,110,0.12)',
      border: 'rgba(253,203,110,0.4)',
      shadow: 'rgba(253,203,110,0.35)',
    },
    {
      id:     'error' as const,
      icon:   '❌',
      label:  'Invalid',
      color:  '#e17055',
      bg:     'rgba(225,112,85,0.12)',
      border: 'rgba(225,112,85,0.4)',
      shadow: 'rgba(225,112,85,0.35)',
    },
  ]

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: 'rgba(19,19,26,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => { stopCamera(); router.push('/admin/dashboard') }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h1 className="font-syne font-bold text-base text-[#f0f0ff] leading-none">QR Scanner</h1>
          <p className="font-dm text-xs text-[#8888aa] mt-0.5">
            {result === 'processing' ? 'Verifying...' :
             result === 'idle'       ? 'Ready to scan' :
             result === 'success'    ? `✓ ${attendeeName}` :
             result === 'warning'    ? `⚠ ${attendeeName}` : '✗ Invalid QR'}
          </p>
        </div>
        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: result === 'idle' || result === 'processing' ? '#6c5ce7' : frameBorder,
              boxShadow: `0 0 6px ${result === 'idle' ? '#6c5ce7' : frameBorder}`,
              animation: result === 'idle' ? 'btnScanPulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span className="font-dm text-xs text-[#8888aa]">
            {cameraErr ? 'No Camera' : 'Live'}
          </span>
        </div>
      </div>

      {/* ── Camera area — fills all remaining space ──────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Darkened vignette to focus on scan frame */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 58% 50% at 50% 48%, transparent 0%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Centered scan frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative ${frameAnim}`}
            style={{
              width:  'min(72vw, 72vh, 300px)',
              height: 'min(72vw, 72vh, 300px)',
              border: `3px solid ${frameBorder}`,
              borderRadius: '22px',
              transition: 'border-color 0.25s ease',
            }}
          >
            {/* Corners */}
            {[
              'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl',
              'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl',
              'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl',
              'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl',
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute w-8 h-8 ${cls}`}
                style={{ borderColor: frameBorder, transition: 'border-color 0.25s ease' }}
              />
            ))}

            {/* Scan line */}
            {result === 'idle' && (
              <div
                className="absolute left-3 right-3 h-0.5 qr-scan-line"
                style={{
                  background: 'linear-gradient(90deg, transparent, #6c5ce7, #a29bfe, #6c5ce7, transparent)',
                  boxShadow: '0 0 10px rgba(108,92,231,0.8)',
                }}
              />
            )}

            {/* Processing spinner */}
            {result === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-12 h-12 rounded-full border-[3px] border-[#a29bfe] border-t-transparent"
                  style={{ animation: 'spin 0.7s linear infinite' }}
                />
              </div>
            )}

            {/* Result icon inside frame */}
            {(result === 'success' || result === 'warning' || result === 'error') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 rounded-[18px]">
                <span className="qr-result-icon" style={{ fontSize: '64px', lineHeight: 1 }}>
                  {result === 'success' ? '✅' : result === 'warning' ? '⚠️' : '❌'}
                </span>
                {attendeeName && (
                  <p className="font-syne font-bold text-white text-sm text-center px-3 leading-tight">
                    {attendeeName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Camera error message */}
        {cameraErr && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div
              className="rounded-2xl p-6 text-center max-w-xs w-full"
              style={{
                background: 'rgba(19,19,26,0.97)',
                border: '1px solid rgba(225,112,85,0.4)',
              }}
            >
              <p className="text-5xl mb-3">📷</p>
              <p className="font-syne font-bold text-[#f0f0ff] mb-2">Camera Access Denied</p>
              <p className="font-dm text-sm text-[#8888aa] leading-relaxed mb-4">{cameraErr}</p>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 rounded-full font-dm text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom — 3 result cards ──────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pt-4 pb-6"
        style={{
          background: 'rgba(10,10,15,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Hint text */}
        <p className="font-dm text-xs text-[#8888aa] text-center mb-3">
          Scan result will appear below
        </p>

        {/* 3 cards */}
        <div className="grid grid-cols-3 gap-3">
          {cards.map((card) => {
            const isActive = result === card.id
            return (
              <div
                key={card.id}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-2 transition-all duration-300"
                style={{
                  background: isActive ? card.bg : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? card.border : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: isActive ? `0 0 24px ${card.shadow}` : 'none',
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                }}
              >
                <span
                  style={{
                    fontSize: '32px',
                    lineHeight: 1,
                    filter: isActive ? 'none' : 'grayscale(0.7) opacity(0.35)',
                    transition: 'filter 0.3s ease',
                    animation: isActive ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
                  }}
                >
                  {card.icon}
                </span>
                <span
                  className="font-dm text-xs font-semibold text-center"
                  style={{
                    color: isActive ? card.color : '#8888aa',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {card.label}
                </span>
                {/* Active name under card */}
                {isActive && attendeeName && (
                  <span className="font-dm text-[10px] text-center leading-tight px-1" style={{ color: card.color }}>
                    {attendeeName.split(' ')[0]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
