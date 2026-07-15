'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const publicPaths = ['/auth/login', '/auth', '/register']

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace('/auth/login')
    }
  }, [user, loading, isPublic, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  if (!user && !isPublic) {
    return null
  }

  return <>{children}</>
}
