import { QueryBuilder } from './query-builder'
import { query } from '../../db/client'

export class DynamicRecordsService {
  static async getRecords(
    tableName: string,
    options?: {
      search?: string
      sortBy?: string
      sortDirection?: 'asc' | 'desc'
      limit?: number
      offset?: number
    }
  ) {
    const exists = await QueryBuilder.tableExists(tableName)
    if (!exists) {
      throw new DynamicRecordsError(`Table "${tableName}" does not exist.`, 404)
    }

    const columns = await QueryBuilder.getTableColumns(tableName)
    const searchColumns = columns.filter((col) => !['id', 'created_at', 'submitted_at'].includes(col))

    const { rows, total } = await QueryBuilder.selectAll(tableName, {
      ...options,
      searchColumns: options?.search ? searchColumns : undefined,
    })

    return {
      records: rows.map((row) => ({
        id: row.id,
        data: Object.fromEntries(
          Object.entries(row).filter(([k]) => !['id', 'created_at', 'submitted_at'].includes(k))
        ),
        submittedAt: row.submitted_at ?? null,
        createdAt: row.created_at,
      })),
      columns: searchColumns,
      total,
    }
  }

  static async getRecordById(tableName: string, id: string) {
    const exists = await QueryBuilder.tableExists(tableName)
    if (!exists) {
      throw new DynamicRecordsError(`Table "${tableName}" does not exist.`, 404)
    }

    const row = await QueryBuilder.selectById(tableName, id)
    if (!row) {
      throw new DynamicRecordsError('Record not found.', 404)
    }

    return {
      id: row.id,
      data: Object.fromEntries(
        Object.entries(row).filter(([k]) => !['id', 'created_at', 'submitted_at'].includes(k))
      ),
      submittedAt: row.submitted_at ?? null,
      createdAt: row.created_at,
    }
  }

  static async getConnections() {
    const result = await query(
      `SELECT id, name, table_name, column_metadata, last_synced_at, created_at
       FROM form_connections
       WHERE active = true
       ORDER BY created_at DESC`
    )

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      tableName: row.table_name,
      columns: row.column_metadata,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
    }))
  }
}

export class DynamicRecordsError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'DynamicRecordsError'
  }
}
