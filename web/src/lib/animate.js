import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number toward its new value.
 *
 * A streak that jumps 32 → 33 is information; a streak that *counts* to 33
 * feels like a reward. The effect is small enough to stay tasteful and is the
 * main reason the app reads as "alive" rather than merely correct.
 *
 * Honours prefers-reduced-motion by snapping straight to the value — the
 * number is the point, the motion is decoration.
 */
export function useCountUp(value, { duration = 650, enabled = true } = {}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!enabled || reduced || typeof value !== 'number' || Number.isNaN(value)) {
      setDisplay(value);
      fromRef.current = value;
      return undefined;
    }

    const from = fromRef.current;
    const delta = value - from;

    if (delta === 0) return undefined;

    // Counting from zero on first paint would animate every number on every
    // page load, which is noise rather than delight.
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic — quick to start, gently settling.
      const eased = 1 - (1 - t) ** 3;

      setDisplay(Math.round(from + delta * eased));

      if (t < 1) frameRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, duration, enabled]);

  return display;
}

/**
 * True for `ms` after `trigger` changes — for one-shot emphasis animations
 * like a pulse on a streak badge when it ticks over.
 */
export function usePulse(trigger, ms = 600) {
  const [pulsing, setPulsing] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), ms);
    return () => clearTimeout(timer);
  }, [trigger, ms]);

  return pulsing;
}
