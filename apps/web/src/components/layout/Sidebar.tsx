'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TableProperties,
  Grid3x3,
  Archive,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Droplets,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Form Integration', href: '/forms', icon: TableProperties },
  { label: 'Data Grids', href: '/grids', icon: Grid3x3 },
  { label: 'Master Registry', href: '/registry', icon: Archive },
  { label: 'Settings', href: '/auth', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col border-r border-gray-200 bg-white transition-all ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <Droplets className="h-5 w-5 shrink-0 text-red-600" />
        <span className={`font-bold text-red-600 ${collapsed ? 'hidden' : 'block'}`}>
          Blood Donor Admin
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-red-50 text-red-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-red-600' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
