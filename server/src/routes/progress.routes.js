import { Router } from 'express';
import * as controller from '../controllers/progress.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/progress', controller.getProgress);
router.get('/insights', controller.getInsights);
router.get('/recap', controller.getRecap);
router.post('/recap/seen', controller.markRecapSeen);

export default router;
