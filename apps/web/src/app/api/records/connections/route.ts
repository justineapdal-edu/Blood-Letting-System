import { createServiceClient, rpc } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  try {
    const { data: connections, error } = await supabase
      .from('form_connections')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    // For each connection, get the column information
    const enrichedConnections = await Promise.all(
      connections.map(async (conn) => {
        let columns: { key: string; label: string; type: string }[] = []

        try {
          // Try to get column info from the table
          const { data: columnsData } = await rpc(supabase, 'get_table_columns', {
            p_table_name: conn.table_name,
          })

          if (columnsData) {
            columns = columnsData.map((col: any) => ({
              key: col.column_name,
              label: col.column_name
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c: string) => c.toUpperCase()),
              type: 'text',
            }))
          }
        } catch {
          // Table might not exist yet
        }

        return {
          id: conn.id,
          name: conn.name,
          tableName: conn.table_name,
          columns,
          lastSyncedAt: conn.last_synced_at,
          createdAt: conn.created_at,
        }
      })
    )

    return Response.json({ success: true, data: enrichedConnections })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to load connections' },
      { status: 500 }
    )
  }
}
