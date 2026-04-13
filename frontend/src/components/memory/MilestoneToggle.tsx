'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

export default function MilestoneToggle({ checked, onChange }: MilestoneToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
        checked
          ? 'bg-warning/10 border-warning text-warning'
          : 'bg-white border-border text-text-secondary hover:border-warning/50'
      )}
    >
      <Star className={cn('w-4 h-4', checked && 'fill-warning')} />
      {checked ? 'Milestone ⭐' : 'Mark as Milestone'}
    </button>
  );
}
