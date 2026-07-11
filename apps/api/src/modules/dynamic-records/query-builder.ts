import { query } from '../../db/client'

export class QueryBuilder {
  static async getTableColumns(tableName: string): Promise<string[]> {
    const result = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       AND column_name NOT IN ('id', 'created_at', 'submitted_at')
       ORDER BY ordinal_position`,
      [tableName]
    )
    return result.rows.map((r) => r.column_name)
  }

  static async tableExists(tableName: string): Promise<boolean> {
    const result = await query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )`,
      [tableName]
    )
    return result.rows[0].exists
  }

  static async selectAll(
    tableName: string,
    options?: {
      search?: string
      searchColumns?: string[]
      sortBy?: string
      sortDirection?: 'asc' | 'desc'
      limit?: number
      offset?: number
    }
  ): Promise<{ rows: any[]; total: number }> {
    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (options?.search && options.searchColumns && options.searchColumns.length > 0) {
      const searchConditions = options.searchColumns.map((col) => {
        values.push(`%${options.search}%`)
        return `"${col}" ILIKE $${paramIndex++}`
      })
      conditions.push(`(${searchConditions.join(' OR ')})`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await query(
      `SELECT COUNT(*) FROM "${tableName}" ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0].count, 10)

    const orderClause = options?.sortBy
      ? `ORDER BY "${options.sortBy}" ${options.sortDirection === 'desc' ? 'DESC' : 'ASC'}`
      : 'ORDER BY created_at DESC'

    const limit = options?.limit ?? 100
    const offset = options?.offset ?? 0

    const dataResult = await query(
      `SELECT * FROM "${tableName}" ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    )

    return { rows: dataResult.rows, total }
  }

  static async selectById(tableName: string, id: string): Promise<any | null> {
    const result = await query(
      `SELECT * FROM "${tableName}" WHERE id = $1`,
      [id]
    )
    return result.rows[0] ?? null
  }
}
