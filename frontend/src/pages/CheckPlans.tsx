import { useState, useEffect, useRef, useCallback } from 'react';
import { FileCheck, Plus, Trash2, Play, X, ChevronDown, ChevronUp, Pencil, Check, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { getCheckPlans, createCheckPlan, deleteCheckPlan, getConnections, getMetadataSnapshot, getMetadataForConnection, updateCheckPlan, validateCheckPlanYaml } from '../api/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { CheckPlan, CheckSuggestion, Connection, CreateCheckPlanPayload, MetadataProfile, ColumnProfile } from '../types';
import type { SuggestionPlanDraft } from './Suggestions';
import { readWorkflowContext, setWorkflowContext } from '../utils/workflowContext';
import { CheckTemplateLibrary } from '../components/CheckTemplateLibrary';

const DEFAULT_CHECKS_YAML = `checks for data:
  - row_count > 0`;
const DEFAULT_GE_YAML = 'expectations for data:';

const SUGGESTION_PLAN_DRAFT_KEY = 'dq-suggestion-plan-draft';
const CHECK_PLAN_FORM_DRAFT_KEY = 'dq-check-plan-form-draft';

type CheckPlansLocationState = {
  suggestionDraft?: SuggestionPlanDraft;
};

type CheckPlanFormDraft = {
  showForm: boolean;
  form: CreateCheckPlanPayload;
  importedSuggestions: CheckSuggestion[];
  engineDrafts: Record<string, string>;
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

const readCheckPlanFormDraft = (): CheckPlanFormDraft | null => {
  const rawDraft = sessionStorage.getItem(CHECK_PLAN_FORM_DRAFT_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawDraft) as CheckPlanFormDraft;
    if (!parsed?.form) {
      return null;
    }

    const parsedEngine = parsed.form.check_engine || 'soda';
    const parsedChecksYaml = parsedEngine === 'great_expectations'
      ? (parsed.form.checks_yaml || DEFAULT_GE_YAML)
      : sanitizeLegacySodaYaml(parsed.form.checks_yaml || DEFAULT_CHECKS_YAML);

    return {
      showForm: parsed.showForm ?? true,
      form: {
        ...parsed.form,
        check_engine: parsedEngine,
        checks_yaml: parsedChecksYaml,
      },
      importedSuggestions: Array.isArray(parsed.importedSuggestions) ? parsed.importedSuggestions : [],
      engineDrafts: {
        soda: sanitizeLegacySodaYaml(parsed.engineDrafts?.soda || DEFAULT_CHECKS_YAML),
        great_expectations: parsed.engineDrafts?.great_expectations || DEFAULT_GE_YAML,
      },
    };
  } catch (error) {
    console.error('Failed to parse check plan draft from session storage:', error);
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

function normalizeLegacySodaBody(yamlBlock: string): string {
  const trimmed = dedentYamlBlock(yamlBlock).trim();
  if (!trimmed) {
    return '';
  }

  let normalized = trimmed
    .replace(/^\s*checks(?:\s+for\s+[^:]+)?:\s*$/gim, '')
    .trim();

  normalized = normalized.replace(/^\s{2,}-(?=\s)/gm, '-');

  normalized = normalized.replace(
    /-\s+name:\s*(['"])(.*?)\1\s*\r?\n\s*type:\s*row_count\s*\r?\n\s*fail:\s*\r?\n\s*when\s*<\s*([^\n#]+)(?:[^\n]*)\r?\n\s*when\s*>\s*([^\n#]+)(?:[^\n]*)/g,
    (_match, _quote, _name, lowValue, highValue) => `- row_count between ${lowValue.trim()} and ${highValue.trim()}`,
  );

  normalized = normalized.replace(
    /-\s+name:\s*(['"])(.*?)\1\s*\r?\n\s*type:\s*schema_type\s*\r?\n\s*column:\s*([^\n]+)\r?\n\s*schema_type:\s*([^\n]+)\r?\n\s*fail:\s*when\s*!?=\s*expected/gm,
    (_match, _quote, _name, columnName, expectedType) => (
      `- schema:\n    fail:\n      when wrong column type:\n        ${columnName.trim()}: ${expectedType.trim().toLowerCase()}`
    ),
  );

  normalized = normalized.replace(
    /-\s+name:\s*(['"])(.*?)\1\s*\r?\n\s*type:\s*(?:valid_regex|invalid_count)\s*\r?\n\s*column:\s*([^\n]+)\r?\n\s*valid_regex:\s*([^\n]+)\r?\n\s*fail:\s*when\s*>\s*0/g,
    (_match, _quote, _name, columnName, regexValue) => (
      `- invalid_count(${columnName.trim()}) = 0:\n    valid regex: ${regexValue.trim()}`
    ),
  );

  normalized = normalized.replace(
    /-\s+name:\s*(['"])(.*?)\1\s*\r?\n\s*type:\s*invalid_count\s*\r?\n\s*column:\s*([^\n]+)\r?\n(?:\s*valid_min:\s*([^\n]+)\r?\n)?(?:\s*valid_max:\s*([^\n]+)\r?\n)?\s*fail:\s*when\s*>\s*0/g,
    (_match, _quote, _name, columnName, minValue, maxValue) => {
      const clauses = [
        `- invalid_count(${columnName.trim()}) = 0:`,
        minValue ? `    valid min: ${minValue.trim()}` : '',
        maxValue ? `    valid max: ${maxValue.trim()}` : '',
      ].filter(Boolean);
      return clauses.join('\n');
    },
  );

  normalized = normalized.replace(
    /-\s+name:\s*(['"])(.*?)\1\s*\r?\n\s*type:\s*anomaly_detection\s*\r?\n\s*column:\s*([^\n]+)\r?\n(?:\s*method:\s*[^\n]+\r?\n)?\s*threshold:\s*([^\n]+)\r?\n\s*fail:\s*when\s+found\s*>\s*\d+/g,
    (_match, _quote, _name, columnName, threshold) => `- stddev(${columnName.trim()}) < ${threshold.trim()}`,
  );

  return dedentYamlBlock(normalized)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeLegacySodaYaml(yaml: string, fallbackHeader = 'checks for data:'): string {
  const headerMatch = yaml.match(/^\s*(checks\s+for\s+[^:]+:)/im);
  const header = headerMatch?.[1]?.trim() || fallbackHeader;
  const body = normalizeLegacySodaBody(yaml);
  if (!body) {
    return header;
  }

  return `${header}\n${indentYamlBlock(body)}`;
}

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

  return normalizeLegacySodaBody(contentLines.join('\n'));
};

const indentYamlBlock = (yamlBlock: string) => (
  yamlBlock
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join('\n')
);

const engineRootHeader = (engine: string) => (
  engine === 'great_expectations' ? DEFAULT_GE_YAML : 'checks for data:'
);

const defaultYamlForEngine = (engine: string, baselineSodaYaml: string) => (
  engine === 'great_expectations' ? DEFAULT_GE_YAML : baselineSodaYaml
);

const hasEngineRootHeader = (yaml: string, engine: string) => {
  const trimmed = yaml.trim();
  if (!trimmed) {
    return false;
  }

  if (engine === 'great_expectations') {
    return trimmed.startsWith('expectations for ');
  }

  return trimmed.startsWith('checks for ') || trimmed.startsWith('checks:');
};

const appendTemplateBlock = (existingYaml: string, engine: string, yamlBlock: string) => {
  const trimmedBlock = dedentYamlBlock(yamlBlock).trim();
  if (!trimmedBlock) {
    return existingYaml;
  }

  const trimmedExisting = (existingYaml || '').trim();
  if (!trimmedExisting) {
    return `${engineRootHeader(engine)}\n${indentYamlBlock(trimmedBlock)}`;
  }

  if (hasEngineRootHeader(trimmedExisting, engine)) {
    return `${trimmedExisting}\n${indentYamlBlock(trimmedBlock)}`;
  }

  return `${engineRootHeader(engine)}\n${indentYamlBlock(trimmedExisting)}\n${indentYamlBlock(trimmedBlock)}`;
};

const buildSuggestionYaml = (suggestions: CheckSuggestion[]) => (
  suggestions
    .map((suggestion) => suggestion.suggested_check_yaml ? normalizeSuggestionYaml(suggestion.suggested_check_yaml) : '')
    .filter((yamlBlock): yamlBlock is string => Boolean(yamlBlock))
    .map((yamlBlock) => indentYamlBlock(yamlBlock))
    .join('\n')
);

const trimOuterBlankLines = (yaml: string) => (
  yaml
    .replace(/^(?:[ \t]*\r?\n)+/, '')
    .replace(/(?:\r?\n[ \t]*)+$/, '')
);

const mergeChecksYaml = (baseYaml: string, importedYaml: string) => {
  const normalizedBase = (baseYaml || DEFAULT_CHECKS_YAML).trim();
  const normalizedImported = trimOuterBlankLines(importedYaml || '');

  if (!normalizedImported.trim()) {
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
  const workflowContextRef = useRef(readWorkflowContext());
  const requestedConnectionId = searchParams.get('connectionId') || '';
  const requestedSnapshotId = searchParams.get('snapshotId') || '';
  const initialConnectionId = requestedConnectionId || workflowContextRef.current?.connectionId || '';
  const initialSnapshotId = requestedSnapshotId || workflowContextRef.current?.snapshotId || '';
  const initialDraftRef = useRef<CheckPlanFormDraft | null>(readCheckPlanFormDraft());
  const [plans, setPlans] = useState<CheckPlan[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(
    initialDraftRef.current?.showForm ?? Boolean(requestedConnectionId || requestedSnapshotId)
  );
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanEngine, setEditingPlanEngine] = useState<string>('soda');
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
  const [importedSuggestions, setImportedSuggestions] = useState<CheckSuggestion[]>(
    initialDraftRef.current?.importedSuggestions || []
  );
  const [baselineChecksYaml, setBaselineChecksYaml] = useState(DEFAULT_CHECKS_YAML);
  const [baselineReady, setBaselineReady] = useState(!initialSnapshotId);
  const [activeMetadataProfile, setActiveMetadataProfile] = useState<MetadataProfile | null>(null);
  const navigate = useNavigate();
  const importedDraftRef = useRef(false);
  const engineDraftsRef = useRef<Record<string, string>>({
    soda: initialDraftRef.current?.engineDrafts?.soda || DEFAULT_CHECKS_YAML,
    great_expectations: initialDraftRef.current?.engineDrafts?.great_expectations || DEFAULT_GE_YAML,
  });
  const pendingDraftRef = useRef<SuggestionPlanDraft | null>(
    (location.state as CheckPlansLocationState | null)?.suggestionDraft || readDraftFromSession()
  );

  const [form, setForm] = useState<CreateCheckPlanPayload>({
    name: initialDraftRef.current?.form.name || '',
    connection_id: requestedConnectionId || initialDraftRef.current?.form.connection_id || initialConnectionId || undefined,
    metadata_snapshot_id: requestedSnapshotId || initialDraftRef.current?.form.metadata_snapshot_id || initialSnapshotId || undefined,
    description: initialDraftRef.current?.form.description || '',
    check_engine: initialDraftRef.current?.form.check_engine || 'soda',
    checks_yaml: initialDraftRef.current?.form.checks_yaml || DEFAULT_CHECKS_YAML,
  });

  const currentEngine = form.check_engine || 'soda';
  const availableColumns = activeMetadataProfile?.schema?.columns || [];

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
    if (!form.connection_id && !form.metadata_snapshot_id) {
      return;
    }

    setWorkflowContext({
      connectionId: form.connection_id,
      snapshotId: form.metadata_snapshot_id,
    });
  }, [form.connection_id, form.metadata_snapshot_id]);

  useEffect(() => {
    const draft: CheckPlanFormDraft = {
      showForm,
      form,
      importedSuggestions,
      engineDrafts: {
        soda: engineDraftsRef.current.soda || DEFAULT_CHECKS_YAML,
        great_expectations: engineDraftsRef.current.great_expectations || DEFAULT_GE_YAML,
      },
    };

    try {
      sessionStorage.setItem(CHECK_PLAN_FORM_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to persist check plan draft:', error);
    }
  }, [showForm, form, importedSuggestions]);

  useEffect(() => {
    const snapshotId = requestedSnapshotId || form.metadata_snapshot_id;
    if (!snapshotId) {
      setBaselineChecksYaml(DEFAULT_CHECKS_YAML);
      if (!form.connection_id) {
        setActiveMetadataProfile(null);
      }
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

        const profileData = data as MetadataProfile;
        setActiveMetadataProfile(profileData);
        const nextBaseline = buildBaselineChecksYaml(profileData);
        setBaselineChecksYaml(nextBaseline);
        const currentSodaDraft = engineDraftsRef.current.soda?.trim() || '';
        if (!currentSodaDraft || currentSodaDraft === DEFAULT_CHECKS_YAML.trim() || currentSodaDraft === baselineChecksYaml.trim()) {
          engineDraftsRef.current.soda = nextBaseline;
        }
        setForm((current) => {
          if ((current.check_engine || 'soda') === 'great_expectations') {
            return current;
          }

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
  }, [requestedSnapshotId, form.metadata_snapshot_id, form.connection_id, baselineChecksYaml]);

  useEffect(() => {
    if (form.metadata_snapshot_id || !form.connection_id) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { data } = await getMetadataForConnection(form.connection_id!);
        if (cancelled) {
          return;
        }

        const latestProfile = Array.isArray(data) ? data[0] : data;
        if (latestProfile?.snapshot_id) {
          setActiveMetadataProfile(latestProfile as MetadataProfile);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load latest metadata profile for selected connection:', error);
          setActiveMetadataProfile(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.connection_id, form.metadata_snapshot_id]);

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
      const nextChecksYaml = importedYaml ? mergeChecksYaml(baselineChecksYaml, importedYaml) : baselineChecksYaml;

      engineDraftsRef.current.soda = nextChecksYaml;
      setImportedSuggestions(draft.selectedSuggestions);
      setShowForm(true);
      setForm((current) => ({
        ...current,
        connection_id: requestedConnectionId || draft.connectionId || current.connection_id,
        metadata_snapshot_id: requestedSnapshotId || draft.metadataSnapshotId || current.metadata_snapshot_id,
        check_engine: 'soda',
        checks_yaml: nextChecksYaml,
      }));

      triggerValidation(nextChecksYaml, setCreateValidation, createTimerRef);
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

  const updateCreateYaml = (nextYaml: string, engine = currentEngine) => {
    engineDraftsRef.current[engine] = nextYaml;
    setForm((current) => ({
      ...current,
      checks_yaml: nextYaml,
    }));

    if (engine !== 'great_expectations') {
      triggerValidation(nextYaml, setCreateValidation, createTimerRef);
    } else {
      setCreateValidation(EMPTY_VALIDATION);
    }
  };

  const handleEngineChange = (nextEngine: string) => {
    const previousEngine = currentEngine;
    engineDraftsRef.current[previousEngine] = form.checks_yaml || defaultYamlForEngine(previousEngine, baselineChecksYaml);

    const nextYaml = engineDraftsRef.current[nextEngine] || defaultYamlForEngine(nextEngine, baselineChecksYaml);

    setForm((current) => ({
      ...current,
      check_engine: nextEngine,
      checks_yaml: nextYaml,
    }));

    if (nextEngine === 'great_expectations') {
      setCreateValidation(EMPTY_VALIDATION);
      return;
    }

    triggerValidation(nextYaml, setCreateValidation, createTimerRef);
  };

  const handleAddTemplate = (yamlBlock: string) => {
    const nextYaml = appendTemplateBlock(form.checks_yaml || defaultYamlForEngine(currentEngine, baselineChecksYaml), currentEngine, yamlBlock);
    updateCreateYaml(nextYaml, currentEngine);
  };

  const openAiSuggestions = () => {
    const params = new URLSearchParams();
    if (form.connection_id) {
      params.set('connectionId', form.connection_id);
      params.set('autoGenerate', '1');
    }
    if (form.metadata_snapshot_id) {
      params.set('snapshotId', form.metadata_snapshot_id);
    }

    navigate(`/suggestions${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleCreate = async (e: React.FormEvent, runAfterCreate = false) => {
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

      const { data: createdPlan } = await createCheckPlan(payload);
      await load();
      sessionStorage.removeItem(CHECK_PLAN_FORM_DRAFT_KEY);
      setShowForm(false);
      setForm((current) => ({
        name: '',
        description: '',
        connection_id: current.connection_id,
        metadata_snapshot_id: current.metadata_snapshot_id,
        check_engine: 'soda',
        checks_yaml: baselineChecksYaml,
      }));
      setImportedSuggestions([]);

      if (runAfterCreate && createdPlan?.id) {
        navigate(`/runs?planId=${encodeURIComponent(createdPlan.id)}&autoStart=1`);
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : detail?.message
          ? `${detail.message}${detail.errors?.length ? `\n- ${detail.errors.join('\n- ')}` : ''}`
          : 'Failed to create check plan';
      alert(message);
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
    const nextChecksYaml = (plan.check_engine || 'soda') === 'great_expectations'
      ? (plan.checks_yaml || '')
      : sanitizeLegacySodaYaml(plan.checks_yaml || '');

    setEditingPlanId(plan.id);
    setEditingPlanEngine(plan.check_engine || 'soda');
    setEditForm({ name: plan.name, description: plan.description || '', checks_yaml: nextChecksYaml });
    setExpandedPlanId(null);
    if ((plan.check_engine || 'soda') === 'great_expectations') {
      setEditValidation(EMPTY_VALIDATION);
    } else {
      // Validate existing YAML immediately for Soda plans.
      triggerValidation(nextChecksYaml, setEditValidation, editTimerRef);
    }
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditingPlanEngine('soda');
    setEditValidation(EMPTY_VALIDATION);
  };

  const handleSavePlan = async (planId: string) => {
    setSaving(true);
    try {
      await updateCheckPlan(planId, {
        ...editForm,
        check_engine: editingPlanEngine,
      });
      setEditingPlanId(null);
      setEditingPlanEngine('soda');
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

  const engineLabel = (engine?: string) => (
    engine === 'great_expectations' ? 'Great Expectations' : 'Soda Core'
  );

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
            Assemble the final plan from catalog templates, AI-generated suggestions, and raw YAML, then run it against the selected file.
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
          {importedSuggestions.length > 0 && currentEngine === 'great_expectations' && (
            <div className="mb-4 rounded-[20px] border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
              The imported AI suggestions are SodaCL snippets. Switch back to Soda Core or remove those blocks before saving a Great Expectations plan.
            </div>
          )}
          <form onSubmit={(event) => { void handleCreate(event); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Plan Name</label>
                <input type="text" className="input" placeholder="daily-quality-checks" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Connection</label>
                <select title="Select connection for the check plan" className="input" value={form.connection_id || ''} onChange={e => setForm({ ...form, connection_id: e.target.value || undefined, metadata_snapshot_id: requestedSnapshotId || form.metadata_snapshot_id })} required={!form.metadata_snapshot_id} disabled={Boolean(form.metadata_snapshot_id)}>
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
                <select className="input" title="Check engine" value={form.check_engine || 'soda'} onChange={e => handleEngineChange(e.target.value)}>
                  <option value="soda">Soda Core (SodaCL)</option>
                  <option value="great_expectations">Great Expectations</option>
                </select>
              </div>
              <div className="col-span-2">
                <CheckTemplateLibrary
                  engine={currentEngine}
                  columns={availableColumns}
                  importedSuggestionsCount={importedSuggestions.length}
                  onOpenAiSuggestions={form.connection_id ? openAiSuggestions : undefined}
                  onAddTemplate={(yamlBlock) => handleAddTemplate(yamlBlock)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  {form.check_engine === 'great_expectations' ? 'Expectations (GE YAML)' : 'Checks (SodaCL YAML)'}
                </label>
                <textarea className="input font-mono text-xs" rows={6}
                  value={form.checks_yaml}
                  onChange={e => {
                    updateCreateYaml(e.target.value, currentEngine);
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
              <button type="button" onClick={(event) => { void handleCreate(event as unknown as React.FormEvent, true); }} disabled={!form.name || !form.connection_id || (form.check_engine !== 'great_expectations' && createValidation.valid === false)} className="btn-secondary" title={createValidation.valid === false ? 'Fix YAML errors before creating' : ''}><Play className="w-4 h-4" />Create & Run</button>
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
                      placeholder={editingPlanEngine === 'great_expectations' ? 'expectations for data:\n  - type: expect_column_values_to_not_be_null\n    column: id' : 'checks for data:\n  - row_count > 0'}
                      value={editForm.checks_yaml}
                      onChange={e => {
                        setEditForm(f => ({ ...f, checks_yaml: e.target.value }));
                        if (editingPlanEngine === 'great_expectations') {
                          setEditValidation(EMPTY_VALIDATION);
                        } else {
                          triggerValidation(e.target.value, setEditValidation, editTimerRef);
                        }
                      }} />
                    {editingPlanEngine !== 'great_expectations' && (
                      <>
                        <YamlValidationPanel v={editValidation} />
                        <p className="mt-1 text-xs text-text-muted">SodaCL format: <code className="font-mono">checks for &lt;table&gt;:</code> with indented check lines.</p>
                      </>
                    )}
                    {editingPlanEngine === 'great_expectations' && (
                      <p className="mt-1 text-xs text-text-muted">Great Expectations YAML is saved directly and validated at execution time.</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => void handleSavePlan(plan.id)} disabled={saving || (editingPlanEngine !== 'great_expectations' && editValidation.valid === false)} className="btn-primary text-xs" title={editingPlanEngine !== 'great_expectations' && editValidation.valid === false ? 'Fix YAML errors before saving' : ''}>
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
                        <span className="badge badge-info text-[10px]">{engineLabel(plan.check_engine)}</span>
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
