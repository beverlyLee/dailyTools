import { Router, type Request, type Response } from 'express'
import { generatePrescription } from '../services/prescriptionService.js'
import { savePrescription } from '../services/recordService.js'
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

    const prescription = generatePrescription(data)

    if (req.body.recordId) {
      savePrescription(req.body.recordId, {
        limeDosage: prescription.limeDosage,
        organicFertilizerDosage: prescription.organicFertilizerDosage,
        greenManureSuggestion: prescription.greenManureSuggestion,
        details: prescription.details,
      })
    }

    res.json({ success: true, data: prescription })
  } catch (error) {
    res.status(500).json({ success: false, error: '处方生成失败' })
  }
})

export default router
