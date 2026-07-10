export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
] as const

export const BLOOD_TYPE_OPTIONS = BLOOD_TYPES.map((v) => ({ value: v, label: v }))

export const ELIGIBILITY_STATUSES = [
  'eligible', 'deferred', 'rejected', 'pending',
] as const

export const ELIGIBILITY_OPTIONS = [
  { value: 'eligible', label: 'Eligible' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Pending Review' },
]

export const TOKEN_PREFIX = 'tok_'
export const TOKEN_LENGTH = 24
