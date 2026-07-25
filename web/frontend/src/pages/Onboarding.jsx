import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';

import { Button } from '../components/ui/Button.jsx';
import {
  BrandMark,
  OnboardingBuildIllustration,
  OnboardingStreakIllustration,
  OnboardingReminderIllustration,
} from '../components/illustrations/Illustrations.jsx';

/**
 * Splash + 3-step feature overview (brief §04, §03 feature 12).
 *
 * Shown before sign-up so the value is clear before anyone is asked for an
 * email, and skippable at every step — an onboarding you can't leave is a wall,
 * not a welcome.
 */

const STEPS = [
  {
    illustration: OnboardingBuildIllustration,
    title: 'Build the routine',
    body: 'Daily, certain days, or a few times a week. One tap to check off.',
  },
  {
    illustration: OnboardingStreakIllustration,
    title: 'Watch the streak grow',
    body: 'Show up daily and your streak grows. 7, 30 and 100 days are worth celebrating.',
  },
  {
    illustration: OnboardingReminderIllustration,
    title: 'Never lose the thread',
    body: 'Set a time for each habit and get a nudge when it matters.',
  },
];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const current = STEPS[step];
  const Illustration = current.illustration;
  const isLast = step === STEPS.length - 1;

  const finish = () => navigate('/signup');

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] px-6 py-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-sm font-extrabold tracking-tight text-[var(--text)]">Habit Tracker</span>
        </div>

        <button
          type="button"
          onClick={finish}
          className="rounded-lg px-2 py-1 text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          Skip
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
        {/* Keyed so each step replays the entrance animation. */}
        <div key={step} className="animate-fade-in-up">
          <Illustration className="mx-auto mb-8 h-44 w-auto" />
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">{current.title}</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
            {current.body}
          </p>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-sm space-y-5">
        {/* Progress dots double as navigation. */}
        <div className="flex justify-center gap-2">
          {STEPS.map((stepItem, index) => (
            <button
              key={stepItem.title}
              type="button"
              onClick={() => setStep(index)}
              aria-label={`Go to step ${index + 1}: ${stepItem.title}`}
              aria-current={index === step ? 'step' : undefined}
              className={[
                'h-1.5 rounded-full transition-all duration-300',
                index === step ? 'w-7 bg-[var(--accent-strong)]' : 'w-1.5 bg-[var(--border-strong)]',
              ].join(' ')}
            />
          ))}
        </div>

        <Button size="lg" fullWidth onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? 'Get started' : 'Next'}
          <ArrowRight size={17} weight="bold" />
        </Button>

        <p className="text-center text-[0.8125rem] text-[var(--text-muted)]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-[var(--accent-strong)] hover:underline"
          >
            Sign in
          </button>
        </p>
      </footer>
    </div>
  );
}
