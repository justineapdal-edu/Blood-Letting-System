'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'

export function usePortalUrl(): string {
  const [portalUrl, setPortalUrl] = useState('http://localhost:4000')

  useEffect(() => {
    api.get<{ portalUrl: string }>('/config')
      .then((res) => setPortalUrl(res.portalUrl))
      .catch(() => {})
  }, [])

  return portalUrl
}
