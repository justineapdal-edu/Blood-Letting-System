'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button, Spinner } from '@/components/ui'
import { BLOOD_TYPES } from '@/types'
import type { BloodEvent, CustomFieldSchema } from '@/types'
import { Heart, CalendarDays, MapPin, CheckCircle, Download } from 'lucide-react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

export default function RegisterPage() {
  const params = useParams()
  const eventId = params.event_id as string
  const [event, setEvent] = useState<BloodEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [customResponses, setCustomResponses] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [donorId, setDonorId] = useState<string | null>(null)
  const hiddenQrRef = useRef<HTMLDivElement>(null)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events/${eventId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEvent(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Event not found')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function updateCustomResponse(fieldId: string, value: unknown) {
    setCustomResponses((prev) => ({ ...prev, [fieldId]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!fullName.trim()) errors.full_name = 'Full name is required'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email is required'
    if (!bloodType) errors.blood_type = 'Blood type is required'

    const schema: CustomFieldSchema[] = event?.custom_form_schema || []
    for (const field of schema) {
      const value = customResponses[field.id]
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.id] = `${field.label} is required`
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/events/${eventId}/donors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          blood_type: bloodType,
          custom_form_responses: customResponses,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDonorId(json.data.id)
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  function renderCustomField(field: CustomFieldSchema) {
    const value = customResponses[field.id]
    const fieldError = fieldErrors[field.id]

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.description && <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>}
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => updateCustomResponse(field.id, e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
          </div>
        )

      case 'number':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.description && <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>}
            <input
              type="number"
              value={value !== undefined ? String(value) : ''}
              onChange={(e) => {
                const num = e.target.value === '' ? undefined : Number(e.target.value)
                updateCustomResponse(field.id, num)
              }}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
          </div>
        )

      case 'select':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.description && <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>}
            <select
              value={(value as string) || ''}
              onChange={(e) => updateCustomResponse(field.id, e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id}>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => updateCustomResponse(field.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </span>
            </label>
            {field.description && <p className="mt-1 text-xs text-gray-500 ml-7">{field.description}</p>}
            {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
          </div>
        )

      case 'date':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.description && <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>}
            <input
              type="date"
              value={(value as string) || ''}
              onChange={(e) => updateCustomResponse(field.id, e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
          </div>
        )

      default:
        return null
    }
  }

  async function downloadQR() {
    if (!event || !donorId) return

    const fontLoaded = await document.fonts.load('16px Geist').catch(() => false)
    const fontFamily = fontLoaded ? 'Geist, sans-serif' : 'sans-serif'

    const W = 480
    const H = 620
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)

    const cardX = 16, cardY = 16, cardW = W - 32, cardH = H - 32

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, cardX, cardY, cardW, cardH, 12)
    ctx.fill()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    roundRect(ctx, cardX, cardY, cardW, cardH, 12)
    ctx.stroke()

    let y = cardY + 28

    ctx.fillStyle = '#111827'
    ctx.font = `bold 18px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(event.title, W / 2, y)
    y += 30

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + 24, y)
    ctx.lineTo(cardX + cardW - 24, y)
    ctx.stroke()
    y += 16

    const qrSize = 200
    const qrX = (W - qrSize) / 2
    const hiddenCanvas = hiddenQrRef.current?.querySelector('canvas')
    if (hiddenCanvas) {
      ctx.drawImage(hiddenCanvas, qrX, y, qrSize, qrSize)
    }
    y += qrSize + 12

    ctx.fillStyle = '#6b7280'
    ctx.font = `11px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.fillText('Present this QR code at the event for check-in', W / 2, y)
    y += 22

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + 24, y)
    ctx.lineTo(cardX + cardW - 24, y)
    ctx.stroke()
    y += 16

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const leftCol = cardX + 32
    const rightCol = W / 2 + 8
    const labelFont = `10px ${fontFamily}`
    const valueFont = `12px ${fontFamily}`

    ctx.fillStyle = '#9ca3af'
    ctx.font = labelFont
    ctx.fillText('EVENT DATE', leftCol, y)
    ctx.fillStyle = '#111827'
    ctx.font = valueFont
    ctx.fillText(new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), leftCol, y + 14)

    ctx.fillStyle = '#9ca3af'
    ctx.font = labelFont
    ctx.fillText('LOCATION', rightCol, y)
    ctx.fillStyle = '#111827'
    ctx.font = valueFont
    const locText = event.location.length > 20 ? event.location.slice(0, 20) + '...' : event.location
    ctx.fillText(locText, rightCol, y + 14)
    y += 34

    ctx.fillStyle = '#9ca3af'
    ctx.font = labelFont
    ctx.fillText('DONOR NAME', leftCol, y)
    ctx.fillStyle = '#111827'
    ctx.font = valueFont
    ctx.fillText(fullName.trim(), leftCol, y + 14)

    ctx.fillStyle = '#9ca3af'
    ctx.font = labelFont
    ctx.fillText('BLOOD TYPE', rightCol, y)
    ctx.fillStyle = '#111827'
    ctx.font = valueFont
    ctx.fillText(bloodType, rightCol, y + 14)
    y += 34

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(leftCol, y)
    ctx.lineTo(cardX + cardW - 32, y)
    ctx.stroke()
    y += 10

    ctx.fillStyle = '#9ca3af'
    ctx.font = `9px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.fillText(`Registration ID: ${donorId}`, W / 2, y)

    const link = document.createElement('a')
    link.download = `blood-drive-ticket-${fullName.trim().replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6">
        <div className="w-full max-w-md text-center">
          <Heart className="mx-auto h-10 w-10 text-red-300" />
          <h1 className="mt-4 text-lg font-bold text-gray-900 sm:text-xl">Event Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">{error || 'This event does not exist or has been removed.'}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6">
        <div className="w-full max-w-md text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-green-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">Thank You!</h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Your registration for <span className="font-semibold">{event.title}</span> has been received.
          </p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            We look forward to seeing you at {event.location} on {formatDate(event.event_date)}.
          </p>

          {donorId && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <p className="mb-3 text-sm font-medium text-gray-700">Your Registration Ticket</p>
              <div className="inline-block rounded-lg border border-gray-100 bg-white p-2 shadow-inner">
                <QRCodeSVG
                  value={donorId}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#1f2937"
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div ref={hiddenQrRef} className="sr-only">
                <QRCodeCanvas
                  value={donorId}
                  size={440}
                  bgColor="#ffffff"
                  fgColor="#1f2937"
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="mt-3 text-xs text-gray-400">Scan this QR code at the event for quick check-in</p>
              <Button
                variant="secondary"
                onClick={downloadQR}
                className="mt-4 w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Ticket
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6 text-center">
            <Heart className="mx-auto h-8 w-8 text-red-600" />
            <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">{event.title}</h1>
            {event.description && (
              <p className="mt-1 text-sm text-gray-500">{event.description}</p>
            )}
            <div className="mt-3 flex flex-col items-center gap-1 text-sm text-gray-500 sm:flex-row sm:justify-center sm:gap-4">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                {formatDate(event.event_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {event.location}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.full_name; return n }) }}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Juan dela Cruz"
              />
              {fieldErrors.full_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.email; return n }) }}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="juan@example.com"
              />
              {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Blood Type <span className="text-red-500">*</span>
              </label>
              <select
                value={bloodType}
                onChange={(e) => { setBloodType(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.blood_type; return n }) }}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  fieldErrors.blood_type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select blood type...</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </select>
              {fieldErrors.blood_type && <p className="mt-1 text-sm text-red-600">{fieldErrors.blood_type}</p>}
            </div>

            {event.custom_form_schema && event.custom_form_schema.length > 0 && (
              <>
                <hr className="border-gray-200" />
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Additional Information</h3>
                  {event.custom_form_schema.map((field) => renderCustomField(field))}
                </div>
              </>
            )}
          </div>

          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="mt-6 w-full py-2.5">
            {submitting ? <Spinner size="sm" className="mr-2" /> : null}
            {submitting ? 'Submitting...' : 'Register as Donor'}
          </Button>
        </form>
      </div>
    </div>
  )
}
