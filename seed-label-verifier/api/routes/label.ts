import { Router } from 'express';
import { checkLabelController } from '../controllers/labelController';

const router = Router();

router.post('/check', checkLabelController);

export default router;
