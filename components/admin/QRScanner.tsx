'use client'

import { useRouter } from 'next/navigation'

export default function QRScanner() {
  const router = useRouter()

  return (
    <button
      id="qr-scan-btn"
      onClick={() => router.push('/admin/scan')}
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
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M16 16v.01" strokeWidth="2.8" />
      </svg>
      <span className="hidden sm:inline">Scan QR</span>
    </button>
  )
}
