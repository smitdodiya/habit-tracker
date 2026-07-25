import { Router } from 'express';
import * as controller from '../controllers/push.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// The public key is needed before a subscription exists, but there is no
// reason to expose it anonymously — the client is always logged in by then.
router.use(requireAuth);

router.get('/public-key', controller.getPublicKey);
router.get('/reminders', controller.listReminders);
router.post('/subscribe', validate(controller.subscriptionSchema), controller.subscribe);
router.delete('/subscribe', controller.unsubscribe);
router.post('/test', controller.sendTest);

export default router;
