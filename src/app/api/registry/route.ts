import { createServiceClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const search = searchParams.get('search') || ''
  const bloodType = searchParams.get('blood_type') || ''
  const status = searchParams.get('status') || ''
  const sort = searchParams.get('sort') || 'registered_at'
  const dir = searchParams.get('dir') || 'desc'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from('donor_registrations')
      .select(`
        id, full_name, email, blood_type, registered_at, arrived, donation_status, event_id,
        blood_events!inner(id, title, event_date)
      `, { count: 'exact' })

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (bloodType) {
      query = query.eq('blood_type', bloodType)
    }
    if (status) {
      query = query.eq('donation_status', status)
    }

    const sortColumn = sort === 'event_title' ? 'blood_events.title' : sort
    const ascending = dir === 'asc'
    query = query.order(sortColumn, { ascending, referencedTable: sort === 'event_title' ? 'blood_events' : undefined })

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const donors = (data || []).map((d: any) => ({
      id: d.id,
      full_name: d.full_name,
      email: d.email,
      blood_type: d.blood_type,
      registered_at: d.registered_at,
      arrived: d.arrived,
      donation_status: d.donation_status,
      event_id: d.blood_events?.id || d.event_id,
      event_title: d.blood_events?.title || 'Unknown',
      event_date: d.blood_events?.event_date || null,
    }))

    return Response.json({
      success: true,
      data: donors,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load registry'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
