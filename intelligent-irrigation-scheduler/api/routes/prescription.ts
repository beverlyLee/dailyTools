import { Router, type Request, type Response } from 'express';
import type {
  ApiResponse,
  PrescriptionRequest,
  PrescriptionResponse,
  CostCalculateRequest,
} from '../../shared/types.js';
import { generatePrescription } from '../services/prescriptionService.js';
import { calculateCost } from '../services/costService.js';

const router = Router();

router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<PrescriptionRequest>;
    if (!body.crop || !body.soil || !body.soilSimulation || !body.weather || !body.pumpFlow || !body.irrigationEfficiency) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '请求参数不完整',
        error: '缺少必填字段',
      };
      res.status(400).json(response);
      return;
    }

    let prescription: PrescriptionResponse = generatePrescription(body as PrescriptionRequest);

    if (prescription.isValid && body.crop && prescription.durationMinutes > 0) {
      const costReq: CostCalculateRequest = {
        config: {
          electricityPrice: req.body.electricityPrice ?? 0.6,
          waterPrice: req.body.waterPrice ?? 2.5,
          pumpPower: req.body.pumpPower ?? 7.5,
          pumpFlow: body.pumpFlow,
          laborCostPerHour: req.body.laborCost ?? 30,
        },
        waterAmount: prescription.waterAmount,
        durationMinutes: prescription.durationMinutes,
        area: body.crop.plantingArea,
      };
      const cost = calculateCost(costReq);
      prescription = { ...prescription, estimatedCost: cost.totalCost };
    }

    const response: ApiResponse<PrescriptionResponse> = {
      success: true,
      data: prescription,
      message: prescription.isValid ? '灌溉处方生成成功' : '检测到即将降雨，处方已标记为待确认',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[prescription] POST /generate error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '灌溉处方生成失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

export default router;
