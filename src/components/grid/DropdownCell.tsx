'use client'

interface DropdownCellProps {
  value: string
  options: { value: string; label: string }[]
}

export function DropdownCell({ value, options }: DropdownCellProps) {
  const option = options.find((o) => o.value === value)
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
      {option?.label ?? value}
    </span>
  )
}
