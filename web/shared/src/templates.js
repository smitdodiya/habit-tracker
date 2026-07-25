/**
 * Ready-made habits for the create dialog.
 *
 * The blank form is the hardest screen in the app: a new user has to invent a
 * name, pick an icon and a colour, and decide a schedule before they've done
 * anything at all. A grid of sensible starting points turns that into one tap,
 * and every field stays editable afterwards.
 *
 * Reminder times are chosen to match when the habit is actually done, not a
 * generic 9am — a "read before bed" nudge at breakfast is worse than none.
 */

export const HABIT_TEMPLATES = [
  {
    id: 'water',
    name: 'Drink 2L Water',
    description: 'Two full bottles before 6pm.',
    icon: 'Drop',
    color: '#2D9CDB',
    category: 'health',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '13:00' },
  },
  {
    id: 'meditate',
    name: 'Meditate',
    description: '10 minutes before anything else.',
    icon: 'Sun',
    color: '#E94560',
    category: 'morning-routine',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '07:00' },
  },
  {
    id: 'read',
    name: 'Read 20 Pages',
    description: 'Anything that is not a screen.',
    icon: 'BookOpen',
    color: '#9B51E0',
    category: 'learning',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '21:30' },
  },
  {
    id: 'gym',
    name: 'Gym Workout',
    description: 'Strength training, 45 minutes.',
    icon: 'Barbell',
    color: '#27AE60',
    category: 'health',
    frequency: { type: 'custom', daysOfWeek: [1, 3, 5], timesPerWeek: 3 },
    reminder: { enabled: true, time: '18:00' },
  },
  {
    id: 'walk',
    name: 'Walk 10k Steps',
    description: 'Get outside, whatever the weather.',
    icon: 'PersonSimpleRun',
    color: '#00B8A9',
    category: 'health',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '17:00' },
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'A few lines about the day.',
    icon: 'NotePencil',
    color: '#F2994A',
    category: 'personal',
    frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '20:00' },
  },
  {
    id: 'sleep',
    name: 'Lights Out by 11',
    description: 'Phone out of the bedroom.',
    icon: 'Bed',
    color: '#6C7A9C',
    category: 'health',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '22:30' },
  },
  {
    id: 'stretch',
    name: 'Stretch',
    description: 'Ten minutes to undo the desk.',
    icon: 'FlowerLotus',
    color: '#EB5DA6',
    category: 'health',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '08:00' },
  },
  {
    id: 'inbox',
    name: 'Inbox Zero',
    description: 'Clear the inbox before logging off.',
    icon: 'Tray',
    color: '#1A1A2E',
    category: 'work',
    frequency: { type: 'custom', daysOfWeek: [1, 2, 3, 4, 5], timesPerWeek: 5 },
    reminder: { enabled: true, time: '17:30' },
  },
  {
    id: 'study',
    name: 'Study / Practice',
    description: 'One focused session.',
    icon: 'GraduationCap',
    color: '#F2C94C',
    category: 'learning',
    frequency: { type: 'custom', daysOfWeek: [1, 2, 3, 4, 5], timesPerWeek: 5 },
    reminder: { enabled: true, time: '19:00' },
  },
  {
    id: 'call',
    name: 'Call Family',
    description: 'A proper catch-up, not a text.',
    icon: 'Phone',
    color: '#EB5DA6',
    category: 'personal',
    frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 2 },
    reminder: { enabled: true, time: '19:30' },
  },
  {
    id: 'no-scroll',
    name: 'No Doomscrolling',
    description: 'No social media before noon.',
    icon: 'Prohibit',
    color: '#C02434',
    category: 'personal',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: false, time: '09:00' },
  },
];

/** Strips the picker-only id, leaving a valid habit payload for the API. */
export function templateToHabit(template) {
  const habit = { ...template };
  delete habit.id;
  return habit;
}
