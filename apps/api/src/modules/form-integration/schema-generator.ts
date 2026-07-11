import { query } from '../../db/client'

export class SchemaGenerator {
  static sanitizeColumnName(header: string): string {
    let name = header
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/[\s]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    if (!name || /^\d/.test(name)) {
      name = `col_${name}`
    }

    return name || 'col_unnamed'
  }

  static sanitizeTableName(name: string): string {
    let sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/[\s]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    return `form_${sanitized || 'unnamed'}`
  }

  static async createTable(
    tableName: string,
    columns: string[]
  ): Promise<void> {
    const columnDefs = columns
      .map((col) => `"${col}" TEXT`)
      .join(', ')

    await query(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${columnDefs},
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  }
}
