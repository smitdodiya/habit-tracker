import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

/**
 * Accessible modal dialog.
 *
 * Handles the three things a dialog has to get right and is easy to skip:
 * Escape closes it, focus moves inside and is trapped there while it's open,
 * and the page behind it doesn't scroll.
 *
 * On small screens it becomes a bottom sheet, which is far easier to reach
 * one-handed than a centred box.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog — the first field if there is one, otherwise
    // the panel itself.
    const focusTarget =
      panelRef.current?.querySelector('input, textarea, select, button:not([data-close])') ??
      panelRef.current;
    focusTarget?.focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      // Focus trap: wrap around at the ends rather than escaping to the page.
      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-[rgba(10,10,20,0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={[
          'relative z-10 w-full bg-[var(--surface)] shadow-[var(--shadow-lg)] outline-none',
          'max-h-[92dvh] overflow-y-auto rounded-t-[22px] sm:rounded-[20px]',
          'animate-fade-in-up',
          widths[size] ?? widths.md,
        ].join(' ')}
      >
        {/* Grab handle — a visual affordance for the mobile sheet. */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-[var(--border-strong)]" />
        </div>

        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:pt-5">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>}
              {description && <p className="mt-0.5 text-[0.8125rem] text-[var(--text-muted)]">{description}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                data-close
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 -mt-1 shrink-0 rounded-[10px] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
              >
                <X size={18} weight="bold" />
              </button>
            )}
          </div>
        )}

        <div className="px-5 pb-5">{children}</div>

        {footer && (
          <div className="sticky bottom-0 flex gap-2.5 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
