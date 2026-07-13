import { type NextRequest } from 'next/server'
import { createServiceClient, rpc } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  const supabase = createServiceClient()
  try {
    const { tableName } = await params
    const searchParams = request.nextUrl.searchParams

    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortDirection = searchParams.get('sortDirection') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate table exists
    const { data: tableExists } = await rpc(supabase, 'check_table_exists', {
      p_table_name: tableName,
    })

    if (!tableExists) {
      return Response.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      )
    }

    // Get column names (excluding system columns)
    const { data: columnsData } = await rpc(supabase, 'get_table_columns', {
      p_table_name: tableName,
    })

    const systemColumns = ['id', 'created_at', 'submitted_at']
    const columns = columnsData
      ? columnsData
          .map((col: any) => col.column_name)
          .filter((col: string) => !systemColumns.includes(col))
      : []

    // Build query
    let query = supabase.from(tableName).select('*', { count: 'exact' })

    // Apply search (ILIKE across all columns)
    if (search) {
      const searchConditions = columns.map((col: string) => `${col}.ilike.%${search}%`)
      query = query.or(searchConditions.join(','))
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortDirection === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rows, error, count } = await query

    if (error) throw error

    // Format records to match the expected structure
    const records = (rows || []).map((row: any) => ({
      id: row.id,
      data: Object.fromEntries(
        Object.entries(row).filter(
          ([key]) => !['id', 'created_at', 'submitted_at'].includes(key)
        )
      ),
      submittedAt: row.submitted_at || null,
      createdAt: row.created_at,
    }))

    return Response.json({
      success: true,
      data: {
        records,
        columns,
        total: count || 0,
      },
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to fetch records' },
      { status: 500 }
    )
  }
}
