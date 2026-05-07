const VARIANTS = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 ' +
    'dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500',
  secondary:
    'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100 ' +
    'dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800',
  ghost:
    'bg-transparent text-neutral-700 hover:bg-neutral-100 ' +
    'dark:text-neutral-300 dark:hover:bg-neutral-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  loading = false,
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
