import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, XCircle, AlertTriangle, Loader2, Activity, ArrowRight, ListFilter } from 'lucide-react';
import { getRuns, getRunResults } from '../api/client';
import type { Run, RunResults } from '../types';

export function Results() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get('runId') || '';
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [results, setResults] = useState<RunResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getRuns();
        const arr = Array.isArray(data) ? data : [];
        setRuns(arr);
        const completed = arr.filter((r: Run) => r.status === 'success' || r.status === 'failed' || r.status === 'warning');
        const requestedRun = requestedRunId ? completed.find((run) => run.id === requestedRunId) : null;
        if (requestedRun) {
          loadResults(requestedRun.id);
          setSearchParams({}, { replace: true });
        } else if (completed.length > 0) {
          loadResults(completed[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [requestedRunId, setSearchParams]);

  const loadResults = async (runId: string) => {
    setSelectedRunId(runId);
    setLoadingResults(true);
    try {
      const { data } = await getRunResults(runId);
      setResults(data);
    } catch (e) {
      console.error('Failed to load results:', e);
      setResults(null);
    } finally {
      setLoadingResults(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'pass' || status === 'passed' || status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === 'fail' || status === 'failed' || status === 'error') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const statusBadge = (status: string) => {
    if (status === 'pass' || status === 'passed' || status === 'success') return 'badge-success';
    if (status === 'fail' || status === 'failed' || status === 'error') return 'badge-error';
    return 'badge-warning';
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

  const completedRuns = runs.filter(r => r.status === 'success' || r.status === 'failed' || r.status === 'warning');
  const selectedRun = completedRuns.find((run) => run.id === selectedRunId) || null;

  return (
    <div className="space-y-6">
      <section className="hero-panel animate-fade-up p-8 lg:p-10">
        <div className="absolute -top-10 right-8 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: 'rgba(255,255,255,0.22)' }} />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80">
              <Activity className="h-3.5 w-3.5" />
              Run results
            </div>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              Review the outcome of the executed plan.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
              Use this page to inspect pass rates, failed checks, and the detailed outcome for each rule after the plan runs.
            </p>
          </div>

          {completedRuns.length > 0 && (
            <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Selected run</p>
              <select className="input mt-4 pr-8 text-xs font-mono" value={selectedRunId || ''} onChange={e => loadResults(e.target.value)}>
                {completedRuns.map(r => (
                  <option key={r.id} value={r.id}>Run #{r.id.slice(0, 8)} — {r.status}</option>
                ))}
              </select>
              {selectedRun?.started_at && (
                <p className="mt-3 text-sm text-white/72">Started {new Date(selectedRun.started_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {loadingResults && (
        <div className="card text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--accent)' }} /></div>
      )}

      {results && !loadingResults && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 animate-fade-up">
            {[
              { label: 'Total', value: results.summary.total_checks, color: 'text-text-primary' },
              { label: 'Passed', value: results.summary.passed, color: 'text-emerald-400' },
              { label: 'Failed', value: results.summary.failed, color: 'text-rose-400' },
              { label: 'Pass Rate', value: `${results.summary.pass_rate_percent.toFixed(1)}%`, color: results.summary.pass_rate_percent >= 80 ? 'text-emerald-400' : 'text-rose-400' },
            ].map(s => (
              <div key={s.label} className="metric-tile text-center">
                <p className="text-xs text-text-muted uppercase tracking-wider font-mono">{s.label}</p>
                <p className={`text-2xl font-heading font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] animate-fade-up animate-delay-100">
            <div className="card">
              <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                <ListFilter className="h-4 w-4" />
                Result summary
              </div>
              <div className="space-y-3">
                <div className="rounded-[22px] border p-4" style={{ borderColor: 'var(--divider)' }}>
                  <p className="text-xs font-mono uppercase" style={{ color: 'var(--text-3)' }}>Run status</p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{selectedRun?.status || 'Loaded'}</p>
                </div>
                <div className="rounded-[22px] border p-4" style={{ borderColor: 'var(--divider)' }}>
                  <p className="text-xs font-mono uppercase" style={{ color: 'var(--text-3)' }}>Checks returning issues</p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{results.summary.failed + (results.summary.total_checks - results.summary.passed - results.summary.failed)}</p>
                </div>
                <div className="rounded-[22px] border p-4" style={{ borderColor: 'var(--divider)' }}>
                  <p className="text-xs font-mono uppercase" style={{ color: 'var(--text-3)' }}>Recommended next step</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>Inspect failed rules first, then compare runs and use the graphs and analysis views to understand the impact.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {results.results.map((r, i) => (
                <div key={i} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap lg:flex-nowrap">
                    <div className="flex items-start gap-3">
                      {statusIcon(r.status)}
                      <div>
                        <h4 className="text-sm font-heading font-medium text-text-primary">{r.check_name}</h4>
                        <p className="text-xs text-text-muted font-mono">{r.check_type}</p>
                        {r.message && <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>{r.message}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${statusBadge(r.status)}`}>{r.status.toUpperCase()}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                        Inspect <ArrowRight className="inline-block h-3.5 w-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {completedRuns.length === 0 && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-2-light)' }}>
            <BarChart3 className="w-6 h-6" style={{ color: 'var(--accent-2)' }} />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No results yet</h3>
          <p className="text-xs text-text-muted">Execute a check plan to see detailed results here.</p>
        </div>
      )}
    </div>
  );
}
