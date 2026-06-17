import { Router, type Request, type Response } from 'express'
import { calculateSHI } from '../services/assessmentService.js'
import { saveRecord } from '../services/recordService.js'
import type { SoilData } from '../../shared/types.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const data: SoilData = {
      ph: parseFloat(req.body.ph),
      organicMatter: parseFloat(req.body.organicMatter),
      totalNitrogen: parseFloat(req.body.totalNitrogen),
      availablePhosphorus: parseFloat(req.body.availablePhosphorus),
      availablePotassium: parseFloat(req.body.availablePotassium),
      testDate: req.body.testDate || new Date().toISOString().split('T')[0],
    }

    if (isNaN(data.ph) || isNaN(data.organicMatter) || isNaN(data.totalNitrogen) ||
        isNaN(data.availablePhosphorus) || isNaN(data.availablePotassium)) {
      res.status(400).json({ success: false, error: '参数格式错误' })
      return
    }

    const result = calculateSHI(data)
    const recordId = saveRecord(data, result)

    res.json({ success: true, data: { ...result, recordId } })
  } catch (error) {
    res.status(500).json({ success: false, error: '计算失败' })
  }
})

export default router
