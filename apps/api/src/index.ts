import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { config } from './config'
import { runMigrations } from './db/migrate'
import { sheetsImportRouter } from './modules/form-integration/sheets-import.controller'
import { formIntegrationRouter } from './modules/form-integration/controller'
import { webhookRouter } from './modules/webhook/controller'
import { dynamicRecordsRouter } from './modules/dynamic-records/controller'

const app = express()

// Dynamic CORS: if allowedOrigins is empty, allow all; otherwise check the list
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin

  if (config.cors.allowedOrigins.length === 0) {
    // Development mode: allow all origins
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    // Production mode: check against allowed list
    if (origin && config.cors.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
})

// Request logging for debugging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
  if (req.method === 'POST' && req.url.includes('/webhook')) {
    console.log(`[WEBHOOK] Body:`, JSON.stringify(req.body, null, 2))
  }
  next()
})

app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({ portalUrl: config.portalUrl })
})

app.get('/api/webhook/test', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is reachable.',
    timestamp: new Date().toISOString(),
    portalUrl: config.portalUrl,
  })
})

app.use('/api/sheets', sheetsImportRouter)
app.use('/api/forms', formIntegrationRouter)
app.use('/api/webhook', webhookRouter)
app.use('/api/records', dynamicRecordsRouter)

async function start() {
  try {
    await runMigrations()
    app.listen(config.port, () => {
      console.log(`API server running on http://localhost:${config.port}`)
      console.log(`Portal URL: ${config.portalUrl}`)
      console.log(`CORS origins: ${config.cors.allowedOrigins.length === 0 ? 'ALL (dev mode)' : config.cors.allowedOrigins.join(', ')}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
