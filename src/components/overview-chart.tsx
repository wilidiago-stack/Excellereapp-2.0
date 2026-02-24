'use client';

import { BarChart3, Sparkles } from 'lucide-react';

export function OverviewChart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-sm border border-dashed border-slate-200">
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <BarChart3 className="h-8 w-8" />
        </div>
        <Sparkles className="h-5 w-5 text-orange-400 absolute -top-1 -right-1 animate-bounce" />
      </div>
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
        Analytics Under Construction
      </h3>
      <p className="text-xs text-slate-500 text-center max-w-xs px-4">
        We are currently working on these charts to provide you with real-time project insights and metrics.
      </p>
    </div>
  );
}
