'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Spinner, Toast } from '@/components/ui'
import type { CustomFieldSchema, CustomFieldType } from '@/types'
import { Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-react'

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [customFields, setCustomFields] = useState<CustomFieldSchema[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events/${eventId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const event = json.data
      setTitle(event.title)
      setDescription(event.description || '')
      setEventDate(toLocalDatetime(event.event_date))
      setLocation(event.location)
      setCustomFields(event.custom_form_schema || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load event'
      setToast({ type: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  function toLocalDatetime(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function addField() {
    setCustomFields([
      ...customFields,
      { id: generateId(), type: 'text', label: '', description: '', required: false, options: [] },
    ])
  }

  function removeField(index: number) {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  function updateField(index: number, updates: Partial<CustomFieldSchema>) {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...updates }
    setCustomFields(updated)
  }

  function addOption(fieldIndex: number) {
    const field = customFields[fieldIndex]
    const options = field.options || []
    updateField(fieldIndex, {
      options: [...options, { value: `option_${options.length + 1}`, label: '' }],
    })
  }

  function updateOption(fieldIndex: number, optionIndex: number, updates: { value?: string; label?: string }) {
    const field = customFields[fieldIndex]
    const options = [...(field.options || [])]
    options[optionIndex] = { ...options[optionIndex], ...updates }
    updateField(fieldIndex, { options })
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const field = customFields[fieldIndex]
    const options = (field.options || []).filter((_, i) => i !== optionIndex)
    updateField(fieldIndex, { options })
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) newErrors.title = 'Title is required'
    if (!eventDate) newErrors.eventDate = 'Event date is required'
    if (!location.trim()) newErrors.location = 'Location is required'

    customFields.forEach((field, i) => {
      if (!field.label.trim()) {
        newErrors[`field_${i}`] = 'Field label is required'
      }
      if (field.type === 'select' && (!field.options || field.options.length < 2)) {
        newErrors[`field_${i}_options`] = 'Dropdown needs at least 2 options'
      }
      if (field.type === 'select' && field.options) {
        field.options.forEach((opt, oi) => {
          if (!opt.label.trim()) {
            newErrors[`field_${i}_option_${oi}`] = 'Option label is required'
          }
        })
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          event_date: eventDate,
          location: location.trim(),
          custom_form_schema: customFields.filter((f) => f.label.trim()),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setToast({ type: 'success', message: 'Event updated successfully!' })
      setTimeout(() => router.push(`/events/${eventId}`), 1000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update event'
      setToast({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href={`/events/${eventId}`} className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Edit Blood Drive Event</h1>
      <p className="mt-1 text-sm text-gray-500">Update event details and customize the donor registration form.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Event Details</h2>
          <div className="space-y-4">
            <Input
              id="title"
              label="Event Title"
              placeholder="e.g. Barangay Central Blood Drive - August 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              required
            />
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Optional description for the event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="eventDate"
                label="Date & Time"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                error={errors.eventDate}
                required
              />
              <Input
                id="location"
                label="Location"
                placeholder="e.g. Barangay Hall, Room 201"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                error={errors.location}
                required
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Custom Form Fields</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Add extra fields donors will fill out during registration.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={addField}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Field
            </Button>
          </div>

          {customFields.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
              <p className="text-sm text-gray-500">
                No custom fields yet. Only baseline fields (Name, Email, Blood Type) will be shown.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {customFields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="mt-2 h-4 w-4 shrink-0 text-gray-300" />
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-[1fr_160px_100px] gap-3">
                      <Input
                        placeholder="Field label (e.g. Weight)"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        error={errors[`field_${index}`]}
                      />
                      <div>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const type = e.target.value as CustomFieldType
                            const updates: Partial<CustomFieldSchema> = { type }
                            if (type !== 'select') updates.options = []
                            updateField(index, updates)
                          }}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          {FIELD_TYPES.map((ft) => (
                            <option key={ft.value} value={ft.value}>
                              {ft.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        Required
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Optional description or helper text for this field"
                      value={field.description || ''}
                      onChange={(e) => updateField(index, { description: e.target.value || undefined })}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />

                    {field.type === 'select' && (
                      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">OPTIONS</span>
                          <button
                            type="button"
                            onClick={() => addOption(index)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            + Add option
                          </button>
                        </div>
                        {errors[`field_${index}_options`] && (
                          <p className="text-xs text-red-600">{errors[`field_${index}_options`]}</p>
                        )}
                        {(field.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              placeholder="Label"
                              value={opt.label}
                              onChange={(e) => updateOption(index, oi, { label: e.target.value })}
                              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            {errors[`field_${index}_option_${oi}`] && (
                              <p className="text-xs text-red-600">{errors[`field_${index}_option_${oi}`]}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => removeOption(index, oi)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="mt-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link href={`/events/${eventId}`}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="mr-2" /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
