import { createServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { token, submittedAt, responses } = body

    if (!token || typeof token !== 'string') {
      return Response.json(
        { success: false, error: 'Missing or invalid token' },
        { status: 401 }
      )
    }

    if (!responses || typeof responses !== 'object') {
      return Response.json(
        { success: false, error: 'Missing or invalid responses payload' },
        { status: 400 }
      )
    }

    const { data: connection, error: lookupError } = await supabase
      .from('form_connections')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .single()

    if (lookupError || !connection) {
      return Response.json(
        { success: false, error: 'Invalid or inactive connection token' },
        { status: 404 }
      )
    }

    const tableName = connection.table_name
    const columnNames = Object.keys(responses)

    const { data: tableExists } = await supabase.rpc('check_table_exists', {
      p_table_name: tableName,
    })

    if (!tableExists) {
      const columnsJson = JSON.stringify(columnNames)
      await supabase.rpc('create_donor_table', {
        table_name: tableName,
        columns: columnsJson,
      })

      await supabase
        .from('form_connections')
        .update({ column_metadata: columnNames.map((c) => ({ key: c, label: c, type: 'text' })) })
        .eq('id', connection.id)
    } else {
      const { data: existingColumns } = await supabase.rpc('get_table_columns', {
        p_table_name: tableName,
      })

      if (existingColumns) {
        const existingNames = existingColumns.map((c: { column_name: string }) => c.column_name)
        const newColumns = columnNames.filter((c) => !existingNames.includes(c))

        for (const col of newColumns) {
          await supabase.rpc('exec_sql', {
            sql_query: `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col}" TEXT`,
          })
        }

        if (newColumns.length > 0) {
          const allColumns = [...existingNames, ...newColumns]
          await supabase
            .from('form_connections')
            .update({ column_metadata: allColumns.map((c) => ({ key: c, label: c, type: 'text' })) })
            .eq('id', connection.id)
        }
      }
    }

    const recordData: Record<string, string> = {}
    for (const [key, value] of Object.entries(responses)) {
      recordData[key] = String(value ?? '')
    }

    const { error: insertError } = await supabase.rpc('upsert_donor_record', {
      table_name: tableName,
      record_data: JSON.stringify(recordData),
      submitted_at: submittedAt || new Date().toISOString(),
    })

    if (insertError) {
      throw insertError
    }

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
