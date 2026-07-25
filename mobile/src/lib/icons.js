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
} from 'phosphor-react-native';

/**
 * Habit icons for the native app — Phosphor Icons (brief §05).
 *
 * The *names* come from `@habit-tracker/shared/theme`, because a habit saved as
 * 'Barbell' on the phone must resolve to a barbell on the web. Only this
 * name → component map is platform-specific: web resolves the same names
 * against `@phosphor-icons/react`.
 *
 * Imported explicitly rather than dynamically so Metro can tree-shake, and so
 * a name that has no component fails at build rather than rendering blank on a
 * user's phone.
 */
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

export { ICON_NAMES, HABIT_COLORS } from '@habit-tracker/shared/theme';

/** Falls back to Target so an unknown stored name never renders a blank. */
export function getIcon(name) {
  return ICONS[name] ?? Target;
}
