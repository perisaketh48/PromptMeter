import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';

export default function AuthLayout() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="text-sm font-semibold">AI Token & Cost Intelligence</div>
        <button
          type="button"
          onClick={toggle}
          className="text-sm h-9 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☼' : '☾'}
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
