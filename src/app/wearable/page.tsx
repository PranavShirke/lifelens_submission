'use client';

import React from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import WearableRecorderPanel from '@/components/wearable/WearableRecorderPanel';
import MemoryList from '@/components/memory/MemoryList';
import { mockMemories } from '@/lib/mock-data';
import { Watch } from 'lucide-react';

export default function WearablePage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker']}>
      <AppShell><WearableContent /></AppShell>
    </RoleGuard>
  );
}

function WearableContent() {
  const recentCaptures = mockMemories.filter((m) => m.type === 'audio').slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Watch className="w-6 h-6 text-primary" /> Wearable Memory Capture
        </h1>
        <p className="text-sm text-text-muted mt-1">Simulate wearable device recording and processing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WearableRecorderPanel />
        <div>
          <h3 className="font-semibold text-text-primary mb-4">Recent Captures</h3>
          <MemoryList memories={recentCaptures} compact />
        </div>
      </div>
    </div>
  );
}
