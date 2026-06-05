import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Database,
  FileCheck,
  FileSearch,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Moon,
  PlayCircle,
  Sun,
} from 'lucide-react';
import { useTheme } from './ThemeContext';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Connections', href: '/connections', icon: Database },
  { name: 'Metadata', href: '/metadata', icon: FileSearch },
  { name: 'AI Suggestions', href: '/suggestions', icon: Lightbulb },
  { name: 'Check Plans', href: '/check-plans', icon: FileCheck },
  { name: 'Runs', href: '/runs', icon: PlayCircle },
  { name: 'Results', href: '/results', icon: BarChart3 },
  { name: 'Visualization', href: '/visualization', icon: LineChart },
];

export function Layout() {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const currentPage = NAV_ITEMS.find((item) => item.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="app-shell min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="ambient-shell" />

      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="shell-bar mx-auto max-w-[1380px] px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="brand-mark">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
                    Data quality workflow
                  </p>
                </div>
                <h1 className="truncate text-lg font-semibold sm:text-xl" style={{ color: 'var(--text-1)' }}>
                  {currentPage}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 xl:justify-end">
              <span className="shell-chip">
                <span className="pulse-dot-emerald" />
                API Connected
              </span>
              <span className="shell-chip">v1.0.1</span>
              <button
                onClick={toggle}
                className="theme-toggle"
                title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                type="button"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => `shell-nav-item ${isActive ? 'shell-nav-item-active' : ''}`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-[1380px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
