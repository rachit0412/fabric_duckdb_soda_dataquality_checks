import { useState, useEffect } from 'react';
import { FileSearch, Loader2, RefreshCw, Hash, ToggleLeft, Type } from 'lucide-react';
import { getConnections, profileMetadata, getMetadataForConnection } from '../api/client';
import type { Connection, MetadataProfile, ColumnProfile } from '../types';

export function Metadata() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConn, setSelectedConn] = useState('');
  const [profiling, setProfiling] = useState(false);
  const [profile, setProfile] = useState<MetadataProfile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getConnections();
        setConnections(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleProfile = async () => {
    if (!selectedConn) return;
    setProfiling(true);
    try {
      const { data } = await profileMetadata({ connection_id: selectedConn });
      setProfile(data);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Profiling failed');
    } finally {
      setProfiling(false);
    }
  };

  const loadExisting = async (connId: string) => {
    setSelectedConn(connId);
    try {
      const { data } = await getMetadataForConnection(connId);
      if (data && (Array.isArray(data) ? data.length > 0 : data.snapshot_id)) {
        setProfile(Array.isArray(data) ? data[0] : data);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  };

  const typeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('float') || t.includes('num') || t.includes('decimal')) return <Hash className="w-3.5 h-3.5 text-violet-400" />;
    if (t.includes('bool')) return <ToggleLeft className="w-3.5 h-3.5 text-amber-400" />;
    return <Type className="w-3.5 h-3.5 text-cyan-400" />;
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
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Metadata</h2>
          <p className="mt-1 text-sm text-text-secondary">Profile and explore your data structures</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input text-xs" value={selectedConn} onChange={e => loadExisting(e.target.value)}>
            <option value="">Select connection...</option>
            {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
          <button onClick={handleProfile} disabled={!selectedConn || profiling} className="btn-primary">
            {profiling ? <><Loader2 className="w-4 h-4 animate-spin" />Profiling...</> : <><RefreshCw className="w-4 h-4" />Profile</>}
          </button>
        </div>
      </div>

      {profile && profile.schema?.columns && (
        <div className="animate-fade-up">
          <div className="card mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-text-muted font-mono uppercase">Columns</p>
                <p className="text-xl font-heading font-bold text-text-primary">{profile.schema.columns.length}</p>
              </div>
              {profile.schema.row_count != null && (
                <div className="text-center ml-8">
                  <p className="text-xs text-text-muted font-mono uppercase">Rows</p>
                  <p className="text-xl font-heading font-bold text-text-primary">{profile.schema.row_count.toLocaleString()}</p>
                </div>
              )}
              <div className="ml-auto text-xs text-text-dim font-mono">Profiled {new Date(profile.profiled_at).toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-2">
            {profile.schema.columns.map((col: ColumnProfile, i: number) => (
              <div key={col.name} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {typeIcon(col.type)}
                    <div>
                      <h4 className="text-sm font-heading font-medium text-text-primary">{col.name}</h4>
                      <p className="text-[10px] text-text-dim font-mono">{col.type}{col.nullable ? ' · nullable' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-mono">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!profile && !selectedConn && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.08)' }}>
            <FileSearch className="w-6 h-6 text-cyan-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Select a Connection</h3>
          <p className="text-xs text-text-muted">Choose a data source above to profile its schema and columns.</p>
        </div>
      )}
    </div>
  );
}
