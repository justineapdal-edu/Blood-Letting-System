'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Spinner, Toast } from '@/components/ui'
import type { BloodEvent, DonorRegistration, DonationStatus, CustomFieldSchema } from '@/types'
import { DONATION_STATUS_OPTIONS } from '@/types'
import { ArrowLeft, CalendarDays, MapPin, Users, Copy, Check, ExternalLink, Search, ArrowUpDown, ScanLine, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

interface EventWithDonors extends BloodEvent {
  donors: DonorRegistration[]
}

type DonorSortKey = 'full_name' | 'email' | 'blood_type' | 'registered_at' | 'arrived' | 'donation_status'

const STATUS_COLORS: Record<DonationStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  passed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

function formatCellValue(value: unknown, type: string): string {
  if (value === undefined || value === null) return '-'
  if (type === 'checkbox') return value ? 'Yes' : 'No'
  if (type === 'number') return String(value)
  if (type === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch { return String(value) }
  }
  return String(value)
}

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string
  const [event, setEvent] = useState<EventWithDonors | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [donorSearch, setDonorSearch] = useState('')
  const [donorSort, setDonorSort] = useState<{ key: DonorSortKey; dir: 'asc' | 'desc' }>({ key: 'registered_at', dir: 'desc' })
  const [showScanner, setShowScanner] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchEvent() }, [eventId])

  useEffect(() => {
    const interval = setInterval(() => { fetchEvent() }, 10_000)
    return () => clearInterval(interval)
  }, [eventId])

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events/${eventId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEvent(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function manualRefresh() {
    setRefreshing(true)
    await fetchEvent()
  }

  function getRegistrationUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_DONOR_PORTAL_URL || window.location.origin
    return `${baseUrl}/register/${eventId}`
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getRegistrationUrl())
      setCopied(true)
      setToast({ type: 'success', message: 'Registration link copied to clipboard!' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setToast({ type: 'error', message: 'Failed to copy link' })
    }
  }

  async function toggleArrived(donorId: string, current: boolean) {
    if (!event) return
    const newVal = !current
    setEvent((prev) => ({
      ...prev!,
      donors: prev!.donors.map((d) => d.id === donorId ? { ...d, arrived: newVal } : d),
    }))
    const res = await fetch(`/api/events/${eventId}/donors/${donorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arrived: newVal }),
    })
    if (!res.ok) {
      setEvent((prev) => ({
        ...prev!,
        donors: prev!.donors.map((d) => d.id === donorId ? { ...d, arrived: current } : d),
      }))
      setToast({ type: 'error', message: 'Failed to update arrival status' })
    }
  }

  async function updateDonationStatus(donorId: string, status: DonationStatus) {
    if (!event) return
    const prev = event.donors.find((d) => d.id === donorId)?.donation_status
    setEvent((data) => ({
      ...data!,
      donors: data!.donors.map((d) => d.id === donorId ? { ...d, donation_status: status } : d),
    }))
    const res = await fetch(`/api/events/${eventId}/donors/${donorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donation_status: status }),
    })
    if (!res.ok && prev) {
      setEvent((data) => ({
        ...data!,
        donors: data!.donors.map((d) => d.id === donorId ? { ...d, donation_status: prev } : d),
      }))
      setToast({ type: 'error', message: 'Failed to update donation status' })
    }
  }

  function handleDonorSort(key: DonorSortKey) {
    setDonorSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  async function handleScan(donorId: string): Promise<{ type: 'success' | 'error'; message: string }> {
    let donor = event?.donors.find((d) => d.id === donorId)
    if (!donor) {
      try {
        const res = await fetch(`/api/events/${eventId}/donors/${donorId}`)
        const json = await res.json()
        if (json.success && json.data) {
          donor = json.data
          setEvent((prev) => ({
            ...prev!,
            donors: [...prev!.donors, json.data],
          }))
        }
      } catch {}
    }
    if (!donor) {
      return { type: 'error', message: 'Donor not found for this event.' }
    }
    if (donor.arrived) {
      return { type: 'success', message: `${donor.full_name} is already checked in.` }
    }
    const res = await fetch(`/api/events/${eventId}/donors/${donorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arrived: true }),
    })
    if (res.ok) {
      setEvent((prev) => ({
        ...prev!,
        donors: prev!.donors.map((d) => d.id === donorId ? { ...d, arrived: true } : d),
      }))
      return { type: 'success', message: `${donor.full_name} has been checked in successfully!` }
    } else {
      return { type: 'error', message: 'Failed to check in donor. Please try again.' }
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  function formatRegDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const filteredDonors = useMemo(() => {
    let result = event?.donors || []
    if (donorSearch) {
      const term = donorSearch.toLowerCase()
      result = result.filter((d) =>
        d.full_name.toLowerCase().includes(term) ||
        d.email.toLowerCase().includes(term) ||
        d.blood_type.toLowerCase().includes(term)
      )
    }
    const { key, dir } = donorSort
    return [...result].sort((a, b) => {
      let cmp = 0
      switch (key) {
        case 'full_name': cmp = a.full_name.localeCompare(b.full_name); break
        case 'email': cmp = a.email.localeCompare(b.email); break
        case 'blood_type': cmp = a.blood_type.localeCompare(b.blood_type); break
        case 'registered_at': cmp = new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime(); break
        case 'arrived': cmp = (a.arrived === b.arrived) ? 0 : a.arrived ? -1 : 1; break
        case 'donation_status': cmp = a.donation_status.localeCompare(b.donation_status); break
      }
      return dir === 'asc' ? cmp : -cmp
    })
  }, [event?.donors, donorSearch, donorSort])

  function SortableHeader({ label, sortKey }: { label: string; sortKey: DonorSortKey }) {
    const active = donorSort.key === sortKey
    return (
      <th
        onClick={() => handleDonorSort(sortKey)}
        className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active && (
            <ArrowUpDown className={`h-3 w-3 ${donorSort.dir === 'desc' ? 'rotate-180' : ''} text-red-500`} />
          )}
        </span>
      </th>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
  }

  if (error || !event) {
    return (
      <div className="px-6 py-8">
        <Link href="/events" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />Back to events
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Event not found'}
        </div>
      </div>
    )
  }

  const customColumns: CustomFieldSchema[] = event.custom_form_schema || []

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-4 sm:px-6 sm:pt-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <Link href="/events" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />Back to events
          </Link>
          <h1 className="text-xl font-bold text-gray-900 truncate sm:text-2xl">{event.title}</h1>
          {event.description && <p className="mt-1 max-w-2xl text-sm text-gray-600 truncate">{event.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-gray-400" />{formatDate(event.event_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />{event.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              {event.donors.length} registered donor{event.donors.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setShowScanner(true)}>
            <ScanLine className="mr-1.5 h-4 w-4" />
            Scan QR
          </Button>
          <Button variant="ghost" onClick={manualRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" onClick={copyLink}>
            {copied ? <Check className="mr-1.5 h-4 w-4 text-green-300" /> : <Copy className="mr-1.5 h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Registration Link'}</span>
            <span className="sm:hidden">{copied ? 'Copied' : 'Copy Link'}</span>
          </Button>
          <a href={getRegistrationUrl()} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-sm font-semibold text-gray-900">Registered Donors</h2>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search donors..."
                value={donorSearch}
                onChange={(e) => setDonorSearch(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {event.donors.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No donors registered yet.</p>
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">No donors match your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <SortableHeader label="Name" sortKey="full_name" />
                    <SortableHeader label="Email" sortKey="email" />
                    <SortableHeader label="Blood Type" sortKey="blood_type" />
                    {customColumns.map((col) => (
                      <th key={col.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{col.label}</th>
                    ))}
                    <SortableHeader label="Registered" sortKey="registered_at" />
                    <SortableHeader label="Arrived" sortKey="arrived" />
                    <SortableHeader label="Status" sortKey="donation_status" />
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map((donor) => (
                    <tr key={donor.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{donor.full_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{donor.email}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {donor.blood_type}
                        </span>
                      </td>
                      {customColumns.map((col) => (
                        <td key={col.id} className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatCellValue(donor.custom_form_responses[col.id], col.type)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatRegDate(donor.registered_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => toggleArrived(donor.id, donor.arrived)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                            donor.arrived ? 'bg-red-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                              donor.arrived ? 'translate-x-4.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <select
                          value={donor.donation_status}
                          onChange={(e) => updateDonationStatus(donor.id, e.target.value as DonationStatus)}
                          className={`rounded border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 ${STATUS_COLORS[donor.donation_status]}`}
                        >
                          {DONATION_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      {showScanner && (
        <QRScanner
          onScan={(id) => handleScan(id)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
