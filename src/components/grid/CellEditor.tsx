'use client'

import { useState, useEffect, useRef, type KeyboardEvent } from 'react'

interface CellEditorProps {
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  type?: 'text' | 'dropdown'
  options?: { value: string; label: string }[]
}

export function CellEditor({ value, onChange, onCommit, onCancel, type = 'text', options }: CellEditorProps) {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
    selectRef.current?.focus()
  }, [])

  const commit = () => {
    onChange(editValue)
    onCommit()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Tab') { e.preventDefault(); commit() }
  }

  if (type === 'dropdown' && options) {
    return (
      <select
        ref={selectRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-red-400 px-2 py-1 text-sm focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="w-full rounded border border-red-400 px-2 py-1 text-sm focus:outline-none"
    />
  )
}
