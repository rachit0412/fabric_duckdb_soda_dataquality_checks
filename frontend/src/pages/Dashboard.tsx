import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, FileSearch, FileCheck, PlayCircle, TrendingUp,
  ArrowRight, Zap, Activity, Cpu,
} from 'lucide-react';
import { healthCheck, getConnections, getCheckPlans, getRuns } from '../api/client';

export function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState({
    connections: 0,
    checkPlans: 0,
    runsToday: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [healthRes, connectionsRes, checkPlansRes, runsRes] = await Promise.all([
        healthCheck(),
        getConnections().catch(() => ({ data: [] })),
        getCheckPlans().catch(() => ({ data: [] })),
        getRuns().catch(() => ({ data: [] })),
      ]);

      setHealth(healthRes.data);

      const runs = runsRes.data || [];
      const today = new Date().toISOString().split('T')[0];
      const runsToday = runs.filter((r: any) => r.started_at?.startsWith(today));
      const successfulRuns = runs.filter((r: any) => r.status === 'success');

      setStats({
        connections: (connectionsRes.data || []).length,
        checkPlans: (checkPlansRes.data || []).length,
        runsToday: runsToday.length,
        successRate: runs.length > 0 ? Math.round((successfulRuns.length / runs.length) * 100) : 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const ringDeg = Math.round((stats.successRate / 100) * 360);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-10 h-10">
            <div className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--glass-border)' }} />
            <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#06b6d4' }} />
          </div>
          <p className="text-text-secondary text-sm font-mono">Initializing observatory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="animate-fade-up">
        <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">
          Mission Control
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Real-time data quality monitoring & observability
        </p>
      </div>

      {/* ── Bento Grid: Row 1 — Quality Ring (2-col) + 2 Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Quality Score Ring — spans 2 cols */}
        <div className="lg:col-span-2 card-hover animate-fade-up flex items-center gap-6">
          <div
            className="ring-gauge flex-shrink-0 w-28 h-28 rounded-full"
            style={{
              background: `conic-gradient(#06b6d4 0deg, #22d3ee ${ringDeg}deg, var(--ring-empty) ${ringDeg}deg, var(--ring-empty) 360deg)`,
              boxShadow: stats.successRate > 80 ? '0 0 30px rgba(6,182,212,0.15)' : '0 0 20px rgba(244,63,94,0.1)',
            }}
          >
            <div className="ring-gauge-inner">
              <div className="text-center">
                <span className="stat-number text-3xl text-glow-cyan">{stats.successRate}</span>
                <span className="text-sm font-heading" style={{ color: 'var(--accent-text)' }}>%</span>
                <p className="text-[10px] text-text-muted font-mono mt-0.5 uppercase tracking-wider">Quality</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">
              Overall Quality Score
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Composite score based on all check runs. Measures pass rate across volume, completeness, uniqueness, validity and freshness checks.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="pulse-dot-cyan" />
              <span className="text-xs text-text-muted font-mono">Live monitoring active</span>
            </div>
          </div>
        </div>

        {/* Stat: Active Connections */}
        <div className="card-hover animate-fade-up animate-delay-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">Sources</span>
          </div>
          <p className="stat-number">{stats.connections}</p>
          <p className="text-xs text-text-secondary mt-1">Active connections</p>
        </div>

        {/* Stat: Check Plans */}
        <div className="card-hover animate-fade-up animate-delay-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <FileCheck className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">Plans</span>
          </div>
          <p className="stat-number">{stats.checkPlans}</p>
          <p className="text-xs text-text-secondary mt-1">Check plans configured</p>
        </div>
      </div>

      {/* ── Bento Grid: Row 2 — 2 Stats + Health Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Stat: Runs Today */}
        <div className="card-hover animate-fade-up animate-delay-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <PlayCircle className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">Today</span>
          </div>
          <p className="stat-number">{stats.runsToday}</p>
          <p className="text-xs text-text-secondary mt-1">Executions today</p>
        </div>

        {/* Stat: Trend */}
        <div className="card-hover animate-fade-up animate-delay-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">Trend</span>
          </div>
          <p className="stat-number">{stats.successRate > 0 ? '↑' : '—'}</p>
          <p className="text-xs text-text-secondary mt-1">Quality trend</p>
        </div>

        {/* Health Panel — spans 2 cols */}
        {health && (
          <div className="lg:col-span-2 card-hover animate-fade-up animate-delay-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-text-muted" />
                <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">System Status</span>
              </div>
              <span className={`badge ${health.status === 'ok' ? 'badge-success' : 'badge-error'}`}>
                <Activity className="w-3 h-3" />
                {health.status === 'ok' ? 'Operational' : 'Degraded'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'API', value: health.status, ok: health.status === 'ok' },
                { label: 'Database', value: health.database, ok: health.database === 'connected' },
                { label: 'Version', value: health.version, ok: true },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={s.ok ? 'pulse-dot-emerald' : 'pulse-dot-rose'} />
                    <span className="text-[10px] text-text-muted font-mono uppercase">{s.label}</span>
                  </div>
                  <p className="text-sm font-mono text-text-primary">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="animate-fade-up animate-delay-300">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/connections', icon: Database, label: 'Add Connection', desc: 'Link a data source', color: '#06b6d4' },
            { href: '/metadata', icon: FileSearch, label: 'Profile Metadata', desc: 'Explore your schema', color: '#8b5cf6' },
            { href: '/check-plans', icon: FileCheck, label: 'Create Check Plan', desc: 'Define quality rules', color: '#10b981' },
          ].map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="group glass-hover rounded-2xl p-4 flex items-center gap-4"
              style={{ borderStyle: 'dashed' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-glow-cyan"
                style={{ background: `${action.color}15` }}>
                <action.icon className="w-4 h-4 transition-colors duration-200" style={{ color: action.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{action.label}</p>
                <p className="text-xs text-text-muted">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-dim group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Getting Started ── */}
      <div className="card animate-fade-up animate-delay-400"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, rgba(139,92,246,0.03) 100%)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', boxShadow: '0 0 16px rgba(6,182,212,0.2)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-heading font-semibold text-text-primary">Getting Started</h3>
            <p className="text-xs text-text-muted">Follow the workflow to begin monitoring</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { n: 1, text: 'Create a database connection to your data source' },
            { n: 2, text: 'Profile metadata to understand your data structure' },
            { n: 3, text: 'Get AI-powered suggestions for quality checks' },
            { n: 4, text: 'Create and execute check plans to monitor quality' },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold"
                style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-text)', boxShadow: '0 0 10px rgba(6,182,212,0.1)' }}>
                {step.n}
              </span>
              <p className="text-xs text-text-secondary leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
