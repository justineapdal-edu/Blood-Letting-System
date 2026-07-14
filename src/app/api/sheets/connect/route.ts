import { createServiceClient } from '@/lib/supabase'

function sanitizeTableName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^(\d)/, 'col_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return `sheet_${sanitized}`
}

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  try {
    const { name, url } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!url || typeof url !== 'string') {
      return Response.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    const spreadsheetId = extractSpreadsheetId(url)
    if (!spreadsheetId) {
      return Response.json(
        { success: false, error: 'Invalid Google Sheets URL' },
        { status: 400 }
      )
    }

    const tableName = sanitizeTableName(name.trim())

    const { data: existing } = await supabase
      .from('form_connections')
      .select('id')
      .eq('table_name', tableName)
      .single()

    if (existing) {
      return Response.json(
        { success: false, error: 'A connection with this name already exists' },
        { status: 409 }
      )
    }

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY
    if (!apiKey) {
      return Response.json(
        { success: false, error: 'Google Sheets API key not configured' },
        { status: 500 }
      )
    }

    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z?key=${apiKey}`
    const response = await fetch(apiUrl)
    const sheetData = await response.json()

    if (!response.ok) {
      return Response.json(
        { success: false, error: sheetData.error?.message ?? 'Failed to fetch sheet data' },
        { status: 400 }
      )
    }

    const values = sheetData.values
    if (!values || values.length < 2) {
      return Response.json(
        { success: false, error: 'Sheet is empty or has no data rows' },
        { status: 400 }
      )
    }

    const headers = values[0].map((h: string) =>
      h
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^(\d)/, 'col_$1')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    )

    const dataRows = values.slice(1).filter((row: any[]) =>
      row.some((cell: any) => cell !== '')
    )

    const columnDefs = headers.map((h: string) => `"${h}" TEXT`).join(', ')
    const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ${columnDefs}, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL,
    })

    if (createError) {
      return Response.json(
        { success: false, error: `Failed to create table: ${createError.message}` },
        { status: 500 }
      )
    }

    const BATCH_SIZE = 500
    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      const batch = dataRows.slice(i, i + BATCH_SIZE)
      const rows = batch.map((row: any[]) => {
        const record: Record<string, string> = {}
        headers.forEach((header: string, idx: number) => {
          record[header] = row[idx] || ''
        })
        return record
      })

      const { error: insertError } = await supabase.from(tableName).insert(rows)
      if (insertError) {
        throw new Error(`Failed to insert rows: ${insertError.message}`)
      }
    }

    const columnMetadata = headers.map((h: string) => ({
      key: h,
      label: h
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase()),
      type: 'text',
    }))

    const { data: connection, error: connError } = await supabase
      .from('form_connections')
      .insert({
        name: name.trim(),
        spreadsheet_id: spreadsheetId,
        sheet_url: url,
        table_name: tableName,
        column_metadata: columnMetadata,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (connError) throw connError

    return Response.json({
      success: true,
      message: `Sheet connected. ${dataRows.length} rows imported.`,
      data: {
        id: connection.id,
        name: connection.name,
        spreadsheetId: connection.spreadsheet_id,
        sheetUrl: connection.sheet_url,
        tableName: connection.table_name,
        columnMetadata: connection.column_metadata,
        active: connection.active,
        lastSyncedAt: connection.last_synced_at,
        createdAt: connection.created_at,
      },
      rowCount: dataRows.length,
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to connect sheet' },
      { status: 500 }
    )
  }
}
