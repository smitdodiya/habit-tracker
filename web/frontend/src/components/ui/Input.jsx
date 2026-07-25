import { forwardRef, useId } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

const fieldClasses = (hasError) =>
  [
    'w-full rounded-[12px] border bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)]',
    'placeholder:text-[var(--text-subtle)] transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]',
    hasError
      ? 'border-[var(--danger)] focus:border-[var(--danger)]'
      : 'border-[var(--border-strong)] focus:border-[var(--accent-strong)]',
  ].join(' ');

/**
 * Labelled text input with inline validation messaging.
 * The error is wired to the field with aria-describedby and aria-invalid, so a
 * screen reader announces the problem rather than just the field name.
 */
export const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className = '', id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--text)]">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`${fieldClasses(Boolean(error))} ${Icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-[var(--danger)]">
          <WarningCircle size={13} weight="fill" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="mt-1.5 text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
});

/** Multi-line variant, used for check-in notes. */
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--text)]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={`${fieldClasses(Boolean(error))} resize-none leading-relaxed`}
        {...props}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
});
