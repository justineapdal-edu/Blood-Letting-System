'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'

export function usePortalUrl(): string {
  const [portalUrl, setPortalUrl] = useState(
    process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'
  )

  useEffect(() => {
    api.get<{ portalUrl: string }>('/config')
      .then((res) => setPortalUrl(res.portalUrl))
      .catch(() => {})
  }, [])

  return portalUrl
}
