interface Attendee {
  id: string
  full_name: string
  email: string
  school_id: string | null
  qr_code: string
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
  schools?: { name: string } | null
}

interface StatsBarProps {
  attendees: Attendee[]
}

export default function StatsBar({ attendees }: StatsBarProps) {
  const total = attendees.length
  const checkedIn = attendees.filter((a) => a.checked_in).length
  const pending = total - checkedIn
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  const stats = [
    {
      id: 'stat-total',
      label: 'Total Registered',
      value: total,
      icon: '👥',
      color: '#a29bfe',
      bg: 'rgba(162,155,254,0.1)',
      border: 'rgba(162,155,254,0.25)',
    },
    {
      id: 'stat-checkedin',
      label: 'Checked In',
      value: checkedIn,
      icon: '✅',
      color: '#00b894',
      bg: 'rgba(0,184,148,0.1)',
      border: 'rgba(0,184,148,0.25)',
    },
    {
      id: 'stat-pending',
      label: 'Pending',
      value: pending,
      icon: '⏳',
      color: '#fdcb6e',
      bg: 'rgba(253,203,110,0.1)',
      border: 'rgba(253,203,110,0.25)',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            id={stat.id}
            className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span
                className="text-xs font-dm font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: stat.color }}
              >
                {stat.label}
              </span>
            </div>
            <p className="font-syne font-black text-4xl" style={{ color: stat.color }}>
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-dm text-sm text-[#8888aa]">Attendance rate</span>
          <span className="font-syne font-bold text-[#a29bfe]">{percentage}%</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, #6c5ce7, #00b894)' }}
          />
        </div>
      </div>
    </div>
  )
}
