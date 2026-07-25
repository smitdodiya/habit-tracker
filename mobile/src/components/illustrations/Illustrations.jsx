import Svg, { Rect, Circle, Path, Ellipse, G } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * Flat SVG illustrations (brief §05).
 *
 * Drawn inline from theme tokens rather than shipped as image assets, so they
 * recolour with the theme instead of sitting in a bright rectangle in dark
 * mode. Decorative only — the surrounding copy carries the meaning.
 */

export function BrandMark({ size = 32 }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={9} fill={colors.accent} />
      <Path
        d="M9.5 16.6l4.2 4.2 8.8-9.2"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function EmptyHabitsIllustration({ width = 190 }) {
  const { colors } = useTheme();
  const height = width * (160 / 200);

  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      <Ellipse cx={100} cy={140} rx={62} ry={8} fill={colors.surface3} />
      <Rect x={56} y={26} width={88} height={106} rx={12} fill={colors.surface} stroke={colors.borderStrong} strokeWidth={2} />
      <Rect x={80} y={17} width={40} height={18} rx={6} fill={colors.accent} />

      <Rect x={72} y={56} width={14} height={14} rx={4} fill={colors.accentSoft} stroke={colors.accent} strokeWidth={2} />
      <Rect x={94} y={60} width={38} height={6} rx={3} fill={colors.borderStrong} />
      <Path d="M75 62.5l3 3 5.5-6" stroke={colors.accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <Rect x={72} y={82} width={14} height={14} rx={4} fill={colors.surface3} stroke={colors.borderStrong} strokeWidth={2} />
      <Rect x={94} y={86} width={30} height={6} rx={3} fill={colors.border} />

      <Rect x={72} y={108} width={14} height={14} rx={4} fill={colors.surface3} stroke={colors.borderStrong} strokeWidth={2} />
      <Rect x={94} y={112} width={34} height={6} rx={3} fill={colors.border} />

      <Circle cx={150} cy={44} r={5} fill={colors.accent} opacity={0.4} />
      <Circle cx={44} cy={96} r={3.5} fill={colors.accent} opacity={0.3} />
    </Svg>
  );
}

export function AllDoneIllustration({ width = 190 }) {
  const { colors } = useTheme();
  const height = width * (160 / 200);

  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      <Ellipse cx={100} cy={140} rx={58} ry={8} fill={colors.surface3} />
      <Circle cx={100} cy={74} r={44} fill={colors.accentSoft} />
      <Circle cx={100} cy={74} r={32} fill={colors.surface} stroke={colors.accent} strokeWidth={2.5} />
      <Path d="M86 74.5l9.5 9.5L115 65" stroke={colors.accent} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <G opacity={0.5}>
        <Rect x={46} y={34} width={7} height={7} rx={2} fill={colors.accent} />
        <Rect x={148} y={48} width={6} height={6} rx={2} fill={colors.accent} />
        <Circle cx={156} cy={96} r={4} fill={colors.accent} />
        <Circle cx={40} cy={88} r={3} fill={colors.accent} />
      </G>
    </Svg>
  );
}

export function OnboardingBuildIllustration({ width = 240 }) {
  const { colors } = useTheme();
  const height = width * (170 / 220);

  return (
    <Svg width={width} height={height} viewBox="0 0 220 170">
      <Ellipse cx={110} cy={150} rx={70} ry={9} fill={colors.surface3} />
      {[0, 1, 2].map((index) => (
        <G key={index} translateY={index * 34}>
          <Rect x={46} y={34} width={128} height={26} rx={9} fill={colors.surface} stroke={colors.borderStrong} strokeWidth={1.8} />
          <Circle cx={62} cy={47} r={7} fill={index === 0 ? colors.accent : colors.surface3} />
          {index === 0 && (
            <Path d="M58.6 47l2.4 2.4 4.4-4.6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
          <Rect x={78} y={43} width={index === 0 ? 54 : 44 - index * 6} height={7} rx={3.5} fill={index === 0 ? colors.borderStrong : colors.border} />
        </G>
      ))}
      <Circle cx={188} cy={30} r={5} fill={colors.accent} opacity={0.35} />
    </Svg>
  );
}

export function OnboardingStreakIllustration({ width = 240 }) {
  const { colors } = useTheme();
  const height = width * (170 / 220);

  return (
    <Svg width={width} height={height} viewBox="0 0 220 170">
      <Ellipse cx={110} cy={150} rx={70} ry={9} fill={colors.surface3} />
      {[34, 52, 44, 68, 84, 76, 104].map((barHeight, index) => (
        <Rect
          key={index}
          x={44 + index * 20}
          y={132 - barHeight}
          width={13}
          height={barHeight}
          rx={5}
          fill={index >= 4 ? colors.accent : colors.surface3}
        />
      ))}
      <Path
        d="M172 22c8 8 12 15 12 22a12 12 0 0 1-24 0c0-5 3-9 6-13 1 4 3 6 4 6 2 0 2-8 2-15z"
        fill={colors.accent}
      />
    </Svg>
  );
}

export function OnboardingReminderIllustration({ width = 240 }) {
  const { colors } = useTheme();
  const height = width * (170 / 220);

  return (
    <Svg width={width} height={height} viewBox="0 0 220 170">
      <Ellipse cx={110} cy={150} rx={70} ry={9} fill={colors.surface3} />
      <Rect x={76} y={26} width={68} height={112} rx={14} fill={colors.surface} stroke={colors.borderStrong} strokeWidth={2} />
      <Rect x={96} y={33} width={28} height={4} rx={2} fill={colors.borderStrong} />

      <Rect x={84} y={52} width={52} height={30} rx={8} fill={colors.accentSoft} stroke={colors.accent} strokeWidth={1.6} />
      <Circle cx={95} cy={63} r={5} fill={colors.accent} />
      <Rect x={104} y={59} width={24} height={4} rx={2} fill={colors.accent} opacity={0.55} />
      <Rect x={104} y={67} width={17} height={3.5} rx={1.75} fill={colors.accent} opacity={0.35} />

      <Rect x={84} y={92} width={52} height={8} rx={4} fill={colors.surface3} />
      <Rect x={84} y={106} width={38} height={8} rx={4} fill={colors.surface3} />

      <Path d="M170 54a13 13 0 0 0-26 0c0 12-4 14-4 14h34s-4-2-4-14z" fill={colors.accent} />
      <Path d="M153 72a4.5 4.5 0 0 0 8 0z" fill={colors.accent} />
      <Path d="M180 40a20 20 0 0 1 0 20" stroke={colors.accent} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.45} />
      <Path d="M134 40a20 20 0 0 0 0 20" stroke={colors.accent} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.45} />
    </Svg>
  );
}

export function NotFoundIllustration({ width = 210 }) {
  const { colors } = useTheme();
  const height = width * (160 / 220);

  return (
    <Svg width={width} height={height} viewBox="0 0 220 160">
      <Ellipse cx={110} cy={142} rx={66} ry={8} fill={colors.surface3} />
      <Circle cx={110} cy={70} r={27} fill={colors.surface} stroke={colors.accent} strokeWidth={2.5} />
      <Circle cx={101} cy={65} r={3.2} fill={colors.text} />
      <Circle cx={119} cy={65} r={3.2} fill={colors.text} />
      <Path d="M100 82c4-4.5 16-4.5 20 0" stroke={colors.textMuted} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Circle cx={52} cy={42} r={4} fill={colors.accent} opacity={0.35} />
      <Circle cx={170} cy={56} r={5} fill={colors.accent} opacity={0.3} />
    </Svg>
  );
}
