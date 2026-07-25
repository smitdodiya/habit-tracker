/**
 * Friendly empty state (brief §04, "404 / Empty State").
 * Every empty state pairs an illustration with a clear next action, so a blank
 * screen always tells the user what to do rather than just what is missing.
 */
export function EmptyState({ illustration: Illustration, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`}>
      {Illustration && <Illustration className="mb-5 h-36 w-auto max-w-[220px]" />}

      <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
