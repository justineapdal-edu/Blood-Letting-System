export interface FormConnection {
  id: string
  name: string
  token: string
  tableName: string
  createdAt: string
  active: boolean
}

export interface DonorRecord {
  id: string
  formId: string
  data: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface GridColumn {
  key: string
  label: string
  type: 'text' | 'dropdown' | 'number' | 'date'
  options?: { value: string; label: string }[]
  required?: boolean
}

export interface GridSchema {
  formId: string
  tableName: string
  columns: GridColumn[]
}

export interface SheetConnection {
  id: string
  name: string
  spreadsheetId: string
  sheetUrl: string
  tableName: string
  columnMetadata: GridColumn[]
  active: boolean
  lastSyncedAt: string | null
  createdAt: string
}

export interface SheetImportRequest {
  name: string
  url: string
}

export interface SheetImportResponse {
  success: boolean
  data?: SheetConnection
  rowCount?: number
  message?: string
  error?: string
}

export interface SyncResponse {
  success: boolean
  rowCount?: number
  lastSyncedAt?: string
  message?: string
  error?: string
}
