import { createServiceClient, rpc } from '@/lib/supabase'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient()
  try {
    const { id } = await params

    // Get the connection details
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

    // Fetch fresh data from Google Sheets
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY
    if (!apiKey) {
      return Response.json(
        { success: false, error: 'Google Sheets API key not configured' },
        { status: 500 }
      )
    }

    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${connection.spreadsheet_id}/values/A:Z?key=${apiKey}`
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

    // Parse headers (same as connect)
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

    // Drop and recreate table
    await rpc(supabase, 'exec_sql', {
      sql_query: `DROP TABLE IF EXISTS ${connection.table_name}`,
    })

    const createTableSQL = `
      CREATE TABLE ${connection.table_name} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${headers.map((h: string) => `"${h}" TEXT`).join(',\n        ')}
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await rpc(supabase, 'exec_sql', { sql_query: createTableSQL })

    // Insert rows in batches
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

      await supabase.from(connection.table_name).insert(rows)
    }

    // Update connection metadata
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
