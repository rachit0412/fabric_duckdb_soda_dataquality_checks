import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BarChart2, TrendingUp, PieChart as PieIcon, Activity, ExternalLink } from 'lucide-react';
import { getCheckPlans, getRuns, getRunMetrics, getPlanTrend } from '../api/client';
import type { CheckPlan, Run, RunMetrics, TrendDataPoint } from '../types';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  RadialBarChart, RadialBar,
} from 'recharts';

/* ─── palette ──────────────────────────────────────────────── */
const PASS_COLOR  = '#10b981';
const FAIL_COLOR  = '#f43f5e';
const WARN_COLOR  = '#f59e0b';
const ACCENT      = '#06b6d4';
const GLASS_BORD  = 'rgba(255,255,255,0.10)';
const TEXT_MUTED  = 'rgba(255,255,255,0.38)';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a2e', border: `1px solid ${GLASS_BORD}`, borderRadius: 12, fontSize: 12 },
  labelStyle:   { color: 'rgba(255,255,255,0.85)' },
  cursor:       { fill: 'rgba(255,255,255,0.04)' },
};

const HEAT_COLORS = ['#f43f5e', '#f97316', '#f59e0b', '#84cc16', '#10b981'];
function heatColor(score: number) {
  const idx = Math.min(4, Math.floor(score / 21));
  return HEAT_COLORS[idx];
}

/* ─── custom label for donut centre ────────────────────────── */
function DonutLabel({ cx, cy, rate }: { cx: number; cy: number; rate: number }) {
  return (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={26} fontWeight={700}>
        {rate.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={TEXT_MUTED} fontSize={11}>
        pass rate
      </text>
    </>
  );
}

export function Visualization() {
  const [searchParams] = useSearchParams();
  const requestedRunId = searchParams.get('runId') || '';

  const [plans,       setPlans]       = useState<CheckPlan[]>([]);
  const [runs,        setRuns]        = useState<Run[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [metrics,     setMetrics]     = useState<RunMetrics | null>(null);
  const [trend,       setTrend]       = useState<TrendDataPoint[]>([]);
  const [selectedPlan,    setSelectedPlan]    = useState('');
  const [selectedRunId,   setSelectedRunId]   = useState('');

  const completedRuns = runs.filter(r =>
    r.status === 'success' || r.status === 'failed' || r.status === 'warning'
  );

  useEffect(() => {
    (async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          getCheckPlans().catch(() => ({ data: [] })),
          getRuns().catch(() => ({ data: [] })),
        ]);
        const p = Array.isArray(pRes.data) ? pRes.data : [];
        const r = Array.isArray(rRes.data) ? rRes.data : [];
        setPlans(p);
        setRuns(r);

        const done = r.filter((x: Run) => x.status === 'success' || x.status === 'failed' || x.status === 'warning');
        const target = requestedRunId ? (done.find((x: Run) => x.id === requestedRunId) || done[0]) : done[0];
        if (target) { setSelectedRunId(target.id); loadMetrics(target.id); }
        if (p.length > 0) { setSelectedPlan(p[0].id); loadTrend(p[0].id); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [requestedRunId]);

  const loadMetrics = async (runId: string) => {
    setSelectedRunId(runId);
    try { const { data } = await getRunMetrics(runId); setMetrics(data); }
    catch { setMetrics(null); }
  };

  const loadTrend = async (planId: string) => {
    setSelectedPlan(planId);
    try {
      const { data } = await getPlanTrend(planId, 30);
      setTrend(Array.isArray(data) ? data : data?.data_points || data?.trend || []);
    } catch { setTrend([]); }
  };

  /* ─── derived chart data ──────────────────────────────────── */
  const donutData = metrics ? [
    { name: 'Passed', value: metrics.summary.passed,  fill: PASS_COLOR },
    { name: 'Failed', value: metrics.summary.failed,  fill: FAIL_COLOR },
    { name: 'Warned', value: metrics.summary.total_checks - metrics.summary.passed - metrics.summary.failed, fill: WARN_COLOR },
  ].filter(d => d.value > 0) : [];

  const radialData = metrics ? [{
    name: 'Quality',
    value: parseFloat(metrics.summary.pass_rate.toFixed(1)),
    fill: metrics.summary.pass_rate >= 80 ? PASS_COLOR : metrics.summary.pass_rate >= 50 ? WARN_COLOR : FAIL_COLOR,
  }] : [];

  const columnBars = metrics
    ? Object.entries(metrics.by_column)
        .map(([name, v]) => ({
          name: name.length > 22 ? name.slice(0, 20) + '…' : name,
          fullName: name,
          score: parseFloat(v.quality_score.toFixed(1)),
          passed: v.passed,
          failed: v.failed,
        }))
        .sort((a, b) => a.score - b.score)
    : [];

  const stackedTypeData = metrics
    ? Object.entries(metrics.by_check_type).map(([type, v]) => ({
        name: type,
        passed: v.passed,
        failed: v.failed,
      }))
    : [];

  const trendArea = trend.map(t => ({
    ...t,
    date: t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '',
    fail_rate: 100 - t.pass_rate,
  }));

  /* ─── heatmap: check × recent runs ───────────────────────── */
  // Build from by_column: one row per check, coloured by quality score
  const heatChecks = metrics
    ? Object.entries(metrics.by_column).map(([name, v]) => ({
        name,
        score: v.quality_score,
        passed: v.passed,
        failed: v.failed,
      }))
    : [];

  /* ─── loading / empty ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(255,255,255,0.08)' }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: ACCENT }} />
        </div>
      </div>
    );
  }

  const noData = completedRuns.length === 0 && plans.length === 0;

  if (noData) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.08)' }}>
            <PieIcon className="w-6 h-6 text-cyan-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No analysis data yet</h3>
          <p className="text-xs text-text-muted">Run at least one plan to populate graphs, trends, and outcome analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* ── pickers ── */}
      <div className="flex flex-wrap gap-3 animate-fade-up">
        {completedRuns.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider whitespace-nowrap">Run</label>
            <select className="input text-xs font-mono pr-8" value={selectedRunId}
              title="Select run" onChange={e => loadMetrics(e.target.value)}>
              {completedRuns.map(r => (
                <option key={r.id} value={r.id}>#{r.id.slice(0, 8)} — {r.status}</option>
              ))}
            </select>
          </div>
        )}
        {plans.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider whitespace-nowrap">Plan trend</label>
            <select className="input text-xs font-mono pr-8" value={selectedPlan}
              title="Select plan" onChange={e => loadTrend(e.target.value)}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {metrics && (
        <>
          {/* ══ ROW 1: KPI tiles ══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-up">
            {[
              { label: 'Total Checks', val: metrics.summary.total_checks, color: 'text-text-primary', icon: <Activity className="w-4 h-4" /> },
              { label: 'Passed',       val: metrics.summary.passed,        color: 'text-emerald-400',  icon: <span className="w-2 h-2 rounded-full inline-block" style={{ background: PASS_COLOR }} /> },
              { label: 'Failed',       val: metrics.summary.failed,        color: 'text-rose-400',     icon: <span className="w-2 h-2 rounded-full inline-block" style={{ background: FAIL_COLOR }} /> },
              { label: 'Pass Rate',    val: `${metrics.summary.pass_rate.toFixed(1)}%`,
                color: metrics.summary.pass_rate >= 80 ? 'text-emerald-400' : 'text-rose-400',
                icon: <TrendingUp className="w-4 h-4" /> },
            ].map(tile => (
              <Link key={tile.label} to={`/results?runId=${selectedRunId}`}
                className="card text-center hover:ring-1 hover:ring-white/10 transition-all cursor-pointer">
                <div className="flex items-center justify-center gap-1 text-text-muted mb-1">
                  {tile.icon}
                  <p className="text-[10px] font-mono uppercase tracking-wider">{tile.label}</p>
                </div>
                <p className={`text-3xl font-heading font-bold mt-0.5 ${tile.color}`}>{tile.val}</p>
              </Link>
            ))}
          </div>

          {/* ══ ROW 2: Donut + Radial gauge ══ */}
          <div className="grid gap-4 md:grid-cols-2 animate-fade-up">

            {/* Donut — pass/fail/warn distribution */}
            <div className="card">
              <SectionLabel icon={<PieIcon className="w-3.5 h-3.5" />} title="Check outcome distribution" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius="52%" outerRadius="72%"
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <DonutLabel
                      cx={0} cy={0}
                      rate={metrics.summary.pass_rate}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radial bar — overall quality score */}
            <div className="card flex flex-col items-center justify-center">
              <SectionLabel icon={<BarChart2 className="w-3.5 h-3.5" />} title="Overall quality score" />
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="55%"
                    innerRadius="50%" outerRadius="90%"
                    startAngle={205} endAngle={-25}
                    data={[{ name: 'bg', value: 100, fill: 'rgba(255,255,255,0.06)' }, ...radialData]}
                    barSize={22}
                  >
                    <RadialBar background={false} dataKey="value" cornerRadius={11} />
                    <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle"
                      fill="rgba(255,255,255,0.9)" fontSize={36} fontWeight={700}>
                      {metrics.summary.pass_rate.toFixed(0)}%
                    </text>
                    <text x="50%" y="68%" textAnchor="middle"
                      fill={TEXT_MUTED} fontSize={11}>
                      quality score
                    </text>
                    <Tooltip {...TOOLTIP_STYLE} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ══ ROW 3: Horizontal quality bars per check ══ */}
          {columnBars.length > 0 && (
            <div className="card animate-fade-up">
              <SectionLabel icon={<BarChart2 className="w-3.5 h-3.5" />} title="Quality score per check" />
              <div style={{ height: Math.max(200, columnBars.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={columnBars} layout="vertical" margin={{ left: 8, right: 48 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(val: number) => [`${val.toFixed(1)}%`, 'Quality score']}
                      labelFormatter={(_: unknown, payload: { payload?: { fullName?: string } }[]) => payload?.[0]?.payload?.fullName ?? ''}
                    />
                    <Bar dataKey="score" name="Quality %" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {columnBars.map((entry, i) => (
                        <Cell key={i} fill={entry.score >= 80 ? PASS_COLOR : entry.score >= 50 ? WARN_COLOR : FAIL_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══ ROW 4: Stacked by check type + Area trend ══ */}
          <div className="grid gap-4 md:grid-cols-2 animate-fade-up">

            {/* Stacked bar by check type */}
            {stackedTypeData.length > 0 && (
              <div className="card">
                <SectionLabel icon={<BarChart2 className="w-3.5 h-3.5" />} title="Pass / fail by check type" />
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedTypeData} margin={{ bottom: 24 }}>
                      <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill: TEXT_MUTED, fontSize: 10, fontFamily: 'JetBrains Mono' }} angle={-20} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={7}
                        formatter={v => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
                      <Bar dataKey="passed" name="Passed" stackId="a" fill={PASS_COLOR} radius={[0,0,0,0]} />
                      <Bar dataKey="failed" name="Failed" stackId="a" fill={FAIL_COLOR} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Area trend */}
            <div className="card">
              <SectionLabel icon={<TrendingUp className="w-3.5 h-3.5" />} title="Pass rate trend (30 days)" />
              {trendArea.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendArea}>
                      <defs>
                        <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PASS_COLOR}  stopOpacity={0.25} />
                          <stop offset="95%" stopColor={PASS_COLOR}  stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={FAIL_COLOR} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={FAIL_COLOR} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(1)}%`]} />
                      <Area type="monotone" dataKey="pass_rate" name="Pass rate" stroke={PASS_COLOR} strokeWidth={2} fill="url(#passGrad)" dot={{ r: 3, fill: PASS_COLOR, strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="fail_rate" name="Fail rate" stroke={FAIL_COLOR} strokeWidth={1.5} strokeDasharray="5 3" fill="url(#failGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center">
                  <p className="text-xs text-text-muted">No trend data yet — run this plan multiple times to build a trend.</p>
                </div>
              )}
            </div>
          </div>

          {/* ══ ROW 5: Check quality scoreboard ══ */}
          {heatChecks.length > 0 && (
            <div className="card animate-fade-up">
              <SectionLabel icon={<Activity className="w-3.5 h-3.5" />} title="Check quality scoreboard" />
              <div className="space-y-1">
                {[...heatChecks].sort((a, b) => a.score - b.score).map((c, i) => (
                  <Link
                    key={i}
                    to={`/results?runId=${selectedRunId}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 cursor-pointer group"
                  >
                    <span className="text-sm font-bold font-mono w-12 text-right shrink-0"
                      style={{ color: heatColor(c.score) }}>
                      {c.score.toFixed(0)}%
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-text-primary font-mono truncate">{c.name}</span>
                        <span className="text-[10px] font-mono shrink-0 ml-2">
                          {c.passed > 0 && <span className="text-emerald-500">{c.passed}✓</span>}
                          {c.failed > 0 && <span className="text-rose-500 ml-1">{c.failed}✗</span>}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${c.score}%`, background: heatColor(c.score) }} />
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-50 shrink-0 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!metrics && !loading && (
        <div className="card text-center py-12 animate-fade-up">
          <p className="text-sm text-text-muted">Select a completed run above to load charts.</p>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Graphs &amp; Analysis</h2>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary">Pass rates, outcome distribution, quality heatmap, and trend lines — all in one view.</p>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 text-text-muted">
      {icon}
      <p className="text-xs font-mono uppercase tracking-[0.18em]">{title}</p>
    </div>
  );
}

