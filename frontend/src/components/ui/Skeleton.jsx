export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-800 ${className}`}
      aria-hidden
    />
  );
}
