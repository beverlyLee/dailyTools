import { Router, type Request, type Response } from 'express'
import { getAllRecords, getLatestRecord, getTrackingData } from '../services/recordService.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const records = getAllRecords()
    res.json({ success: true, data: records })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

router.get('/latest', (_req: Request, res: Response): void => {
  try {
    const record = getLatestRecord()
    res.json({ success: true, data: record })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

router.get('/tracking', (_req: Request, res: Response): void => {
  try {
    const data = getTrackingData()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询失败' })
  }
})

export default router
