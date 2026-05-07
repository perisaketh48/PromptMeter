import { forwardRef } from 'react';

const baseClasses = `w-full h-10 px-3 rounded-lg border bg-white text-neutral-900
  border-neutral-300 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400
  dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:placeholder-neutral-500 dark:focus:ring-neutral-500`;

export const Input = forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`${baseClasses} ${className}`} {...rest} />;
});

export const Select = forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={`${baseClasses} pr-9 ${className}`} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`${baseClasses} h-auto py-2 resize-y min-h-[80px] ${className}`}
      {...rest}
    />
  );
});

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400 block">{error}</span>
      ) : hint ? (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">{hint}</span>
      ) : null}
    </label>
  );
}
