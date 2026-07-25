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

/**
 * The icon names and colour palette come from the shared package, because the
 * *data* is identical across platforms — a habit saved as 'Barbell' on the
 * phone must resolve to a barbell on the web. Only the name → component map
 * above is web-specific, since mobile resolves the same names against
 * `phosphor-react-native` instead.
 */
export { ICON_NAMES, HABIT_COLORS } from '@habit-tracker/shared/theme';

/** Falls back to Target so an unknown stored name never renders a blank. */
export function getIcon(name) {
  return ICONS[name] ?? Target;
}
