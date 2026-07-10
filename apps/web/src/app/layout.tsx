import type { ReactNode } from 'react'
import { Geist } from 'next/font/google'
import { Shell } from '@/components/layout/Shell'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-gray-50 antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
