import { createServiceClient } from '@/lib/supabase'
import type { DonationStatus } from '@/types'

const VALID_STATUSES: DonationStatus[] = ['pending', 'passed', 'failed']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; donorId: string }> }
) {
  const { id: eventId, donorId } = await params
  const supabase = createServiceClient()

  try {
    const { data, error } = await supabase
      .from('donor_registrations')
      .select('*')
      .eq('id', donorId)
      .eq('event_id', eventId)
      .single()

    if (error || !data) {
      return Response.json({ success: false, error: 'Donor registration not found' }, { status: 404 })
    }

    return Response.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch donor'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; donorId: string }> }
) {
  const { id: eventId, donorId } = await params
  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { arrived, donation_status } = body

    const updates: Record<string, unknown> = {}

    if (arrived !== undefined) {
      if (typeof arrived !== 'boolean') {
        return Response.json({ success: false, error: 'arrived must be a boolean' }, { status: 400 })
      }
      updates.arrived = arrived
    }

    if (donation_status !== undefined) {
      if (!VALID_STATUSES.includes(donation_status)) {
        return Response.json({ success: false, error: 'Invalid donation_status' }, { status: 400 })
      }
      updates.donation_status = donation_status
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('donor_registrations')
      .update(updates)
      .eq('id', donorId)
      .eq('event_id', eventId)
      .select('id, arrived, donation_status')
      .single()

    if (error || !data) {
      return Response.json({ success: false, error: 'Donor registration not found' }, { status: 404 })
    }

    return Response.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update donor'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
