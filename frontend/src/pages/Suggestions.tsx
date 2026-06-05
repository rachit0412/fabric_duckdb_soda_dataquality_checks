import { useState, useEffect, useRef } from 'react';
import { Lightbulb, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { getConnections, generateSuggestions } from '../api/client';
import type { Connection, CheckSuggestion } from '../types';

export function Suggestions() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConn, setSelectedConn] = useState('');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<CheckSuggestion[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const initialAutoParamsRef = useRef<{ connectionId: string; snapshotId: string; shouldAutoGenerate: boolean } | null>(null);
  const autoGenerateAttemptedRef = useRef(false);

  if (!initialAutoParamsRef.current) {
    const params = new URLSearchParams(window.location.search);
    initialAutoParamsRef.current = {
      connectionId: params.get('connectionId') || '',
      snapshotId: params.get('snapshotId') || '',
      shouldAutoGenerate: params.get('autoGenerate') === '1',
    };
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getConnections();
        setConnections(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleGenerateForSelection = async (connectionId: string, snapshotId?: string) => {
    setGenerating(true);
    setSuggestions([]);
    try {
      const requestPayload = snapshotId
        ? { metadata_snapshot_id: snapshotId }
        : { connection_id: connectionId };
      const { data } = await generateSuggestions(requestPayload);
      setSuggestions(data?.suggestions || []);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedConn) return;
    await handleGenerateForSelection(selectedConn);
  };

  useEffect(() => {
    if (loading) return;

    const requestedConnectionId = initialAutoParamsRef.current?.connectionId || '';
    const requestedSnapshotId = initialAutoParamsRef.current?.snapshotId || '';

    if (requestedConnectionId) {
      setSelectedConn(requestedConnectionId);
    }

    if (!requestedConnectionId || !initialAutoParamsRef.current?.shouldAutoGenerate || autoGenerateAttemptedRef.current) {
      return;
    }

    autoGenerateAttemptedRef.current = true;

    void (async () => {
      await handleGenerateForSelection(requestedConnectionId, requestedSnapshotId || undefined);
      window.history.replaceState({}, document.title, window.location.pathname);
    })();
  }, [loading]);

  const copyYaml = (yaml: string, idx: number) => {
    navigator.clipboard.writeText(yaml);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'text-emerald-400';
    if (c >= 0.5) return 'text-amber-400';
    return 'text-rose-400';
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
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">AI Suggestions</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Generate AI-recommended checks from the selected source so you can add them alongside baseline rules and
            prebuilt Soda or Great Expectations checks in the final plan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select title="Select connection for suggestions" className="input text-xs" value={selectedConn} onChange={e => setSelectedConn(e.target.value)}>
            <option value="">Select connection...</option>
            {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
          <button onClick={handleGenerate} disabled={!selectedConn || generating} className="btn-primary">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate checks</>}
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={s.id || i} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-heading font-semibold text-text-primary">{s.check_name}</h4>
                    <span className="badge badge-info text-[10px]">{s.check_type}</span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">{s.rationale}</p>
                  {s.suggested_check_yaml && (
                    <div className="relative">
                      <pre className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto" style={{ background: 'var(--glass-bg)' }}>
                        {s.suggested_check_yaml}
                      </pre>
                      <button onClick={() => copyYaml(s.suggested_check_yaml, i)} className="absolute top-2 right-2 p-1 rounded hover:bg-white/10">
                        {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-text-muted" />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-text-dim uppercase font-mono">Confidence</p>
                  <p className={`text-lg font-heading font-bold ${confidenceColor(s.confidence)}`}>
                    {(s.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !generating && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.08)' }}>
            <Lightbulb className="w-6 h-6 text-amber-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">
            {selectedConn ? 'Ready to Generate AI Checks' : 'Select a Source'}
          </h3>
          <p className="text-xs text-text-muted">
            {selectedConn
              ? 'Generate AI suggestions, then move the useful rules into the plan with your baseline and prebuilt checks.'
              : 'Choose a connected source or uploaded file to generate AI-backed check recommendations from its metadata.'}
          </p>
        </div>
      )}
    </div>
  );
}
