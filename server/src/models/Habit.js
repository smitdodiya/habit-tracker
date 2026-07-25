import mongoose from 'mongoose';

/** Categories from brief §03 feature 7. 'custom' lets users label their own. */
export const HABIT_CATEGORIES = [
  'morning-routine',
  'health',
  'learning',
  'personal',
  'work',
  'custom',
];

export const FREQUENCY_TYPES = ['daily', 'weekly', 'custom'];

const frequencySchema = new mongoose.Schema(
  {
    type: { type: String, enum: FREQUENCY_TYPES, default: 'daily' },

    // Used when type === 'custom': which weekdays the habit is scheduled on.
    // 0 = Sunday … 6 = Saturday.
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator: (days) => days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: 'daysOfWeek entries must be integers 0-6',
      },
    },

    // Used when type === 'weekly': a flexible target ("3 times a week") rather
    // than fixed days, so the user picks which days suit them that week.
    timesPerWeek: { type: Number, min: 1, max: 7, default: 3 },
  },
  { _id: false },
);

const reminderSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    // Local wall-clock time in the user's timezone, 'HH:mm' 24-hour.
    time: {
      type: String,
      default: '09:00',
      validate: {
        validator: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
        message: 'reminder.time must be HH:mm',
      },
    },
  },
  { _id: false },
);

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 240, default: '' },

    // Phosphor icon name, e.g. 'Barbell'. Resolved to a component on the client.
    icon: { type: String, default: 'Target' },
    color: {
      type: String,
      default: '#E94560',
      validate: {
        validator: (v) => /^#[0-9a-fA-F]{6}$/.test(v),
        message: 'color must be a 6-digit hex value',
      },
    },

    category: { type: String, enum: HABIT_CATEGORIES, default: 'personal' },
    frequency: { type: frequencySchema, default: () => ({}) },
    reminder: { type: reminderSchema, default: () => ({}) },

    // Archived habits keep their history but drop off the Today view.
    archived: { type: Boolean, default: false },

    // Manual sort position on the Today view.
    order: { type: Number, default: 0 },

    // The date the habit starts counting from. Streaks never look further back
    // than this, so a habit created today does not read as "missed" for all of
    // history.
    startDate: { type: String, required: true },
  },
  { timestamps: true },
);

// The Today view's primary query: this user's live habits, in display order.
habitSchema.index({ userId: 1, archived: 1, order: 1 });

habitSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    icon: this.icon,
    color: this.color,
    category: this.category,
    frequency: {
      type: this.frequency.type,
      daysOfWeek: this.frequency.daysOfWeek,
      timesPerWeek: this.frequency.timesPerWeek,
    },
    reminder: { enabled: this.reminder.enabled, time: this.reminder.time },
    archived: this.archived,
    order: this.order,
    startDate: this.startDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Habit = mongoose.model('Habit', habitSchema);
