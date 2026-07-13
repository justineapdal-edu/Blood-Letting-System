'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, type, onDismiss, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }

  const Icon = type === 'success' ? CheckCircle : AlertCircle

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 shadow-sm ${styles[type]}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onDismiss} className="shrink-0 text-current opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
