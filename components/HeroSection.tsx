'use client'

import { useEffect, useRef } from 'react'

interface HeroSectionProps {
  onGetPass: () => void
}

export default function HeroSection({ onGetPass }: HeroSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Animated canvas background with particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; color: string
    }> = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['rgba(108,92,231,', 'rgba(162,155,254,', 'rgba(253,121,168,']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(108,92,231,${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha})`
        ctx.fill()

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(108,92,231,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Grid */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">

        {/* Badge */}
        <div className="animate-fadeUp-delay-1 flex justify-center mb-6">
          <span
            className="px-5 py-2 rounded-full text-sm font-dm font-medium"
            style={{
              background: 'rgba(108,92,231,0.12)',
              border: '1px solid rgba(108,92,231,0.35)',
              color: '#a29bfe',
            }}
          >
            ✦ Lycée Qualifiant Tamansourte
          </span>
        </div>

        {/* Main heading */}
        <h1 className="animate-fadeUp-delay-2 font-syne font-black leading-tight mb-6">
          <span
            className="block text-5xl md:text-7xl lg:text-8xl"
            style={{
              background:
                'linear-gradient(135deg, #f0f0ff 0%, #a29bfe 50%, #6c5ce7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            EVENT NAME
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fadeUp-delay-3 font-dm text-lg md:text-xl text-[#8888aa] mb-10 max-w-2xl mx-auto leading-relaxed">
          Welcome to the annual event of Tamansourte High School.
          Join hundreds of students for an unforgettable day of competitions,
          networking, and discovery.
        </p>

        {/* CTA Button */}
        <div className="animate-fadeUp-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onGetPass} className="btn-primary text-lg px-10 py-4">
            Get My Pass 🎟️
          </button>
          <a
            href="/admin/dashboard"
            className="px-8 py-4 rounded-full font-syne font-semibold text-[#a29bfe] hover:text-white transition-colors duration-200"
            style={{ border: '1px solid rgba(162,155,254,0.3)' }}
          >
            Dashboard →
          </a>
        </div>

        {/* Event info pills */}
        <div className="animate-fadeUp-delay-4 flex flex-wrap items-center justify-center gap-4 mt-12">
          {[
            { icon: '📅', text: 'EVENT DATE' },
            { icon: '📍', text: 'EVENT LOCATION' },
            { icon: '🎓', text: 'All levels' },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-dm text-sm text-[#8888aa]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-[#8888aa] text-xs font-dm tracking-widest uppercase">
          Scroll
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 7l5 5 5-5"
            stroke="rgba(136,136,170,0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  )
}
