'use client'

import { useEffect, useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { getSchoolGradient } from '@/lib/theme'

interface PassSuccessModalProps {
  name: string
  qrCode: string
  email: string
  schoolName: string
  onClose: () => void
}

export default function PassSuccessModal({ name, qrCode, email, schoolName, onClose }: PassSuccessModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [generatingQr, setGeneratingQr] = useState(true)
  const passRef = useRef<HTMLDivElement>(null)

  // Short ID uses the first segment of the UUID (or the first 4 chars)
  const shortId = qrCode.split('-')[0].substring(0, 4).toUpperCase()
  const eventDate = "14 Apr 2026"
  
  // Format the name slightly smaller if too long by truncating gracefully 
  // but CSS will handle truncation with text-ellipsis.
  
  useEffect(() => {
    let cancelled = false
    const generate = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        // The image shows a classic black QR code on white block background
        const dataUrl = await QRCode.toDataURL(qrCode, {
          width: 320,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }, // Black on White
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

  const handleDownload = async () => {
    if (!passRef.current) return
    try {
      const canvas = await html2canvas(passRef.current, {
        scale: 2,
        backgroundColor: null,
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `event_pass_${name.replace(/\s+/g, '_').toLowerCase()}.png`
      link.click()
    } catch (err) {
      console.error('Failed to capture pass', err)
    }
  }

  const bgGradient = getSchoolGradient(schoolName)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[300px] flex flex-col gap-3 animate-scaleIn relative">
        {/* Absolute Close Button (X) */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 w-8 h-8 rounded-full flex items-center justify-center text-[#8888aa] hover:text-white hover:bg-white/10 transition-all duration-200 z-50"
        >
          ✕
        </button>

        {/* Pass Card Container */}
        <div
          ref={passRef}
          className="relative w-full rounded-[28px] shadow-2xl flex flex-col py-5 px-4 border border-white/5"
          style={{ background: bgGradient }}
        >
          {/* Top Row: Event Info + Download Icon & Logo */}
          <div className="flex justify-between items-start mb-4 w-full">
            <div className="flex flex-col">
              <span className="font-dm text-[8px] tracking-widest text-white/50 font-bold uppercase mb-1">
                Event Pass
              </span>
              <h2 className="font-syne font-black text-[16px] text-white leading-tight uppercase">
                TAMANSOURTE<br/>2026
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-white.png"
                  alt="Logo"
                  className="w-full h-full object-contain brightness-0 invert opacity-60"
                />
              </div>
              <button
                data-html2canvas-ignore="true"
                onClick={handleDownload}
                title="Download Pass"
                disabled={!qrDataUrl}
                className="w-10 h-10 rounded-[14px] flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors bg-white/5 shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
          </div>

          {/* User Name flexible to fit entirely */}
          <div className="mb-4 w-full">
            <h1 className="font-syne font-black text-[24px] text-white uppercase text-center leading-none break-words">
              {name}
            </h1>
          </div>

          {/* QR Code Container centered */}
          <div className="flex justify-center w-full mb-5">
            {generatingQr ? (
              <div
                className="w-[180px] h-[180px] flex items-center justify-center bg-white rounded-3xl"
              >
                <div className="w-10 h-10 rounded-full border-2 border-black border-t-transparent animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <div className="bg-white rounded-[24px] p-3 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-[180px] h-[180px] block"
                  style={{ imageRendering: 'pixelated', borderRadius: '12px' }}
                />
              </div>
            ) : (
              <div className="text-white text-sm">Error generating QR</div>
            )}
          </div>

          {/* Unique ID below QR placed centrally */}
          <div className="flex flex-col items-center mb-5 w-full">
            <span className="font-dm text-[8px] tracking-[0.2em] text-white/50 uppercase font-bold mb-1">
              Unique ID
            </span>
            <span className="font-mono text-[20px] text-[#5da9e9] font-black tracking-widest drop-shadow-sm">
              {shortId}
            </span>
          </div>

          {/* Bottom Row: School & Date */}
          <div className="flex justify-between items-end w-full">
            <div className="flex flex-col flex-1 pr-3">
              <span className="font-dm text-[8px] tracking-widest text-white/50 uppercase font-bold mb-1">
                School
              </span>
              <span className="font-dm text-[11px] text-white font-medium break-words leading-tight">
                {schoolName}
              </span>
            </div>
            
            <div className="flex flex-col items-end shrink-0 pl-3">
              <span className="font-dm text-[8px] tracking-widest text-white/50 uppercase font-bold mb-1">
                Date
              </span>
              <span className="font-dm text-[11px] text-white font-medium">
                {eventDate}
              </span>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  )
}
