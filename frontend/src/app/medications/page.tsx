'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import PatientMedicationList from '@/components/medication/PatientMedicationList';
import { getMedications, getMedicationEvents, markDose as markDoseApi } from '@/lib/api/medications';
import { useUIStore } from '@/lib/store/ui-store';
import { useSessionStore } from '@/lib/store/session-store';
import type { MedicationEvent, Medication } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Pill, Calendar, Filter } from 'lucide-react';

export default function MedicationsPage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker']}>
      <AppShell><MedicationsContent /></AppShell>
    </RoleGuard>
  );
}

function MedicationsContent() {
  const { addToast } = useUIStore();
  const { activePatientId } = useSessionStore();
  const [events, setEvents] = useState<MedicationEvent[]>([]);
  const [medications, setMeds] = useState<Medication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const pid = activePatientId || 'patient_1';
    getMedicationEvents(pid).then(setEvents).catch(() => {});
    getMedications(pid).then(setMeds).catch(() => {});
  }, [activePatientId]);

  const handleMarkDose = (eventId: string, status: 'taken' | 'skipped', note?: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, status, note: note || e.note, timestamp: new Date().toISOString() } : e
      )
    );
    addToast({
      type: status === 'taken' ? 'success' : 'info',
      message: status === 'taken' ? 'Dose marked as taken! 💊' : 'Dose skipped',
    });
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const historyEvents = events.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    const da = new Date(`${a.doseDate}T${a.doseTime}`);
    const db = new Date(`${b.doseDate}T${b.doseTime}`);
    return db.getTime() - da.getTime();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" /> My Medications
          </h1>
          <p className="text-sm text-text-muted mt-1">{todayStr}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Medications */}
        <div>
          <h2 className="font-semibold text-text-primary mb-4">Active Medications</h2>
          <PatientMedicationList
            medications={medications}
            events={events}
            onMarkDose={handleMarkDose}
          />
        </div>

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Medication History</h2>
            <div className="flex gap-2">
              {['all', 'taken', 'missed', 'skipped'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn('px-3 py-1 text-xs rounded-full capitalize',
                    statusFilter === s ? 'bg-primary text-white' : 'bg-border-light text-text-secondary hover:bg-border')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-text-muted text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Medication</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyEvents.map((evt, i) => (
                  <tr key={evt.id} className={cn('border-t border-border-light', i % 2 === 0 && 'bg-background/50')}>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(evt.doseDate + 'T00:00:00')}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{evt.medicationName}</td>
                    <td className="px-4 py-3 text-text-secondary">{evt.doseTime}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', {
                        'badge-green': evt.status === 'taken',
                        'badge-red': evt.status === 'missed',
                        'badge-yellow': evt.status === 'pending',
                        'badge-gray': evt.status === 'skipped',
                      })}>
                        {evt.status === 'taken' ? '✅' : evt.status === 'missed' ? '❌' : evt.status === 'pending' ? '🕐' : '⏭️'} {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
