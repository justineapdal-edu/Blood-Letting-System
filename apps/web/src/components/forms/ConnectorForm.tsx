'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

export function ConnectorForm() {
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const generated = `tok_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
    setToken(generated)
    setShowToken(true)
  }

  return (
    <>
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
          <Button type="submit" disabled={!name.trim()}>
            Generate Connection Token
          </Button>
        </div>

        {name && !token && (
          <p className="text-xs text-gray-400">
            A unique connection token will be generated to authorize your Google Apps Script webhook.
          </p>
        )}
      </form>

      <Modal open={showToken} onClose={() => setShowToken(false)} title="Connection Token Created">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Copy this token and paste it into your Google Apps Script template to authorize the webhook connection.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 break-all">
              {token}
            </code>
            <Button
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(token)}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-amber-600 font-medium">
            This token will not be shown again. Store it securely.
          </p>
        </div>
      </Modal>
    </>
  )
}
