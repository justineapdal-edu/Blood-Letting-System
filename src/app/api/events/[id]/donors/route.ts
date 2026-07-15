import { createServiceClient } from '@/lib/supabase'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { CustomFieldSchema } from '@/types'

const BLOOD_TYPE_VALUES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) return false

  entry.count++
  return true
}

function validateCustomResponses(
  responses: Record<string, unknown>,
  schema: CustomFieldSchema[]
): string | null {
  for (const field of schema) {
    const value = responses[field.id]

    if (field.required && (value === undefined || value === null || value === '')) {
      return `Field "${field.label}" is required`
    }

    if (value !== undefined && value !== null && value !== '') {
      switch (field.type) {
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            return `Field "${field.label}" must be a number`
          }
          break
        case 'select':
          if (typeof value !== 'string') {
            return `Field "${field.label}" must be a text value`
          }
          if (field.options && !field.options.some((opt) => opt.value === value)) {
            return `Field "${field.label}" has an invalid option`
          }
          break
        case 'checkbox':
          if (typeof value !== 'boolean') {
            return `Field "${field.label}" must be true or false`
          }
          break
        case 'date':
          if (typeof value !== 'string' || isNaN(Date.parse(value))) {
            return `Field "${field.label}" must be a valid date`
          }
          break
        case 'text':
          if (typeof value !== 'string') {
            return `Field "${field.label}" must be text`
          }
          if (value.length > 500) {
            return `Field "${field.label}" must be 500 characters or less`
          }
          break
      }
    }
  }

  return null
}

function sanitizeCustomResponses(
  responses: Record<string, unknown>,
  schema: CustomFieldSchema[]
): Record<string, unknown> {
  const allowed = new Set(schema.map((f) => f.id))
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(responses)) {
    if (!allowed.has(key)) continue

    if (typeof value === 'string') sanitized[key] = value.slice(0, 500)
    else if (typeof value === 'number') sanitized[key] = Math.min(Math.max(value, 0), 99999)
    else if (typeof value === 'boolean') sanitized[key] = value
  }

  return sanitized
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return Response.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const origin = request.headers.get('origin')
  const normalize = (url: string) => url.replace(/\/+$/, '')
  const allowedOrigins = [process.env.NEXT_PUBLIC_DONOR_PORTAL_URL, process.env.NEXT_PUBLIC_PORTAL_URL]
    .filter((u): u is string => !!u)
    .map(normalize)

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(normalize(origin))) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { full_name, email, blood_type, custom_form_responses = {} } = body

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0 || full_name.length > 255) {
      return Response.json({ success: false, error: 'Valid full name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return Response.json({ success: false, error: 'Valid email is required' }, { status: 400 })
    }
    if (!blood_type || !BLOOD_TYPE_VALUES.includes(blood_type)) {
      return Response.json({ success: false, error: 'Valid blood type is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: event, error: eventError } = await supabase
      .from('blood_events')
      .select('id, custom_form_schema')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return Response.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    const schema: CustomFieldSchema[] = event.custom_form_schema || []
    const validationError = validateCustomResponses(custom_form_responses, schema)
    if (validationError) {
      return Response.json({ success: false, error: validationError }, { status: 400 })
    }

    const sanitizedResponses = sanitizeCustomResponses(custom_form_responses, schema)

    const { data: registration, error: insertError } = await supabase
      .from('donor_registrations')
      .insert({
        event_id: eventId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        blood_type,
        custom_form_responses: sanitizedResponses,
      })
      .select('id, registered_at')
      .single()

    if (insertError) throw insertError

    return Response.json({
      success: true,
      data: {
        id: registration.id,
        registered_at: registration.registered_at,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to register donor'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
