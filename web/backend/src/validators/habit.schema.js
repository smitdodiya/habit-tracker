import { z } from 'zod';
import { HABIT_CATEGORIES, FREQUENCY_TYPES } from '../models/Habit.js';
import { MOODS } from '../models/CheckIn.js';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const frequency = z
  .object({
    type: z.enum(FREQUENCY_TYPES).default('daily'),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    timesPerWeek: z.number().int().min(1).max(7).default(3),
  })
  .refine((f) => f.type !== 'custom' || f.daysOfWeek.length > 0, {
    message: 'Pick at least one day for a custom schedule',
    path: ['daysOfWeek'],
  });

const reminder = z.object({
  enabled: z.boolean().default(false),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Reminder time must be HH:mm').default('09:00'),
});

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required').max(60),
  description: z.string().trim().max(240).default(''),
  icon: z.string().trim().min(1).max(40).default('Target'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be a hex value like #E94560').default('#E94560'),
  category: z.enum(HABIT_CATEGORIES).default('personal'),
  frequency: frequency.default({ type: 'daily', daysOfWeek: [], timesPerWeek: 3 }),
  reminder: reminder.default({ enabled: false, time: '09:00' }),
  // Optional so the client can backdate a habit it is migrating; defaults to
  // the user's today in the controller.
  startDate: dateKey.optional(),
});

export const updateHabitSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    description: z.string().trim().max(240).optional(),
    icon: z.string().trim().min(1).max(40).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    category: z.enum(HABIT_CATEGORIES).optional(),
    frequency: frequency.optional(),
    reminder: reminder.optional(),
    archived: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

export const reorderHabitsSchema = z.object({
  order: z.array(z.string().min(1)).min(1, 'Provide at least one habit id'),
});

export const checkInSchema = z.object({
  // Omitted means "today in the user's timezone" — the one-tap path.
  date: dateKey.optional(),
  note: z.string().trim().max(500).default(''),
  mood: z.enum(MOODS).nullable().default(null),
});

export const listCheckInsSchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
});

export const statsRangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d', '365d']).default('30d'),
});

export const exportSchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  range: z.enum(['7d', '30d', '90d', '365d']).default('30d'),
});
