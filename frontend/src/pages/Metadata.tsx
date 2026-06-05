import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileSearch, Loader2, RefreshCw, Hash, ToggleLeft, Type, Sparkles, Wand2, ArrowRight, Sigma, Database, ShieldAlert, Radar, Layers3 } from 'lucide-react';
import { getConnections, profileMetadata, getMetadataForConnection } from '../api/client';
import type { Connection, MetadataProfile, ColumnProfile } from '../types';

type EnrichedColumn = ColumnProfile & {
  completenessPercent: number | null;
  qualityFlag: 'healthy' | 'attention' | 'critical';
  wranglerHint: string;
};

export function Metadata() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConn, setSelectedConn] = useState('');
  const [profiling, setProfiling] = useState(false);
  const [profile, setProfile] = useState<MetadataProfile | null>(null);
  const requestedConnectionId = searchParams.get('connectionId') || '';
  const shouldAutoProfile = searchParams.get('autoProfile') === '1';

  const getEnrichedColumns = (metadata: MetadataProfile | null): EnrichedColumn[] => {
    if (!metadata?.schema?.columns) return [];

    return metadata.schema.columns.map((column) => {
      const profileStats = metadata.profile?.[column.name] || {};
      const rowCount = profileStats.row_count ?? column.row_count ?? null;
      const nullCount = profileStats.null_count ?? column.null_count ?? null;
      const nullPercent = profileStats.null_percent ?? column.null_percentage ?? null;
      const distinctCount = profileStats.distinct_count ?? column.distinct_count ?? null;
      const completenessPercent = typeof nullPercent === 'number' ? Math.max(0, 100 - nullPercent) : null;

      let qualityFlag: EnrichedColumn['qualityFlag'] = 'healthy';
      if (typeof nullPercent === 'number' && nullPercent >= 20) {
        qualityFlag = 'critical';
      } else if (typeof nullPercent === 'number' && nullPercent > 0) {
        qualityFlag = 'attention';
      }

      let wranglerHint = 'Ready for rule generation';
      if (typeof nullPercent === 'number' && nullPercent > 0) {
        wranglerHint = `Handle ${nullPercent.toFixed(1)}% null values before enforcing strict completeness checks`;
      } else if (typeof distinctCount === 'number' && typeof rowCount === 'number' && rowCount > 0 && distinctCount / rowCount < 0.25) {
        wranglerHint = 'Low cardinality column; consider validity or allowed-values checks';
      } else if ((column.type || '').toLowerCase().includes('date')) {
        wranglerHint = 'Date-like column; freshness or chronology checks are a good fit';
      } else if ((column.type || '').toLowerCase().includes('num')) {
        wranglerHint = 'Numeric column; range and anomaly checks are a good fit';
      }

      return {
        ...column,
        row_count: rowCount ?? undefined,
        null_count: nullCount ?? 0,
        null_percentage: typeof nullPercent === 'number' ? nullPercent : undefined,
        distinct_count: distinctCount ?? undefined,
        min: profileStats.min ?? column.min,
        max: profileStats.max ?? column.max,
        mean: profileStats.mean ?? column.mean,
        stddev: profileStats.stddev ?? column.stddev,
        min_length: profileStats.min_length ?? column.min_length,
        max_length: profileStats.max_length ?? column.max_length,
        completenessPercent,
        qualityFlag,
        wranglerHint,
      };
    });
  };

  const enrichedColumns = getEnrichedColumns(profile);
  const totalRows = enrichedColumns.find((column) => typeof column.row_count === 'number')?.row_count ?? null;
  const columnsNeedingAttention = enrichedColumns.filter((column) => column.qualityFlag !== 'healthy').length;
  const profilingReadiness = enrichedColumns.length > 0
    ? Math.round((enrichedColumns.filter((column) => column.qualityFlag === 'healthy').length / enrichedColumns.length) * 100)
    : 0;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getConnections();
        setConnections(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const runProfile = async (connectionId: string) => {
    setProfiling(true);
    try {
      const { data } = await profileMetadata({ connection_id: connectionId });
      setProfile(data);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Profiling failed');
    } finally {
      setProfiling(false);
    }
  };

  const handleProfile = async () => {
    if (!selectedConn) return;
    await runProfile(selectedConn);
  };

  const loadExisting = async (connId: string) => {
    setSelectedConn(connId);
    try {
      const { data } = await getMetadataForConnection(connId);
      if (data && (Array.isArray(data) ? data.length > 0 : data.snapshot_id)) {
        setProfile(Array.isArray(data) ? data[0] : data);
        return true;
      } else {
        setProfile(null);
        return false;
      }
    } catch {
      setProfile(null);
      return false;
    }
  };

  useEffect(() => {
    if (loading || !requestedConnectionId) return;

    (async () => {
      const hasExistingProfile = await loadExisting(requestedConnectionId);
      if (!hasExistingProfile && shouldAutoProfile) {
        await runProfile(requestedConnectionId);
      }

      setSearchParams({}, { replace: true });
    })();
  }, [loading, requestedConnectionId, setSearchParams, shouldAutoProfile]);

  const typeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('float') || t.includes('num') || t.includes('decimal')) return <Hash className="w-3.5 h-3.5 text-violet-400" />;
    if (t.includes('bool')) return <ToggleLeft className="w-3.5 h-3.5 text-amber-400" />;
    return <Type className="w-3.5 h-3.5 text-cyan-400" />;
  };

  const qualityTone = (flag: EnrichedColumn['qualityFlag']) => {
    if (flag === 'critical') return 'text-rose-400';
    if (flag === 'attention') return 'text-amber-400';
    return 'text-emerald-400';
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
      <section className="hero-panel animate-fade-up p-8 lg:p-10">
        <div className="absolute -top-10 right-8 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: 'rgba(255,255,255,0.22)' }} />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80">
              <Radar className="h-3.5 w-3.5" />
              Metadata profiling
            </div>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              Parse the source structure before building the plan.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
              Profile the selected source to inspect the schema, null patterns, value ranges, and candidate columns for data quality checks.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Current source</p>
            <div className="mt-4 space-y-3">
              <select title="Select connection for profiling" className="input text-xs" value={selectedConn} onChange={e => loadExisting(e.target.value)}>
                <option value="">Select connection...</option>
                {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
              </select>
              <button onClick={handleProfile} disabled={!selectedConn || profiling} className="btn-primary w-full">
                {profiling ? <><Loader2 className="w-4 h-4 animate-spin" />Profiling...</> : <><RefreshCw className="w-4 h-4" />Profile source</>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {profile && enrichedColumns.length > 0 && (
        <div className="animate-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <div className="metric-tile">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="text-xs text-text-muted font-mono uppercase">Columns</p>
                  <p className="text-xl font-heading font-bold text-text-primary">{enrichedColumns.length}</p>
                </div>
              </div>
            </div>
            <div className="metric-tile">
              <div className="flex items-center gap-3">
                <Sigma className="w-5 h-5" style={{ color: 'var(--accent-2)' }} />
                <div>
                  <p className="text-xs text-text-muted font-mono uppercase">Rows Profiled</p>
                  <p className="text-xl font-heading font-bold text-text-primary">{totalRows != null ? totalRows.toLocaleString() : '—'}</p>
                </div>
              </div>
            </div>
            <div className="metric-tile">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                <div>
                  <p className="text-xs text-text-muted font-mono uppercase">Needs Attention</p>
                  <p className="text-xl font-heading font-bold text-text-primary">{columnsNeedingAttention}</p>
                </div>
              </div>
            </div>
            <div className="metric-tile">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--success)' }} />
                <div>
                  <p className="text-xs text-text-muted font-mono uppercase">Profiler Readiness</p>
                  <p className="text-xl font-heading font-bold text-text-primary">{profilingReadiness}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="text-sm font-heading font-semibold text-text-primary">Profiler Summary</h3>
                <p className="mt-1 text-xs text-text-secondary">This profile summarizes schema shape, null ratios, cardinality, and type patterns for plan creation.</p>
              </div>
              <div className="text-xs text-text-dim font-mono">Profiled {new Date(profile.profiled_at).toLocaleString()}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to={`/suggestions?connectionId=${encodeURIComponent(selectedConn)}&snapshotId=${encodeURIComponent(profile.snapshot_id)}&autoGenerate=1`} className="btn-primary">
                <Sparkles className="w-4 h-4" />Generate Suggestions
              </Link>
              <Link to={`/check-plans?connectionId=${encodeURIComponent(profile.connection_id)}&snapshotId=${encodeURIComponent(profile.snapshot_id)}`} className="btn-secondary">
                <ArrowRight className="w-4 h-4" />Open Check Plans
              </Link>
            </div>
          </div>

          <div className="card mb-4">
            <div className="flex items-center gap-3 mb-4">
              <Wand2 className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              <div>
                <h3 className="text-sm font-heading font-semibold text-text-primary">Wrangler Prep</h3>
                <p className="text-xs text-text-secondary">Use these hints to decide which baseline, AI-generated, or prebuilt checks belong in the final plan.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {enrichedColumns.slice(0, 6).map((column) => (
                <div key={`wrangler-${column.name}`} className="rounded-[24px] p-4 border" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-heading font-semibold text-text-primary">{column.name}</p>
                      <p className="text-[11px] font-mono text-text-dim">{column.type}</p>
                    </div>
                    <span className={`text-xs font-mono ${qualityTone(column.qualityFlag)}`}>
                      {column.qualityFlag === 'healthy' ? 'healthy' : column.qualityFlag === 'attention' ? 'review' : 'critical'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-text-secondary">{column.wranglerHint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {enrichedColumns.map((col: EnrichedColumn, i: number) => (
              <div key={col.name} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start justify-between gap-6 flex-wrap lg:flex-nowrap">
                  <div className="flex items-center gap-3">
                    {typeIcon(col.type)}
                    <div>
                      <h4 className="text-sm font-heading font-medium text-text-primary">{col.name}</h4>
                      <p className="text-[10px] text-text-dim font-mono">{col.type}{col.nullable ? ' · nullable' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono md:flex md:items-center md:gap-6">
                    <div className="text-center">
                      <p className="text-text-dim">Completeness</p>
                      <p className={qualityTone(col.qualityFlag)}>{col.completenessPercent != null ? `${col.completenessPercent.toFixed(1)}%` : '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-text-dim">Nulls</p>
                      <p className="text-text-secondary">{col.null_count}{col.null_percentage != null ? ` (${col.null_percentage.toFixed(1)}%)` : ''}</p>
                    </div>
                    {col.distinct_count != null && (
                      <div className="text-center">
                        <p className="text-text-dim">Distinct</p>
                        <p className="text-text-secondary">{col.distinct_count}</p>
                      </div>
                    )}
                    {col.min != null && (
                      <div className="text-center">
                        <p className="text-text-dim">Min</p>
                        <p className="text-text-secondary">{String(col.min)}</p>
                      </div>
                    )}
                    {col.max != null && (
                      <div className="text-center">
                        <p className="text-text-dim">Max</p>
                        <p className="text-text-secondary">{String(col.max)}</p>
                      </div>
                    )}
                    {col.mean != null && (
                      <div className="text-center">
                        <p className="text-text-dim">Mean</p>
                        <p className="text-text-secondary">{Number(col.mean).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-text-muted">{col.wranglerHint}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!profile && !selectedConn && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
            <FileSearch className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Select a Connection</h3>
          <p className="text-xs text-text-muted">Choose a data source above to profile its schema and columns.</p>
        </div>
      )}

      {!profile && selectedConn && (
        <div className="card animate-fade-up">
          <div className="flex items-center gap-3 mb-3">
            <Layers3 className="w-5 h-5" style={{ color: 'var(--accent-2)' }} />
            <div>
              <h3 className="text-sm font-heading font-semibold text-text-primary">No profile loaded yet</h3>
              <p className="text-xs text-text-secondary">Run the profiler to generate schema details, stats, and rule hints.</p>
            </div>
          </div>
          <button onClick={handleProfile} disabled={profiling} className="btn-primary">
            {profiling ? <><Loader2 className="w-4 h-4 animate-spin" />Profiling...</> : <><RefreshCw className="w-4 h-4" />Start profiling</>}
          </button>
        </div>
      )}
    </div>
  );
}
