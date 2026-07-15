'use client'

import { SheetsImporter } from '@/components/forms/SheetsImporter'

export default function FormsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Form Integration Manager</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import data from Google Sheets to auto-generate database tables.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <div className="max-w-2xl space-y-6">
          <SheetsImporter />
        </div>
      </div>
    </div>
  )
}
