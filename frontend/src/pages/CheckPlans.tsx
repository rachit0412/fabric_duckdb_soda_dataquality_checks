import { FileCheck } from 'lucide-react';

export function CheckPlans() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">Check Plans</h2>
        <p className="mt-1 text-sm text-text-secondary">Configure and manage quality rules</p>
      </div>
      <div className="card text-center py-20 animate-fade-up animate-delay-100">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.08)' }}>
          <FileCheck className="w-6 h-6 text-emerald-400/60" />
        </div>
        <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Coming Soon</h3>
        <p className="text-xs text-text-muted">Check plan builder with scheduling and threshold configuration.</p>
      </div>
    </div>
  );
}
