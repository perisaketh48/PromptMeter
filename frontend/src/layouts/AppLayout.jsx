import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◰' },
  { to: '/estimate', label: 'Estimator', icon: '∑' },
  { to: '/usage', label: 'Usage', icon: '⌨' },
  { to: '/budgets', label: 'Budgets', icon: '◬' },
  { to: '/credentials', label: 'Keys', icon: '⌥' },
  { to: '/subscription', label: 'Plan', icon: '◐' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: '◇' },
  { to: '/admin/users', label: 'Users', icon: '◯' },
  { to: '/admin/providers', label: 'Providers', icon: '☷' },
  { to: '/admin/models', label: 'Models', icon: '⌗' },
  { to: '/admin/feedback', label: 'Feedback', icon: '✎' },
];

function NavItem({ to, label, icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
        ${isActive
          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}`
      }
    >
      <span className="font-mono text-xs w-4 text-center">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function Sidebar({ user }) {
  const isAdmin = user?.is_staff || user?.role === 'admin';
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-4 sticky top-0 h-screen">
      <div className="px-2 mb-6">
        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">AI Token & Cost</div>
        <div className="text-xs text-neutral-500">Intelligence platform</div>
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} end={item.to === '/'} />
        ))}
      </nav>
      {isAdmin && (
        <div className="mt-6">
          <div className="px-3 text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Admin</div>
          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => (
              <NavItem key={item.to} {...item} end={item.to === '/admin'} />
            ))}
          </nav>
        </div>
      )}
      <div className="mt-auto pt-4 text-[11px] text-neutral-500">
        v1.0.0
      </div>
    </aside>
  );
}

function BottomNav({ user }) {
  const items = NAV.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur">
      <div className="flex justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 px-3 text-[10px] ${
                isActive
                  ? 'text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500'
              }`
            }
          >
            <span className="font-mono text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Topbar({ user, onLogout }) {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
      <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <div className="md:hidden text-sm font-semibold">AI Token & Cost</div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={toggle}
          className="text-sm h-9 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? '☼' : '☾'}
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 h-9 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <span className="text-sm">{user?.full_name || user?.email}</span>
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden text-sm"
              onMouseLeave={() => setOpen(false)}
            >
              <div className="px-3 py-2 text-xs text-neutral-500 truncate">{user?.email}</div>
              <button
                className="block w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={onLogout}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          onLogout={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        />
        <main className="flex-1 px-4 md:px-6 py-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav user={user} />
    </div>
  );
}
