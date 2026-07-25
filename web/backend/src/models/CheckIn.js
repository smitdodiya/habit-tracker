import mongoose from 'mongoose';

/** Optional mood tag captured alongside a check-in note (brief §03 feature 8). */
export const MOODS = ['great', 'good', 'okay', 'low', 'tough'];

const checkInSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true,
    },

    // 'YYYY-MM-DD' resolved in the user's timezone. See utils/date.js for why
    // this is a string and not a Date.
    date: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: 'date must be YYYY-MM-DD',
      },
    },

    note: { type: String, trim: true, maxlength: 500, default: '' },
    mood: { type: String, enum: [...MOODS, null], default: null },
  },
  { timestamps: true },
);

// One check-in per habit per day. This is what makes the one-tap check-in
// idempotent: a double-tap or a retried request hits the unique index instead
// of inflating the streak.
checkInSchema.index({ habitId: 1, date: 1 }, { unique: true });

// Backs the heatmap and dashboard range queries.
checkInSchema.index({ userId: 1, date: 1 });

checkInSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    habitId: this.habitId.toString(),
    date: this.date,
    note: this.note,
    mood: this.mood,
    createdAt: this.createdAt,
  };
};

export const CheckIn = mongoose.model('CheckIn', checkInSchema);
