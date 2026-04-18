import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Database, FileSearch, Lightbulb, FileCheck, PlayCircle,
  BarChart3, LineChart, LayoutDashboard, Activity, Sun, Moon,
} from 'lucide-react';
import { useTheme } from './ThemeContext';

export function Layout() {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Connections', href: '/connections', icon: Database },
    { name: 'Metadata', href: '/metadata', icon: FileSearch },
    { name: 'Suggestions', href: '/suggestions', icon: Lightbulb },
    { name: 'Check Plans', href: '/check-plans', icon: FileCheck },
    { name: 'Runs', href: '/runs', icon: PlayCircle },
    { name: 'Results', href: '/results', icon: BarChart3 },
    { name: 'Visualization', href: '/visualization', icon: LineChart },
  ];

  const currentPage = navigation.find(n => n.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(145deg, var(--bg-from) 0%, var(--bg-mid) 50%, var(--bg-to) 100%)' }}>

      {/* ── Icon Rail ── */}
      <aside className="fixed inset-y-0 left-0 z-40 w-[60px] flex flex-col items-center py-4"
        style={{ background: 'var(--rail-bg)', backdropFilter: 'blur(24px)', borderRight: '1px solid var(--rail-border)' }}>

        {/* Logo Mark */}
        <div className="mb-6 relative group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}>
            <Activity className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="rail-tooltip">Data Observatory</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `rail-item ${isActive ? 'rail-item-active' : ''}`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span className="rail-tooltip">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom: theme toggle + status */}
        <div className="mt-auto flex flex-col items-center gap-2">
          <button onClick={toggle} className="theme-toggle" title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            {theme === 'dark' ? <Sun className="w-[16px] h-[16px]" /> : <Moon className="w-[16px] h-[16px]" />}
          </button>
          <div className="rail-item group">
            <span className="pulse-dot-emerald" />
            <span className="rail-tooltip">System Healthy</span>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-h-screen ml-[60px]">

        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-6"
          style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--topbar-border)' }}>
          {/* Left: Section */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Observatory</span>
            <span style={{ color: 'var(--text-4)' }}>/</span>
            <span className="text-sm font-heading font-medium" style={{ color: 'var(--accent-text)' }}>{currentPage}</span>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="pulse-dot-emerald" />
              <span className="font-mono" style={{ color: 'var(--text-2)' }}>API Connected</span>
            </div>
            <div className="h-4 w-px" style={{ background: 'var(--divider)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>v1.0.1</span>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-auto dot-grid">
          <div className="max-w-[1280px] mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
