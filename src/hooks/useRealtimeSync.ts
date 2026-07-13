'use client'

import { useEffect, useState } from 'react'

interface SyncEvent {
  type: 'new_submission' | 'update' | 'delete'
  formId: string
  payload: Record<string, string>
}

export function useRealtimeSync(formId: string, onEvent?: (event: SyncEvent) => void) {
  const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/sync`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (msg) => {
      try {
        const event: SyncEvent = JSON.parse(msg.data)
        if (event.formId === formId) {
          setLastEvent(event)
          onEvent?.(event)
        }
      } catch {
        // ignore malformed payloads
      }
    }

    return () => ws.close()
  }, [formId, onEvent])

  return { connected, lastEvent }
}
