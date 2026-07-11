import { Router, Request, Response } from 'express'
import { DynamicRecordsService, DynamicRecordsError } from './service'

export const dynamicRecordsRouter = Router()

function handleError(res: Response, err: unknown) {
  if (err instanceof DynamicRecordsError) {
    res.status(err.statusCode).json({ success: false, error: err.message })
    return
  }
  console.error('Dynamic records error:', err)
  res.status(500).json({ success: false, error: 'Internal server error.' })
}

dynamicRecordsRouter.get('/connections', async (_req: Request, res: Response) => {
  try {
    const connections = await DynamicRecordsService.getConnections()
    res.json({ success: true, data: connections })
  } catch (err) {
    handleError(res, err)
  }
})

dynamicRecordsRouter.get('/:tableName', async (req: Request, res: Response) => {
  try {
    const tableName = String(req.params.tableName)
    const search = (req.query.search as string) ?? undefined
    const sortBy = (req.query.sortBy as string) ?? undefined
    const sortDirection = (req.query.sortDirection as 'asc' | 'desc') ?? 'asc'
    const limit = parseInt(req.query.limit as string) || 200
    const offset = parseInt(req.query.offset as string) || 0

    const result = await DynamicRecordsService.getRecords(tableName, {
      search,
      sortBy,
      sortDirection,
      limit,
      offset,
    })

    res.json({ success: true, data: result })
  } catch (err) {
    handleError(res, err)
  }
})

dynamicRecordsRouter.get('/:tableName/:id', async (req: Request, res: Response) => {
  try {
    const tableName = String(req.params.tableName)
    const id = String(req.params.id)
    const record = await DynamicRecordsService.getRecordById(tableName, id)
    res.json({ success: true, data: record })
  } catch (err) {
    handleError(res, err)
  }
})
