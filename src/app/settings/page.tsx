'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui'
import { User, Globe, Info, Copy, Check } from 'lucide-react'

interface Config {
  portalUrl: string
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [config, setConfig] = useState<Config | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {})
  }, [])

  function copyPortalUrl() {
    if (!config?.portalUrl) return
    navigator.clipboard.writeText(config.portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and system configuration.</p>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <div className="space-y-8">
          {/* Profile */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.email || 'Not set'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Portal Configuration */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-gray-900">Portal Configuration</h2>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <label className="block text-xs font-medium text-gray-500">Donor Portal URL</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800">
                  {config?.portalUrl || 'Loading...'}
                </code>
                <button
                  onClick={copyPortalUrl}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                This is the base URL used for public donor registration links.
              </p>
            </div>
          </section>

          {/* System Info */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-gray-900">System Information</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Application</span>
                <span className="text-sm font-medium text-gray-900">Blood Donor Admin</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Framework</span>
                <span className="text-sm font-medium text-gray-900">Next.js 16</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Database</span>
                <span className="text-sm font-medium text-gray-900">Supabase PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Environment</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
