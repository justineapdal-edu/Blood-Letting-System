export function isValidBloodType(value: string): boolean {
  return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(value)
}

export function isValidEligibilityStatus(value: string): boolean {
  return ['eligible', 'deferred', 'rejected', 'pending'].includes(value)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{10,13}$/.test(value.replace(/[\s-]/g, ''))
}
