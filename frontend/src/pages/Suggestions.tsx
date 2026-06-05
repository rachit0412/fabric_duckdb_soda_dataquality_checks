import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { getConnections, generateSuggestions } from '../api/client';
import type { Connection, CheckSuggestion } from '../types';

const SUGGESTION_PLAN_DRAFT_KEY = 'dq-suggestion-plan-draft';
const SUGGESTIONS_CACHE_KEY = 'dq-suggestions-results-cache';

type SuggestionsCache = {
  connectionId: string;
  snapshotId: string;
  suggestions: CheckSuggestion[];
};

export type SuggestionPlanDraft = {
  connectionId?: string;
  metadataSnapshotId?: string;
  selectedSuggestions: CheckSuggestion[];
};

export function Suggestions() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConn, setSelectedConn] = useState('');
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<CheckSuggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [currentSnapshotId, setCurrentSnapshotId] = useState('');
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

      // Restore cached suggestions so navigating back doesn't lose results
      try {
        const raw = sessionStorage.getItem(SUGGESTIONS_CACHE_KEY);
        if (raw) {
          const cache: SuggestionsCache = JSON.parse(raw);
          if (cache.suggestions?.length) {
            setSuggestions(cache.suggestions);
            setSelectedSuggestionIds(cache.suggestions.map((s: CheckSuggestion) => s.id));
            setCurrentSnapshotId(cache.snapshotId || '');
            if (cache.connectionId) setSelectedConn(cache.connectionId);
          }
        }
      } catch { /* ignore stale cache */ }
    })();
  }, []);

  const handleGenerateForSelection = async (connectionId: string, snapshotId?: string) => {
    setGenerating(true);
    setSuggestions([]);
    setSelectedSuggestionIds([]);
    try {
      const requestPayload = snapshotId
        ? { metadata_snapshot_id: snapshotId }
        : { connection_id: connectionId };
      const { data } = await generateSuggestions(requestPayload);
      const nextSuggestions = data?.suggestions || [];
      const nextSnapshotId = data?.metadata_snapshot_id || snapshotId || '';
      setCurrentSnapshotId(nextSnapshotId);
      setSuggestions(nextSuggestions);
      setSelectedSuggestionIds(nextSuggestions.map((suggestion: CheckSuggestion) => suggestion.id));
      // Persist so navigating back doesn't wipe results
      const cache: SuggestionsCache = { connectionId, snapshotId: nextSnapshotId, suggestions: nextSuggestions };
      sessionStorage.setItem(SUGGESTIONS_CACHE_KEY, JSON.stringify(cache));
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

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestionIds((current) => (
      current.includes(suggestionId)
        ? current.filter((id) => id !== suggestionId)
        : [...current, suggestionId]
    ));
  };

  const selectAllSuggestions = () => {
    setSelectedSuggestionIds(suggestions.map((suggestion) => suggestion.id));
  };

  const clearSuggestionSelection = () => {
    setSelectedSuggestionIds([]);
  };

  const openCheckPlans = (withSelectedSuggestions: boolean) => {
    const snapshotId = currentSnapshotId || initialAutoParamsRef.current?.snapshotId || '';
    const draft: SuggestionPlanDraft = {
      connectionId: selectedConn,
      metadataSnapshotId: snapshotId,
      selectedSuggestions: suggestions.filter((suggestion) => selectedSuggestionIds.includes(suggestion.id)),
    };

    if (withSelectedSuggestions) {
      sessionStorage.setItem(SUGGESTION_PLAN_DRAFT_KEY, JSON.stringify(draft));
    } else {
      sessionStorage.removeItem(SUGGESTION_PLAN_DRAFT_KEY);
    }
    // Clear suggestions cache so they don't reappear after the plan is created
    sessionStorage.removeItem(SUGGESTIONS_CACHE_KEY);

    const params = new URLSearchParams();
    if (selectedConn) {
      params.set('connectionId', selectedConn);
    }
    if (snapshotId) {
      params.set('snapshotId', snapshotId);
    }

    navigate(`/check-plans${params.toString() ? `?${params.toString()}` : ''}`, {
      state: withSelectedSuggestions ? { suggestionDraft: draft } : null,
    });
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
            Generate rule suggestions from the selected source, choose the useful ones together, and carry them straight into plan creation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select title="Select connection for suggestions" className="input text-xs" value={selectedConn} onChange={e => setSelectedConn(e.target.value)}>
            <option value="">Select connection...</option>
            {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
          </select>
          <button onClick={handleGenerate} disabled={!selectedConn || generating} className="btn-primary">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Preparing suggestions...</> : <><Sparkles className="w-4 h-4" />Generate suggestions</>}
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="card animate-fade-up">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Selection</p>
                <h3 className="mt-1 text-sm font-heading font-semibold text-text-primary">
                  {selectedSuggestionIds.length} of {suggestions.length} suggestions selected
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Select multiple suggestions, skip this step for now, or send the selected YAML blocks directly into the plan form.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectAllSuggestions} className="btn-secondary">Select all</button>
                <button type="button" onClick={clearSuggestionSelection} className="btn-secondary">Clear</button>
                <button type="button" onClick={() => openCheckPlans(false)} className="btn-secondary">Skip for now</button>
                <button type="button" onClick={() => openCheckPlans(true)} disabled={selectedSuggestionIds.length === 0} className="btn-primary disabled:opacity-40">
                  <Sparkles className="w-4 h-4" />Add selected to plan
                </button>
              </div>
            </div>
          </div>

          {suggestions.map((s, i) => (
            <div key={s.id || i} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-text-muted"
                    checked={selectedSuggestionIds.includes(s.id)}
                    onChange={() => toggleSuggestion(s.id)}
                    aria-label={`Select suggestion ${s.check_name}`}
                  />
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
              ? 'Generate suggestions, choose the useful ones in bulk, and send them into the plan without retyping YAML.'
              : 'Choose a connected source or uploaded file to generate AI-backed check recommendations from its metadata.'}
          </p>
        </div>
      )}
    </div>
  );
}
