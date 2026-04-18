import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, Trash2, Upload, FileSpreadsheet, Link2, X, Loader2 } from 'lucide-react';
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
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.parquet'))) {
      setSelectedFile(file);
      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
      setFormMode('upload');
    }
  }, [uploadName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
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

  const typeIcon = (t: string) => {
    if (t === 'csv' || t === 'parquet') return <FileSpreadsheet className="w-5 h-5 text-cyan-400" />;
    return <Database className="w-5 h-5 text-violet-400" />;
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
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Connections</h2>
          <p className="mt-1 text-sm text-text-secondary">Upload data files or link database sources</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { resetForms(); setFormMode('upload'); }} className="btn-primary">
            <Upload className="w-4 h-4" /><span>Upload File</span>
          </button>
          <button onClick={() => { resetForms(); setFormMode('database'); }} className="btn-secondary">
            <Link2 className="w-4 h-4" /><span>Database</span>
          </button>
        </div>
      </div>

      {/* Drop Zone (always visible when no form, acts as quick upload) */}
      {formMode === 'none' && connections.length === 0 && (
        <div
          className={`card text-center py-16 animate-fade-up border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'border-cyan-400 bg-cyan-400/5' : ''}`}
          style={{ borderColor: dragOver ? undefined : 'var(--glass-border)' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => setFormMode('upload')}
        >
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.08)' }}>
            <Upload className="w-6 h-6 text-cyan-400/60" />
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
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragOver ? 'border-cyan-400 bg-cyan-400/5' : ''}`}
              style={{ borderColor: dragOver ? undefined : 'var(--glass-border)' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
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
                  <p className="text-sm text-text-secondary mb-1">Drag & drop or <button type="button" onClick={() => fileInputRef.current?.click()} className="text-cyan-400 hover:underline">browse</button></p>
                  <p className="text-xs text-text-dim">CSV or Parquet, up to 100 MB</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,.parquet,.parq" className="hidden" onChange={handleFileSelect} />
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-1.5">Connection Name</label>
              <input type="text" className="input" placeholder="e.g. customers-q1" value={uploadName} onChange={(e) => setUploadName(e.target.value)} required minLength={3} />
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: conn.type === 'csv' || conn.type === 'parquet' ? 'rgba(6,182,212,0.1)' : 'rgba(139,92,246,0.1)' }}>
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
          className={`card text-center py-8 border-2 border-dashed transition-all cursor-pointer hover:border-cyan-400/30 ${dragOver ? 'border-cyan-400 bg-cyan-400/5' : ''}`}
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
