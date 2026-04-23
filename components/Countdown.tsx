'use client'

import { useState, useEffect } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function Countdown() {
  const targetDate = new Date('2026-05-17T00:00:00').getTime()
  
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-t from-[#6c5ce7] to-[#a29bfe] rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        
        {/* Unit Card */}
        <div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-[#13131a]/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <span className="text-2xl md:text-3xl font-syne font-black text-white tabular-nums">
            {value.toString().padStart(2, '0')}
          </span>
          
          {/* Subtle line across middle */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/5"></div>
        </div>
      </div>
      <span className="mt-2 text-[10px] md:text-xs font-dm font-bold text-[#8888aa] uppercase tracking-[0.2em]">
        {label}
      </span>
    </div>
  )

  return (
    <div className="animate-slideUp-delay-3 flex items-center justify-center gap-3 md:gap-6 my-8">
      <TimeUnit value={timeLeft.days} label="Days" />
      <div className="text-white/20 font-syne text-xl mb-6">:</div>
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <div className="text-white/20 font-syne text-xl mb-6">:</div>
      <TimeUnit value={timeLeft.minutes} label="Mins" />
      <div className="text-white/20 font-syne text-xl mb-6">:</div>
      <TimeUnit value={timeLeft.seconds} label="Secs" />
    </div>
  )
}
