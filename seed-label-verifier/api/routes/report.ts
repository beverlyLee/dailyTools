import { Router } from 'express';
import { generateReportController } from '../controllers/reportController';

const router = Router();

router.post('/generate', generateReportController);

export default router;
