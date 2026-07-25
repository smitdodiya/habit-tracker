import { Router } from 'express';
import { exportData } from '../controllers/export.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { exportSchema } from '../validators/habit.schema.js';

const router = Router();

router.use(requireAuth);
router.get('/', validate(exportSchema, 'query'), exportData);

export default router;
