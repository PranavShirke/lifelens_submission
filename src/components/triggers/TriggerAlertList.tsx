'use client';

import React from 'react';
import type { Trigger } from '@/lib/types';
import { cn, formatRelativeTime, getSeverityColor } from '@/lib/utils';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface TriggerAlertListProps {
  triggers: Trigger[];
  onDismiss?: (id: string) => void;
}

export default function TriggerAlertList({ triggers, onDismiss }: TriggerAlertListProps) {
  if (triggers.length === 0) return null;

  const severityIcon: Record<string, React.ReactNode> = {
    urgent: <AlertTriangle className="w-4 h-4 text-danger" />,
    high: <AlertCircle className="w-4 h-4 text-warning" />,
    medium: <Info className="w-4 h-4 text-info" />,
    low: <Info className="w-4 h-4 text-text-muted" />,
  };

  return (
    <div className="space-y-3">
      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className={cn(
            'card p-3 relative',
            `severity-${trigger.severity}`
          )}
        >
          <div className="flex items-start gap-2">
            {severityIcon[trigger.severity]}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('badge text-[10px] uppercase', {
                  'badge-red': trigger.severity === 'urgent',
                  'badge-yellow': trigger.severity === 'high',
                  'badge-blue': trigger.severity === 'medium',
                  'badge-gray': trigger.severity === 'low',
                })}>
                  {trigger.severity}
                </span>
                <span className="text-[10px] text-text-muted">{formatRelativeTime(trigger.timestamp)}</span>
              </div>
              <p className="text-sm text-text-primary leading-snug">{trigger.message}</p>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(trigger.id)}
                className="p-1 rounded-lg hover:bg-background text-text-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
