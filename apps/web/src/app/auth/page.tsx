'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    } else if (!loading) {
      router.replace('/auth/login')
    }
  }, [user, loading, router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-gray-400">Redirecting…</div>
    </div>
  )
}
