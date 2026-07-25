import { Router } from 'express';
import * as controller from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', controller.getOverview);
router.get('/users', controller.listUsers);
router.get('/habits', controller.listAllHabits);
router.get('/activity', controller.listActivity);

export default router;
