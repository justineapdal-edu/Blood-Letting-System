import { query, transaction } from '../../db/client'
import { config } from '../../config'

const SPREADSHEET_ID_REGEX = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/

interface SheetsApiResponse {
  range: string
  majorDimension: string
  values: string[][]
}

export class SheetsImportService {
  static extractSpreadsheetId(url: string): string {
    const match = url.match(SPREADSHEET_ID_REGEX)
    if (!match) {
      throw new SheetsImportError(
        'Invalid Google Sheets URL format. Please provide a valid Google Sheets URL.',
        400
      )
    }
    return match[1]
  }

  static buildApiUrl(spreadsheetId: string): string {
    return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z?key=${config.google.sheetsApiKey}`
  }

  static async fetchSheetData(spreadsheetId: string): Promise<string[][]> {
    if (!config.google.sheetsApiKey) {
      throw new SheetsImportError(
        'Google Sheets API key is not configured. Please set GOOGLE_SHEETS_API_KEY in your environment variables. See: https://console.cloud.google.com/apis/credentials',
        500
      )
    }

    const url = this.buildApiUrl(spreadsheetId)

    let res: Response
    try {
      res = await fetch(url)
    } catch (err) {
      throw new SheetsImportError(
        'Unable to reach Google Sheets API. Please check your network and try again.',
        502
      )
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({})) as any
      const apiMessage = body?.error?.message ?? ''

      if (apiMessage.includes('API key not valid')) {
        throw new SheetsImportError(
          'The Google Sheets API key is invalid. Please check your GOOGLE_SHEETS_API_KEY environment variable.',
          403
        )
      }

      throw new SheetsImportError(
        "Unable to access sheet. Please ensure:\n1. 'Anyone with the link can view' is enabled on the sheet.\n2. Google Sheets API is enabled in your Google Cloud project.",
        403
      )
    }

    if (res.status === 404) {
      throw new SheetsImportError(
        'Spreadsheet not found. Please check the URL and ensure the sheet exists.',
        404
      )
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as any
      const apiMessage = body?.error?.message ?? `HTTP ${res.status}`
      throw new SheetsImportError(
        `Google Sheets API error: ${apiMessage}`,
        res.status
      )
    }

    const data = await res.json() as SheetsApiResponse

    if (!data.values || data.values.length === 0) {
      throw new SheetsImportError(
        'The sheet appears to be empty. Please add data rows before importing.',
        400
      )
    }

    return data.values
  }

  static parseSheetData(values: string[][]): { headers: string[]; rows: string[][] } {
    const headers = values[0]
    const rows = values.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''))

    if (headers.length === 0) {
      throw new SheetsImportError(
        'No column headers found in the sheet. Please ensure the first row contains headers.',
        400
      )
    }

    return { headers, rows }
  }

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

  static sanitizeTableName(identifierName: string): string {
    let name = identifierName
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/[\s]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    return `sheet_${name || 'unnamed'}`
  }

  static async createDynamicTable(
    tableName: string,
    sanitizedColumns: string[]
  ): Promise<void> {
    const columnDefs = sanitizedColumns
      .map((col) => `"${col}" TEXT`)
      .join(', ')

    await query(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${columnDefs},
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  }

  static async batchInsertRows(
    tableName: string,
    sanitizedColumns: string[],
    rows: string[][]
  ): Promise<number> {
    if (rows.length === 0) return 0

    const BATCH_SIZE = 500
    let totalInserted = 0

    await transaction(async (client) => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const placeholders: string[] = []
        const values: any[] = []
        let paramIndex = 1

        for (const row of batch) {
          const rowPlaceholders = sanitizedColumns
            .map(() => `$${paramIndex++}`)
            .join(', ')
          placeholders.push(`(${rowPlaceholders})`)

          for (let j = 0; j < sanitizedColumns.length; j++) {
            values.push(row[j] ?? null)
          }
        }

        const insertQuery = `
          INSERT INTO "${tableName}" (${sanitizedColumns.map((c) => `"${c}"`).join(', ')})
          VALUES ${placeholders.join(', ')}
        `

        const result = await client.query(insertQuery, values)
        totalInserted += result.rowCount ?? 0
      }
    })

    return totalInserted
  }

  static async connectSheet(
    name: string,
    url: string
  ) {
    const spreadsheetId = this.extractSpreadsheetId(url)
    const values = await this.fetchSheetData(spreadsheetId)
    const { headers, rows } = this.parseSheetData(values)

    const sanitizedColumns = headers.map((h) => this.sanitizeColumnName(h))
    const tableName = this.sanitizeTableName(name)

    const existing = await query(
      'SELECT id FROM form_connections WHERE table_name = $1',
      [tableName]
    )
    if (existing.rows.length > 0) {
      throw new SheetsImportError(
        `A sheet with the name "${name}" is already connected. Please choose a different name.`,
        409
      )
    }

    await this.createDynamicTable(tableName, sanitizedColumns)
    await this.batchInsertRows(tableName, sanitizedColumns, rows)

    const columnMetadata = headers.map((h, i) => ({
      key: sanitizedColumns[i],
      label: h,
      type: 'text' as const,
    }))

    const result = await query(
      `INSERT INTO form_connections (name, spreadsheet_id, sheet_url, table_name, column_metadata, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, spreadsheetId, url, tableName, JSON.stringify(columnMetadata)]
    )

    return { connection: result.rows[0], rowCount: rows.length }
  }

  static async listConnections() {
    const result = await query(
      'SELECT * FROM form_connections ORDER BY created_at DESC'
    )
    return result.rows
  }

  static async syncSheet(connectionId: string) {
    const result = await query(
      'SELECT * FROM form_connections WHERE id = $1 AND active = true',
      [connectionId]
    )

    if (result.rows.length === 0) {
      throw new SheetsImportError(
        'Connected sheet not found or has been deactivated.',
        404
      )
    }

    const connection = result.rows[0]
    const values = await this.fetchSheetData(connection.spreadsheet_id)
    const { headers, rows } = this.parseSheetData(values)

    const sanitizedColumns = headers.map((h) => this.sanitizeColumnName(h))
    const tableName = connection.table_name

    await transaction(async (client) => {
      await client.query(`TRUNCATE "${tableName}"`)

      const columnDefs = sanitizedColumns.map((col) => `"${col}" TEXT`).join(', ')
      await client.query(`DROP TABLE IF EXISTS "${tableName}"`)
      await client.query(`
        CREATE TABLE "${tableName}" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ${columnDefs},
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)

      const BATCH_SIZE = 500
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const placeholders: string[] = []
        const values: any[] = []
        let paramIndex = 1

        for (const row of batch) {
          const rowPlaceholders = sanitizedColumns
            .map(() => `$${paramIndex++}`)
            .join(', ')
          placeholders.push(`(${rowPlaceholders})`)
          for (let j = 0; j < sanitizedColumns.length; j++) {
            values.push(row[j] ?? null)
          }
        }

        await client.query(
          `INSERT INTO "${tableName}" (${sanitizedColumns.map((c) => `"${c}"`).join(', ')})
           VALUES ${placeholders.join(', ')}`,
          values
        )
      }
    })

    const columnMetadata = headers.map((h, i) => ({
      key: sanitizedColumns[i],
      label: h,
      type: 'text' as const,
    }))

    await query(
      `UPDATE form_connections
       SET column_metadata = $1, last_synced_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(columnMetadata), connectionId]
    )

    return { rowCount: rows.length }
  }

  static async disconnectSheet(connectionId: string) {
    const result = await query(
      'SELECT * FROM form_connections WHERE id = $1',
      [connectionId]
    )

    if (result.rows.length === 0) {
      throw new SheetsImportError('Connected sheet not found.', 404)
    }

    const connection = result.rows[0]
    await query(`DROP TABLE IF EXISTS "${connection.table_name}"`)
    await query('DELETE FROM form_connections WHERE id = $1', [connectionId])
  }
}

export class SheetsImportError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'SheetsImportError'
  }
}
