import { Router, type Request, type Response } from 'express'
import { generateWeatherData, shouldDelayFeeding } from '../services/weatherService.js'

const router = Router()

router.get('/current', (_req: Request, res: Response): void => {
  const weather = generateWeatherData()
  const feedingAdvice = shouldDelayFeeding(weather)
  
  res.json({
    success: true,
    data: {
      weather,
      feedingAdvice,
    },
  })
})

router.get('/advice', (_req: Request, res: Response): void => {
  const weather = generateWeatherData()
  const feedingAdvice = shouldDelayFeeding(weather)
  
  res.json({
    success: true,
    data: feedingAdvice,
  })
})

export default router
