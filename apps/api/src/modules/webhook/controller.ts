import { Router, Request, Response } from 'express'
import { TokenService } from '../form-integration/token.service'
import { PayloadParser } from './payload-parser'
import { Dispatcher } from './dispatcher'

export const webhookRouter = Router()

webhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { token, submittedAt, responses } = req.body

    if (!token || typeof token !== 'string') {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid connection token.',
      })
      return
    }

    const connection = await TokenService.validate(token)
    if (!connection) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired connection token.',
      })
      return
    }

    if (!responses || typeof responses !== 'object' || Object.keys(responses).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No form responses in payload.',
      })
      return
    }

    const parsed = PayloadParser.parse({ token, submittedAt: submittedAt ?? new Date().toISOString(), responses })

    await Dispatcher.dispatch(connection.id, connection.tableName, parsed)

    res.status(201).json({
      success: true,
      message: 'Record saved successfully.',
    })
  } catch (err: any) {
    console.error('Webhook error:', err)
    res.status(500).json({
      success: false,
      error: err.message ?? 'Internal server error processing webhook.',
    })
  }
})
