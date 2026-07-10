'use client'

import { useState, useRef, useEffect } from 'react'

interface DropdownProps {
  label?: string
  options: { value: string; label: string }[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}

export function Dropdown({ label, options, value, onChange, placeholder = 'Select...', error }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="space-y-1" ref={ref}>
      {label && <p className="block text-sm font-medium text-gray-700">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${selected ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span className="ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-[var(--dropdown-width)] overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-red-50 ${
                value === opt.value ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
