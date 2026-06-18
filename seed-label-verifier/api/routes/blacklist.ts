import { Router } from 'express';
import { getBlacklistController, searchBlacklistController, subscribeController } from '../controllers/blacklistController';

const router = Router();

router.get('/', getBlacklistController);
router.get('/search', searchBlacklistController);
router.post('/subscribe', subscribeController);

export default router;
