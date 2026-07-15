'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Spinner } from '@/components/ui'
import {
  Heart,
  Users,
  UserCheck,
  CheckCircle,
  Clock,
  XCircle,
  CalendarDays,
  MapPin,
  ArrowRight,
} from 'lucide-react'

interface DashboardData {
  summary: {
    totalEvents: number
    totalDonors: number
    totalArrived: number
    statusCounts: { pending: number; passed: number; failed: number }
  }
  bloodTypeDistribution: { type: string; count: number }[]
  upcomingEvents: { id: string; title: string; event_date: string; location: string; donor_count: number }[]
  recentDonors: {
    id: string
    full_name: string
    email: string
    blood_type: string
    registered_at: string
    arrived: boolean
    donation_status: string
    event_title: string
  }[]
  topEvents: { id: string; title: string; event_date: string; donor_count: number }[]
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
  pending: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  passed: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  failed: { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
}

const BLOOD_TYPE_COLORS: Record<string, string> = {
  'A+': 'bg-red-500',
  'A-': 'bg-red-400',
  'B+': 'bg-blue-500',
  'B-': 'bg-blue-400',
  'AB+': 'bg-purple-500',
  'AB-': 'bg-purple-400',
  'O+': 'bg-amber-500',
  'O-': 'bg-amber-400',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error)
        setData(json.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    )
  }

  const { summary, bloodTypeDistribution, upcomingEvents, recentDonors, topEvents } = data
  const maxDonors = Math.max(...topEvents.map((e) => e.donor_count), 1)
  const maxBloodType = Math.max(...bloodTypeDistribution.map((b) => b.count), 1)
  const totalStatus = summary.statusCounts.pending + summary.statusCounts.passed + summary.statusCounts.failed

  function donutGradient() {
    if (totalStatus === 0) return 'conic-gradient(#e5e7eb 0% 100%)'
    const p = (summary.statusCounts.passed / totalStatus) * 100
    const f = (summary.statusCounts.failed / totalStatus) * 100
    const pending = (summary.statusCounts.pending / totalStatus) * 100
    return `conic-gradient(#22c55e 0% ${p}%, #ef4444 ${p}% ${p + f}%, #eab308 ${p + f}% 100%)`
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of all blood drives and donor activity.</p>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Blood Drives"
              value={summary.totalEvents}
              icon={Heart}
              iconColor="text-red-600"
              iconBg="bg-red-50"
            />
            <StatCard
              label="Total Donors"
              value={summary.totalDonors}
              icon={Users}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              label="Checked In"
              value={summary.totalArrived}
              icon={UserCheck}
              iconColor="text-green-600"
              iconBg="bg-green-50"
            />
            <StatCard
              label="Donations Passed"
              value={summary.statusCounts.passed}
              icon={CheckCircle}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Donation Status Donut */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Donation Status</h3>
              {totalStatus === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No donation data yet</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative h-36 w-36 shrink-0">
                    <div
                      className="h-full w-full rounded-full"
                      style={{ background: donutGradient() }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-white" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{totalStatus}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    {(['passed', 'failed', 'pending'] as const).map((status) => {
                      const count = summary.statusCounts[status]
                      const pct = totalStatus > 0 ? Math.round((count / totalStatus) * 100) : 0
                      const cfg = STATUS_CONFIG[status]
                      const Icon = cfg.icon
                      return (
                        <div key={status} className="flex items-center gap-2">
                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${cfg.bg}`}>
                            <Icon className={`h-3 w-3 ${cfg.color}`} />
                          </span>
                          <span className="capitalize text-gray-600">{status}</span>
                          <span className="ml-auto font-medium text-gray-900">{count}</span>
                          <span className="w-10 text-right text-xs text-gray-400">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Blood Type Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Blood Type Distribution</h3>
              {bloodTypeDistribution.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No donor data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {bloodTypeDistribution.map((bt) => (
                    <div key={bt.type} className="flex items-center gap-3">
                      <span className="w-8 text-right text-xs font-medium text-gray-700">{bt.type}</span>
                      <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${BLOOD_TYPE_COLORS[bt.type] || 'bg-gray-400'}`}
                          style={{ width: `${(bt.count / maxBloodType) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-xs font-medium text-gray-600">{bt.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Events */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Top Events by Donors</h3>
              <Link href="/events" className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {topEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No events yet</p>
            ) : (
              <div className="space-y-3">
                {topEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 group-hover:text-red-600">
                          {event.title}
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">{formatDate(event.event_date)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-red-500"
                            style={{ width: `${(event.donor_count / maxDonors) * 100}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-medium text-gray-600">
                          {event.donor_count} donor{event.donor_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Row: Upcoming + Recent */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Upcoming Events */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Upcoming Events</h3>
                <Link href="/events" className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="group block rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 group-hover:text-red-600">
                          {event.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          {event.donor_count}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(event.event_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Registrations */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
                <h3 className="text-sm font-semibold text-gray-900">Recent Registrations</h3>
              </div>
              {recentDonors.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No registrations yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Donor</th>
                        <th className="hidden px-4 py-2 text-xs font-medium text-gray-500 sm:table-cell">Event</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Blood</th>
                        <th className="hidden px-4 py-2 text-xs font-medium text-gray-500 md:table-cell">When</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDonors.map((donor) => {
                        const cfg = STATUS_CONFIG[donor.donation_status] || STATUS_CONFIG.pending
                        const Icon = cfg.icon
                        return (
                          <tr key={donor.id} className="border-b border-gray-50">
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <div className="font-medium text-gray-900">{donor.full_name}</div>
                              <div className="text-xs text-gray-400 sm:hidden">{donor.event_title}</div>
                            </td>
                            <td className="hidden whitespace-nowrap px-4 py-2.5 text-gray-500 sm:table-cell">
                              {donor.event_title}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                {donor.blood_type}
                              </span>
                            </td>
                            <td className="hidden whitespace-nowrap px-4 py-2.5 text-xs text-gray-500 md:table-cell">
                              {formatDateTime(donor.registered_at)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                                <Icon className="h-3 w-3" />
                                <span className="hidden sm:inline">{donor.donation_status}</span>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string
  value: number
  icon: typeof Heart
  iconColor: string
  iconBg: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="truncate text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
