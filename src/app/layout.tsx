import type { ReactNode } from 'react'
import { Geist } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { AuthGuard } from '@/components/auth-guard'
import { LayoutRouter } from '@/components/layout-router'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-gray-50 antialiased">
        <AuthProvider>
          <AuthGuard>
            <LayoutRouter>{children}</LayoutRouter>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
