import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { executeCheckPlan, getRuns, getRunStatus } from '../api/client';
import type { Run } from '../types';

type RunProgressState = {
  status: string;
  progressPercent: number;
  errorMessage?: string;
};

export function Runs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState<Record<string, RunProgressState>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');
  const requestedPlanId = searchParams.get('planId') || '';
  const shouldAutoStart = searchParams.get('autoStart') === '1';
  const highlightedRunId = searchParams.get('runId') || '';

  useEffect(() => {
    void loadRuns();
  }, []);

  useEffect(() => {
    if (!requestedPlanId || !shouldAutoStart) {
      return;
    }

    let cancelled = false;
    let startedRunId = '';

    void (async () => {
      try {
        setStartingPlanId(requestedPlanId);
        const { data } = await executeCheckPlan(requestedPlanId);
        if (!cancelled && data?.run_id) {
          startedRunId = data.run_id;
          setRunProgress((current) => ({
            ...current,
            [data.run_id]: {
              status: data.status || 'pending',
              progressPercent: data.percent_complete || 0,
            },
          }));
          await loadRuns();
          setSearchParams({ runId: data.run_id }, { replace: true });
        }
      } catch (error) {
        console.error('Failed to start plan:', error);
      } finally {
        if (!cancelled) {
          setStartingPlanId(null);
          if (!startedRunId) {
            setSearchParams({}, { replace: true });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedPlanId, setSearchParams, shouldAutoStart]);

  useEffect(() => {
    const activeRuns = runs.filter((run) => run.status === 'pending' || run.status === 'running');
    if (activeRuns.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void Promise.all(activeRuns.map(async (run) => {
        try {
          const { data } = await getRunStatus(run.id);
          setRunProgress((current) => ({
            ...current,
            [run.id]: {
              status: data.status,
              progressPercent: data.progress_percent ?? 0,
              errorMessage: data.error_message || undefined,
            },
          }));
        } catch (error) {
          console.error(`Failed to refresh run status for ${run.id}:`, error);
        }
      }));

      void loadRuns(false);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [runs]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadRuns(false);
      }
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const loadRuns = async (toggleLoading = true) => {
    try {
      if (toggleLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const { data } = await getRuns();
      const nextRuns = Array.isArray(data) ? [...data] : [];
      nextRuns.sort((left, right) => {
        const rightTime = new Date(right.started_at || right.completed_at || 0).getTime();
        const leftTime = new Date(left.started_at || left.completed_at || 0).getTime();
        return rightTime - leftTime;
      });
      setRuns(nextRuns);
      setLastUpdatedAt(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      if (toggleLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { badge: string; icon: typeof CheckCircle2; label: string; dot: string }> = {
      success: { badge: 'badge-success', icon: CheckCircle2, label: 'Pass', dot: 'pulse-dot-emerald' },
      failed: { badge: 'badge-error', icon: XCircle, label: 'Fail', dot: 'pulse-dot-rose' },
      warning: { badge: 'badge-warning', icon: AlertTriangle, label: 'Warn', dot: 'pulse-dot-cyan' },
      running: { badge: 'badge-info', icon: PlayCircle, label: 'Running', dot: 'pulse-dot-cyan' },
      pending: { badge: 'badge', icon: Clock, label: 'Pending', dot: '' },
    };
    return configs[status] || configs.pending;
  };

  const getCurrentProgress = (run: Run, progress?: RunProgressState) => {
    if (run.status === 'success' || run.status === 'failed' || run.status === 'warning' || run.status === 'cancelled') {
      return 100;
    }

    if (typeof progress?.progressPercent === 'number') {
      return progress.progressPercent;
    }

    return run.status === 'running' ? 50 : 0;
  };

  const getTrackingLabel = (run: Run, progress?: RunProgressState) => {
    if (progress?.errorMessage) {
      return progress.errorMessage;
    }

    if (run.status === 'pending') {
      return 'Queued in backend and waiting to start';
    }

    if (run.status === 'running') {
      return 'Polling backend every 2 seconds for updated check progress';
    }

    if (run.status === 'success') {
      return 'Execution finished successfully';
    }

    if (run.status === 'failed') {
      return 'Execution finished with failing checks';
    }

    if (run.status === 'warning') {
      return 'Execution finished with warnings';
    }

    return 'Execution status updated';
  };

  const activeRunsCount = runs.filter((run) => run.status === 'pending' || run.status === 'running').length;

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

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Plan Runs</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">Execute assembled plans, monitor status and timing, and track pass or fail counts before reviewing the detailed results.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-info">
            <Activity className="w-3 h-3" />
            {activeRunsCount > 0 ? `${activeRunsCount} active run${activeRunsCount === 1 ? '' : 's'}` : 'No active runs'}
          </span>
          <button type="button" onClick={() => void loadRuns(false)} className="btn-secondary text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh now
          </button>
        </div>
        {startingPlanId && (
          <p className="mt-2 text-xs font-mono text-text-muted">Starting plan {startingPlanId.slice(0, 8)} and opening live run status...</p>
        )}
      </div>

      <div className="card animate-fade-up">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Run monitoring</p>
            <h3 className="mt-1 text-sm font-heading font-semibold text-text-primary">
              {activeRunsCount > 0 ? 'Backend polling is active for in-flight runs' : 'Run list is up to date'}
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              {activeRunsCount > 0
                ? 'The page refreshes running and pending executions every 2 seconds and refreshes again when you return to the tab.'
                : 'Completed runs stay visible here, and the page refreshes again when you come back to the tab or press refresh.'}
            </p>
          </div>
          <div className="text-xs font-mono text-text-muted">
            Last updated {lastUpdatedAt || 'just now'}
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(139,92,246,0.08)' }}>
            <PlayCircle className="w-6 h-6 text-violet-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No plan runs yet</h3>
          <p className="text-xs text-text-muted">Execute a plan to start reading the source, applying the checks, and producing results.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run, i) => {
            const sc = getStatusConfig(run.status);
            const StatusIcon = sc.icon;
            const progress = runProgress[run.id];
            const currentProgress = getCurrentProgress(run, progress);
            const isHighlighted = highlightedRunId === run.id;
            return (
              <div key={run.id} className={`card-hover animate-fade-up ${isHighlighted ? 'run-card-highlighted' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between gap-6 flex-wrap lg:flex-nowrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                      <PlayCircle className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-heading font-semibold text-text-primary">
                        Plan run <span className="font-mono" style={{ color: 'var(--accent-text)' }}>#{run.id.slice(0, 8)}</span>
                      </h3>
                      <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5 font-mono">
                        <Clock className="w-3 h-3 text-text-muted" />
                        {run.started_at ? new Date(run.started_at).toLocaleString() : 'Pending'}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-text-muted font-mono">Total <span className="text-text-secondary">{run.total_checks}</span></span>
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">Pass <span>{run.passed_checks}</span></span>
                        <span className="text-xs font-mono text-rose-600 dark:text-rose-400">Fail <span>{run.failed_checks}</span></span>
                      </div>
                      <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full" style={{ background: 'var(--glass-border)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${currentProgress}%`, background: 'var(--accent)' }} />
                      </div>
                      <p className="mt-2 text-xs text-text-muted font-mono">Progress {currentProgress}%</p>
                      <p className="mt-1 text-xs text-text-secondary">{getTrackingLabel(run, progress)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                    <span className={`badge ${sc.badge}`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </span>
                    {(run.status === 'success' || run.status === 'failed' || run.status === 'warning') ? (
                      <>
                        <Link to={`/results?runId=${encodeURIComponent(run.id)}`} className="btn-secondary text-xs">Open results</Link>
                        <Link to={`/visualization?runId=${encodeURIComponent(run.id)}`} className="btn-secondary text-xs">Open graphs</Link>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-text-muted">Waiting for completion before results are available</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
