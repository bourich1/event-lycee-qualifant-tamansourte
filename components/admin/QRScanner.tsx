'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

type ScanState = 'scanning' | 'processing' | 'success' | 'warning' | 'error'

interface QRScannerProps {
  onScanResult?: (result: { type: 'success' | 'warning' | 'error'; message: string }) => void
}

interface StateConfigEntry {
  border: string
  anim: string
  overlay: ReactNode
}

// ─── Web Audio API sounds ─────────────────────────────────────────────────────
function playSound(type: 'success' | 'warning' | 'error') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const note = (
      freq: number,
      start: number,
      dur: number,
      wave: OscillatorType = 'sine',
      vol = 0.35
    ) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = wave
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(vol, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }

    if (type === 'success') {
      note(523, 0, 0.12)
      note(659, 0.13, 0.12)
      note(784, 0.26, 0.25)
    } else if (type === 'warning') {
      note(440, 0, 0.15)
      note(349, 0.18, 0.2)
    } else {
      note(220, 0, 0.08, 'sawtooth', 0.3)
      note(180, 0.1, 0.08, 'sawtooth', 0.3)
      note(220, 0.2, 0.12, 'sawtooth', 0.25)
    }
  } catch {
    /* silent fallback */
  }
}

// ─── QR decode — jsqr (canvas-based, works everywhere) ───────────────────────
async function decodeFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<string | null> {
  if (video.videoWidth === 0 || video.readyState < 2) return null

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx2d = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx2d) return null

  ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height)
  const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height)

  // Dynamic import — jsqr ships its own TypeScript types (.d.ts bundled)
  const jsQR = (await import('jsqr')).default
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  })
  return result?.data ?? null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QRScanner({ onScanResult }: QRScannerProps) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [scanState, setScanState]     = useState<ScanState>('scanning')
  const [resultMsg, setResultMsg]     = useState('')
  const [resultName, setResultName]   = useState('')
  const [cameraError, setCameraError] = useState('')

  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef<number>()
  const lastCodeRef   = useRef('')
  const lastTimeRef   = useRef(0)
  const processingRef = useRef(false)

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('')
    setScanState('scanning')
    processingRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraError('Unable to access camera. Check permissions or use HTTPS.')
    }
  }, [])

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // ── Handle decoded QR ─────────────────────────────────────────────────────
  const handleQRData = useCallback(
    async (qr_code: string) => {
      if (processingRef.current) return
      processingRef.current = true
      setScanState('processing')

      try {
        const res = await fetch('/api/verify-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_code }),
        })
        const data = await res.json()

        let state: 'success' | 'warning' | 'error'
        let msg = ''
        let name = ''

        if (data.error) {
          state = 'error'
          msg   = 'Invalid or unknown QR code'
        } else if (data.warning) {
          state = 'warning'
          name  = data.attendee?.full_name ?? 'Participant'
          msg   = 'Already checked in'
        } else {
          state = 'success'
          name  = data.attendee?.full_name ?? 'Participant'
          msg   = 'Checked in successfully!'
        }

        setScanState(state)
        setResultMsg(msg)
        setResultName(name)
        playSound(state)
        onScanResult?.({ type: state, message: name ? `${name} — ${msg}` : msg })

        // Return to scanning after 2.5s
        setTimeout(() => {
          setScanState('scanning')
          setResultMsg('')
          setResultName('')
          processingRef.current = false
        }, 2500)
      } catch {
        setScanState('error')
        setResultMsg('Network error')
        playSound('error')
        setTimeout(() => {
          setScanState('scanning')
          processingRef.current = false
        }, 2500)
      }
    },
    [onScanResult]
  )

  // ── Decode loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modalOpen) return

    const loop = async () => {
      if (!processingRef.current && videoRef.current && canvasRef.current) {
        const code = await decodeFrame(videoRef.current, canvasRef.current)
        if (code) {
          const now = Date.now()
          if (code !== lastCodeRef.current || now - lastTimeRef.current > 3000) {
            lastCodeRef.current = code
            lastTimeRef.current = now
            await handleQRData(code)
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [modalOpen, handleQRData])

  // ── Open / close ──────────────────────────────────────────────────────────
  const openModal = () => {
    setModalOpen(true)
    setScanState('scanning')
    setResultMsg('')
    setResultName('')
    setCameraError('')
    setTimeout(() => startCamera(), 80)
  }

  const closeModal = () => {
    stopCamera()
    setModalOpen(false)
  }

  useEffect(() => () => stopCamera(), [stopCamera])

  // ── State config ──────────────────────────────────────────────────────────
  const stateConfig: Record<ScanState, StateConfigEntry> = {
    scanning: {
      border: 'rgba(108,92,231,0.8)',
      anim: '',
      overlay: null,
    },
    processing: {
      border: 'rgba(162,155,254,0.6)',
      anim: '',
      overlay: (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div
            className="w-14 h-14 rounded-full border-[3px] border-[#a29bfe] border-t-transparent"
            style={{ animation: 'spin 0.7s linear infinite' }}
          />
        </div>
      ),
    },
    success: {
      border: '#00b894',
      anim: 'qr-success',
      overlay: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 gap-4">
          <span className="qr-result-icon" style={{ fontSize: '72px', lineHeight: 1 }}>✅</span>
          {resultName && (
            <p className="font-syne font-bold text-white text-xl text-center px-4">{resultName}</p>
          )}
          <p className="font-dm text-base font-semibold" style={{ color: '#00b894' }}>
            Checked in successfully!
          </p>
        </div>
      ),
    },
    warning: {
      border: '#fdcb6e',
      anim: 'qr-warning',
      overlay: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 gap-4">
          <span className="qr-result-icon" style={{ fontSize: '72px', lineHeight: 1 }}>⚠️</span>
          {resultName && (
            <p className="font-syne font-bold text-white text-xl text-center px-4">{resultName}</p>
          )}
          <p className="font-dm text-base font-semibold" style={{ color: '#fdcb6e' }}>
            Already checked in
          </p>
        </div>
      ),
    },
    error: {
      border: '#e17055',
      anim: 'qr-error',
      overlay: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 gap-4">
          <span className="qr-result-icon" style={{ fontSize: '72px', lineHeight: 1 }}>❌</span>
          <p className="font-dm text-base font-semibold px-4 text-center" style={{ color: '#e17055' }}>
            {resultMsg || 'Invalid QR code'}
          </p>
        </div>
      ),
    },
  }

  const cfg = stateConfig[scanState]

  const dotColor =
    scanState === 'success'  ? '#00b894' :
    scanState === 'warning'  ? '#fdcb6e' :
    scanState === 'error'    ? '#e17055' : '#6c5ce7'

  return (
    <>
      {/* ── Trigger button in navbar ──────────────────────────────────────── */}
      <button
        id="qr-scan-btn"
        onClick={openModal}
        title="Scan QR Code"
        className="btn-scan-idle flex items-center gap-2 px-4 py-2.5 rounded-xl font-dm font-semibold text-white text-sm transition-all duration-300 hover:scale-105 active:scale-95 select-none"
        style={{
          background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {/* QR icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M16 16v.01" strokeWidth="2.8" />
        </svg>
        <span className="hidden sm:inline">Scan QR</span>
      </button>

      {/* ── Fullscreen scanner modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: '#0a0a0f' }}
        >
          {/* ── Top bar ── */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: 'rgba(19,19,26,0.98)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: dotColor,
                  boxShadow: `0 0 8px ${dotColor}`,
                  animation: scanState === 'scanning' ? 'btnScanPulse 1.5s ease-in-out infinite' : 'none',
                }}
              />
              <h2 className="font-syne font-bold text-base text-[#f0f0ff]">QR Code Scanner</h2>
            </div>
            <button
              onClick={closeModal}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all text-lg"
            >
              ✕
            </button>
          </div>

          {/* ── Camera view — fills all remaining space ── */}
          <div className="relative flex-1 overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Hidden canvas for jsQR */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Darkened sides */}
              <div className="absolute inset-0" style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)',
              }} />

              {/* Scan box */}
              <div
                className={`relative w-64 h-64 sm:w-80 sm:h-80 ${cfg.anim}`}
                style={{
                  border: `3px solid ${cfg.border}`,
                  borderRadius: '20px',
                  transition: 'border-color 0.3s ease',
                  boxShadow: `0 0 0 9999px rgba(0,0,0,0.45)`,
                }}
              >
                {/* Corner markers */}
                {[
                  'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                  'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
                ].map((cls, i) => (
                  <div
                    key={i}
                    className={`absolute w-8 h-8 ${cls}`}
                    style={{ borderColor: cfg.border, transition: 'border-color 0.3s ease' }}
                  />
                ))}

                {/* Animated scan line */}
                {scanState === 'scanning' && (
                  <div
                    className="absolute left-2 right-2 h-0.5 qr-scan-line"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #6c5ce7, #a29bfe, #6c5ce7, transparent)',
                      boxShadow: '0 0 10px #6c5ce7',
                    }}
                  />
                )}

                {/* Result overlay inside frame */}
                {cfg.overlay}
              </div>
            </div>

            {/* Camera error overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div
                  className="rounded-2xl p-6 text-center max-w-xs"
                  style={{
                    background: 'rgba(19,19,26,0.95)',
                    border: '1px solid rgba(225,112,85,0.4)',
                  }}
                >
                  <p className="text-4xl mb-3">📷</p>
                  <p className="font-syne font-bold text-[#f0f0ff] mb-2">Camera Access Denied</p>
                  <p className="font-dm text-sm text-[#8888aa] leading-relaxed">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-4 px-5 py-2.5 rounded-full font-dm text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom bar ── */}
          <div
            className="shrink-0 px-6 py-4 flex flex-col items-center gap-3"
            style={{
              background: 'rgba(19,19,26,0.98)',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Status text */}
            <p
              className="font-dm text-sm text-center font-medium"
              style={{
                color:
                  scanState === 'success'  ? '#00b894' :
                  scanState === 'warning'  ? '#fdcb6e' :
                  scanState === 'error'    ? '#e17055' : '#8888aa',
              }}
            >
              {scanState === 'scanning'   && '📷 Point the camera at a QR code'}
              {scanState === 'processing' && '⏳ Verifying...'}
              {scanState === 'success'    && `✓ ${resultName} — Checked in!`}
              {scanState === 'warning'    && `⚠ ${resultName} — Already checked in`}
              {scanState === 'error'      && `✗ ${resultMsg || 'Invalid QR code'}`}
            </p>

            <button
              onClick={closeModal}
              className="w-full max-w-sm py-3 rounded-xl font-dm font-semibold text-sm text-[#8888aa] hover:text-white transition-all duration-200"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              Close Scanner
            </button>
          </div>
        </div>
      )}
    </>
  )
}
