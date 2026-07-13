import { createServiceClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'

function generateToken(): string {
  const hex = randomBytes(12).toString('hex')
  return `tok_${hex}`
}

function sanitizeTableName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^(\d)/, 'col_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return `form_${sanitized}`
}

export async function GET() {
  const supabase = createServiceClient()
  try {
    const { data, error } = await supabase
      .from('form_connections')
      .select('*')
      .eq('spreadsheet_id', '')
      .eq('sheet_url', '')
      .order('created_at', { ascending: false })

    if (error) throw error

    const connections = data.map((row) => ({
      id: row.id,
      name: row.name,
      token: row.token,
      tableName: row.table_name,
      active: row.active,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
    }))

    return Response.json({ success: true, data: connections })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to load forms' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const token = generateToken()
    const tableName = sanitizeTableName(name.trim())

    // Check for duplicate table_name
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

    const { data, error } = await supabase
      .from('form_connections')
      .insert({
        name: name.trim(),
        token,
        table_name: tableName,
        spreadsheet_id: '',
        sheet_url: '',
        column_metadata: [],
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        token: data.token,
        tableName: data.table_name,
        active: data.active,
        createdAt: data.created_at,
      },
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Failed to create connection' },
      { status: 500 }
    )
  }
}
