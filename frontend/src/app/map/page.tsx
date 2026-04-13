'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import MemoryMapPanel from '@/components/map/MemoryMapPanel';
import { getMemories } from '@/lib/api/memories';
import { useSessionStore } from '@/lib/store/session-store';
import { cn } from '@/lib/utils';
import { MapPin, Filter } from 'lucide-react';
import type { Memory } from '@/lib/types';

export default function MapPage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker', 'family']}>
      <AppShell><MapContent /></AppShell>
    </RoleGuard>
  );
}

function MapContent() {
  const { activePatientId } = useSessionStore();
  const [selectedType, setSelectedType] = useState('all');
  const [allMemories, setAllMemories] = useState<Memory[]>([]);

  useEffect(() => {
    const pid = activePatientId || 'patient_1';
    getMemories(pid).then(setAllMemories).catch(() => {});
  }, [activePatientId]);

  const types = [
    { key: 'all', label: 'All', emoji: '🗺️' },
    { key: 'image', label: 'Images', emoji: '📷' },
    { key: 'audio', label: 'Audio', emoji: '🎤' },
    { key: 'text', label: 'Text', emoji: '📝' },
  ];

  const memoriesWithLoc = allMemories.filter((m) => m.location);
  const filtered = selectedType === 'all' ? memoriesWithLoc : memoriesWithLoc.filter((m) => m.type === selectedType);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Memory Map
          </h1>
          <p className="text-sm text-text-muted mt-1">{filtered.length} memories with locations</p>
        </div>
        <div className="flex gap-2">
          {types.map((t) => (
            <button key={t.key} onClick={() => setSelectedType(t.key)}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedType === t.key ? 'bg-primary text-white' : 'bg-card text-text-secondary border border-border-light hover:bg-background')}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <div className="w-3 h-3 rounded-full bg-primary" /> Images
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <div className="w-3 h-3 rounded-full bg-info" /> Audio
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <div className="w-3 h-3 rounded-full bg-success" /> Text
        </div>
      </div>

      <MemoryMapPanel memories={allMemories} selectedType={selectedType} />
    </div>
  );
}
