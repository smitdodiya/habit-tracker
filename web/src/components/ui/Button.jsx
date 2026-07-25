import { forwardRef } from 'react';
import { CircleNotch } from '@phosphor-icons/react';

/**
 * The app's button.
 *
 * Note the accent variants use --accent-strong rather than the raw brand
 * accent: white text on #E94560 measures 3.85:1, below the AA threshold, while
 * the slightly deeper shade reaches 5.07:1 and reads as the same colour.
 */

const VARIANTS = {
  primary:
    'bg-[var(--accent-strong)] text-white hover:bg-[var(--accent-hover)] shadow-sm ' +
    'disabled:bg-[var(--accent-strong)]',
  navy: 'bg-[var(--navy)] text-[var(--text-inverse)] hover:opacity-90',
  secondary:
    'bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  ghost: 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90',
  'danger-soft':
    'bg-[var(--danger-soft)] text-[var(--danger)] border border-transparent hover:border-[var(--danger)]',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-[0.8125rem] gap-1.5 rounded-[10px]',
  md: 'h-11 px-5 text-sm gap-2 rounded-[12px]',
  lg: 'h-[52px] px-6 text-[0.9375rem] gap-2 rounded-[14px]',
  icon: 'h-10 w-10 justify-center rounded-[12px]',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // A loading button stays visibly itself but stops accepting clicks, so a
      // slow network can't produce a double submit.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center font-semibold transition-all duration-150',
        'active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth ? 'w-full justify-center' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && <CircleNotch size={16} weight="bold" className="animate-spin" />}
      {children}
    </button>
  );
});
