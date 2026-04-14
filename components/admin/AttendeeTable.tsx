'use client'

import { useState, useMemo } from 'react'

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

interface AttendeeTableProps {
  attendees: Attendee[]
}

export default function AttendeeTable({ attendees }: AttendeeTableProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked' | 'pending'>('all')

  const filtered = useMemo(() => {
    return attendees.filter((a) => {
      const q = search.toLowerCase()
      const matchSearch =
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.schools?.name?.toLowerCase().includes(q) ?? false)

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'checked' && a.checked_in) ||
        (filterStatus === 'pending' && !a.checked_in)

      return matchSearch && matchStatus
    })
  }, [attendees, search, filterStatus])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#13131a' }}
    >
      {/* Header */}
      <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-white/[0.06]">
        <h2 className="font-syne font-bold text-lg text-[#f0f0ff]">
          Attendees ({filtered.length})
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <input
              id="attendee-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-field pr-10"
              style={{ width: '220px', paddingLeft: '38px' }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa] text-base">🔍</span>
          </div>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'checked' | 'pending')}
            className="input-field"
            style={{ width: 'auto', cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#13131a' }}>All</option>
            <option value="checked" style={{ background: '#13131a' }}>Checked In</option>
            <option value="pending" style={{ background: '#13131a' }}>Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#8888aa] font-dm">
            <div className="text-4xl mb-3">🔍</div>
            <p>No attendees found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Name', 'Email', 'School', 'Status', 'Registered At'].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-3.5 text-left font-dm text-xs font-semibold text-[#8888aa] uppercase tracking-wider"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((attendee, idx) => (
                <tr
                  key={attendee.id}
                  className="transition-colors duration-150 hover:bg-white/[0.02]"
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <td className="px-5 py-4">
                    <span className="font-dm font-medium text-[#f0f0ff]">{attendee.full_name}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-dm text-sm text-[#8888aa]">{attendee.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-dm text-sm text-[#8888aa]">{attendee.schools?.name ?? '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    {attendee.checked_in ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-dm font-semibold"
                        style={{
                          background: 'rgba(0,184,148,0.15)',
                          color: '#00b894',
                          border: '1px solid rgba(0,184,148,0.3)',
                        }}
                      >
                        ✓ Checked In
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-dm font-semibold"
                        style={{
                          background: 'rgba(253,203,110,0.1)',
                          color: '#fdcb6e',
                          border: '1px solid rgba(253,203,110,0.25)',
                        }}
                      >
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-dm text-xs text-[#8888aa]">{formatDate(attendee.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
