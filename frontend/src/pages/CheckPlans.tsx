import { useState, useEffect, useRef } from 'react';
import { FileCheck, Plus, Trash2, Play, X, Loader2 } from 'lucide-react';
import { getCheckPlans, createCheckPlan, deleteCheckPlan, getConnections, executeCheckPlan, getMetadataSnapshot } from '../api/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { CheckPlan, CheckSuggestion, Connection, CreateCheckPlanPayload, MetadataProfile, ColumnProfile } from '../types';
import type { SuggestionPlanDraft } from './Suggestions';

const DEFAULT_CHECKS_YAML = `checks for data:
  - row_count > 0`;

const SUGGESTION_PLAN_DRAFT_KEY = 'dq-suggestion-plan-draft';

type CheckPlansLocationState = {
  suggestionDraft?: SuggestionPlanDraft;
};

const readDraftFromSession = (): SuggestionPlanDraft | null => {
  const rawDraft = sessionStorage.getItem(SUGGESTION_PLAN_DRAFT_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    const draft = JSON.parse(rawDraft) as SuggestionPlanDraft;
    return draft.selectedSuggestions?.length ? draft : null;
  } catch (error) {
    console.error('Failed to parse suggestion draft from session storage:', error);
    return null;
  }
};

const findKeyLikeColumn = (columns: ColumnProfile[]) => (
  columns.find((column) => column.is_pk)
  || columns.find((column) => /^id$/i.test(column.name))
  || columns.find((column) => /(^|_)id$/i.test(column.name))
  || columns.find((column) => /id$/i.test(column.name))
);

const buildBaselineChecksYaml = (snapshot?: MetadataProfile) => {
  const lines = ['checks for data:', '  - row_count > 0'];
  const keyLikeColumn = snapshot ? findKeyLikeColumn(snapshot.schema?.columns || []) : undefined;

  if (keyLikeColumn?.name) {
    lines.push(`  - missing_count(${keyLikeColumn.name}) = 0`);
    lines.push(`  - duplicate_count(${keyLikeColumn.name}) = 0`);
  }

  return lines.join('\n');
};

const dedentYamlBlock = (yamlBlock: string) => {
  const lines = yamlBlock.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return '';
  }

  const minIndent = Math.min(...nonEmptyLines.map((line) => line.match(/^\s*/)?.[0].length ?? 0));
  return lines.map((line) => line.slice(minIndent)).join('\n').trimEnd();
};

const normalizeSuggestionYaml = (yamlBlock: string) => {
  const trimmed = yamlBlock.trim();
  if (!trimmed) {
    return '';
  }

  const lines = trimmed.split(/\r?\n/);
  const firstLine = lines[0]?.trim().toLowerCase();
  const contentLines = firstLine === 'checks:' || firstLine?.startsWith('checks for ')
    ? lines.slice(1)
    : lines;

  return dedentYamlBlock(contentLines.join('\n'));
};

const indentYamlBlock = (yamlBlock: string) => (
  yamlBlock
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join('\n')
);

const buildSuggestionYaml = (suggestions: CheckSuggestion[]) => (
  suggestions
    .map((suggestion) => suggestion.suggested_check_yaml ? normalizeSuggestionYaml(suggestion.suggested_check_yaml) : '')
    .filter((yamlBlock): yamlBlock is string => Boolean(yamlBlock))
    .map((yamlBlock) => indentYamlBlock(yamlBlock))
    .join('\n')
);

const mergeChecksYaml = (baseYaml: string, importedYaml: string) => {
  const normalizedBase = (baseYaml || DEFAULT_CHECKS_YAML).trim();
  const normalizedImported = importedYaml.trim();

  if (!normalizedImported) {
    return normalizedBase;
  }

  return `${normalizedBase}\n${normalizedImported}`;
};

export function CheckPlans() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedConnectionId = searchParams.get('connectionId') || '';
  const requestedSnapshotId = searchParams.get('snapshotId') || '';
  const [plans, setPlans] = useState<CheckPlan[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(requestedConnectionId || requestedSnapshotId));
  const [executing, setExecuting] = useState<string | null>(null);
  const [importedSuggestions, setImportedSuggestions] = useState<CheckSuggestion[]>([]);
  const [baselineChecksYaml, setBaselineChecksYaml] = useState(DEFAULT_CHECKS_YAML);
  const [baselineReady, setBaselineReady] = useState(!requestedSnapshotId);
  const navigate = useNavigate();
  const importedDraftRef = useRef(false);
  const pendingDraftRef = useRef<SuggestionPlanDraft | null>(
    (location.state as CheckPlansLocationState | null)?.suggestionDraft || readDraftFromSession()
  );

  const [form, setForm] = useState<CreateCheckPlanPayload>({
    name: '',
    connection_id: requestedConnectionId || undefined,
    metadata_snapshot_id: requestedSnapshotId || undefined,
    description: '',
    checks_yaml: DEFAULT_CHECKS_YAML,
  });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!requestedConnectionId && !requestedSnapshotId) {
      return;
    }

    setShowForm(true);
    setForm((current) => ({
      ...current,
      connection_id: requestedConnectionId || current.connection_id,
      metadata_snapshot_id: requestedSnapshotId || current.metadata_snapshot_id,
    }));
  }, [requestedConnectionId, requestedSnapshotId]);

  useEffect(() => {
    const snapshotId = requestedSnapshotId || form.metadata_snapshot_id;
    if (!snapshotId) {
      setBaselineChecksYaml(DEFAULT_CHECKS_YAML);
      setBaselineReady(true);
      return;
    }

    let cancelled = false;
    setBaselineReady(false);

    void (async () => {
      try {
        const { data } = await getMetadataSnapshot(snapshotId);
        if (cancelled) {
          return;
        }

        const nextBaseline = buildBaselineChecksYaml(data as MetadataProfile);
        setBaselineChecksYaml(nextBaseline);
        setForm((current) => {
          const currentChecksYaml = current.checks_yaml?.trim() || '';
          const previousBaseline = baselineChecksYaml.trim();
          const shouldReplaceBaseline = !currentChecksYaml || currentChecksYaml === DEFAULT_CHECKS_YAML.trim() || currentChecksYaml === previousBaseline;

          if (!shouldReplaceBaseline) {
            return current;
          }

          return {
            ...current,
            checks_yaml: nextBaseline,
          };
        });
      } catch (error) {
        console.error('Failed to load metadata snapshot for baseline checks:', error);
      } finally {
        if (!cancelled) {
          setBaselineReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedSnapshotId, form.metadata_snapshot_id, baselineChecksYaml]);

  useEffect(() => {
    if (!baselineReady) {
      return;
    }

    if (importedDraftRef.current) {
      return;
    }

    const draft = pendingDraftRef.current;
    if (!draft) {
      return;
    }

    try {
      if (!draft.selectedSuggestions?.length) {
        pendingDraftRef.current = null;
        sessionStorage.removeItem(SUGGESTION_PLAN_DRAFT_KEY);
        return;
      }

      const importedYaml = buildSuggestionYaml(draft.selectedSuggestions);
      setImportedSuggestions(draft.selectedSuggestions);
      setShowForm(true);
      setForm((current) => ({
        ...current,
        connection_id: requestedConnectionId || draft.connectionId || current.connection_id,
        metadata_snapshot_id: requestedSnapshotId || draft.metadataSnapshotId || current.metadata_snapshot_id,
        checks_yaml: importedYaml ? mergeChecksYaml(baselineChecksYaml, importedYaml) : baselineChecksYaml,
      }));
    } catch (error) {
      console.error('Failed to import suggestion draft:', error);
    } finally {
      importedDraftRef.current = true;
      pendingDraftRef.current = null;
      sessionStorage.removeItem(SUGGESTION_PLAN_DRAFT_KEY);
      if ((location.state as CheckPlansLocationState | null)?.suggestionDraft) {
        navigate(`${location.pathname}${location.search}`, { replace: true });
      }
    }
  }, [baselineReady, baselineChecksYaml, location.pathname, location.search, location.state, navigate, requestedConnectionId, requestedSnapshotId]);

  const load = async () => {
    try {
      const [plansRes, connsRes] = await Promise.all([
        getCheckPlans().catch(() => ({ data: [] })),
        getConnections().catch(() => ({ data: [] })),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setConnections(Array.isArray(connsRes.data) ? connsRes.data : []);
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreateCheckPlanPayload = {
        name: form.name,
        description: form.description,
        checks_yaml: form.checks_yaml,
      };

      if (form.connection_id) {
        payload.connection_id = form.connection_id;
      }

      if (form.metadata_snapshot_id) {
        payload.metadata_snapshot_id = form.metadata_snapshot_id;
      }

      const { data: createdPlan } = await createCheckPlan(payload);
      await load();
      setShowForm(false);
      setForm({ name: '', description: '', checks_yaml: baselineChecksYaml });
      setImportedSuggestions([]);
      if (createdPlan?.id) {
        navigate(`/runs?planId=${encodeURIComponent(createdPlan.id)}&autoStart=1`);
      }
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Failed to create check plan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this check plan?')) return;
    try {
      await deleteCheckPlan(id);
      load();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleExecute = async (planId: string) => {
    setExecuting(planId);
    try {
      const { data } = await executeCheckPlan(planId);
      navigate(data?.run_id ? `/runs?runId=${encodeURIComponent(data.run_id)}` : '/runs');
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Failed to execute');
    } finally {
      setExecuting(null);
    }
  };

  const connName = (id: string) => connections.find(c => c.id === id)?.name || id?.slice(0, 8) || '—';

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
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Check Plans</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Assemble the final plan by combining baseline rules, selected suggestions, and any extra Soda-compatible YAML you want to run.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /><span>Build Plan</span>
        </button>
      </div>

      {showForm && (
        <div className="card animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold text-text-primary">Create Check Plan</h3>
            <button title="Close create check plan form" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/5"><X className="w-4 h-4 text-text-muted" /></button>
          </div>
          {importedSuggestions.length > 0 && (
            <div className="mb-4 rounded-[20px] border p-4" style={{ borderColor: 'var(--divider)', background: 'var(--glass-bg)' }}>
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Imported suggestions</p>
              <p className="mt-1 text-sm text-text-primary">{importedSuggestions.length} selected suggestion blocks were added to this plan draft.</p>
              <p className="mt-1 text-xs text-text-secondary">Review the YAML below, remove anything you do not want, and then create the plan.</p>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Plan Name</label>
                <input type="text" className="input" placeholder="daily-quality-checks" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Connection</label>
                <select title="Select connection for the check plan" className="input" value={form.connection_id || ''} onChange={e => setForm({ ...form, connection_id: e.target.value || undefined })} required={!form.metadata_snapshot_id} disabled={Boolean(form.metadata_snapshot_id)}>
                  <option value="">Select a connection...</option>
                  {connections.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
                {form.metadata_snapshot_id && (
                  <p className="mt-1 text-xs text-text-muted">Using the profiled metadata snapshot from the previous step.</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Description</label>
                <input type="text" className="input" placeholder="Describe the scope, owner, or target dataset" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Checks (SodaCL YAML)</label>
                <textarea className="input font-mono text-xs" rows={6} value={form.checks_yaml} onChange={e => setForm({ ...form, checks_yaml: e.target.value })} placeholder={"checks for data:\n  - row_count > 0"} required />
                <p className="mt-1 text-xs text-text-muted">Paste baseline rules and selected suggestion blocks here. This plan executes as Soda-compatible YAML.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Create Plan</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan, i) => (
          <div key={plan.id} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-semibold text-text-primary">{plan.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-secondary">{connName(plan.connection_id)}</span>
                    {plan.dataset_identifier && (
                      <span className="text-[10px] text-text-dim font-mono">· {plan.dataset_identifier}</span>
                    )}
                  </div>
                  {plan.description && <p className="text-xs text-text-muted mt-1">{plan.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${plan.enabled ? 'badge-success' : 'badge-warning'}`}>
                  {plan.enabled ? 'Active' : 'Disabled'}
                </span>
                <button onClick={() => handleExecute(plan.id)} disabled={executing === plan.id} className="btn-ghost text-xs gap-1">
                  {executing === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Execute
                </button>
                <button title={`Delete plan ${plan.name}`} onClick={() => handleDelete(plan.id)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'var(--delete-hover-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && !showForm && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.08)' }}>
            <FileCheck className="w-6 h-6 text-emerald-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No check plans yet</h3>
          <p className="text-xs text-text-muted mb-4">Create the first plan to combine baseline rules and selected suggestions for execution.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto"><Plus className="w-4 h-4" />Create Plan</button>
        </div>
      )}
    </div>
  );
}
