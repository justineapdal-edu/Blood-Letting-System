'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/ui/Toast'
import { api } from '@/lib/api-client'
import { RefreshCw, Trash2, Link2, Database, Clock } from 'lucide-react'

interface ConnectedSheet {
  id: string
  name: string
  spreadsheetId: string
  sheetUrl: string
  tableName: string
  columnMetadata: { key: string; label: string; type: string }[]
  active: boolean
  lastSyncedAt: string | null
  createdAt: string
}

export function SheetsImporter() {
  const [sheets, setSheets] = useState<ConnectedSheet[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadSheets = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: ConnectedSheet[] }>('/sheets')
      if (res.success) {
        setSheets(res.data)
      }
    } catch (err) {
      // Silent fail on list load
    }
  }, [])

  useEffect(() => {
    loadSheets()
  }, [loadSheets])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)

    try {
      const res = await api.post<{ success: boolean; data?: ConnectedSheet; rowCount?: number; message?: string; error?: string }>(
        '/sheets/connect',
        { name: name.trim(), url: url.trim() }
      )

      if (res.success) {
        setToast({ message: res.message ?? 'Sheet connected successfully.', type: 'success' })
        setName('')
        setUrl('')
        await loadSheets()
      } else {
        setToast({ message: res.error ?? 'Failed to connect sheet.', type: 'error' })
      }
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to connect sheet. Please try again.', type: 'error' })
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (id: string) => {
    setSyncingId(id)

    try {
      const res = await api.post<{ success: boolean; rowCount?: number; message?: string; error?: string; lastSyncedAt?: string }>(
        `/sheets/${id}/sync`,
        {}
      )

      if (res.success) {
        setToast({ message: res.message ?? 'Sync complete.', type: 'success' })
        setSheets((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, lastSyncedAt: res.lastSyncedAt ?? new Date().toISOString() }
              : s
          )
        )
      } else {
        setToast({ message: res.error ?? 'Sync failed.', type: 'error' })
      }
    } catch (err: any) {
      setToast({ message: err.message ?? 'Sync failed. Please try again.', type: 'error' })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDisconnect = async (id: string, sheetName: string) => {
    if (!confirm(`Disconnect "${sheetName}"? This will delete the imported data table.`)) return

    try {
      const res = await api.delete<{ success: boolean; message?: string; error?: string }>(
        `/sheets/${id}`
      )

      if (res.success) {
        setToast({ message: res.message ?? 'Sheet disconnected.', type: 'success' })
        await loadSheets()
      } else {
        setToast({ message: res.error ?? 'Failed to disconnect.', type: 'error' })
      }
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to disconnect.', type: 'error' })
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}

      <form onSubmit={handleConnect} className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-1">
          <Link2 className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-semibold text-gray-900">Import from Google Sheets</h3>
        </div>

        <Input
          id="sheet-name"
          label="Sheet Identifier Name"
          placeholder="e.g. Barangay Central Drive - August 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          id="sheet-url"
          label="Google Sheets URL"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={!name.trim() || !url.trim() || connecting}>
            {connecting ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Connecting & Syncing...
              </span>
            ) : (
              'Connect & Sync'
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          Paste a Google Sheets URL. The sheet must be set to &quot;Anyone with the link can view&quot;.
          A Google Sheets API key must be configured on the server.
          Data will be imported into a dynamically created database table.
        </p>
      </form>

      {sheets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Connected Sheets</h3>

          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 shrink-0 text-red-500" />
                  <h4 className="text-sm font-medium text-gray-900 truncate">{sheet.name}</h4>
                  {!sheet.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>{sheet.columnMetadata?.length ?? 0} columns</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last synced: {formatDate(sheet.lastSyncedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="secondary"
                  onClick={() => handleSync(sheet.id)}
                  disabled={syncingId === sheet.id}
                  className="text-xs"
                >
                  {syncingId === sheet.id ? (
                    <span className="flex items-center gap-1">
                      <Spinner size="sm" /> Syncing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Sync Now
                    </span>
                  )}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDisconnect(sheet.id, sheet.name)}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sheets.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <Link2 className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No sheets connected yet. Enter a Google Sheets URL above to get started.
          </p>
        </div>
      )}
    </div>
  )
}
