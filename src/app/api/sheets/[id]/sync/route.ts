import { createServiceClient } from '@/lib/supabase'
import { parseCsv, sanitizeHeader, deduplicateHeaders } from '@/lib/csv'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient()
  try {
    const { id } = await params

    const { data: connection, error: fetchError } = await supabase
      .from('form_connections')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !connection) {
      return Response.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      )
    }

    if (!connection.spreadsheet_id) {
      return Response.json(
        { success: false, error: 'Not a sheets connection' },
        { status: 400 }
      )
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${connection.spreadsheet_id}/export?format=csv`
    const response = await fetch(csvUrl)

    if (!response.ok) {
      return Response.json(
        { success: false, error: 'Failed to fetch sheet. Make sure the sheet is still shared as "Anyone with the link can view".' },
        { status: 400 }
      )
    }

    const csv = await response.text()
    const rows = parseCsv(csv)

    if (rows.length < 2) {
      return Response.json(
        { success: false, error: 'Sheet is empty or has no data rows' },
        { status: 400 }
      )
    }

    const headers = deduplicateHeaders(rows[0].map(sanitizeHeader))
    const dataRows = rows.slice(1).filter((row) =>
      row.some((cell) => cell.trim() !== '')
    )

    const tableName = connection.table_name

    await supabase.rpc('exec_sql', {
      sql_query: `DROP TABLE IF EXISTS "${tableName}"`,
    })

    const columnDefs = headers.map((h: string) => `"${h}" TEXT`).join(', ')
    const createTableSQL = `CREATE TABLE "${tableName}" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ${columnDefs}, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL,
    })

    if (createError) {
      throw new Error(`Failed to recreate table: ${createError.message}`)
    }

    const BATCH_SIZE = 500
    for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
      const batch = dataRows.slice(i, i + BATCH_SIZE)
      const records = batch.map((row) => {
        const record: Record<string, string> = {}
        headers.forEach((header: string, idx: number) => {
          record[header] = row[idx] || ''
        })
        return record
      })

      const { error: insertError } = await supabase.from(tableName).insert(records)
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

    const { error: updateError } = await supabase
      .from('form_connections')
      .update({
        column_metadata: columnMetadata,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) throw updateError

    return Response.json({
      success: true,
      message: `Sync complete. ${dataRows.length} rows imported.`,
      rowCount: dataRows.length,
      lastSyncedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to sync sheet' },
      { status: 500 }
    )
  }
}
