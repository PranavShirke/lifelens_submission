'use client';

import React from 'react';
import type { AgentTraceStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface AgentTracePanelProps {
  trace: AgentTraceStep[];
}

export default function AgentTracePanel({ trace }: AgentTracePanelProps) {
  const statusIcon: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-success" />,
    warning: <AlertCircle className="w-4 h-4 text-warning" />,
    error: <XCircle className="w-4 h-4 text-danger" />,
  };

  return (
    <div className="space-y-3">
      {trace.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {i + 1}
            </div>
            {i < trace.length - 1 && <div className="w-0.5 flex-1 bg-border-light mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-text-primary">{step.agent}</span>
              {statusIcon[step.status]}
              <span className="text-xs text-text-muted ml-auto">{step.duration}</span>
            </div>
            <p className="text-xs text-text-secondary mb-1">{step.action}</p>
            <div className="p-2 rounded-lg bg-background text-xs text-text-muted">{step.output}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
