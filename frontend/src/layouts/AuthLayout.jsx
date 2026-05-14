import { Outlet } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";

export default function AuthLayout() {
  const { theme, toggle } = useTheme();
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="text-sm font-semibold">PromptMeter</div>
        <button
          type="button"
          onClick={toggle}
          className="px-3 text-sm border rounded-md h-9 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☼" : "☾"}
        </button>
      </header>
      <main className="flex items-center justify-center flex-1 px-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
