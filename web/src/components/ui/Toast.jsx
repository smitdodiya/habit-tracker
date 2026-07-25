import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';
import { useToastStore } from '../../store/toastStore.js';

const TONES = {
  success: { icon: CheckCircle, color: 'var(--success)', bg: 'var(--success-soft)' },
  error: { icon: WarningCircle, color: 'var(--danger)', bg: 'var(--danger-soft)' },
  info: { icon: Info, color: 'var(--accent-strong)', bg: 'var(--accent-soft)' },
};

/**
 * Toast host, mounted once at the app root.
 *
 * The region is a polite live region so screen readers announce messages
 * without interrupting whatever the user is doing.
 */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone] ?? TONES.info;
        const Icon = tone.icon;

        return (
          <div
            key={toast.id}
            className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--shadow-lg)]"
          >
            <span
              className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: tone.bg, color: tone.color }}
            >
              <Icon size={15} weight="fill" />
            </span>

            <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-[var(--text)]">{toast.message}</p>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
