'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { DataGrid } from '@/components/grid/DataGrid'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Database, ArrowLeft, Clock } from 'lucide-react'

interface Connection {
  id: string
  name: string
  tableName: string
  columns: { key: string; label: string; type: string }[]
  lastSyncedAt: string | null
  createdAt: string
}

export default function GridsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Connection | null>(null)

  const loadConnections = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Connection[] }>('/records/connections')
      if (res.success) {
        setConnections(res.data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString()
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all connections
        </button>
        <DataGrid tableName={selected.tableName} displayName={selected.name} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Data Grids</h1>
      <p className="mt-2 mb-6 text-gray-600">
        View and search data from connected forms and sheets.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="text-gray-400" />
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Database className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No connected data sources found.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Go to Form Integration Manager to connect a form or sheet first.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => (
            <button
              key={conn.id}
              onClick={() => setSelected(conn)}
              className="flex flex-col items-start rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-left transition-all hover:border-red-200 hover:shadow-md hover:bg-red-50/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-medium text-gray-900 truncate">{conn.name}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-1">{conn.columns.length} columns</p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                Last synced: {formatDate(conn.lastSyncedAt)}
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  View Data →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
