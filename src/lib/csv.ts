export function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    const next = csv[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field)
        field = ''
      } else if (ch === '\r' && next === '\n') {
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
      } else if (ch === '\n') {
        current.push(field)
        field = ''
        rows.push(current)
        current = []
      } else {
        field += ch
      }
    }
  }

  if (field || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  return rows
}

export function sanitizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^(\d)/, 'col_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function deduplicateHeaders(headers: string[]): string[] {
  const seen: Record<string, number> = {}
  return headers.map((h) => {
    const base = h || 'column'
    if (seen[base]) {
      seen[base]++
      return `${base}_${seen[base]}`
    }
    seen[base] = 1
    return base
  })
}
