import { useState, useEffect } from 'react';
import { Plus, Database, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { getConnections, createConnection, testConnection, deleteConnection } from '../api/client';
import type { Connection } from '../types';

export function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    connection_type: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data } = await getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConnection(formData);
      setShowForm(false);
      setFormData({ name: '', connection_type: 'postgresql', host: '', port: 5432, database: '', username: '', password: '' });
      loadConnections();
    } catch (error) {
      console.error('Failed to create connection:', error);
      alert('Failed to create connection');
    }
  };

  const handleTest = async (id: string) => {
    try {
      await testConnection(id);
      alert('Connection successful!');
    } catch (error) {
      alert('Connection failed!');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await deleteConnection(id);
      loadConnections();
    } catch (error) {
      console.error('Failed to delete connection:', error);
      alert('Failed to delete connection');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(255,255,255,0.06)' }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#06b6d4' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Connections</h2>
          <p className="mt-1 text-sm text-text-secondary">Manage your data source connections</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>Add Connection</span>
        </button>
      </div>

      {showForm && (
        <div className="card animate-fade-up">
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-4">New Connection</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" className="input" placeholder="Production DB" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Type</label>
                <select className="input" value={formData.connection_type} onChange={(e) => setFormData({ ...formData, connection_type: e.target.value })}>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="snowflake">Snowflake</option>
                  <option value="duckdb">DuckDB</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Host</label>
                <input type="text" className="input" placeholder="localhost" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Port</label>
                <input type="number" className="input font-mono" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Database</label>
                <input type="text" className="input" placeholder="data_quality" value={formData.database} onChange={(e) => setFormData({ ...formData, database: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Username</label>
                <input type="text" className="input" placeholder="postgres" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" className="input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">Create Connection</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {connections.map((conn, i) => (
          <div key={conn.id} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
                  <Database className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-semibold text-text-primary">{conn.name}</h3>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">
                    {conn.connection_type} · {conn.host}:{conn.port}/{conn.database}
                  </p>
                  <p className="text-[10px] text-text-dim font-mono mt-1">
                    Created {new Date(conn.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {conn.is_active ? (
                  <span className="badge badge-success">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="badge badge-error">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </span>
                )}
                <button onClick={() => handleTest(conn.id)} className="btn-ghost text-xs">Test</button>
                <button onClick={() => handleDelete(conn.id)} className="p-2 text-text-muted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {connections.length === 0 && !showForm && (
        <div className="card text-center py-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.08)' }}>
            <Database className="w-6 h-6 text-cyan-400/60" />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">No connections yet</h3>
          <p className="text-xs text-text-muted">Link your first data source to begin monitoring.</p>
        </div>
      )}
    </div>
  );
}
