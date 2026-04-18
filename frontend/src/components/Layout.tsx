import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Database, FileSearch, Lightbulb, FileCheck, PlayCircle,
  BarChart3, LineChart, LayoutDashboard, Activity,
} from 'lucide-react';

export function Layout() {
  const location = useLocation();

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
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(145deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)' }}>

      {/* ── Icon Rail ── */}
      <aside className="fixed inset-y-0 left-0 z-40 w-[60px] flex flex-col items-center py-4 glass border-r-0"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(24px)' }}>

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

        {/* Bottom: status */}
        <div className="mt-auto">
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
          style={{ background: 'rgba(10,14,26,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Left: Section */}
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-xs font-mono uppercase tracking-wider">Observatory</span>
            <span className="text-text-dim">/</span>
            <span className="text-cyan-400 text-sm font-heading font-medium">{currentPage}</span>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="pulse-dot-emerald" />
              <span className="text-text-secondary font-mono">API Connected</span>
            </div>
            <div className="h-4 w-px bg-white/[0.08]" />
            <span className="text-text-muted text-xs font-mono">v1.0.1</span>
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
