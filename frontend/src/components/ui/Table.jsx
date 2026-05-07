export function Table({ className = '', children }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 ${className}`}>
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 uppercase tracking-wide text-xs">
      {children}
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{children}</tbody>;
}

export function TR({ className = '', children, ...rest }) {
  return (
    <tr className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

export function TH({ className = '', children, ...rest }) {
  return (
    <th
      className={`px-4 py-2.5 text-left font-medium ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TD({ className = '', children, ...rest }) {
  return (
    <td className={`px-4 py-2.5 align-middle text-neutral-800 dark:text-neutral-200 ${className}`} {...rest}>
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children = 'No records.' }) {
  return (
    <TR>
      <TD colSpan={colSpan} className="text-center text-neutral-500 py-10">
        {children}
      </TD>
    </TR>
  );
}
