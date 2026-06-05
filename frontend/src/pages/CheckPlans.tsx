import { useState, useEffect } from 'react';
import { FileCheck, Plus, Trash2, Play, X, Loader2 } from 'lucide-react';
import { getCheckPlans, createCheckPlan, deleteCheckPlan, getConnections, executeCheckPlan } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CheckPlan, Connection, CreateCheckPlanPayload } from '../types';

const DEFAULT_CHECKS_YAML = `checks for data:
  - row_count > 0
  - missing_count(id) = 0
  - duplicate_count(id) = 0`;

export function CheckPlans() {
  const [searchParams] = useSearchParams();
  const requestedConnectionId = searchParams.get('connectionId') || '';
  const requestedSnapshotId = searchParams.get('snapshotId') || '';
  const [plans, setPlans] = useState<CheckPlan[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(requestedConnectionId || requestedSnapshotId));
  const [executing, setExecuting] = useState<string | null>(null);
  const navigate = useNavigate();

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

      await createCheckPlan(payload);
      setShowForm(false);
      setForm({ name: '', description: '', checks_yaml: DEFAULT_CHECKS_YAML });
      load();
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
      await executeCheckPlan(planId);
      navigate('/runs');
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
            Assemble the final plan by combining baseline rules, AI suggestions, and prebuilt Soda or Great Expectations rule patterns.
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
                <p className="mt-1 text-xs text-text-muted">Paste baseline rules, AI-generated checks, or adapted Soda and Great Expectations rule patterns here.</p>
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
                <button onClick={() => handleDelete(plan.id)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
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
          <p className="text-xs text-text-muted mb-4">Create the first plan to combine baseline, AI-generated, and prebuilt checks for execution.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto"><Plus className="w-4 h-4" />Create Plan</button>
        </div>
      )}
    </div>
  );
}
