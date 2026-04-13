'use client';

import React from 'react';
import { useUIStore, type Toast } from '@/lib/store/ui-store';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<Toast['type'], LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<Toast['type'], string> = {
  success: 'border-success bg-success-light text-success',
  error: 'border-danger bg-danger-light text-danger',
  info: 'border-info bg-info-light text-info',
  warning: 'border-warning bg-warning-light text-warning',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'toast-enter flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg bg-card min-w-[320px] max-w-[420px]',
              colorMap[toast.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium text-text-primary flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="flex-shrink-0">
              <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
