'use client'

import { useState } from 'react'

interface NavbarProps {
  onRegister: () => void
}

export default function Navbar({ onRegister }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-md border-b border-white/5 bg-[#0a0a0f]/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center font-syne font-black text-white text-xs">
            LQ
          </div>
          <span className="font-syne font-bold text-sm tracking-tight text-white hidden sm:block">
            TAMANSOURTE
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          <a 
            href="#about" 
            className="px-3 py-2 rounded-full text-[11px] font-dm font-bold text-[#8888aa] uppercase tracking-widest hover:text-white transition-colors"
          >
            About
          </a>
          <a 
            href="/admin/dashboard" 
            className="px-3 py-2 rounded-full text-[11px] font-dm font-bold text-[#8888aa] uppercase tracking-widest hover:text-white transition-colors"
          >
            Dashboard
          </a>
          <button 
            onClick={onRegister}
            className="btn-primary text-[11px] px-6 py-2 ml-2"
          >
            Get My Pass 🎟️
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 z-[60]"
        >
          <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
          <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[55] bg-[#0a0a0f] transition-all duration-500 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Close Button Inside Menu */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="flex flex-col items-center justify-center h-full gap-8">
          <a 
            href="#about" 
            onClick={() => setIsOpen(false)}
            className="text-2xl font-syne font-black text-white uppercase tracking-tighter"
          >
            About
          </a>
          <a 
            href="/admin/dashboard" 
            onClick={() => setIsOpen(false)}
            className="text-2xl font-syne font-black text-white uppercase tracking-tighter"
          >
            Dashboard
          </a>
          <button 
            onClick={() => {
              setIsOpen(false)
              onRegister()
            }}
            className="btn-primary text-base px-10 py-4 mt-4"
          >
            Get My Pass 🎟️
          </button>
        </div>
      </div>
    </>
  )
}
