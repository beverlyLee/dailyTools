import { Router } from 'express';
import { verifySeedController } from '../controllers/seedController';

const router = Router();

router.post('/verify', verifySeedController);

export default router;
