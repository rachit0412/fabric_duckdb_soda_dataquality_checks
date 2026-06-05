import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, Plus, Sparkles, Wand2 } from 'lucide-react';
import { getCheckLibrary } from '../api/client';
import type { CheckLibraryResponse, CheckTemplate, CheckTemplateParameter, ColumnProfile } from '../types';

type CheckTemplateLibraryProps = {
  engine: string;
  columns: ColumnProfile[];
  importedSuggestionsCount: number;
  onAddTemplate: (yamlBlock: string, template: CheckTemplate) => void;
  onOpenAiSuggestions?: () => void;
};

const listToYaml = (raw: string) => {
  const items = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => JSON.stringify(value));
  return `[${items.join(', ')}]`;
};

const formatParamValue = (parameter: CheckTemplateParameter, rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  if (parameter.input_type === 'list') {
    return listToYaml(trimmed);
  }

  if (parameter.input_type === 'number') {
    return trimmed;
  }

  // Quote values with YAML-significant characters to avoid parse errors
  // in generated checklist snippets (regex, labels with ':', etc.).
  if (/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return trimmed;
  }

  return JSON.stringify(trimmed);
};

const substituteTemplate = (template: CheckTemplate, values: Record<string, string>) => (
  template.template.replace(/{{(\w+)}}/g, (_match, key) => {
    const parameter = (template.parameters || []).find((item) => item.key === key);
    const rawValue = values[key] ?? parameter?.default ?? '';
    return formatParamValue(parameter || { key, label: key, input_type: 'text' }, rawValue);
  })
);

const categoryButtonClass = (active: boolean) => (
  active
    ? 'badge badge-info cursor-pointer border-transparent'
    : 'badge cursor-pointer border border-[var(--divider)] bg-transparent text-text-secondary'
);

const engineLabel = (engine: string) => (
  engine === 'great_expectations' ? 'Great Expectations' : 'Soda Core'
);

export function CheckTemplateLibrary({
  engine,
  columns,
  importedSuggestionsCount,
  onAddTemplate,
  onOpenAiSuggestions,
}: CheckTemplateLibraryProps) {
  const [categories, setCategories] = useState<Record<string, CheckTemplate[]>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedScope, setSelectedScope] = useState<'all' | 'table' | 'column' | 'pair'>('all');
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const { data } = await getCheckLibrary(engine);
        if (cancelled) {
          return;
        }

        const response = data as CheckLibraryResponse;
        setCategories(response.categories || {});
        setSelectedCategory('All');
      } catch (libraryError: any) {
        if (!cancelled) {
          setError(libraryError?.response?.data?.detail || 'Failed to load check templates');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [engine]);

  const categoryNames = useMemo(() => Object.keys(categories), [categories]);
  const totalCatalogCount = useMemo(
    () => categoryNames.reduce((sum, category) => sum + (categories[category] || []).length, 0),
    [categories, categoryNames],
  );

  const visibleTemplates = useMemo(() => {
    const templates = selectedCategory === 'All'
      ? categoryNames.flatMap((category) => categories[category] || [])
      : categories[selectedCategory] || [];

    const query = search.trim().toLowerCase();
    if (!query) {
      return templates;
    }

    return templates.filter((template) => {
      const matchesScope = selectedScope === 'all' || (template.scope || 'column') === selectedScope;
      if (!matchesScope) {
        return false;
      }

      return (
      template.name.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query)
      || template.category.toLowerCase().includes(query)
      || (template.scope || '').toLowerCase().includes(query)
      || template.template.toLowerCase().includes(query)
      );
    });
  }, [categories, categoryNames, selectedCategory, search, selectedScope]);

  const totalTemplates = visibleTemplates.length;
  const totalPages = Math.max(1, Math.ceil(totalTemplates / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedTemplates = visibleTemplates.slice(pageStart, pageStart + pageSize);

  const visiblePageNumbers = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const normalizedStart = Math.max(1, end - 4);
    return Array.from({ length: end - normalizedStart + 1 }, (_, idx) => normalizedStart + idx);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [engine, selectedCategory, selectedScope, search, pageSize]);

  useEffect(() => {
    setExpandedTemplateId(null);
  }, [engine, selectedCategory, selectedScope, search, currentPage]);

  const getDraftValue = (template: CheckTemplate, parameter: CheckTemplateParameter) => (
    drafts[template.id]?.[parameter.key] ?? parameter.default ?? ''
  );

  const updateDraftValue = (templateId: string, key: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [templateId]: {
        ...(current[templateId] || {}),
        [key]: value,
      },
    }));
  };

  const addTemplate = (template: CheckTemplate) => {
    const values = drafts[template.id] || {};
    const missingParameters = (template.parameters || []).filter((parameter) => {
      if (parameter.required === false) {
        return false;
      }
      const value = values[parameter.key] ?? parameter.default ?? '';
      return !String(value).trim();
    });

    if (missingParameters.length > 0) {
      alert(`Fill these fields first: ${missingParameters.map((parameter) => parameter.label).join(', ')}`);
      return;
    }

    onAddTemplate(substituteTemplate(template, values), template);
  };

  const renderParameterInput = (template: CheckTemplate, parameter: CheckTemplateParameter) => {
    const value = getDraftValue(template, parameter);
    const commonProps = {
      className: 'input text-xs',
      title: parameter.label,
      value,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        updateDraftValue(template.id, parameter.key, event.target.value);
      },
    };

    if (parameter.input_type === 'select') {
      return (
        <select {...commonProps}>
          <option value="">Select...</option>
          {(parameter.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    if (parameter.input_type === 'column' && columns.length > 0) {
      return (
        <select {...commonProps}>
          <option value="">Select column...</option>
          {columns.map((column) => (
            <option key={column.name} value={column.name}>{column.name}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        {...commonProps}
        type={parameter.input_type === 'number' ? 'number' : 'text'}
        placeholder={parameter.placeholder}
      />
    );
  };

  return (
    <div className="rounded-[24px] border border-[var(--divider)] bg-[var(--glass-bg)] p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.22em] text-text-muted">
            <Wand2 className="w-3.5 h-3.5" />
            Quick add
          </div>
          <h4 className="mt-3 text-sm font-heading font-semibold text-text-primary">Pick from {engineLabel(engine)} checks</h4>
          <p className="mt-1 text-xs text-text-secondary max-w-2xl">
            Choose a curated template from the SodaCL or Great Expectations catalogs and add it straight into the plan editor.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-[14px] border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-300">
              <p className="font-mono uppercase tracking-wider text-[10px]">Soda catalog</p>
              <p className="mt-1 text-emerald-200">Predefined SodaCL checks from the built-in library.</p>
            </div>
            <div className="rounded-[14px] border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-sky-300">
              <p className="font-mono uppercase tracking-wider text-[10px]">GE catalog</p>
              <p className="mt-1 text-sky-200">Predefined Great Expectations templates from the built-in library.</p>
            </div>
            <div className="rounded-[14px] border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-purple-300">
              <p className="font-mono uppercase tracking-wider text-[10px]">AI suggestions</p>
              <p className="mt-1 text-purple-200">Generated on the fly by the AI suggestion engine, not from Soda/GE catalogs.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenAiSuggestions && engine === 'soda' && (
            <button type="button" onClick={onOpenAiSuggestions} className="btn-secondary text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {importedSuggestionsCount > 0 ? `AI suggestions (${importedSuggestionsCount})` : 'Open AI suggestions'}
            </button>
          )}
        </div>
      </div>

      {engine === 'great_expectations' && (
        <div className="rounded-[18px] border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-300">
          AI-generated suggestions currently add SodaCL blocks. Use the Great Expectations catalog below for GE plans.
        </div>
      )}

      {columns.length === 0 && (
        <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          Profile metadata first if you want column dropdowns. You can still type column names manually.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={categoryButtonClass(selectedCategory === 'All')} onClick={() => setSelectedCategory('All')}>
          All ({totalCatalogCount})
        </button>
        {categoryNames.map((category) => (
          <button key={category} type="button" className={categoryButtonClass(selectedCategory === category)} onClick={() => setSelectedCategory(category)}>
            {category} ({(categories[category] || []).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_180px_140px_auto] lg:items-center">
        <input
          className="input text-xs"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search checks by name, category, scope, or syntax"
          title="Search check templates"
        />
        <select
          className="input text-xs"
          title="Filter by check scope"
          value={selectedScope}
          onChange={(event) => setSelectedScope(event.target.value as 'all' | 'table' | 'column' | 'pair')}
        >
          <option value="all">All scopes</option>
          <option value="table">Table checks</option>
          <option value="column">Column checks</option>
          <option value="pair">Pair checks</option>
        </select>
        <select
          className="input text-xs"
          title="Checks per page"
          value={String(pageSize)}
          onChange={(event) => setPageSize(Number(event.target.value))}
        >
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
        <p className="text-xs text-text-muted">
          Showing {totalTemplates === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + pageSize, totalTemplates)} of {totalTemplates}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-[18px] border border-[var(--divider)] px-4 py-3 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading template catalog...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-[18px] border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 max-h-[640px] overflow-y-auto pr-1">
          {pagedTemplates.map((template) => (
            <div key={template.id} className="rounded-[20px] border border-[var(--divider)] bg-[var(--card-bg)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-300" />
                    <h5 className="text-sm font-heading font-semibold text-text-primary">{template.name}</h5>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{template.description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span className="badge text-[10px] border border-[var(--divider)] bg-transparent text-text-secondary">{template.category}</span>
                  <span className="badge badge-info text-[10px]">{template.scope || 'column'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedTemplateId((current) => (current === template.id ? null : template.id))}
                  className="btn-secondary text-xs"
                >
                  {expandedTemplateId === template.id ? 'Hide details' : 'Configure'}
                </button>
                <button type="button" onClick={() => addTemplate(template)} className="btn-primary text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Add to YAML
                </button>
              </div>

              {expandedTemplateId === template.id && (
                <>
                  {(template.parameters || []).length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(template.parameters || []).map((parameter) => (
                        <label key={`${template.id}-${parameter.key}`} className="block text-xs text-text-secondary">
                          <span className="mb-1 block font-mono uppercase tracking-wider text-text-muted">{parameter.label}</span>
                          {renderParameterInput(template, parameter)}
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="rounded-[16px] border border-[var(--divider)] bg-[var(--input-bg)] p-3">
                    <p className="mb-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Preview</p>
                    <pre className="whitespace-pre-wrap break-words text-[11px] font-mono text-text-secondary">{substituteTemplate(template, drafts[template.id] || {})}</pre>
                  </div>
                </>
              )}
            </div>
          ))}
          {pagedTemplates.length === 0 && (
            <div className="rounded-[18px] border border-[var(--divider)] px-4 py-3 text-sm text-text-secondary xl:col-span-2">
              No checks found. Try a different search or category.
            </div>
          )}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setPage(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {visiblePageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`text-xs px-2.5 py-1.5 rounded-lg border ${pageNumber === currentPage ? 'border-transparent bg-cyan-500/20 text-cyan-200' : 'border-[var(--divider)] text-text-secondary'}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <span className="text-xs text-text-muted">Page {currentPage} / {totalPages}</span>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}