export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isPhone(value: string): boolean {
  return /^\+?[0-9]{10,13}$/.test(value.replace(/[\s-]/g, ''))
}

export function isRequired(value: string): boolean {
  return value.trim().length > 0
}
