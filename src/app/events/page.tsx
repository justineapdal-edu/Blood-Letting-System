'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Spinner, Modal, Toast } from '@/components/ui'
import type { BloodEventWithDonorCount } from '@/types'
import { CalendarDays, MapPin, Users, Plus, Heart, Search, ArrowUpDown, MoreVertical, Pencil, Trash2 } from 'lucide-react'

type SortKey = 'date_newest' | 'date_oldest' | 'name_az' | 'name_za' | 'donors_most' | 'donors_least'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_newest', label: 'Newest First' },
  { value: 'date_oldest', label: 'Oldest First' },
  { value: 'name_az', label: 'Name A-Z' },
  { value: 'name_za', label: 'Name Z-A' },
  { value: 'donors_most', label: 'Most Donors' },
  { value: 'donors_least', label: 'Least Donors' },
]

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<BloodEventWithDonorCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date_newest')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BloodEventWithDonorCount | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchEvents() }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpenId])

  async function fetchEvents() {
    try {
      const res = await fetch('/api/events')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEvents(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/events/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
      setToast({ type: 'success', message: 'Event deleted successfully' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete event'
      setToast({ type: 'error', message })
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    let result = events
    if (term) {
      result = result.filter((e) =>
        e.title.toLowerCase().includes(term) ||
        e.location.toLowerCase().includes(term) ||
        (e.description && e.description.toLowerCase().includes(term))
      )
    }
    switch (sort) {
      case 'date_newest': result = [...result].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()); break
      case 'date_oldest': result = [...result].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()); break
      case 'name_az': result = [...result].sort((a, b) => a.title.localeCompare(b.title)); break
      case 'name_za': result = [...result].sort((a, b) => b.title.localeCompare(a.title)); break
      case 'donors_most': result = [...result].sort((a, b) => b.donor_count - a.donor_count); break
      case 'donors_least': result = [...result].sort((a, b) => a.donor_count - b.donor_count); break
    }
    return result
  }, [events, search, sort])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Blood Drives</h1>
          <p className="mt-1 text-sm text-gray-500">Manage blood donation events and track donor registrations.</p>
        </div>
        <Link href="/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:px-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <ArrowUpDown className="h-4 w-4" />
            {SORT_OPTIONS.find((o) => o.value === sort)?.label}
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setSort(option.value); setShowSortMenu(false) }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      sort === option.value ? 'font-medium text-red-600 bg-red-50' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        {loading && (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-20">
            <Heart className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">No blood drives yet</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first event to start collecting donor registrations.</p>
            <Link href="/events/new" className="mt-4">
              <Button><Plus className="mr-2 h-4 w-4" />Create Event</Button>
            </Link>
          </div>
        )}

        {!loading && !error && events.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center"><p className="text-sm text-gray-500">No events match your search.</p></div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md aspect-square"
              >
                <div className="absolute top-3 right-3 z-10" ref={menuOpenId === event.id ? menuRef : undefined}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === event.id ? null : event.id) }}
                    className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpenId === event.id && (
                    <div className="absolute right-0 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); router.push(`/events/${event.id}/edit`) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setDeleteTarget(event) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />Delete
                      </button>
                    </div>
                  )}
                </div>

                <Link href={`/events/${event.id}`} className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-semibold text-gray-900 line-clamp-2">{event.title}</h2>
                  {event.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{event.description}</p>
                  )}
                  <div className="mt-auto space-y-2 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    {event.donor_count} donor{event.donor_count !== 1 ? 's' : ''}
                  </span>
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    {event.donor_count} registered
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Event">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.title}</span>?
          This will also remove all {deleteTarget?.donor_count ?? 0} donor registration{deleteTarget?.donor_count !== 1 ? 's' : ''}.
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner size="sm" className="mr-2" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {deleting ? 'Deleting...' : 'Delete Event'}
          </Button>
        </div>
      </Modal>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
