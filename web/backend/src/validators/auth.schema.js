import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

// 8 characters minimum with a letter and a number: enough to stop the obvious
// weak passwords without the arcane symbol rules that push people to "P@ssw0rd!".
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be under 128 characters')
  .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), {
    message: 'Password must include at least one letter and one number',
  });

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email,
  password,
  // Sent by the browser via Intl so check-ins land on the right calendar day.
  timezone: z.string().trim().min(1).default('UTC'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    timezone: z.string().trim().min(1).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notificationsEnabled: z.boolean().optional(),
    onboardingComplete: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});
