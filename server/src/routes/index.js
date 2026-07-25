import { Router } from 'express';
import mongoose from 'mongoose';

import authRoutes from './auth.routes.js';
import habitRoutes from './habit.routes.js';
import statsRoutes from './stats.routes.js';
import progressRoutes from './progress.routes.js';
import exportRoutes from './export.routes.js';
import pushRoutes from './push.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

/** Liveness + database connectivity, for deploy checks and the dev startup log. */
router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    database: states[mongoose.connection.readyState] ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/habits', habitRoutes);
router.use('/stats', statsRoutes);
router.use('/me', progressRoutes);
router.use('/export', exportRoutes);
router.use('/push', pushRoutes);
router.use('/admin', adminRoutes);

export default router;
