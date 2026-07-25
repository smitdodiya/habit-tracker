/**
 * Minimal flat SVG illustrations (brief §05).
 *
 * Drawn inline rather than imported as files so they inherit the theme: each
 * one paints from the CSS design tokens, which means they recolour correctly
 * in dark mode instead of sitting in a bright rectangle.
 *
 * All are decorative and marked aria-hidden — the surrounding copy carries the
 * meaning for anyone using a screen reader.
 */

const base = {
  'aria-hidden': 'true',
  focusable: 'false',
  xmlns: 'http://www.w3.org/2000/svg',
};

/** Empty Today view: a clipboard waiting for its first habit. */
export function EmptyHabitsIllustration({ className = '' }) {
  return (
    <svg {...base} viewBox="0 0 200 160" className={className}>
      <ellipse cx="100" cy="140" rx="62" ry="8" fill="var(--surface-3)" />

      <rect x="56" y="26" width="88" height="106" rx="12" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
      <rect x="80" y="17" width="40" height="18" rx="6" fill="var(--accent)" />

      <rect x="72" y="56" width="14" height="14" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
      <rect x="94" y="60" width="38" height="6" rx="3" fill="var(--border-strong)" />

      <rect x="72" y="82" width="14" height="14" rx="4" fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth="2" />
      <rect x="94" y="86" width="30" height="6" rx="3" fill="var(--border)" />

      <rect x="72" y="108" width="14" height="14" rx="4" fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth="2" />
      <rect x="94" y="112" width="34" height="6" rx="3" fill="var(--border)" />

      {/* A tick already earned, to hint at what the page becomes */}
      <path d="M75 62.5l3 3 5.5-6" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <circle cx="150" cy="44" r="5" fill="var(--accent)" opacity="0.4" />
      <circle cx="44" cy="96" r="3.5" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

/** All done for the day. */
export function AllDoneIllustration({ className = '' }) {
  return (
    <svg {...base} viewBox="0 0 200 160" className={className}>
      <ellipse cx="100" cy="140" rx="58" ry="8" fill="var(--surface-3)" />

      <circle cx="100" cy="74" r="44" fill="var(--accent-soft)" />
      <circle cx="100" cy="74" r="32" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
      <path
        d="M86 74.5l9.5 9.5L115 65"
        stroke="var(--accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Celebration marks */}
      <rect x="46" y="34" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.55" transform="rotate(-20 49.5 37.5)" />
      <rect x="148" y="48" width="6" height="6" rx="2" fill="var(--accent)" opacity="0.45" transform="rotate(25 151 51)" />
      <circle cx="156" cy="96" r="4" fill="var(--accent)" opacity="0.4" />
      <circle cx="40" cy="88" r="3" fill="var(--accent)" opacity="0.35" />
      <path d="M60 116l4-7 4 7z" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

/** 404 — a lost page. */
export function NotFoundIllustration({ className = '' }) {
  return (
    <svg {...base} viewBox="0 0 220 160" className={className}>
      <ellipse cx="110" cy="142" rx="66" ry="8" fill="var(--surface-3)" />

      <text
        x="110"
        y="96"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="62"
        fontWeight="800"
        fill="var(--surface-3)"
        letterSpacing="2"
      >
        404
      </text>

      <circle cx="110" cy="70" r="27" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
      <circle cx="101" cy="65" r="3.2" fill="var(--text)" />
      <circle cx="119" cy="65" r="3.2" fill="var(--text)" />
      <path d="M100 82c4-4.5 16-4.5 20 0" stroke="var(--text-muted)" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      <circle cx="52" cy="42" r="4" fill="var(--accent)" opacity="0.35" />
      <circle cx="170" cy="56" r="5" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

/** Onboarding step 1 — build habits. */
export function OnboardingBuildIllustration({ className = '' }) {
  return (
    <svg {...base} viewBox="0 0 220 170" className={className}>
      <ellipse cx="110" cy="150" rx="70" ry="9" fill="var(--surface-3)" />

      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(0 ${index * 34})`}>
          <rect x="46" y="34" width="128" height="26" rx="9" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.8" />
          <circle cx="62" cy="47" r="7" fill={index === 0 ? 'var(--accent)' : 'var(--surface-3)'} />
          {index === 0 && (
            <path d="M58.6 47l2.4 2.4 4.4-4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
          <rect x="78" y="43" width={index === 0 ? 54 : 44 - index * 6} height="7" rx="3.5" fill={index === 0 ? 'var(--border-strong)' : 'var(--border)'} />
        </g>
      ))}

      <circle cx="188" cy="30" r="5" fill="var(--accent)" opacity="0.35" />
      <circle cx="32" cy="66" r="3.5" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

/** Onboarding step 2 — streaks. */
export function OnboardingStreakIllustration({ className = '' }) {
  return (
    <svg {...base} viewBox="0 0 220 170" className={className}>
      <ellipse cx="110" cy="150" rx="70" ry="9" fill="var(--surface-3)" />

      {/* A rising run of bars */}
      {[34, 52, 44, 68, 84, 76, 104].map((height, index) => (
        <rect
          key={index}
          x={44 + index * 20}
          y={132 - height}
          width="13"
          height={height}
          rx="5"
          fill={index >= 4 ? 'var(--accent)' : 'var(--surface-3)'}
          opacity={index >= 4 ? 1 : 1}
        />
      ))}

      {/* Flame marking the current streak */}
      <path
        d="M172 22c8 8 12 15 12 22a12 12 0 0 1-24 0c0-5 3-9 6-13 1 4 3 6 4 6 2 0 2-8 2-15z"
        fill="var(--accent)"
      />
      <circle cx="42" cy="34" r="4" fill="var(--accent)" opacity="0.3" />
    </svg>
  );
}

/** Onboarding step 3 — reminders. */
export function OnboardingReminderIllustration({ className = '' }) {
  return (
    <svg {...base} viewBox="0 0 220 170" className={className}>
      <ellipse cx="110" cy="150" rx="70" ry="9" fill="var(--surface-3)" />

      <rect x="76" y="26" width="68" height="112" rx="14" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
      <rect x="96" y="33" width="28" height="4" rx="2" fill="var(--border-strong)" />

      {/* Notification card on the screen */}
      <rect x="84" y="52" width="52" height="30" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.6" />
      <circle cx="95" cy="63" r="5" fill="var(--accent)" />
      <rect x="104" y="59" width="24" height="4" rx="2" fill="var(--accent)" opacity="0.55" />
      <rect x="104" y="67" width="17" height="3.5" rx="1.75" fill="var(--accent)" opacity="0.35" />

      <rect x="84" y="92" width="52" height="8" rx="4" fill="var(--surface-3)" />
      <rect x="84" y="106" width="38" height="8" rx="4" fill="var(--surface-3)" />

      {/* Bell with ring waves */}
      <path
        d="M170 54a13 13 0 0 0-26 0c0 12-4 14-4 14h34s-4-2-4-14z"
        fill="var(--accent)"
      />
      <path d="M153 72a4.5 4.5 0 0 0 8 0z" fill="var(--accent)" />
      <path d="M180 40a20 20 0 0 1 0 20" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M134 40a20 20 0 0 0 0 20" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.45" />
    </svg>
  );
}

/** Small mark used in the header and on the auth screens. */
export function BrandMark({ size = 32, className = '' }) {
  return (
    <svg {...base} viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path
        d="M9.5 16.6l4.2 4.2 8.8-9.2"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
