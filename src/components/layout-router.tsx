'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Shell } from './layout/Shell'

const publicPages = ['/auth/login', '/auth/signup', '/auth', '/register']

export function LayoutRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = publicPages.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isPublicPage) {
    return <>{children}</>
  }

  return <Shell>{children}</Shell>
}
