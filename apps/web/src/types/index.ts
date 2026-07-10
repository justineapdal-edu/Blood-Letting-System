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

export const BLOOD_TYPES = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
] as const

export const ELIGIBILITY_STATUSES = [
  { value: 'eligible', label: 'Eligible' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Pending Review' },
] as const
