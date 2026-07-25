/**
 * The habit icon set — Phosphor Icons (open source, free, per brief §05).
 *
 * Curated and imported explicitly rather than pulling the whole library in
 * dynamically: it keeps the bundle small, and it gives the icon picker a
 * definite set to render instead of thousands of options.
 */

import {
  Target,
  Sun,
  MoonStars,
  Drop,
  Barbell,
  PersonSimpleRun,
  Bicycle,
  Heartbeat,
  ForkKnife,
  Carrot,
  Pill,
  BookOpen,
  GraduationCap,
  PencilSimple,
  NotePencil,
  Code,
  Palette,
  MusicNotes,
  Camera,
  Brain,
  FlowerLotus,
  Bed,
  Tray,
  Briefcase,
  Money,
  ChartLineUp,
  Phone,
  Broom,
  Plant,
  Dog,
  Users,
  Prohibit,
  Timer,
  Trophy,
} from '@phosphor-icons/react';

/** name → component. The `name` string is what gets stored on the habit. */
export const ICONS = {
  Target,
  Sun,
  MoonStars,
  Drop,
  Barbell,
  PersonSimpleRun,
  Bicycle,
  Heartbeat,
  ForkKnife,
  Carrot,
  Pill,
  BookOpen,
  GraduationCap,
  PencilSimple,
  NotePencil,
  Code,
  Palette,
  MusicNotes,
  Camera,
  Brain,
  FlowerLotus,
  Bed,
  Tray,
  Briefcase,
  Money,
  ChartLineUp,
  Phone,
  Broom,
  Plant,
  Dog,
  Users,
  Prohibit,
  Timer,
  Trophy,
};

export const ICON_NAMES = Object.keys(ICONS);

/** Falls back to Target so an unknown stored name never renders a blank. */
export function getIcon(name) {
  return ICONS[name] ?? Target;
}

/**
 * Habit colour palette.
 * Chosen so every swatch stays distinguishable in both themes and holds up
 * against the light and dark card surfaces.
 */
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
