import { createServiceClient } from '@/lib/supabase'
import type { CustomFieldSchema } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const { data: event, error: eventError } = await supabase
      .from('blood_events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return Response.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    const { data: donors, error: donorsError } = await supabase
      .from('donor_registrations')
      .select('*')
      .eq('event_id', id)
      .order('registered_at', { ascending: false })

    if (donorsError) throw donorsError

    return Response.json({
      success: true,
      data: {
        ...event,
        donors: donors || [],
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load event'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
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
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        event_date: new Date(event_date).toISOString(),
        location: location.trim(),
        custom_form_schema: schema,
      })
      .eq('id', id)
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
    const message = error instanceof Error ? error.message : 'Failed to update event'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const { error } = await supabase
      .from('blood_events')
      .delete()
      .eq('id', id)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete event'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
