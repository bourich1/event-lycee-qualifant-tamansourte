'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

// 'idle' removed — component starts in 'scanning' directly when modal opens
type ScanState = 'scanning' | 'processing' | 'success' | 'warning' | 'error'

interface StateConfigEntry {
  border: string
  anim: string
  overlay: ReactNode
}

interface QRScannerProps {
  onScanResult?: (result: { type: 'success' | 'warning' | 'error'; message: string }) => void
}

// ─── Web Audio API sounds (no external files) ────────────────────────────────
function playSound(type: 'success' | 'warning' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const playNote = (freq: number, start: number, duration: number, wave: OscillatorType = 'sine', vol = 0.35) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = wave
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(vol, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    if (type === 'success') {
      // Ascending happy beeps
      playNote(523, 0,    0.12)
      playNote(659, 0.13, 0.12)
      playNote(784, 0.26, 0.25)
    } else if (type === 'warning') {
      // Double mid-pitch boop
      playNote(440, 0,    0.15)
      playNote(349, 0.18, 0.2)
    } else {
      // Low buzz shake
      playNote(220, 0,    0.08, 'sawtooth', 0.3)
      playNote(180, 0.1,  0.08, 'sawtooth', 0.3)
      playNote(220, 0.2,  0.12, 'sawtooth', 0.25)
    }
  } catch {
    // Audio API not available — silent fallback
  }
}

// ─── QR decode — BarcodeDetector (Chrome/Edge) ───────────────────────────────
// Works on HTTP localhost + HTTPS production. No npm package needed.
let cachedDetector: unknown = null

async function getDetector() {
  if (cachedDetector) return cachedDetector as { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }
  // @ts-ignore
  if (typeof BarcodeDetector === 'undefined') return null
  // @ts-ignore
  const det = new BarcodeDetector({ formats: ['qr_code'] })
  cachedDetector = det
  return det as { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }
}

async function decodeQRFromVideo(
  video: HTMLVideoElement,
  _canvas: HTMLCanvasElement
): Promise<string | null> {
  if (video.videoWidth === 0 || video.readyState < 2) return null
  try {
    const detector = await getDetector()
    if (!detector) return null
    const codes = await detector.detect(video)
    return codes.length > 0 ? codes[0].rawValue : null
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QRScanner({ onScanResult }: QRScannerProps) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [scanState, setScanState]     = useState<ScanState>('scanning')
  const [resultMsg, setResultMsg]     = useState('')
  const [resultName, setResultName]   = useState('')
  const [cameraError, setCameraError] = useState('')

  const videoRef       = useRef<HTMLVideoElement>(null)
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const animFrameRef   = useRef<number>()
  const lastCodeRef    = useRef('')
  const lastTimeRef    = useRef(0)
  const processingRef  = useRef(false)

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('')
    setScanState('scanning')
    processingRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraError(
        'Impossible d\'accéder à la caméra. Vérifiez les permissions et utilisez HTTPS ou localhost.'
      )
    }
  }, [])

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // ── Handle verified QR ────────────────────────────────────────────────────
  const handleQRData = useCallback(async (qr_code: string) => {
    if (processingRef.current) return
    processingRef.current = true
    setScanState('processing')

    try {
      const res  = await fetch('/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code }),
      })
      const data = await res.json()

      let state: 'success' | 'warning' | 'error'
      let msg: string
      let name = ''

      if (data.error) {
        state = 'error'
        msg   = 'QR code invalide ou inconnu'
      } else if (data.warning) {
        state = 'warning'
        name  = data.attendee?.full_name ?? 'Participant'
        msg   = 'Déjà enregistré'
      } else {
        state = 'success'
        name  = data.attendee?.full_name ?? 'Participant'
        msg   = 'Enregistré avec succès !'
      }

      setScanState(state)
      setResultMsg(msg)
      setResultName(name)
      playSound(state)
      onScanResult?.({ type: state, message: name ? `${name} — ${msg}` : msg })

      // After 2.5s → go back to scanning
      setTimeout(() => {
        setScanState('scanning')
        setResultMsg('')
        setResultName('')
        processingRef.current = false
      }, 2500)
    } catch {
      setScanState('error')
      setResultMsg('Erreur réseau')
      playSound('error')
      setTimeout(() => {
        setScanState('scanning')
        processingRef.current = false
      }, 2500)
    }
  }, [onScanResult])

  // ── Scanning loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modalOpen) return

    const loop = async () => {
      if (!processingRef.current && videoRef.current && canvasRef.current) {
        const code = await decodeQRFromVideo(videoRef.current, canvasRef.current)
        if (code) {
          const now = Date.now()
          const isDuplicate = code === lastCodeRef.current && now - lastTimeRef.current < 3000
          if (!isDuplicate) {
            lastCodeRef.current = code
            lastTimeRef.current = now
            await handleQRData(code)
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [modalOpen, handleQRData])

  // ── Open / close modal ────────────────────────────────────────────────────
  const openModal = async () => {
    setModalOpen(true)
    setScanState('scanning')
    setResultMsg('')
    setResultName('')
    setCameraError('')
    // Wait for DOM render
    setTimeout(() => startCamera(), 100)
  }

  const closeModal = () => {
    stopCamera()
    setModalOpen(false)
    setScanState('scanning')
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera])

  // Record<ScanState, StateConfigEntry> ensures ALL states are handled.
  // TypeScript will error at compile time if any state key is missing.
  const stateConfig: Record<ScanState, StateConfigEntry> = {
    scanning: {
      border: 'rgba(108,92,231,0.7)',
      anim: '',
      overlay: null,
    },
    processing: {
      border: 'rgba(162,155,254,0.6)',
      anim: '',
      overlay: (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <div className="w-10 h-10 rounded-full border-2 border-[#a29bfe] border-t-transparent"
            style={{ animation: 'spin 0.7s linear infinite' }} />
        </div>
      ),
    },
    success: {
      border: '#00b894',
      anim: 'qr-success',
      overlay: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-3">
          <span className="qr-result-icon text-6xl">✅</span>
          {resultName && <p className="font-syne font-bold text-white text-base">{resultName}</p>}
          <p className="font-dm text-sm text-[#00b894]">Enregistré avec succès !</p>
        </div>
      ),
    },
    warning: {
      border: '#fdcb6e',
      anim: 'qr-warning',
      overlay: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-3">
          <span className="qr-result-icon text-6xl">⚠️</span>
          {resultName && <p className="font-syne font-bold text-white text-base">{resultName}</p>}
          <p className="font-dm text-sm text-[#fdcb6e]">Déjà enregistré</p>
        </div>
      ),
    },
    error: {
      border: '#e17055',
      anim: 'qr-error',
      overlay: (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl gap-3">
          <span className="qr-result-icon text-6xl">❌</span>
          <p className="font-dm text-sm text-[#e17055]">{resultMsg || 'QR code invalide'}</p>
        </div>
      ),
    },
  }

  const cfg = stateConfig[scanState]

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        id="qr-scan-btn"
        onClick={openModal}
        className="btn-scan-idle group flex items-center gap-3 px-6 py-3.5 rounded-2xl font-dm font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {/* QR scan icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M16 16v.01" strokeWidth="2.5" />
        </svg>
        <span>Scanner QR</span>
      </button>

      {/* ── Scanner modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden animate-scaleIn"
            style={{
              background: '#13131a',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: scanState === 'scanning' || scanState === 'processing' ? '#6c5ce7' :
                                scanState === 'success' ? '#00b894' :
                                scanState === 'warning' ? '#fdcb6e' : '#e17055',
                    boxShadow: `0 0 8px ${
                      scanState === 'scanning' || scanState === 'processing' ? '#6c5ce7' :
                      scanState === 'success' ? '#00b894' :
                      scanState === 'warning' ? '#fdcb6e' : '#e17055'
                    }`,
                    animation: scanState === 'scanning' ? 'btnScanPulse 1.5s ease-in-out infinite' : 'none',
                  }}
                />
                <h3 className="font-syne font-bold text-base text-[#f0f0ff]">Scanner QR Code</h3>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Camera area */}
            <div className="p-5">
              <div
                className={`relative rounded-xl overflow-hidden ${cfg.anim}`}
                style={{
                  aspectRatio: '1 / 1',
                  background: '#0a0a0f',
                  border: `3px solid ${cfg.border}`,
                  transition: 'border-color 0.3s ease',
                }}
              >
                {/* Video stream */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                {/* Hidden canvas for jsQR decoding */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Corner frame markers */}
                {['top-3 left-3 border-t-2 border-l-2 rounded-tl-lg',
                  'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
                  'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg',
                  'bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg',
                ].map((cls, i) => (
                  <div
                    key={i}
                    className={`absolute w-7 h-7 ${cls}`}
                    style={{ borderColor: cfg.border, transition: 'border-color 0.3s ease' }}
                  />
                ))}

                {/* Animated scan line (only when scanning) */}
                {scanState === 'scanning' && (
                  <div
                    className="absolute left-3 right-3 h-px qr-scan-line"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #6c5ce7, #a29bfe, #6c5ce7, transparent)',
                      boxShadow: '0 0 8px #6c5ce7',
                    }}
                  />
                )}

                {/* Result overlay */}
                {cfg.overlay}
              </div>

              {/* Camera error */}
              {cameraError && (
                <div
                  className="mt-4 px-4 py-3 rounded-xl text-sm font-dm"
                  style={{
                    background: 'rgba(225,112,85,0.1)',
                    border: '1px solid rgba(225,112,85,0.3)',
                    color: '#e17055',
                  }}
                >
                  ⚠️ {cameraError}
                </div>
              )}

              {/* Status text */}
              <p className="text-center font-dm text-sm mt-4"
                style={{
                  color: scanState === 'scanning' ? '#8888aa' :
                         scanState === 'success' ? '#00b894' :
                         scanState === 'warning' ? '#fdcb6e' : '#e17055',
                }}>
                {scanState === 'scanning'    && 'Pointez la caméra vers un QR code...'}
                {scanState === 'processing'  && 'Vérification en cours...'}
                {scanState === 'success'     && `✓ ${resultName} — Enregistré !`}
                {scanState === 'warning'     && `⚠ ${resultName} — Déjà enregistré`}
                {scanState === 'error'       && `✗ ${resultMsg || 'QR code invalide'}`}
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                onClick={closeModal}
                className="w-full py-3 rounded-xl font-dm font-medium text-sm text-[#8888aa] hover:text-white transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
              >
                Fermer le scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
