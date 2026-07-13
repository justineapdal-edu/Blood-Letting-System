'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConnectorForm } from '@/components/forms/ConnectorForm'
import { SheetsImporter } from '@/components/forms/SheetsImporter'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Toast } from '@/components/ui/Toast'
import { api } from '@/lib/api-client'
import { buildAppsScript } from '@/lib/apps-script'
import { usePortalUrl } from '@/hooks/usePortalUrl'
import { Trash2, Link2, Clock, Copy, Check, Code } from 'lucide-react'

interface ConnectedForm {
  id: string
  name: string
  token: string
  tableName: string
  active: boolean
  lastSyncedAt: string | null
  createdAt: string
}

const tabs = [
  { id: 'webhook', label: 'Webhook Integration' },
  { id: 'sheets', label: 'Google Sheets Import' },
] as const

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState<'webhook' | 'sheets'>('webhook')
  const [forms, setForms] = useState<ConnectedForm[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [scriptModal, setScriptModal] = useState<ConnectedForm | null>(null)
  const [copiedScript, setCopiedScript] = useState(false)

  const portalUrl = usePortalUrl()

  const loadForms = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: ConnectedForm[] }>('/forms')
      if (res.success) {
        setForms(res.data)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadForms()
  }, [loadForms])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke connection "${name}"? This will delete the dynamic table.`)) return

    try {
      const res = await api.delete<{ success: boolean; message?: string; error?: string }>(`/forms/${id}`)
      if (res.success) {
        setToast({ message: res.message ?? 'Connection revoked.', type: 'success' })
        await loadForms()
      } else {
        setToast({ message: res.error ?? 'Failed to revoke.', type: 'error' })
      }
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to revoke.', type: 'error' })
    }
  }

  const handleCopyToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyScript = () => {
    if (!scriptModal) return
    navigator.clipboard.writeText(buildAppsScript(portalUrl, scriptModal.token))
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Form Integration Manager</h1>
      <p className="mt-2 mb-6 text-gray-600">
        Connect external data sources to auto-generate database tables and manage records.
      </p>

      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-red-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'webhook' && (
        <div className="space-y-6">
          <ConnectorForm onCreated={loadForms} />

          {forms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Connected Forms</h3>
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 shrink-0 text-red-500" />
                      <h4 className="text-sm font-medium text-gray-900 truncate">{form.name}</h4>
                      {!form.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-mono">{form.token?.slice(0, 12)}...{form.token?.slice(-4)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(form.lastSyncedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setScriptModal(form)
                        setCopiedScript(false)
                      }}
                      className="text-xs"
                    >
                      <span className="flex items-center gap-1"><Code className="h-3 w-3" /> View Script</span>
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopyToken(form.id, form.token)}
                      className="text-xs"
                    >
                      {copiedId === form.id ? (
                        <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Copied</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> Token</span>
                      )}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(form.id, form.name)}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {forms.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <Link2 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No forms connected yet. Create a connection above to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sheets' && <SheetsImporter />}

      <Modal
        open={!!scriptModal}
        onClose={() => setScriptModal(null)}
        title={`Apps Script — ${scriptModal?.name ?? ''}`}
      >
        {scriptModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Copy this script and paste it into your Google Form&apos;s Apps Script editor.
            </p>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Your Token</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 break-all">
                  {scriptModal.token}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(scriptModal.token ?? '')}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Apps Script Template</p>
              <p className="text-xs text-gray-500 mb-2">
                Google Form → Extensions → Apps Script → Paste this code
              </p>
              <div className="relative">
                <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 font-mono whitespace-pre-wrap">
                  {buildAppsScript(portalUrl, scriptModal.token ?? '')}
                </pre>
                <Button
                  variant="secondary"
                  className="absolute top-2 right-2 text-xs"
                  onClick={handleCopyScript}
                >
                  {copiedScript ? (
                    <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Copied</span>
                  ) : (
                    <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> Copy Script</span>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Step 3: Set up the trigger</p>
              <p className="text-xs text-gray-500">
                In Apps Script: Edit → Current project&apos;s triggers → Add trigger →
                Function: <code className="bg-gray-100 px-1 rounded">onSubmit</code>,
                Event: <code className="bg-gray-100 px-1 rounded">On form submit</code>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
