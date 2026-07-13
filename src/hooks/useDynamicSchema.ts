'use client'

import { useState, useEffect } from 'react'

interface SchemaColumn {
  key: string
  label: string
  type: 'text' | 'dropdown'
  options?: { value: string; label: string }[]
}

interface DynamicSchema {
  formId: string
  tableName: string
  columns: SchemaColumn[]
}

export function useDynamicSchema(formId: string) {
  const [schema, setSchema] = useState<DynamicSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/schema/${formId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load schema')
        return res.json()
      })
      .then(setSchema)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [formId])

  return { schema, loading, error }
}
