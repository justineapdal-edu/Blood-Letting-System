'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/ui/Toast'
import { api } from '@/lib/api-client'
import { usePortalUrl } from '@/hooks/usePortalUrl'
import { Copy, Check } from 'lucide-react'
import { buildAppsScript } from '@/lib/apps-script'

export function ConnectorForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const portalUrl = usePortalUrl()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await api.post<{ success: boolean; data?: { token: string }; error?: string }>(
        '/forms',
        { name: name.trim() }
      )

      if (res.success && res.data) {
        setToken(res.data.token)
        setShowToken(true)
        setName('')
        onCreated?.()
      } else {
        setToast({ message: res.error ?? 'Failed to create connection.', type: 'error' })
      }
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to create connection.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyScript = () => {
    const script = buildAppsScript(portalUrl, token)
    navigator.clipboard.writeText(script)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token)
  }

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Input
          id="drive-name"
          label="Blood Drive Name"
          placeholder="e.g. Barangay Central Drive - August 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={!name.trim() || loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Creating...
              </span>
            ) : (
              'Create Connection'
            )}
          </Button>
        </div>

        {!token && !loading && (
          <p className="text-xs text-gray-400">
            Creates a connection token and generates a Google Apps Script template for your form.
          </p>
        )}
      </form>

      <Modal open={showToken} onClose={() => setShowToken(false)} title="Connection Created">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Your connection token has been created. Follow the steps below to link your Google Form.
          </p>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Step 1: Copy your token</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 break-all">
                {token}
              </code>
              <Button variant="secondary" onClick={handleCopyToken}>
                Copy
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Step 2: Copy the Apps Script</p>
            <p className="text-xs text-gray-500 mb-2">
              Open your Google Form → Extensions → Apps Script → Paste this code
            </p>
            <div className="relative">
              <pre className="max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 font-mono whitespace-pre-wrap">
                {buildAppsScript(portalUrl, token)}
              </pre>
              <Button
                variant="secondary"
                className="absolute top-2 right-2 text-xs"
                onClick={handleCopyScript}
              >
                {copiedScript ? (
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Copied</span>
                ) : (
                  <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</span>
                )}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Step 3: Authorize &amp; activate</p>
            <p className="text-xs text-gray-500">
              In Apps Script, select <code className="bg-gray-100 px-1 rounded">setupTrigger</code> from the function dropdown and click <strong>Run</strong>.
              Complete the authorization prompt when it appears. The trigger will be created automatically.
            </p>
          </div>

          <p className="text-xs text-amber-600 font-medium">
            This token will not be shown again. Store it securely.
          </p>
        </div>
      </Modal>
    </>
  )
}
