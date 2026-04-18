import { FileSearch } from 'lucide-react';

export function Metadata() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Metadata</h2>
        <p className="mt-1 text-sm text-text-secondary">Profile and explore your data structures</p>
      </div>
      <div className="card text-center py-20 animate-fade-up animate-delay-100">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.08)' }}>
          <FileSearch className="w-6 h-6 text-cyan-400/60" />
        </div>
        <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Coming Soon</h3>
        <p className="text-xs text-text-muted">Schema profiling and column-level analysis will be available in a future release.</p>
      </div>
    </div>
  );
}
