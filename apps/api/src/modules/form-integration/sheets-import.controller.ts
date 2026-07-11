import { Router, Request, Response } from 'express'
import { SheetsImportService, SheetsImportError } from './sheets-import.service'

export const sheetsImportRouter = Router()

function handleError(res: Response, err: unknown) {
  if (err instanceof SheetsImportError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
    return
  }
  console.error('Unexpected error:', err)
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred. Please try again.',
  })
}

sheetsImportRouter.post('/connect', async (req: Request, res: Response) => {
  try {
    const { name, url } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        error: 'Sheet Identifier Name is required.',
      })
      return
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({
        success: false,
        error: 'Google Sheets URL is required.',
      })
      return
    }

    const { connection, rowCount } = await SheetsImportService.connectSheet(name.trim(), url.trim())

    res.status(201).json({
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        spreadsheetId: connection.spreadsheet_id,
        sheetUrl: connection.sheet_url,
        tableName: connection.table_name,
        columnMetadata: connection.column_metadata,
        active: connection.active,
        lastSyncedAt: connection.last_synced_at,
        createdAt: connection.created_at,
      },
      rowCount,
      message: `Successfully connected "${name}" and imported ${rowCount} rows.`,
    })
  } catch (err) {
    handleError(res, err)
  }
})

sheetsImportRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const connections = await SheetsImportService.listConnections()

    res.json({
      success: true,
      data: connections.map((c) => ({
        id: c.id,
        name: c.name,
        spreadsheetId: c.spreadsheet_id,
        sheetUrl: c.sheet_url,
        tableName: c.table_name,
        columnMetadata: c.column_metadata,
        active: c.active,
        lastSyncedAt: c.last_synced_at,
        createdAt: c.created_at,
      })),
    })
  } catch (err) {
    handleError(res, err)
  }
})

sheetsImportRouter.post('/:id/sync', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { rowCount } = await SheetsImportService.syncSheet(id)

    res.json({
      success: true,
      rowCount,
      lastSyncedAt: new Date().toISOString(),
      message: `Sync complete. ${rowCount} rows imported.`,
    })
  } catch (err) {
    handleError(res, err)
  }
})

sheetsImportRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    await SheetsImportService.disconnectSheet(id)

    res.json({
      success: true,
      message: 'Sheet disconnected and dynamic table dropped.',
    })
  } catch (err) {
    handleError(res, err)
  }
})
