import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widths[size]} bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl
          flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
