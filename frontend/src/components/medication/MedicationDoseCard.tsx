'use client';

import React, { useState } from 'react';
import type { Medication, MedicationEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, Clock, X, SkipForward, Info } from 'lucide-react';

interface MedicationDoseCardProps {
  medication: Medication;
  events: MedicationEvent[];
  onMarkDose: (eventId: string, status: 'taken' | 'skipped', note?: string) => void;
}

export default function MedicationDoseCard({ medication, events, onMarkDose }: MedicationDoseCardProps) {
  const [skipReason, setSkipReason] = useState('');
  const [showSkipModal, setShowSkipModal] = useState<string | null>(null);

  const statusIcon: Record<string, React.ReactNode> = {
    taken: <Check className="w-3.5 h-3.5 text-success" />,
    pending: <Clock className="w-3.5 h-3.5 text-warning" />,
    missed: <X className="w-3.5 h-3.5 text-danger" />,
    skipped: <SkipForward className="w-3.5 h-3.5 text-text-muted" />,
  };

  const statusStyle: Record<string, string> = {
    taken: 'bg-success-light border-success text-success',
    pending: 'bg-warning-light border-warning text-warning',
    missed: 'bg-danger-light border-danger text-danger',
    skipped: 'bg-border-light border-border text-text-muted',
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-text-primary">{medication.name}</h4>
          <p className="text-sm text-text-secondary">{medication.dosage} · {medication.frequency}</p>
        </div>
        {medication.prescribedBy && (
          <span className="badge badge-gray text-xs">Rx: {medication.prescribedBy}</span>
        )}
      </div>

      {medication.notes && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Instructions</p>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{medication.notes}</p>
          </div>
        </div>
      )}

      {/* Dose time chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {events.map((evt) => (
          <div
            key={evt.id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium',
              statusStyle[evt.status]
            )}
          >
            {statusIcon[evt.status]}
            {evt.doseTime}
            <span className="capitalize">({evt.status})</span>
          </div>
        ))}
      </div>

      {/* Actions for pending doses */}
      {events.some((e) => e.status === 'pending') && (
        <div className="flex gap-2">
          {events
            .filter((e) => e.status === 'pending')
            .map((e) => (
              <React.Fragment key={e.id}>
                <button
                  onClick={() => onMarkDose(e.id, 'taken')}
                  className="btn-gradient text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Take Dose
                </button>
                <button
                  onClick={() => setShowSkipModal(e.id)}
                  className="btn-outline text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
              </React.Fragment>
            ))}
        </div>
      )}

      {/* Skip reason modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="card p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold mb-3">Skip Reason</h3>
            <input
              type="text"
              placeholder="Why are you skipping this dose?"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="input-base mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSkipModal(null)} className="btn-outline text-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  onMarkDose(showSkipModal, 'skipped', skipReason);
                  setShowSkipModal(null);
                  setSkipReason('');
                }}
                className="btn-gradient text-sm"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
