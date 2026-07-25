import { useId } from 'react';

/**
 * Switch control. Built on a real checkbox so it is keyboard-operable and
 * announced correctly, with the visual switch drawn from the peer state.
 */
export function Toggle({ checked, onChange, label, description, disabled = false, id }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={[
        'flex items-center justify-between gap-4',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      ].join(' ')}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-[var(--text)]">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--text-muted)]">
              {description}
            </span>
          )}
        </span>
      )}

      <span className="relative inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={[
            'block h-6 w-11 rounded-full transition-colors duration-200',
            'bg-[var(--border-strong)] peer-checked:bg-[var(--accent-strong)]',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-ring)] peer-focus-visible:ring-offset-2',
            'peer-focus-visible:ring-offset-[var(--surface)]',
          ].join(' ')}
        />
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 peer-checked:translate-x-5',
          ].join(' ')}
        />
      </span>
    </label>
  );
}
