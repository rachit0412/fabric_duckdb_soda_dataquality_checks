import { Lightbulb } from 'lucide-react';

export function Suggestions() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h2 className="text-2xl font-heading font-bold text-text-primary tracking-tight">AI Suggestions</h2>
        <p className="mt-1 text-sm text-text-secondary">Intelligent recommendations for quality checks</p>
      </div>
      <div className="card text-center py-20 animate-fade-up animate-delay-100">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.08)' }}>
          <Lightbulb className="w-6 h-6 text-amber-400/60" />
        </div>
        <h3 className="text-sm font-heading font-semibold text-text-primary mb-1">Coming Soon</h3>
        <p className="text-xs text-text-muted">AI-powered check suggestions based on your data patterns.</p>
      </div>
    </div>
  );
}
