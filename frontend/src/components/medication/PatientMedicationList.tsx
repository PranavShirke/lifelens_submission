'use client';

import React from 'react';
import type { Medication, MedicationEvent } from '@/lib/types';
import MedicationDoseCard from './MedicationDoseCard';

interface PatientMedicationListProps {
  medications: Medication[];
  events: MedicationEvent[];
  onMarkDose: (eventId: string, status: 'taken' | 'skipped', note?: string) => void;
}

export default function PatientMedicationList({ medications, events, onMarkDose }: PatientMedicationListProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter((e) => e.doseDate === today);
  const takenCount = todayEvents.filter((e) => e.status === 'taken').length;
  const adherence = todayEvents.length > 0 ? Math.round((takenCount / todayEvents.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Today's summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary">Today&apos;s Adherence</h3>
          <span className="text-2xl font-bold text-primary">{adherence}%</span>
        </div>
        <div className="w-full h-2.5 bg-border-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${adherence}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          {takenCount} of {todayEvents.length} doses taken
        </p>
      </div>

      {/* Medication cards */}
      {medications.filter((m) => m.active).map((med) => {
        const medEvents = todayEvents.filter((e) => e.medicationId === med.id);
        return (
          <MedicationDoseCard
            key={med.id}
            medication={med}
            events={medEvents}
            onMarkDose={onMarkDose}
          />
        );
      })}
    </div>
  );
}
