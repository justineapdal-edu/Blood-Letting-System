'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Shell } from './layout/Shell'

const authPages = ['/auth/login', '/auth/signup', '/auth']

export function LayoutRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = authPages.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isAuthPage) {
    return <>{children}</>
  }

  return <Shell>{children}</Shell>
}
