import { Router } from 'express';
import { getDashboard } from '../controllers/stats.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { statsRangeSchema } from '../validators/habit.schema.js';

const router = Router();

router.use(requireAuth);
router.get('/dashboard', validate(statsRangeSchema, 'query'), getDashboard);

export default router;
