import { Router, Request, Response } from 'express'
import { query } from '../../db/client'
import { TokenService } from './token.service'
import { SchemaGenerator } from './schema-generator'

export const formIntegrationRouter = Router()

formIntegrationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        error: 'Blood drive name is required.',
      })
      return
    }

    const token = TokenService.generate()
    const tableName = SchemaGenerator.sanitizeTableName(name.trim())

    const existing = await query(
      'SELECT id FROM form_connections WHERE table_name = $1',
      [tableName]
    )
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: `A form with the name "${name}" is already connected. Please choose a different name.`,
      })
      return
    }

    const result = await query(
      `INSERT INTO form_connections (name, token, spreadsheet_id, sheet_url, table_name, column_metadata)
       VALUES ($1, $2, '', '', $3, '[]')
       RETURNING *`,
      [name.trim(), token, tableName]
    )

    const connection = result.rows[0]

    res.status(201).json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        token: connection.token,
        tableName: connection.table_name,
        createdAt: connection.created_at,
      },
      message: `Connection created. Paste the Apps Script template into your Google Form.`,
    })
  } catch (err: any) {
    console.error('Form integration error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to create connection.',
    })
  }
})

formIntegrationRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, token, table_name, column_metadata, active, last_synced_at, created_at
       FROM form_connections
       WHERE spreadsheet_id = '' AND sheet_url = ''
       ORDER BY created_at DESC`
    )

    res.json({
      success: true,
      data: result.rows.map((c) => ({
        id: c.id,
        name: c.name,
        token: c.token,
        tableName: c.table_name,
        columnMetadata: c.column_metadata,
        active: c.active,
        lastSyncedAt: c.last_synced_at,
        createdAt: c.created_at,
      })),
    })
  } catch (err: any) {
    console.error('List forms error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to list connections.',
    })
  }
})

formIntegrationRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)

    const result = await query(
      'SELECT * FROM form_connections WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Connection not found.',
      })
      return
    }

    const connection = result.rows[0]
    await query(`DROP TABLE IF EXISTS "${connection.table_name}"`)
    await query('DELETE FROM form_connections WHERE id = $1', [id])

    res.json({
      success: true,
      message: 'Connection revoked and dynamic table dropped.',
    })
  } catch (err: any) {
    console.error('Delete form error:', err)
    res.status(500).json({
      success: false,
      error: 'Failed to revoke connection.',
    })
  }
})
