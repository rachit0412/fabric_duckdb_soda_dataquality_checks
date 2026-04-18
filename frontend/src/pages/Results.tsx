import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { getRuns, getRunResults } from '../api/client';
import type { Run, RunResults } from '../types';

export function Results() {
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
        if (completed.length > 0) {
          loadResults(completed[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === 'fail') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const statusBadge = (status: string) => {
    if (status === 'pass') return 'badge-success';
    if (status === 'fail') return 'badge-error';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Results</h2>
          <p className="mt-1 text-sm text-text-secondary">Detailed check results and analysis</p>
        </div>
        {completedRuns.length > 0 && (
          <div className="relative">
            <select className="input pr-8 text-xs font-mono" value={selectedRunId || ''} onChange={e => loadResults(e.target.value)}>
              {completedRuns.map(r => (
                <option key={r.id} value={r.id}>Run #{r.id.slice(0, 8)} — {r.status}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loadingResults && (
        <div className="card text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" /></div>
      )}

      {results && !loadingResults && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 animate-fade-up">
            {[
              { label: 'Total', value: results.summary.total_checks, color: 'text-text-primary' },
              { label: 'Passed', value: results.summary.passed, color: 'text-emerald-400' },
              { label: 'Failed', value: results.summary.failed, color: 'text-rose-400' },
              { label: 'Pass Rate', value: `${results.summary.pass_rate_percent.toFixed(1)}%`, color: results.summary.pass_rate_percent >= 80 ? 'text-emerald-400' : 'text-rose-400' },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <p className="text-xs text-text-muted uppercase tracking-wider font-mono">{s.label}</p>
                <p className={`text-2xl font-heading font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Individual Results */}
          <div className="space-y-2">
            {results.results.map((r, i) => (
              <div key={i} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(r.status)}
                    <div>
                      <h4 className="text-sm font-heading font-medium text-text-primary">{r.check_name}</h4>
                      <p className="text-xs text-text-muted font-mono">{r.check_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.message && <span className="text-xs text-text-secondary max-w-xs truncate">{r.message}</span>}
                    <span className={`badge ${statusBadge(r.status)}`}>{r.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {completedRuns.length === 0 && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(139,92,246,0.08)' }}>
            <BarChart3 className="w-6 h-6 text-violet-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No results yet</h3>
          <p className="text-xs text-text-muted">Execute a check plan to see detailed results here.</p>
        </div>
      )}
    </div>
  );
}
