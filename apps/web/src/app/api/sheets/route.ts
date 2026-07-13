import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  try {
    const { data, error } = await supabase
      .from('form_connections')
      .select('*')
      .neq('spreadsheet_id', '')
      .order('created_at', { ascending: false })

    if (error) throw error

    const sheets = data.map((row) => ({
      id: row.id,
      name: row.name,
      spreadsheetId: row.spreadsheet_id,
      sheetUrl: row.sheet_url,
      tableName: row.table_name,
      columnMetadata: row.column_metadata,
      active: row.active,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
    }))

    return Response.json({ success: true, data: sheets })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to load sheets' },
      { status: 500 }
    )
  }
}
