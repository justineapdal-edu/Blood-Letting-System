import { SchemaGenerator } from '../form-integration/schema-generator'

export interface WebhookPayload {
  token: string
  submittedAt: string
  responses: Record<string, string>
}

export interface ParsedPayload {
  token: string
  submittedAt: string
  columns: string[]
  values: string[]
}

export class PayloadParser {
  static parse(payload: WebhookPayload): ParsedPayload {
    const entries = Object.entries(payload.responses)

    if (entries.length === 0) {
      throw new PayloadParseError('No form responses found in the payload.')
    }

    const columns = entries.map(([question]) =>
      SchemaGenerator.sanitizeColumnName(question)
    )

    const values = entries.map(([, answer]) => answer ?? '')

    return {
      token: payload.token,
      submittedAt: payload.submittedAt,
      columns,
      values,
    }
  }
}

export class PayloadParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PayloadParseError'
  }
}
