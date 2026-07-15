import { createServiceClient } from '@/lib/supabase'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { CustomFieldSchema } from '@/types'

export async function GET() {
  const supabase = createServiceClient()
  try {
    const { data: events, error } = await supabase
      .from('blood_events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) throw error

    const eventIds = events.map((e) => e.id)
    let donorCounts: Record<string, number> = {}

    if (eventIds.length > 0) {
      const { data: counts } = await supabase
        .from('donor_registrations')
        .select('event_id')
        .in('event_id', eventIds)

      if (counts) {
        for (const row of counts) {
          donorCounts[row.event_id] = (donorCounts[row.event_id] || 0) + 1
        }
      }
    }

    const result = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      location: event.location,
      custom_form_schema: event.custom_form_schema,
      created_at: event.created_at,
      created_by: event.created_by,
      donor_count: donorCounts[event.id] || 0,
    }))

    return Response.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load events'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  try {
    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    const body = await request.json()
    const { title, description, event_date, location, custom_form_schema } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return Response.json({ success: false, error: 'Title is required' }, { status: 400 })
    }
    if (!event_date || isNaN(Date.parse(event_date))) {
      return Response.json({ success: false, error: 'Valid event date is required' }, { status: 400 })
    }
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return Response.json({ success: false, error: 'Location is required' }, { status: 400 })
    }

    const schema: CustomFieldSchema[] = Array.isArray(custom_form_schema) ? custom_form_schema : []

    const { data, error } = await supabase
      .from('blood_events')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        event_date: new Date(event_date).toISOString(),
        location: location.trim(),
        custom_form_schema: schema,
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({
      success: true,
      data: {
        id: data.id,
        title: data.title,
        description: data.description,
        event_date: data.event_date,
        location: data.location,
        custom_form_schema: data.custom_form_schema,
        created_at: data.created_at,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create event'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
