import { randomBytes } from 'crypto'
import { query } from '../../db/client'

const TOKEN_PREFIX = 'tok_'
const TOKEN_LENGTH = 24

export class TokenService {
  static generate(): string {
    const hex = randomBytes(TOKEN_LENGTH / 2).toString('hex')
    return `${TOKEN_PREFIX}${hex}`
  }

  static async validate(token: string): Promise<{ id: string; tableName: string } | null> {
    if (!token || !token.startsWith(TOKEN_PREFIX)) {
      return null
    }

    const result = await query(
      'SELECT id, table_name FROM form_connections WHERE token = $1 AND active = true',
      [token]
    )

    if (result.rows.length === 0) {
      return null
    }

    return {
      id: result.rows[0].id,
      tableName: result.rows[0].table_name,
    }
  }
}
