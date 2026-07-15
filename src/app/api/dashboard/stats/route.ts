import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  try {
    const now = new Date().toISOString()

    const [
      eventsResult,
      donorsResult,
      arrivedResult,
      statusResult,
      bloodTypeResult,
      upcomingResult,
      recentResult,
      perEventResult,
    ] = await Promise.all([
      supabase.from('blood_events').select('id, title, description, event_date, location, created_at'),
      supabase.from('donor_registrations').select('id, event_id, full_name, email, blood_type, registered_at, arrived, donation_status'),
      supabase.from('donor_registrations').select('id', { count: 'exact', head: true }).eq('arrived', true),
      supabase.from('donor_registrations').select('donation_status'),
      supabase.from('donor_registrations').select('blood_type'),
      supabase.from('blood_events').select('id, title, event_date, location').gte('event_date', now).order('event_date', { ascending: true }).limit(5),
      supabase.from('donor_registrations').select('id, full_name, email, blood_type, registered_at, arrived, donation_status, event_id').order('registered_at', { ascending: false }).limit(10),
      supabase.from('donor_registrations').select('event_id'),
    ])

    const events = eventsResult.data || []
    const donors = donorsResult.data || []
    const totalEvents = events.length
    const totalDonors = donors.length
    const totalArrived = arrivedResult.count || 0

    const statusCounts = { pending: 0, passed: 0, failed: 0 }
    for (const d of donors) {
      statusCounts[d.donation_status as keyof typeof statusCounts]++
    }

    const bloodTypeCounts: Record<string, number> = {}
    for (const d of donors) {
      bloodTypeCounts[d.blood_type] = (bloodTypeCounts[d.blood_type] || 0) + 1
    }
    const bloodTypeDistribution = Object.entries(bloodTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    const donorCountByEvent: Record<string, number> = {}
    for (const d of perEventResult.data || []) {
      donorCountByEvent[d.event_id] = (donorCountByEvent[d.event_id] || 0) + 1
    }
    const topEvents = events
      .map((e) => ({
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        donor_count: donorCountByEvent[e.id] || 0,
      }))
      .sort((a, b) => b.donor_count - a.donor_count)
      .slice(0, 5)

    const eventMap: Record<string, { title: string; event_date: string; location: string }> = {}
    for (const e of events) {
      eventMap[e.id] = { title: e.title, event_date: e.event_date, location: e.location }
    }
    const recentDonors = (recentResult.data || []).map((d) => ({
      id: d.id,
      full_name: d.full_name,
      email: d.email,
      blood_type: d.blood_type,
      registered_at: d.registered_at,
      arrived: d.arrived,
      donation_status: d.donation_status,
      event_title: eventMap[d.event_id]?.title || 'Unknown Event',
    }))

    const upcoming = (upcomingResult.data || []).map((e) => ({
      id: e.id,
      title: e.title,
      event_date: e.event_date,
      location: e.location,
      donor_count: donorCountByEvent[e.id] || 0,
    }))

    return Response.json({
      success: true,
      data: {
        summary: {
          totalEvents,
          totalDonors,
          totalArrived,
          statusCounts,
        },
        bloodTypeDistribution,
        upcomingEvents: upcoming,
        recentDonors,
        topEvents,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard stats'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
