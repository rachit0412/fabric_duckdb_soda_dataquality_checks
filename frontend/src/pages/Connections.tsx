import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, Trash2, Upload, FileSpreadsheet, Link2, X, Loader2, ArrowRight, HardDrive, Sparkles } from 'lucide-react';
import { getConnections, createConnection, deleteConnection, uploadFile } from '../api/client';
import type { Connection } from '../types';

type FormMode = 'none' | 'upload' | 'database';

export function Connections() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [uploadName, setUploadName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // DB form
  const [dbForm, setDbForm] = useState({ name: '', type: 'postgres', remote_url: '' });

  useEffect(() => { loadConnections(); }, []);

  const getAvailableUploadName = useCallback((baseName: string) => {
    const trimmed = baseName.trim();
    if (!trimmed) return '';

    const existingNames = new Set(connections.map((connection) => connection.name));
    if (!existingNames.has(trimmed)) {
      return trimmed;
    }

    let suffix = 2;
    while (existingNames.has(`${trimmed}-${suffix}`)) {
      suffix += 1;
    }

    return `${trimmed}-${suffix}`;
  }, [connections]);

  const loadConnections = async () => {
    try {
      const { data } = await getConnections();
      setConnections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    const normalizedName = file?.name.toLowerCase() || '';
    if (file && (normalizedName.endsWith('.csv') || normalizedName.endsWith('.parquet') || normalizedName.endsWith('.parq'))) {
      setSelectedFile(file);
      if (!uploadName) setUploadName(getAvailableUploadName(file.name.replace(/\.[^.]+$/, '')));
      setFormMode('upload');
    }
  }, [getAvailableUploadName, uploadName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadName) setUploadName(getAvailableUploadName(file.name.replace(/\.[^.]+$/, '')));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadName) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'csv';
      const fileType = ext === 'parquet' || ext === 'parq' ? 'parquet' : 'csv';
      const { data } = await uploadFile(uploadName, fileType, selectedFile);
      resetForms();
      await loadConnections();
      navigate(`/metadata?connectionId=${encodeURIComponent(data.id)}&autoProfile=1`);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Upload failed';
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await createConnection(dbForm);
      resetForms();
      await loadConnections();
      navigate(`/metadata?connectionId=${encodeURIComponent(data.id)}&autoProfile=1`);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to create connection';
      alert(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this connection?')) return;
    try {
      await deleteConnection(id);
      loadConnections();
    } catch (error) {
      alert('Failed to delete connection');
    }
  };

  const resetForms = () => {
    setFormMode('none');
    setSelectedFile(null);
    setUploadName('');
    setDbForm({ name: '', type: 'postgres', remote_url: '' });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const fileConnections = connections.filter((conn) => conn.type === 'csv' || conn.type === 'parquet').length;
  const databaseConnections = connections.length - fileConnections;

  const typeIcon = (t: string) => {
    if (t === 'csv' || t === 'parquet') return <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--accent)' }} />;
    return <Database className="w-5 h-5" style={{ color: 'var(--accent-2)' }} />;
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
        <div className="absolute -top-10 right-8 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: 'rgba(255,255,255,0.24)' }} />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Source setup
            </div>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              Add the data source that the plan will run against.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
              Upload a CSV or Parquet file, or create a database connection. Once the source is registered,
              move straight into metadata profiling.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => { resetForms(); setFormMode('upload'); }} className="btn-primary" type="button">
                <Upload className="w-4 h-4" />
                Upload file
              </button>
              <button onClick={() => { resetForms(); setFormMode('database'); }} className="btn-secondary" type="button" style={{ color: '#fffdf8', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' }}>
                <Link2 className="w-4 h-4" />
                Add database
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Connected sources</p>
              <p className="mt-3 text-4xl font-semibold text-white">{connections.length}</p>
              <p className="mt-2 text-sm text-white/72">Each saved source can be profiled and reused in future plans.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/12 bg-black/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Files</p>
                <p className="mt-2 text-2xl font-semibold text-white">{fileConnections}</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-black/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Databases</p>
                <p className="mt-2 text-2xl font-semibold text-white">{databaseConnections}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-fade-up animate-delay-100">
        {[
          {
            label: 'File uploads',
            value: fileConnections,
            icon: FileSpreadsheet,
            color: 'var(--accent)',
            bg: 'var(--accent-light)',
          },
          {
            label: 'Database endpoints',
            value: databaseConnections,
            icon: HardDrive,
            color: 'var(--accent-2)',
            bg: 'var(--accent-2-light)',
          },
          {
            label: 'Ready for profiling',
            value: connections.length,
            icon: ArrowRight,
            color: 'var(--success)',
            bg: 'var(--success-bg)',
          },
        ].map((item) => (
          <div key={item.label} className="metric-tile">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: item.bg }}>
                <item.icon className="h-5 w-5" style={{ color: item.color }} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>{item.value}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>{item.label}</p>
          </div>
        ))}
      </section>

      {/* Drop Zone (always visible when no form, acts as quick upload) */}
      {formMode === 'none' && connections.length === 0 && (
        <div
          className={`card text-center py-16 animate-fade-up border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'bg-cyan-400/5' : ''}`}
          style={{ borderColor: dragOver ? undefined : 'var(--glass-border)' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => setFormMode('upload')}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-light)' }}>
            <Upload className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Drop a CSV or Parquet file here</h3>
          <p className="text-xs text-text-muted">or click to browse. Up to 100 MB.</p>
        </div>
      )}

      {/* Upload Form */}
      {formMode === 'upload' && (
        <div className="card animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold text-text-primary">Upload Data File</h3>
            <button onClick={resetForms} className="p-1 rounded-lg transition-colors hover:bg-white/5"><X className="w-4 h-4 text-text-muted" /></button>
          </div>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Dropzone */}
            <div
              className={`relative border-2 border-dashed rounded-[24px] p-8 text-center transition-all ${dragOver ? 'bg-cyan-400/5' : ''}`}
              style={{ borderColor: dragOver ? undefined : 'var(--glass-border)' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                    <p className="text-xs text-text-muted">{formatSize(selectedFile.size)}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedFile(null)} className="ml-2 p-1 rounded hover:bg-white/5">
                    <X className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-text-dim mx-auto mb-2" />
                  <p className="text-sm text-text-secondary mb-1">Drag & drop or <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:underline" style={{ color: 'var(--accent)' }}>browse</button></p>
                  <p className="text-xs text-text-dim">CSV or Parquet, up to 100 MB</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,.parquet,.parq" className="hidden" onChange={handleFileSelect} />
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Connection Name</label>
              <input type="text" className="input" placeholder="e.g. customers-q1" value={uploadName} onChange={(e) => setUploadName(e.target.value)} required minLength={3} />
              <p className="mt-1 text-xs text-text-muted">Existing names are auto-versioned with `-2`, `-3`, and so on.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={!selectedFile || !uploadName || uploading} className="btn-primary disabled:opacity-40">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload & Connect</>}
              </button>
              <button type="button" onClick={resetForms} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Database Connection Form */}
      {formMode === 'database' && (
        <div className="card animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold text-text-primary">New Database Connection</h3>
            <button onClick={resetForms} className="p-1 rounded-lg transition-colors hover:bg-white/5"><X className="w-4 h-4 text-text-muted" /></button>
          </div>
          <form onSubmit={handleDbSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Name</label>
                <input type="text" className="input" placeholder="prod-postgres" value={dbForm.name} onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })} required minLength={3} />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Type</label>
                <select className="input" value={dbForm.type} onChange={(e) => setDbForm({ ...dbForm, type: e.target.value })}>
                  <option value="postgres">PostgreSQL</option>
                  <option value="snowflake">Snowflake</option>
                  <option value="duckdb">DuckDB</option>
                  <option value="bigquery">BigQuery</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Connection URL</label>
                <input type="text" className="input font-mono text-xs" placeholder="postgresql://user:pass@host:5432/dbname" value={dbForm.remote_url} onChange={(e) => setDbForm({ ...dbForm, remote_url: e.target.value })} required />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Create</button>
              <button type="button" onClick={resetForms} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Connections List */}
      <div className="space-y-3">
        {connections.map((conn, i) => (
          <div key={conn.id} className="card-hover animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: conn.type === 'csv' || conn.type === 'parquet' ? 'var(--accent-light)' : 'var(--accent-2-light)' }}>
                  {typeIcon(conn.type)}
                </div>
                <div>
                  <h3 className="text-sm font-heading font-semibold text-text-primary">{conn.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge badge-info text-[10px]">{conn.type.toUpperCase()}</span>
                    <span className="text-[10px] text-text-dim font-mono">
                      Created {new Date(conn.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(conn.id)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'var(--delete-hover-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {connections.length > 0 && formMode === 'none' && (
        <div
          className={`card text-center py-8 border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'bg-cyan-400/5' : ''}`}
          style={{ borderColor: dragOver ? undefined : 'var(--glass-border)' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => setFormMode('upload')}
        >
          <p className="text-xs text-text-muted"><Upload className="w-4 h-4 inline-block mr-1 -mt-0.5" />Drop a file here or click to upload</p>
        </div>
      )}
    </div>
  );
}
