import { useState, useEffect, useRef, useCallback } from 'react';
import { FileCheck, Plus, Trash2, Play, X, ChevronDown, ChevronUp, Pencil, Check, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { getCheckPlans, createCheckPlan, deleteCheckPlan, getConnections, getMetadataSnapshot, updateCheckPlan, validateCheckPlanYaml } from '../api/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { CheckPlan, CheckSuggestion, Connection, CreateCheckPlanPayload, MetadataProfile, ColumnProfile } from '../types';
import type { SuggestionPlanDraft } from './Suggestions';

const DEFAULT_CHECKS_YAML = `checks for data:
  - row_count > 0`;

const SUGGESTION_PLAN_DRAFT_KEY = 'dq-suggestion-plan-draft';

type CheckPlansLocationState = {
  suggestionDraft?: SuggestionPlanDraft;
};

type YamlIssue = { severity: 'error' | 'warning'; message: string };
type YamlValidation = { valid?: boolean; issues: YamlIssue[]; loading: boolean };

const EMPTY_VALIDATION: YamlValidation = { issues: [], loading: false };

function YamlValidationPanel({ v }: { v: YamlValidation }) {
  if (v.loading) {
    return <p className="mt-1 flex items-center gap-1 text-xs text-text-muted"><Loader2 className="w-3 h-3 animate-spin" /> Validating…</p>;
  }
  if (v.valid === true && v.issues.length === 0) {
    return <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Valid SodaCL — looks good</p>;
  }
  if (v.issues.length === 0) return null;
  const errors   = v.issues.filter(i => i.severity === 'error');
  const warnings = v.issues.filter(i => i.severity === 'warning');
  return (
    <div className="mt-2 space-y-1.5">
      {errors.map((issue, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{issue.message}</span>
        </div>
      ))}
      {warnings.map((issue, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-500">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{issue.message}</span>
        </div>
      ))}
    </div>
  );
}

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

const sortPlansNewestFirst = (plans: CheckPlan[]) => (
  [...plans].sort((left, right) => {
    const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
    const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
    return rightTime - leftTime;
  })
);

export function CheckPlans() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedConnectionId = searchParams.get('connectionId') || '';
  const requestedSnapshotId = searchParams.get('snapshotId') || '';
  const [plans, setPlans] = useState<CheckPlan[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(requestedConnectionId || requestedSnapshotId));
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', checks_yaml: '' });
  const [saving, setSaving] = useState(false);
  const [createValidation, setCreateValidation] = useState<YamlValidation>(EMPTY_VALIDATION);
  const [editValidation,   setEditValidation]   = useState<YamlValidation>(EMPTY_VALIDATION);
  const createTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerValidation = useCallback((yaml: string, setter: React.Dispatch<React.SetStateAction<YamlValidation>>, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!yaml.trim()) { setter(EMPTY_VALIDATION); return; }
    setter(prev => ({ ...prev, loading: true }));
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await validateCheckPlanYaml(yaml);
        setter({ valid: data.valid, issues: data.issues || [], loading: false });
      } catch {
        setter(EMPTY_VALIDATION);
      }
    }, 600);
  }, []);
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
    check_engine: 'soda',
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
      setPlans(sortPlansNewestFirst(Array.isArray(plansRes.data) ? plansRes.data : []));
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
        check_engine: form.check_engine || 'soda',
      };

      if (form.connection_id) {
        payload.connection_id = form.connection_id;
      }

      if (form.metadata_snapshot_id) {
        payload.metadata_snapshot_id = form.metadata_snapshot_id;
      }

      await createCheckPlan(payload);
      await load();
      setShowForm(false);
      setForm({ name: '', description: '', check_engine: 'soda', checks_yaml: baselineChecksYaml });
      setImportedSuggestions([]);
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

  const handleStartEdit = (plan: CheckPlan) => {
    setEditingPlanId(plan.id);
    setEditForm({ name: plan.name, description: plan.description || '', checks_yaml: plan.checks_yaml || '' });
    setExpandedPlanId(null);
    // Validate existing YAML immediately
    triggerValidation(plan.checks_yaml || '', setEditValidation, editTimerRef);
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditValidation(EMPTY_VALIDATION);
  };

  const handleSavePlan = async (planId: string) => {
    setSaving(true);
    try {
      await updateCheckPlan(planId, editForm);
      setEditingPlanId(null);
      load();
    } catch {
      alert('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = (planId: string) => {
    // Navigate immediately — the Runs page owns the execution call
    navigate(`/runs?planId=${encodeURIComponent(planId)}&autoStart=1`);
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
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Check Engine</label>
                <select className="input" title="Check engine" value={form.check_engine || 'soda'} onChange={e => setForm({ ...form, check_engine: e.target.value })}>
                  <option value="soda">Soda Core (SodaCL)</option>
                  <option value="great_expectations">Great Expectations</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  {form.check_engine === 'great_expectations' ? 'Expectations (GE YAML)' : 'Checks (SodaCL YAML)'}
                </label>
                <textarea className="input font-mono text-xs" rows={6}
                  value={form.checks_yaml}
                  onChange={e => {
                    setForm({ ...form, checks_yaml: e.target.value });
                    if (form.check_engine !== 'great_expectations') {
                      triggerValidation(e.target.value, setCreateValidation, createTimerRef);
                    }
                  }}
                  placeholder={form.check_engine === 'great_expectations'
                    ? "expectations for data:\n  - type: expect_column_values_to_not_be_null\n    column: customer_id\n  - type: expect_column_values_to_be_between\n    column: age\n    min_value: 0\n    max_value: 150"
                    : "checks for data:\n  - row_count > 0"
                  } required />
                {form.check_engine !== 'great_expectations' && (
                  <>
                    <YamlValidationPanel v={createValidation} />
                    {createValidation.valid === undefined && !createValidation.loading && (
                      <p className="mt-1 text-xs text-text-muted">Paste SodaCL YAML — it will be validated automatically as you type.</p>
                    )}
                  </>
                )}
                {form.check_engine === 'great_expectations' && (
                  <p className="mt-1 text-xs text-text-muted">GE expectations YAML. Validation runs at execution time via the GE runner service.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={form.check_engine !== 'great_expectations' && createValidation.valid === false} className="btn-primary" title={createValidation.valid === false ? 'Fix YAML errors before creating' : ''}><Plus className="w-4 h-4" />Create Plan</button>
              <button type="button" onClick={() => { setShowForm(false); setCreateValidation(EMPTY_VALIDATION); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan, i) => (
          <div key={plan.id} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>

            {/* ── edit mode ── */}
            {editingPlanId === plan.id ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Editing plan</p>
                  <button title="Cancel edit" onClick={handleCancelEdit} className="p-1 rounded-lg hover:bg-white/5"><X className="w-4 h-4 text-text-muted" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Name</label>
                    <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Description</label>
                    <input className="input" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Checks YAML</label>
                    <textarea className="input font-mono text-xs" rows={10}
                      placeholder="checks for data:\n  - row_count > 0"
                      value={editForm.checks_yaml}
                      onChange={e => {
                        setEditForm(f => ({ ...f, checks_yaml: e.target.value }));
                        triggerValidation(e.target.value, setEditValidation, editTimerRef);
                      }} />
                    <YamlValidationPanel v={editValidation} />
                    <p className="mt-1 text-xs text-text-muted">SodaCL format: <code className="font-mono">checks for &lt;table&gt;:</code> with indented check lines.</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => void handleSavePlan(plan.id)} disabled={saving || editValidation.valid === false} className="btn-primary text-xs" title={editValidation.valid === false ? 'Fix YAML errors before saving' : ''}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save changes
                  </button>
                  <button onClick={handleCancelEdit} className="btn-secondary text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {/* ── normal card row ── */}
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
                    <button
                      title="View/hide YAML checks"
                      onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                      className="btn-secondary text-xs gap-1"
                    >
                      {expandedPlanId === plan.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Checks
                    </button>
                    <button
                      title="Edit plan"
                      onClick={() => handleStartEdit(plan)}
                      className="btn-secondary text-xs gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button onClick={() => handleExecute(plan.id)} className="btn-ghost text-xs gap-1">
                      <Play className="w-3 h-3" />
                      Execute
                    </button>
                    <button title={`Delete plan ${plan.name}`} onClick={() => handleDelete(plan.id)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'var(--delete-hover-bg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── expanded YAML ── */}
                {expandedPlanId === plan.id && (
                  <div className="mt-4 rounded-[16px] border overflow-hidden" style={{ borderColor: 'var(--divider)' }}>
                    <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--glass-border)' }}>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">checks_yaml</span>
                      <button onClick={() => handleStartEdit(plan)} className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Edit YAML
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap break-words" style={{ background: 'var(--input-bg)' }}>
                      {plan.checks_yaml || '(no checks defined)'}
                    </pre>
                  </div>
                )}
              </>
            )}
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
