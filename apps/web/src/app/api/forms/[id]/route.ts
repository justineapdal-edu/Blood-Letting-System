import { createServiceClient, rpc } from '@/lib/supabase'

export async function DELETE(
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

    // Drop the dynamic table if it exists
    const { error: dropError } = await rpc(supabase, 'exec_sql', {
      sql_query: `DROP TABLE IF EXISTS ${connection.table_name}`,
    })

    if (dropError) {
      console.warn('Failed to drop table:', dropError.message)
    }

    // Delete the connection record
    const { error: deleteError } = await supabase
      .from('form_connections')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return Response.json({
      success: true,
      message: 'Connection revoked and table dropped.',
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to revoke connection' },
      { status: 500 }
    )
  }
}
