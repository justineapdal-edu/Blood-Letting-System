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

// Blood Event types
export type CustomFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'date'

export interface CustomFieldOption {
  value: string
  label: string
}

export interface CustomFieldSchema {
  id: string
  type: CustomFieldType
  label: string
  description?: string
  required: boolean
  options?: CustomFieldOption[]
}

export interface BloodEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string
  custom_form_schema: CustomFieldSchema[]
  created_at: string
  created_by: string | null
}

export interface BloodEventWithDonorCount extends BloodEvent {
  donor_count: number
}

export type DonationStatus = 'pending' | 'passed' | 'failed'

export const DONATION_STATUS_OPTIONS: { value: DonationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
]

export interface DonorRegistration {
  id: string
  event_id: string
  full_name: string
  email: string
  blood_type: string
  custom_form_responses: Record<string, unknown>
  registered_at: string
  arrived: boolean
  donation_status: DonationStatus
}
