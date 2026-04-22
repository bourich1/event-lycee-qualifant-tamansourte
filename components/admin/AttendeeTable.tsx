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
  onDelete?: (id: string) => void
}

export default function AttendeeTable({ attendees, onDelete }: AttendeeTableProps) {
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState<'all' | 'checked' | 'pending'>('all')
  const [confirmTarget, setConfirmTarget] = useState<Attendee | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState('')

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

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/delete-attendee', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmTarget.id }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setDeleteError(data.error || 'Failed to delete. Please try again.')
        setDeleting(false)
        return
      }

      onDelete?.(confirmTarget.id)
      setConfirmTarget(null)
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* ── Confirmation modal ─────────────────────────────────────────────── */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: '#13131a',
              border: '1px solid rgba(225,112,85,0.25)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(225,112,85,0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
          >
            {/* Red top bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #e17055, #fd79a8)' }} />

            <div className="p-7 text-center">
              {/* Warning icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
                style={{
                  background: 'rgba(225,112,85,0.12)',
                  border: '1px solid rgba(225,112,85,0.3)',
                }}
              >
                🗑️
              </div>

              <h3 className="font-syne font-black text-xl text-[#f0f0ff] mb-2">
                Delete Attendee?
              </h3>
              <p className="font-dm text-sm text-[#8888aa] mb-1">
                You are about to permanently delete:
              </p>
              <p className="font-syne font-bold text-base text-[#f0f0ff] mb-1">
                {confirmTarget.full_name}
              </p>
              <p className="font-dm text-xs text-[#8888aa] mb-6">
                {confirmTarget.email}
              </p>

              {/* Warning note */}
              <div
                className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-dm text-left mb-6"
                style={{
                  background: 'rgba(225,112,85,0.08)',
                  border: '1px solid rgba(225,112,85,0.2)',
                  color: '#e17055',
                }}
              >
                <span className="shrink-0">⚠️</span>
                <span>This action is <strong>permanent</strong> and cannot be undone. The attendee&apos;s QR code will be invalidated.</span>
              </div>

              {/* Error */}
              {deleteError && (
                <div
                  className="px-4 py-2.5 rounded-xl text-xs font-dm mb-4"
                  style={{
                    background: 'rgba(225,112,85,0.1)',
                    border: '1px solid rgba(225,112,85,0.3)',
                    color: '#e17055',
                  }}
                >
                  {deleteError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmTarget(null); setDeleteError('') }}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl font-dm font-semibold text-sm text-[#8888aa] hover:text-white transition-all duration-200"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl font-dm font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                  style={{
                    background: deleting
                      ? 'rgba(225,112,85,0.5)'
                      : 'linear-gradient(135deg, #e17055, #d63031)',
                    opacity: deleting ? 0.8 : 1,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    boxShadow: deleting ? 'none' : '0 0 20px rgba(225,112,85,0.4)',
                  }}
                >
                  {deleting ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
                        style={{ animation: 'spin 0.7s linear infinite' }}
                      />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <span>🗑️</span>
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table card ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#13131a' }}
      >
        {/* Header */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-white/[0.06]">
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
                  {['Name', 'Email', 'School', 'Status', 'Registered At', ''].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-left font-dm text-[11px] font-semibold text-[#8888aa] uppercase tracking-wider"
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
                    className="transition-colors duration-150 hover:bg-white/[0.02] group"
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <span className="font-dm font-medium text-[#f0f0ff]">{attendee.full_name}</span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <span className="font-dm text-sm text-[#8888aa]">{attendee.email}</span>
                    </td>

                    {/* School */}
                    <td className="px-4 py-3">
                      <span className="font-dm text-sm text-[#8888aa]">{attendee.schools?.name ?? '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
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

                    {/* Created At */}
                    <td className="px-4 py-3">
                      <span className="font-dm text-xs text-[#8888aa]">{formatDate(attendee.created_at)}</span>
                    </td>

                    {/* Delete button */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => { setConfirmTarget(attendee); setDeleteError('') }}
                        title="Delete attendee"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                        style={{
                          background: 'rgba(225,112,85,0.1)',
                          border: '1px solid rgba(225,112,85,0.2)',
                          color: '#e17055',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
