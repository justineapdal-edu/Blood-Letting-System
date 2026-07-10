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
