import { useState, useEffect } from 'react';
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { getRuns } from '../api/client';
import type { Run } from '../types';

export function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const { data } = await getRuns();
      setRuns(data);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setLoading(false);
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
      <div className="animate-fade-up">
        <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Check Runs</h2>
        <p className="mt-1 text-sm text-text-secondary">Execution history and monitoring</p>
      </div>

      {runs.length === 0 ? (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(139,92,246,0.08)' }}>
            <PlayCircle className="w-6 h-6 text-violet-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No check runs yet</h3>
          <p className="text-xs text-text-muted">Execute a check plan to see results here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run, i) => {
            const sc = getStatusConfig(run.status);
            const StatusIcon = sc.icon;
            return (
              <div key={run.id} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                      <PlayCircle className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-heading font-semibold text-text-primary">
                        Run <span className="font-mono" style={{ color: 'var(--accent-text)' }}>#{run.id.slice(0, 8)}</span>
                      </h3>
                      <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5 font-mono">
                        <Clock className="w-3 h-3 text-text-muted" />
                        {new Date(run.started_at).toLocaleString()}
                        {run.duration_seconds && (
                          <span className="text-text-dim">· {run.duration_seconds}s</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-text-muted font-mono">Total <span className="text-text-secondary">{run.total_checks}</span></span>
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">Pass <span>{run.passed_checks}</span></span>
                        <span className="text-xs font-mono text-rose-600 dark:text-rose-400">Fail <span>{run.failed_checks}</span></span>
                        <span className="text-xs font-mono text-amber-600 dark:text-amber-400">Warn <span>{run.warning_checks}</span></span>
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${sc.badge}`}>
                    <StatusIcon className="w-3 h-3" />
                    {sc.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
