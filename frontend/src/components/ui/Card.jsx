export function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white shadow-sm
        dark:bg-neutral-900 dark:border-neutral-800 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`px-5 pt-5 pb-3 flex items-start justify-between gap-3 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {subtitle && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>;
}
