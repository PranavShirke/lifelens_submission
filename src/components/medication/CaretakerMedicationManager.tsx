'use client';

import React, { useState } from 'react';
import type { Medication } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import AdherenceAnalyticsPanel from './AdherenceAnalyticsPanel';
import { useUIStore } from '@/lib/store/ui-store';

interface CaretakerMedicationManagerProps {
  medications: Medication[];
  patientId: string;
}

export default function CaretakerMedicationManager({ medications, patientId }: CaretakerMedicationManagerProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'add' | 'adherence'>('active');
  const { addToast } = useUIStore();
  const [formData, setFormData] = useState({
    name: '', dosage: '', frequency: '', schedule: '', prescribedBy: '', notes: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const tabs = [
    { key: 'active' as const, label: 'Active Medications' },
    { key: 'add' as const, label: 'Add Medication' },
    { key: 'adherence' as const, label: 'Adherence Analytics' },
  ];

  const handleAddMedication = () => {
    if (!formData.name || !formData.dosage) {
      addToast({ type: 'error', message: 'Please fill in medication name and dosage' });
      return;
    }
    addToast({ type: 'success', message: `${formData.name} added successfully` });
    setFormData({ name: '', dosage: '', frequency: '', schedule: '', prescribedBy: '', notes: '', startDate: new Date().toISOString().split('T')[0] });
    setActiveTab('active');
  };

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border-light">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'active' && (
          <div className="space-y-3">
            {medications.filter((m) => m.active).map((med) => (
              <div key={med.id} className="flex items-center justify-between p-4 rounded-xl border border-border-light hover:bg-background transition-colors">
                <div>
                  <p className="font-semibold text-text-primary">{med.name}</p>
                  <p className="text-sm text-text-secondary">{med.dosage} · {med.frequency}</p>
                  <p className="text-xs text-text-muted mt-1">Schedule: {med.schedule.join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1 block">Medication Name *</label>
              <input className="input-base" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Donepezil" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">Dosage *</label>
                <input className="input-base" value={formData.dosage} onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} placeholder="e.g. 10mg" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">Frequency</label>
                <input className="input-base" value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} placeholder="e.g. Twice daily" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1 block">Schedule Times (comma-separated)</label>
              <input className="input-base" value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} placeholder="e.g. 08:00, 20:00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">Start Date</label>
                <input className="input-base" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">Prescribed By</label>
                <input className="input-base" value={formData.prescribedBy} onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })} placeholder="Doctor name" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1 block">Notes</label>
              <textarea className="input-base min-h-[80px]" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." />
            </div>
            <button onClick={handleAddMedication} className="btn-gradient flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        )}

        {activeTab === 'adherence' && <AdherenceAnalyticsPanel />}
      </div>
    </div>
  );
}
