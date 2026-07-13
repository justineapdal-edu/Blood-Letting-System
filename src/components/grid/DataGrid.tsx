'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface RecordData {
  id: string
  data: Record<string, string>
  submittedAt: string | null
  createdAt: string
}

interface RecordsResponse {
  records: RecordData[]
  columns: string[]
  total: number
}

interface DataGridProps {
  tableName: string
  displayName: string
}

const PAGE_SIZE = 50

export function DataGrid({ tableName, displayName }: DataGridProps) {
  const [records, setRecords] = useState<RecordData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (sortBy) {
        params.set('sortBy', sortBy)
        params.set('sortDirection', sortDir)
      }
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))

      const res = await api.get<{ success: boolean; data?: RecordsResponse; error?: string }>(
        `/records/${tableName}?${params.toString()}`
      )

      if (res.success && res.data) {
        setRecords(res.data.records)
        setColumns(res.data.columns)
        setTotal(res.data.total)
      } else {
        setError(res.error ?? 'Failed to load records.')
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load records.')
    } finally {
      setLoading(false)
    }
  }, [tableName, search, sortBy, sortDir, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    setPage(0)
  }

  const formatHeader = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">
            {total} record{total !== 1 ? 's' : ''} in {tableName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        {sortBy && (
          <Button variant="ghost" onClick={() => { setSortBy(null); setPage(0) }} className="text-xs">
            Clear sort
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-12 px-3 py-2.5 text-xs font-medium text-gray-500">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="cursor-pointer select-none px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100"
                    onClick={() => handleSort(col)}
                  >
                    <span className="flex items-center gap-1">
                      {formatHeader(col)}
                      {sortBy === col ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-12 text-center">
                    <Spinner size="md" className="mx-auto text-gray-400" />
                    <p className="mt-2 text-xs text-gray-500">Loading records...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-12 text-center text-sm text-gray-500">
                    {search ? 'No records match your search.' : 'No records found.'}
                  </td>
                </tr>
              ) : (
                records.map((record, rowIdx) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {page * PAGE_SIZE + rowIdx + 1}
                    </td>
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                        {record.data[col] || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs"
              >
                Next <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
