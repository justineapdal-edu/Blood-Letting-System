import { query } from '../../db/client'
import { SchemaGenerator } from '../form-integration/schema-generator'
import type { ParsedPayload } from './payload-parser'

export class Dispatcher {
  static async dispatch(
    connectionId: string,
    tableName: string,
    parsed: ParsedPayload
  ): Promise<void> {
    const tableExists = await query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )`,
      [tableName]
    )

    if (!tableExists.rows[0].exists) {
      await SchemaGenerator.createTable(tableName, parsed.columns)
    }

    const placeholders = parsed.columns.map((_, i) => `$${i + 1}`).join(', ')
    const columnList = parsed.columns.map((c) => `"${c}"`).join(', ')

    await query(
      `INSERT INTO "${tableName}" (${columnList}, submitted_at)
       VALUES (${placeholders}, $${parsed.columns.length + 1})`,
      [...parsed.values, parsed.submittedAt]
    )

    await query(
      `UPDATE form_connections
       SET last_synced_at = NOW()
       WHERE id = $1`,
      [connectionId]
    )
  }
}
