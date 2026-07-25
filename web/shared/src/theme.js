/**
 * Design tokens as plain data.
 *
 * The web renders these through CSS custom properties in
 * `web/frontend/src/styles/tokens.css`; React Native has no CSS, so it needs the same
 * values as JavaScript. Keeping one source here is what stops the two from
 * drifting into "nearly the same" — which is worse than obviously different,
 * because nobody notices.
 *
 * Brand palette from brief §05:
 *   Primary  Deep Navy  #1A1A2E
 *   Accent   Red-Pink   #E94560
 *   BG       Off-White  #F5F5F7
 *
 * On the accent and WCAG AA (also §05): #E94560 only reaches 3.5:1 against the
 * off-white background and 3.85:1 behind white text — both under the 4.5:1
 * threshold for body copy. So the accent has three roles rather than one
 * compromised value:
 *
 *   accent        #E94560  fills, chips, chart marks, large decorative
 *                          elements — where the 3:1 non-text bar applies
 *   accentStrong  #D12B47  anything carrying text: button backgrounds behind
 *                          white (5.07:1) and links on the background (4.61:1)
 *   accentSoft             tinted backgrounds for selected states
 *
 * Dark mode is a designed second palette built from the navy family, not an
 * inversion, with the accent lifted to #FF6B84 so it stays legible (6.95:1).
 */

export const lightTheme = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  surface2: '#FAFAFB',
  surface3: '#F0F0F3',
  border: '#E4E4EA',
  borderStrong: '#D3D3DC',

  text: '#1A1A2E',
  textMuted: '#5B6270',
  textSubtle: '#83899A',
  textInverse: '#FFFFFF',

  accent: '#E94560',
  accentStrong: '#D12B47',
  accentHover: '#BD2340',
  accentSoft: '#FDECEF',
  accentRing: 'rgba(233, 69, 96, 0.32)',

  navy: '#1A1A2E',

  success: '#1A7F52',
  successSoft: '#E6F5EE',
  warning: '#A35A00',
  warningSoft: '#FDF1E3',
  danger: '#C02434',
  dangerSoft: '#FDECEE',

  freeze: '#2D9CDB',
  freezeSoft: 'rgba(45, 156, 219, 0.14)',

  // Heatmap ramp. Step 0 means "nothing done" rather than "nothing scheduled".
  heat: ['#ECECED', '#FAD2DA', '#F4A0B0', '#EE6D86', '#E94560', '#B81F3A'],
};

export const darkTheme = {
  bg: '#0F0F1A',
  surface: '#17172A',
  surface2: '#1E1E33',
  surface3: '#26263F',
  border: '#2C2C48',
  borderStrong: '#3A3A5C',

  text: '#F0F0F5',
  textMuted: '#A4A4BD',
  textSubtle: '#7C7C99',
  textInverse: '#12121E',

  accent: '#FF6B84',
  accentStrong: '#FF6B84',
  accentHover: '#FF8599',
  accentSoft: 'rgba(255, 107, 132, 0.14)',
  accentRing: 'rgba(255, 107, 132, 0.4)',

  navy: '#F0F0F5',

  success: '#4ADE9D',
  successSoft: 'rgba(74, 222, 157, 0.14)',
  warning: '#F5B862',
  warningSoft: 'rgba(245, 184, 98, 0.14)',
  danger: '#FF7B8C',
  dangerSoft: 'rgba(255, 123, 140, 0.14)',

  freeze: '#57B6EA',
  freezeSoft: 'rgba(87, 182, 234, 0.16)',

  // Step 0 sits just above the card surface: readable as an empty cell in the
  // grid and in the legend, without competing with days that saw activity.
  heat: ['#262640', '#4A2436', '#7A2F45', '#AB3D57', '#E94560', '#FF6B84'],
};

export const radii = { sm: 8, md: 14, lg: 20, full: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/**
 * Type scale. Brief §05 sets a 14px minimum on mobile, so nothing here goes
 * below it except deliberate metadata, and the OS font-scale setting is
 * respected rather than overridden.
 */
export const typography = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 14, fontWeight: '400' },
  smallBold: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
  micro: { fontSize: 11, fontWeight: '600' },
};

/** The habit colour palette — distinguishable in both themes. */
export const HABIT_COLORS = [
  '#E94560', // brand accent
  '#F2994A', // orange
  '#F2C94C', // yellow
  '#27AE60', // green
  '#2D9CDB', // blue
  '#9B51E0', // purple
  '#EB5DA6', // pink
  '#00B8A9', // teal
  '#6C7A9C', // slate
  '#1A1A2E', // brand navy
];

/**
 * Icon names, as data.
 *
 * The components themselves cannot be shared — web uses
 * `@phosphor-icons/react` and mobile uses `phosphor-react-native` — but the
 * *set* must match, or a habit created on one platform would render blank on
 * the other. Each client maps these names to its own components.
 */
export const ICON_NAMES = [
  'Target',
  'Sun',
  'MoonStars',
  'Drop',
  'Barbell',
  'PersonSimpleRun',
  'Bicycle',
  'Heartbeat',
  'ForkKnife',
  'Carrot',
  'Pill',
  'BookOpen',
  'GraduationCap',
  'PencilSimple',
  'NotePencil',
  'Code',
  'Palette',
  'MusicNotes',
  'Camera',
  'Brain',
  'FlowerLotus',
  'Bed',
  'Tray',
  'Briefcase',
  'Money',
  'ChartLineUp',
  'Phone',
  'Broom',
  'Plant',
  'Dog',
  'Users',
  'Prohibit',
  'Timer',
  'Trophy',
];

/** Achievement key → icon name, so both clients show the same badge art. */
export const ACHIEVEMENT_ICONS = {
  'first-step': 'Footprints',
  'week-one': 'Fire',
  'month-master': 'Medal',
  century: 'Trophy',
  'early-bird': 'SunHorizon',
  'night-owl': 'MoonStars',
  'perfect-week': 'Sparkle',
  comeback: 'ArrowUUpLeft',
  collector: 'Stack',
  centurion: 'ChartLineUp',
  'note-taker': 'NotePencil',
  'well-rounded': 'CirclesFour',
  'weekend-warrior': 'Confetti',
  unshakeable: 'ShieldCheck',
};
