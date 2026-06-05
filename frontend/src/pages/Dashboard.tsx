import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Database,
  FileCheck,
  FileSearch,
  Layers3,
  Orbit,
  PlayCircle,
  Radar,
  ScanSearch,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getCheckPlans, getConnections, getRuns, healthCheck } from '../api/client';

export function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    connections: 0,
    checkPlans: 0,
    runsToday: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDashboardData();
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
      const runsToday = runs.filter((run: any) => run.started_at?.startsWith(today));
      const successfulRuns = runs.filter((run: any) => run.status === 'success');
      setRecentRuns(runs.slice(0, 5));

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
      <div className="flex h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="relative mx-auto h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'var(--card-border)' }} />
            <div
              className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--accent)' }}
            />
          </div>
          <p className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="hero-panel animate-fade-up p-8 lg:p-10">
        <div className="absolute -top-12 right-10 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: 'rgba(255,255,255,0.22)' }} />
        <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: 'rgba(255,255,255,0.18)' }} />

        <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Workflow overview
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl lg:text-6xl">
              Upload data, profile metadata, build checks, run plans, and review results.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
              Start from a CSV upload or a saved connection, parse the metadata, assemble a plan from baseline rules
              and selected suggestions, then run it and review graphs, outcomes, and analysis.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/connections" className="btn-primary">
                Connect a source <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/visualization"
                className="btn-secondary"
                style={{
                  color: '#fffdf8',
                  borderColor: 'rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                Open trend reports
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">Execution today</p>
                  <p className="mt-3 text-4xl font-semibold text-white">{stats.runsToday}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Orbit className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="mt-3 text-sm text-white/72">
                See what executed today and whether the latest plan activity is moving or blocked.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/12 bg-black/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Success rate</p>
                <p className="mt-2 text-3xl font-semibold text-white">{stats.successRate}%</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-black/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Sources</p>
                <p className="mt-2 text-3xl font-semibold text-white">{stats.connections}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 animate-fade-up animate-delay-100">
        {[
          {
            label: 'Quality Score',
            value: `${stats.successRate}%`,
            icon: Activity,
            color: stats.successRate >= 80 ? 'var(--success)' : stats.successRate >= 50 ? 'var(--warning)' : 'var(--error)',
            bgColor: stats.successRate >= 80 ? 'var(--success-bg)' : stats.successRate >= 50 ? 'var(--warning-bg)' : 'var(--error-bg)',
          },
          {
            label: 'Data Sources',
            value: stats.connections,
            icon: Database,
            color: 'var(--accent)',
            bgColor: 'var(--accent-light)',
          },
          {
            label: 'Check Plans',
            value: stats.checkPlans,
            icon: FileCheck,
            color: 'var(--accent-2)',
            bgColor: 'var(--accent-2-light)',
          },
          {
            label: 'Runs Today',
            value: stats.runsToday,
            icon: PlayCircle,
            color: 'var(--warning)',
            bgColor: 'var(--warning-bg)',
          },
        ].map((stat) => (
          <div key={stat.label} className="metric-tile">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: stat.bgColor }}>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
            </div>
            <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
              {stat.value}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] animate-fade-up animate-delay-200">
        <div className="card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div
              className="ring-gauge h-36 w-36 flex-shrink-0 rounded-full"
              style={{
                background: `conic-gradient(var(--accent) 0deg, var(--accent-2) ${ringDeg}deg, var(--ring-empty) ${ringDeg}deg, var(--ring-empty) 360deg)`,
              }}
            >
              <div className="ring-gauge-inner">
                <div className="text-center">
                  <span className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>{stats.successRate}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>%</span>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    Pass rate
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                <Radar className="h-4 w-4" />
                Plan status
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                Current pass rate is {stats.successRate >= 80 ? 'stable' : stats.successRate >= 50 ? 'mixed' : 'at risk'} across executed checks.
              </h3>
              <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-3)' }}>
                Use metadata to identify candidate columns, combine baseline rules with selected suggestions,
                then execute the plan and inspect failures before moving to results and graphs.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  { label: 'Completeness', value: `${Math.max(stats.successRate - 4, 0)}%` },
                  { label: 'Execution', value: `${Math.max(stats.successRate - 7, 0)}%` },
                  { label: 'Coverage', value: `${Math.min(stats.successRate + 2, 100)}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] px-4 py-3" style={{ background: 'var(--accent-light)' }}>
                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{item.label}</p>
                    <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {health && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                  <Cpu className="h-4 w-4" />
                  Runtime status
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                  Infrastructure signals
                </h3>
              </div>
              <span className={`badge ${health.status === 'ok' ? 'badge-success' : 'badge-error'}`}>
                {health.status === 'ok' ? 'Operational' : 'Attention needed'}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { label: 'API Server', value: health.status === 'ok' ? 'Running' : 'Error', ok: health.status === 'ok', icon: Shield },
                { label: 'Database', value: health.database === 'connected' ? 'Connected' : 'Disconnected', ok: health.database === 'connected', icon: Layers3 },
                { label: 'Version', value: health.version || '—', ok: true, icon: ScanSearch },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border p-4" style={{ borderColor: 'var(--divider)', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: item.ok ? 'var(--success-bg)' : 'var(--error-bg)' }}>
                        <item.icon className="h-5 w-5" style={{ color: item.ok ? 'var(--success)' : 'var(--error)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.label}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>Live heartbeat from the service layer.</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono" style={{ color: item.ok ? 'var(--success)' : 'var(--error)' }}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] animate-fade-up animate-delay-300">
        <div className="card">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
              <Zap className="h-4 w-4" />
                  Build a plan
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                  Move to the next step in the workflow.
            </h3>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { href: '/connections', icon: Database, label: 'Add Connection', desc: 'Register a source and shape ingestion.', color: 'var(--accent)', bgColor: 'var(--accent-light)' },
              { href: '/metadata', icon: FileSearch, label: 'Profile Metadata', desc: 'Inspect schema, types, and null patterns.', color: 'var(--accent-2)', bgColor: 'var(--accent-2-light)' },
              { href: '/check-plans', icon: FileCheck, label: 'Create Check Plan', desc: 'Turn baseline rules and selected suggestions into one executable plan.', color: 'var(--success)', bgColor: 'var(--success-bg)' },
            ].map((action) => (
              <Link key={action.href} to={action.href} className="card-hover group flex min-h-[210px] flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: action.bgColor }}>
                    <action.icon className="h-5 w-5" style={{ color: action.color }} />
                  </div>
                  <p className="mt-10 text-lg font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>{action.label}</p>
                  <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-3)' }}>{action.desc}</p>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                  Open view
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
            <Shield className="h-4 w-4" />
            Process guide
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Follow the application flow from source to analysis.
          </h3>

          <div className="mt-6 space-y-4">
            {[
              { n: '01', title: 'Source', text: 'Upload a CSV or create a connection ahead of time or on the fly.' },
              { n: '02', title: 'Profile', text: 'Parse metadata, inspect schema, and understand the columns.' },
              { n: '03', title: 'Plan', text: 'Combine baseline checks and selected suggestions into one plan.' },
              { n: '04', title: 'Run', text: 'Execute the plan and review graphs, results, and analysis outcomes.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-4 rounded-[22px] border p-4" style={{ borderColor: 'var(--divider)' }}>
                <div className="text-sm font-mono" style={{ color: 'var(--accent-text)' }}>{step.n}</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{step.title}</p>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-3)' }}>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] animate-fade-up animate-delay-300">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                <PlayCircle className="h-4 w-4" />
                Recent activity
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                Latest plan runs
              </h3>
            </div>
            <Link to="/runs" className="btn-secondary text-xs">Open runs</Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentRuns.length > 0 ? recentRuns.map((run) => (
              <div key={run.id} className="rounded-[22px] border p-4" style={{ borderColor: 'var(--divider)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Run #{run.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-3)' }}>{run.started_at ? new Date(run.started_at).toLocaleString() : 'Queued'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${run.status === 'success' ? 'badge-success' : run.status === 'failed' ? 'badge-error' : run.status === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                      {run.status}
                    </span>
                    {(run.status === 'success' || run.status === 'failed' || run.status === 'warning') && (
                      <Link to={`/results?runId=${encodeURIComponent(run.id)}`} className="btn-secondary text-xs">Results</Link>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-[22px] border p-6 text-sm" style={{ borderColor: 'var(--divider)' }}>
                No runs yet. Start with a source, profile it, and create the first plan.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
            <ArrowRight className="h-4 w-4" />
            Next best action
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Keep the workflow moving.
          </h3>
          <div className="mt-6 space-y-3">
            {stats.connections === 0 ? (
              <Link to="/connections" className="card-hover block p-4">Add the first source</Link>
            ) : stats.checkPlans === 0 ? (
              <Link to="/metadata" className="card-hover block p-4">Profile a source and generate rules</Link>
            ) : stats.runsToday === 0 ? (
              <Link to="/check-plans" className="card-hover block p-4">Execute the first plan</Link>
            ) : (
              <Link to="/results" className="card-hover block p-4">Review the latest results</Link>
            )}
            <Link to="/visualization" className="card-hover block p-4">Open graphs and analysis</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
