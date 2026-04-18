import { useState, useEffect } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import { getCheckPlans, getRuns, getRunMetrics, getPlanTrend } from '../api/client';
import type { CheckPlan, Run, RunMetrics, TrendDataPoint } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function Visualization() {
  const [plans, setPlans] = useState<CheckPlan[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RunMetrics | null>(null);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');

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

        // Auto-load latest completed run metrics
        const completed = r.filter((x: Run) => x.status === 'success' || x.status === 'failed' || x.status === 'warning');
        if (completed.length > 0) {
          loadRunMetrics(completed[0].id);
        }
        if (p.length > 0) {
          setSelectedPlan(p[0].id);
          loadTrend(p[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const loadRunMetrics = async (runId: string) => {
    try {
      const { data } = await getRunMetrics(runId);
      setMetrics(data);
    } catch { setMetrics(null); }
  };

  const loadTrend = async (planId: string) => {
    setSelectedPlan(planId);
    try {
      const { data } = await getPlanTrend(planId, 30);
      setTrend(Array.isArray(data) ? data : data?.trend || []);
    } catch { setTrend([]); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--glass-border)' }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#06b6d4' }} />
        </div>
      </div>
    );
  }

  const noData = plans.length === 0 && runs.length === 0;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Visualization</h2>
        <p className="mt-1 text-sm text-text-secondary">Quality metrics and trend analysis</p>
      </div>

      {noData ? (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.08)' }}>
            <LineChartIcon className="w-6 h-6 text-cyan-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No Data Yet</h3>
          <p className="text-xs text-text-muted">Execute check plans to see quality trends and metrics.</p>
        </div>
      ) : (
        <>
          {/* Run Metrics - Column quality */}
          {metrics && metrics.by_column && Object.keys(metrics.by_column).length > 0 && (
            <div className="card animate-fade-up">
              <h3 className="text-sm font-heading font-semibold text-text-primary mb-4">Quality Score by Column</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(metrics.by_column).map(([name, v]) => ({ name, score: v.quality_score * 100, passed: v.passed, failed: v.failed }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'var(--text-1)' }}
                    />
                    <Bar dataKey="score" name="Quality %" radius={[4, 4, 0, 0]}>
                      {Object.entries(metrics.by_column).map(([name, v]) => (
                        <Cell key={name} fill={v.quality_score >= 0.8 ? '#10b981' : v.quality_score >= 0.5 ? '#f59e0b' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {plans.length > 0 && (
            <div className="card animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-heading font-semibold text-text-primary">Pass Rate Trend</h3>
                <select className="input text-xs w-auto" value={selectedPlan} onChange={e => loadTrend(e.target.value)}>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {trend.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: 'var(--text-1)' }}
                      />
                      <Line type="monotone" dataKey="pass_rate" name="Pass Rate %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center py-8">No trend data available for this plan yet.</p>
              )}
            </div>
          )}

          {/* Summary stats */}
          {metrics && (
            <div className="grid grid-cols-4 gap-4 animate-fade-up">
              <div className="card text-center">
                <p className="text-xs text-text-muted font-mono uppercase">Total</p>
                <p className="text-2xl font-heading font-bold text-text-primary">{metrics.summary.total_checks}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-text-muted font-mono uppercase">Passed</p>
                <p className="text-2xl font-heading font-bold text-emerald-400">{metrics.summary.passed}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-text-muted font-mono uppercase">Failed</p>
                <p className="text-2xl font-heading font-bold text-rose-400">{metrics.summary.failed}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-text-muted font-mono uppercase">Pass Rate</p>
                <p className={`text-2xl font-heading font-bold ${metrics.summary.pass_rate >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(metrics.summary.pass_rate).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
