'use client';

import React, { useState } from 'react';
import type { AgentWorkflow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Sparkles, Shield, AlertTriangle, Lightbulb, Activity } from 'lucide-react';

interface AgentWorkflowTabsProps {
  workflow: AgentWorkflow;
}

const tabConfig = [
  { key: 'planner' as const, label: 'Planner', icon: Sparkles, color: 'text-primary' },
  { key: 'critic' as const, label: 'Critic', icon: Shield, color: 'text-success' },
  { key: 'triggers' as const, label: 'Triggers', icon: AlertTriangle, color: 'text-warning' },
  { key: 'recommendations' as const, label: 'Recommendations', icon: Lightbulb, color: 'text-info' },
  { key: 'trace' as const, label: 'Agent Trace', icon: Activity, color: 'text-accent' },
];

export default function AgentWorkflowTabs({ workflow }: AgentWorkflowTabsProps) {
  const [openTab, setOpenTab] = useState<string | null>(null);

  return (
    <div className="space-y-2 mt-3">
      {tabConfig.map((tab) => {
        const isOpen = openTab === tab.key;
        const content = tab.key === 'trace' ? null : workflow[tab.key];

        return (
          <div key={tab.key} className="rounded-xl border border-border-light overflow-hidden">
            <button
              onClick={() => setOpenTab(isOpen ? null : tab.key)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-background transition-colors"
            >
              <tab.icon className={cn('w-4 h-4', tab.color)} />
              <span className="flex-1 text-left">{tab.label}</span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm">
                {tab.key === 'trace' ? (
                  <div className="space-y-2">
                    {workflow.trace.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          step.status === 'success' ? 'bg-success-light text-success' :
                            step.status === 'warning' ? 'bg-warning-light text-warning' : 'bg-danger-light text-danger'
                        )}>
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-text-primary">{step.agent}</span>
                            <span className="text-xs text-text-muted">· {step.duration}</span>
                          </div>
                          <p className="text-xs text-text-secondary">{step.action}: {step.output}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-background whitespace-pre-wrap text-text-secondary leading-relaxed">
                    {content}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
