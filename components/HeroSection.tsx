'use client'

import { useEffect, useRef } from 'react'
import Countdown from './Countdown'
import Navbar from './Navbar'

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

      {/* Navbar */}
      <Navbar onRegister={onGetPass} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-20">

        {/* Badge */}
        <div className="flex justify-center mb-5" data-aos="fade-down" data-aos-delay="200">
          <span
            className="px-4 py-1.5 rounded-full text-xs font-dm font-semibold uppercase tracking-wider"
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
        <h1 className="font-syne font-black leading-tight mb-2" data-aos="fade-up" data-aos-delay="400">
          <span
            className="block text-3xl md:text-5xl lg:text-6xl"
            style={{
              background:
                'linear-gradient(135deg, #f0f0ff 0%, #a29bfe 50%, #6c5ce7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            LQ TAMANSOURTE 2026
          </span>
        </h1>

        {/* Countdown Timer */}
        <div data-aos="zoom-in" data-aos-delay="600">
          <Countdown />
        </div>

        {/* Event info pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8" data-aos="fade-up" data-aos-delay="800">
          {[
            { icon: '📅', text: 'May 17, 2026' },
            { icon: '📍', text: 'lycée qualifiant tamansourt ' },
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

        {/* Mobile Get Pass Button */}
        <div className="mt-8 md:hidden flex justify-center w-full" >
          <button 
            onClick={onGetPass}
            className="btn-primary w-full py-4 text-base font-bold shadow-lg shadow-[#6c5ce7]/20"
          >
            Get My Pass 🎟️
          </button>
        </div>
      </div>


    </section>
  )
}
