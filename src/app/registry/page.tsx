'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner, Toast } from '@/components/ui'
import { BLOOD_TYPES, DONATION_STATUS_OPTIONS } from '@/types'
import type { DonationStatus } from '@/types'
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Archive } from 'lucide-react'

interface RegistryDonor {
  id: string
  full_name: string
  email: string
  blood_type: string
  registered_at: string
  arrived: boolean
  donation_status: DonationStatus
  event_id: string
  event_title: string
  event_date: string | null
}

type SortKey = 'full_name' | 'email' | 'blood_type' | 'registered_at' | 'donation_status'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  passed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
}

export default function RegistryPage() {
  const router = useRouter()
  const [donors, setDonors] = useState<RegistryDonor[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [search, setSearch] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<SortKey>('registered_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (bloodType) params.set('blood_type', bloodType)
      if (status) params.set('status', status)
      params.set('sort', sort)
      params.set('dir', sortDir)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/registry?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDonors(json.data)
      setTotalPages(json.pagination.totalPages)
      setTotal(json.pagination.total)
    } catch (err: unknown) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load registry' })
    } finally {
      setLoading(false)
    }
  }, [search, bloodType, status, sort, sortDir, page])

  useEffect(() => { fetchData() }, [fetchData])

  function handleSort(key: SortKey) {
    if (sort === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function SortableHeader({ label, sortKey }: { label: string; sortKey: SortKey }) {
    const active = sort === sortKey
    return (
      <th
        onClick={() => handleSort(sortKey)}
        className="cursor-pointer select-none px-3 py-2.5 text-left text-xs font-medium text-gray-500 hover:text-gray-700 sm:px-4"
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active && (
            <ArrowUpDown className={`h-3 w-3 ${sortDir === 'desc' ? 'rotate-180' : ''} text-red-500`} />
          )}
        </span>
      </th>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Master Registry & Archive</h1>
        <p className="mt-1 text-sm text-gray-500">Search and browse all historical donor records across all blood drives.</p>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <select
            value={bloodType}
            onChange={handleFilterChange(setBloodType)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">All Blood Types</option>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={handleFilterChange(setStatus)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">All Statuses</option>
            {DONATION_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="mb-3 text-xs text-gray-500">
          {total} record{total !== 1 ? 's' : ''} found
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : donors.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Archive className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No donor records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <SortableHeader label="Name" sortKey="full_name" />
                    <SortableHeader label="Email" sortKey="email" />
                    <SortableHeader label="Blood" sortKey="blood_type" />
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 sm:px-4">Event</th>
                    <SortableHeader label="Registered" sortKey="registered_at" />
                    <SortableHeader label="Status" sortKey="donation_status" />
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 sm:px-4">Arrived</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((donor) => (
                    <tr
                      key={donor.id}
                      className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                      onClick={() => router.push(`/events/${donor.event_id}`)}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900 sm:px-4">{donor.full_name}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-500 sm:px-4">{donor.email}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          {donor.blood_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 sm:px-4">
                        <div className="max-w-[200px] truncate">{donor.event_title}</div>
                        <div className="text-xs text-gray-400 sm:hidden">{formatDate(donor.registered_at)}</div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-gray-500 sm:table-cell sm:px-4">
                        {formatDate(donor.registered_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[donor.donation_status] || ''}`}>
                          {donor.donation_status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                        {donor.arrived ? (
                          <span className="inline-flex items-center rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">Yes</span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
