import { Router, type Request, type Response } from 'express'
import { calculateFCR, type FCRCalculationRequest } from '../services/fcrService.js'

const router = Router()

router.post('/calculate', (req: Request, res: Response): void => {
  try {
    const data = req.body as FCRCalculationRequest
    
    if (!data.totalFeedAmount || !data.estimatedYield || !data.initialWeight || !data.stockCount) {
      res.status(400).json({
        success: false,
        error: '缺少必要参数：totalFeedAmount, estimatedYield, initialWeight, stockCount',
      })
      return
    }
    
    const result = calculateFCR(data)
    
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '计算失败',
    })
  }
})

export default router
