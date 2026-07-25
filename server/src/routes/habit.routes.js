import { Router } from 'express';
import * as controller from '../controllers/habit.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createHabitSchema,
  updateHabitSchema,
  reorderHabitsSchema,
  checkInSchema,
  listCheckInsSchema,
} from '../validators/habit.schema.js';

const router = Router();

// Every habit route is user-scoped.
router.use(requireAuth);

router.get('/', controller.listHabits);
router.get('/today', controller.listToday);
router.post('/', validate(createHabitSchema), controller.createHabit);

// Declared before '/:id' so 'reorder' is not swallowed as a habit id.
router.patch('/reorder', validate(reorderHabitsSchema), controller.reorderHabits);

router.get('/:id', controller.getHabit);
router.patch('/:id', validate(updateHabitSchema), controller.updateHabit);
router.delete('/:id', controller.deleteHabit);

router.post('/:id/checkin', validate(checkInSchema), controller.checkIn);
router.delete('/:id/checkin', controller.undoCheckIn);
router.get('/:id/checkins', validate(listCheckInsSchema, 'query'), controller.listCheckIns);

export default router;
