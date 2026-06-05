import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ArrowLeft, BarChart3, LineChart, Loader2,
} from 'lucide-react';
import { executeCheckPlan, getRuns, getRunStatus } from '../api/client';
import type { Run } from '../types';

/* ──────────────────────────────────────────── helpers ──── */
const STATUS_CFG = {
  success:   { badge: 'badge-success', icon: CheckCircle2, label: 'Passed'    },
  failed:    { badge: 'badge-error',   icon: XCircle,      label: 'Failed'    },
  warning:   { badge: 'badge-warning', icon: AlertTriangle, label: 'Warning'  },
  running:   { badge: 'badge-info',    icon: PlayCircle,   label: 'Running'   },
  pending:   { badge: 'badge',         icon: Clock,        label: 'Queued'    },
  cancelled: { badge: 'badge',         icon: XCircle,      label: 'Cancelled' },
} as const;

type StatusKey = keyof typeof STATUS_CFG;
const getCfg = (s: string) => STATUS_CFG[(s as StatusKey)] ?? STATUS_CFG.pending;
const isDone   = (s: string) => ['success','failed','warning','cancelled'].includes(s);
const isActive = (s: string) => ['pending','running'].includes(s);

const getProgress = (run: Run, live?: { progressPercent: number }): number => {
  if (isDone(run.status)) return 100;
  if (typeof live?.progressPercent === 'number') return live.progressPercent;
  return run.status === 'running' ? 50 : 5;
};

const STEPS = ['Queued', 'Running', 'Processing', 'Done'];
const stepIdx = (s: string) => {
  if (s === 'pending') return 0;
  if (s === 'running') return 2;
  return 3;
};

const doneBarColor = (s: string) =>
  s === 'success' ? '#10b981' : s === 'failed' ? '#f43f5e' : '#f59e0b';

/* ──────────────────────────────────────────── component ── */
export function Runs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [runs,        setRuns]        = useState<Run[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [liveStatus,  setLiveStatus]  = useState<Record<string, { status: string; progressPercent: number; errorMessage?: string }>>({});
  const [startingRun, setStartingRun] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const planIdParam   = searchParams.get('planId')    ?? '';
  const autoStart     = searchParams.get('autoStart') === '1';
  const trackedRunId  = searchParams.get('runId')     ?? '';

  const trackedRun  = trackedRunId ? runs.find(r => r.id === trackedRunId) : undefined;
  const trackedLive = trackedRun   ? liveStatus[trackedRun.id]              : undefined;
  const trackedPct  = trackedRun   ? getProgress(trackedRun, trackedLive)   : 0;
  const trackedSC   = trackedRun   ? getCfg(trackedRun.status)              : null;
  const trackedDone = trackedRun   ? isDone(trackedRun.status)              : false;
  const trackedActv = trackedRun   ? isActive(trackedRun.status)            : false;

  /* ── initial load ── */
  useEffect(() => { void loadRuns(true); }, []);

  /* ── auto-start when coming from CheckPlans ── */
  useEffect(() => {
    if (!planIdParam || !autoStart) return;
    let cancelled = false;
    setStartingRun(true);

    void (async () => {
      try {
        const { data } = await executeCheckPlan(planIdParam);
        if (!cancelled && data?.run_id) {
          await loadRuns(false);
          setSearchParams({ runId: data.run_id }, { replace: true });
        }
      } catch (err) {
        console.error('Failed to start plan:', err);
      } finally {
        if (!cancelled) setStartingRun(false);
      }
    })();

    return () => { cancelled = true; };
  }, [planIdParam, autoStart]);

  /* ── live polling ── */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    /* Watch active runs PLUS the tracked run (catches fast completions) */
    const toWatch = runs.filter(r => isActive(r.status) || r.id === trackedRunId);
    if (toWatch.length === 0 && !startingRun) return;

    pollRef.current = setInterval(async () => {
      let needsRefresh = startingRun;

      await Promise.all(toWatch.map(async run => {
        try {
          const { data } = await getRunStatus(run.id);
          setLiveStatus(prev => ({
            ...prev,
            [run.id]: {
              status:          data.status,
              progressPercent: data.progress_percent ?? 0,
              errorMessage:    data.error_message || undefined,
            },
          }));
          if (isDone(data.status)) needsRefresh = true;
        } catch { /* ignore */ }
      }));

      if (needsRefresh || toWatch.some(r => isActive(r.status))) {
        await loadRuns(false);
      }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [runs, trackedRunId, startingRun]);

  /* ── fetch status immediately for tracked run on load ── */
  useEffect(() => {
    if (!trackedRunId || !trackedRun) return;
    void (async () => {
      try {
        const { data } = await getRunStatus(trackedRunId);
        setLiveStatus(prev => ({
          ...prev,
          [trackedRunId]: {
            status:          data.status,
            progressPercent: data.progress_percent ?? 0,
            errorMessage:    data.error_message || undefined,
          },
        }));
      } catch { /* ignore */ }
    })();
  }, [trackedRunId, trackedRun?.id]);

  /* ── tab-focus refresh ── */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadRuns(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const loadRuns = async (spinner = false) => {
    if (spinner) setLoading(true);
    try {
      const { data } = await getRuns();
      const sorted = (Array.isArray(data) ? [...data] : []).sort((a, b) => {
        const bt = new Date(b.started_at || b.completed_at || 0).getTime();
        const at = new Date(a.started_at || a.completed_at || 0).getTime();
        return bt - at;
      });
      setRuns(sorted);
    } catch (e) { console.error(e); }
    finally { if (spinner) setLoading(false); }
  };

  /* ───────────────────────────────────────────── render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--glass-border)' }} />
          <div className="absolute inset-0 animate-spin rounded-full" style={{ border: '2px solid transparent', borderTopColor: 'var(--accent)' }} />
        </div>
      </div>
    );
  }

  const showHero = Boolean(trackedRunId || startingRun);

  return (
    <div className="space-y-5">

      {/* ── header ── */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Plan Runs</h2>
          <p className="mt-1 text-sm text-text-secondary">Execute plans, monitor progress, and open results.</p>
        </div>
        <button type="button" onClick={() => void loadRuns(false)} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ══ LIVE EXECUTION HERO ══ */}
      {showHero && (
        <div className="hero-panel animate-fade-up" style={{ padding: '2rem 2.25rem' }}>
          {/* decorative blobs */}
          <div className="absolute -top-10 right-8 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: 'rgba(255,255,255,0.3)' }} />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full opacity-15 blur-3xl" style={{ background: 'rgba(255,255,255,0.2)' }} />

          {/* top row: status + back */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap items-center gap-2">
              {trackedSC && (
                <span className={`badge ${trackedSC.badge} text-sm px-3 py-1`}>
                  <trackedSC.icon className="w-3.5 h-3.5" />
                  {trackedSC.label}
                </span>
              )}
              {(trackedActv || startingRun) && (
                <span className="badge badge-info text-xs">
                  <span className="pulse-dot-cyan mr-1" />
                  Live — refreshing every 2s
                </span>
              )}
            </div>
            <button type="button" onClick={() => navigate('/check-plans')} className="btn-secondary text-xs"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' }}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to plans
            </button>
          </div>

          {/* body */}
          <div className="relative z-10">
            {startingRun && !trackedRun ? (
              /* ── starting spinner ── */
              <div className="flex items-center gap-4">
                <Loader2 className="w-7 h-7 animate-spin text-white/70 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-xl">Starting execution…</p>
                  <p className="text-white/60 text-sm mt-0.5">Backend is receiving the plan and queuing checks.</p>
                </div>
              </div>
            ) : trackedRun ? (
              /* ── live run view ── */
              <>
                <p className="text-white/55 text-xs font-mono uppercase tracking-wider">Execution run</p>
                <h3 className="text-white text-3xl font-bold font-heading mt-0.5">
                  #{trackedRun.id.slice(0, 8)}
                </h3>
                <p className="text-white/60 text-sm mt-1">
                  {trackedRun.started_at
                    ? `Started ${new Date(trackedRun.started_at).toLocaleTimeString()}`
                    : 'Waiting to start'}
                  {trackedRun.completed_at
                    ? ` · Completed ${new Date(trackedRun.completed_at).toLocaleTimeString()}`
                    : ''}
                </p>

                {/* ── step stepper ── */}
                <div className="mt-5 flex flex-wrap items-center gap-0">
                  {STEPS.map((step, i) => {
                    const si = stepIdx(trackedRun.status);
                    const done  = i < si;
                    const active = i === si;
                    return (
                      <div key={step} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            done   ? 'bg-white/25 border-white/40 text-white' :
                            active ? 'bg-white border-white text-gray-900' :
                                     'bg-white/5 border-white/15 text-white/30'
                          }`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <p className={`text-[10px] font-mono mt-1 whitespace-nowrap ${
                            active ? 'text-white font-semibold' : 'text-white/40'
                          }`}>{step}</p>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 w-10 sm:w-14 mb-4 mx-1 rounded-full ${
                            done ? 'bg-white/35' : 'bg-white/10'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── progress bar ── */}
                <div className="mt-5 h-2.5 w-full rounded-full overflow-hidden bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${trackedPct}%`,
                      background: trackedDone ? doneBarColor(trackedRun.status) : 'rgba(255,255,255,0.85)',
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-white/50 font-mono">
                  <span>{trackedPct}% complete</span>
                  {trackedActv && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Auto-refreshing
                    </span>
                  )}
                </div>

                {/* ── stats grid ── */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total',  val: trackedRun.total_checks,  color: 'rgba(255,255,255,0.9)' },
                    { label: 'Passed', val: trackedRun.passed_checks,  color: trackedRun.passed_checks  > 0 ? '#34d399' : 'rgba(255,255,255,0.35)' },
                    { label: 'Failed', val: trackedRun.failed_checks,  color: trackedRun.failed_checks  > 0 ? '#f87171' : 'rgba(255,255,255,0.35)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-[20px] bg-white/10 p-3 text-center">
                      <p className="text-white/55 text-[11px] font-mono uppercase tracking-wider">{label}</p>
                      <p className="text-3xl font-bold mt-1" style={{ color }}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* ── error message ── */}
                {trackedDone && trackedLive?.errorMessage && (
                  <div className="mt-4 rounded-[16px] border border-rose-400/30 bg-rose-500/15 px-4 py-3">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-rose-300 mb-1">Execution error</p>
                    <pre className="text-xs text-rose-200 whitespace-pre-wrap break-words font-mono leading-relaxed">{trackedLive.errorMessage}</pre>
                    <p className="mt-2 text-[11px] text-white/50">Fix the checks YAML in <Link to="/check-plans" className="underline hover:text-white/80">Check Plans → Edit</Link> then re-execute.</p>
                  </div>
                )}

                {/* ── action buttons ── */}
                {trackedDone ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      to={`/results?runId=${encodeURIComponent(trackedRun.id)}`}
                      className="btn-primary"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View detailed results
                    </Link>
                    <Link
                      to={`/visualization?runId=${encodeURIComponent(trackedRun.id)}`}
                      className="btn-secondary"
                      style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' }}
                    >
                      <LineChart className="w-4 h-4" />
                      View graphs
                    </Link>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-white/45 font-mono">
                    Results and graphs will appear here once the run completes.
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ══ RUN HISTORY ══ */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading font-semibold text-text-primary">
            {runs.length > 0 ? `Run history (${runs.length})` : 'No runs yet'}
          </h3>
          <Link to="/check-plans" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            ← Check plans
          </Link>
        </div>

        {runs.length === 0 ? (
          <div className="card text-center py-12">
            <PlayCircle className="w-8 h-8 text-violet-400/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No plan runs yet</p>
            <p className="text-xs text-text-muted mb-4">Execute a plan from Check Plans to see runs here.</p>
            <Link to="/check-plans" className="btn-secondary text-xs mx-auto inline-flex">Go to check plans</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const sc    = getCfg(run.status);
              const SI    = sc.icon;
              const live  = liveStatus[run.id];
              const prog  = getProgress(run, live);
              const done  = isDone(run.status);
              const actv  = isActive(run.status);
              const isT   = run.id === trackedRunId;

              return (
                <div
                  key={run.id}
                  id={`run-card-${run.id}`}
                  className={`card-hover ${isT ? 'run-card-highlighted' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* left: icon + id + meta */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                        style={{ background: 'rgba(139,92,246,0.1)' }}>
                        {actv
                          ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                          : <SI className="w-4 h-4 text-violet-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-heading font-semibold font-mono text-text-primary">
                            #{run.id.slice(0, 8)}
                          </span>
                          {isT && <span className="badge badge-info text-[10px] px-1.5">Current</span>}
                          <span className={`badge ${sc.badge} text-[10px]`}>
                            <SI className="w-2.5 h-2.5" />
                            {sc.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-text-muted font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {run.started_at ? new Date(run.started_at).toLocaleString() : 'Pending'}
                          </span>
                          <span>·</span>
                          <span className="text-text-secondary">{run.total_checks} checks</span>
                          <span className="text-emerald-500 font-semibold">{run.passed_checks} pass</span>
                          {run.failed_checks > 0 && (
                            <span className="text-rose-500 font-semibold">{run.failed_checks} fail</span>
                          )}
                        </div>
                        {/* mini progress for active runs */}
                        {!done && (
                          <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full" style={{ background: 'var(--glass-border)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, background: 'var(--accent)' }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* right: actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {done ? (
                        <>
                          <Link to={`/results?runId=${encodeURIComponent(run.id)}`} className="btn-secondary text-xs">
                            <BarChart3 className="w-3 h-3" />
                            Results
                          </Link>
                          <Link to={`/visualization?runId=${encodeURIComponent(run.id)}`} className="btn-secondary text-xs">
                            <LineChart className="w-3 h-3" />
                            Graphs
                          </Link>
                        </>
                      ) : (
                        <span className="text-xs text-text-muted font-mono">In progress…</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}