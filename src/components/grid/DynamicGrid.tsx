'use client'

import { useState, useCallback } from 'react'
import { navigateCell, type CellPosition } from './KeyboardNav'

interface Column {
  key: string
  label: string
  type?: 'text' | 'dropdown'
  options?: { value: string; label: string }[]
}

interface DynamicGridProps {
  formId: string
}

const MOCK_COLUMNS: Column[] = [
  { key: 'name', label: 'Full Name' },
  { key: 'age', label: 'Age' },
  { key: 'blood_type', label: 'Blood Type', type: 'dropdown', options: [
    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
  ]},
  { key: 'status', label: 'Eligibility Status', type: 'dropdown', options: [
    { value: 'eligible', label: 'Eligible' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'rejected', label: 'Rejected' },
  ]},
]

export function DynamicGrid({ formId }: DynamicGridProps) {
  const [active, setActive] = useState<CellPosition | null>(null)
  const [rows, setRows] = useState<Record<string, string>[]>([])

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, {}])
  }, [])

  const updateCell = useCallback((rowIdx: number, colKey: string, value: string) => {
    setRows((prev) => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [colKey]: value }
      return next
    })
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!active) return
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault()
      const next = navigateCell(active, { rows: rows.length, cols: MOCK_COLUMNS.length }, e.key)
      setActive(next)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto" onKeyDown={handleKeyDown} tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 px-3 py-2 text-xs font-medium text-gray-500">#</th>
              {MOCK_COLUMNS.map((col) => (
                <th key={col.key} className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-gray-100 transition-colors ${
                  active?.row === rowIdx ? 'bg-red-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-3 py-2 text-xs text-gray-400">{rowIdx + 1}</td>
                {MOCK_COLUMNS.map((col, colIdx) => {
                  const isActive = active?.row === rowIdx && active?.col === colIdx
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 cursor-pointer ${
                        isActive ? 'ring-2 ring-red-500 ring-inset' : ''
                      }`}
                      onClick={() => setActive({ row: rowIdx, col: colIdx })}
                    >
                      {row[col.key] || <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-3">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
        >
          + Add Row
        </button>
        <span className="text-xs text-gray-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
