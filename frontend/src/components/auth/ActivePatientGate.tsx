'use client';

import React from 'react';
import { useSessionStore } from '@/lib/store/session-store';
import { Users, ChevronDown } from 'lucide-react';

interface ActivePatientGateProps {
  children: React.ReactNode;
}

export default function ActivePatientGate({ children }: ActivePatientGateProps) {
  const { activePatientId, patients, setActivePatient, role } = useSessionStore();

  // Patients always have their own patientId set
  if (role === 'patient' && activePatientId) {
    return <>{children}</>;
  }

  if (!activePatientId && (role === 'caretaker' || role === 'family')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Select a Patient</h2>
          <p className="text-sm text-text-secondary mb-6">
            Choose a patient to view their dashboard and manage their care.
          </p>
          <div className="relative">
            <select
              onChange={(e) => {
                const p = patients.find((pt) => pt.id === e.target.value);
                if (p) setActivePatient(p.id, p.name);
              }}
              defaultValue=""
              className="input-base appearance-none cursor-pointer pr-10"
            >
              <option value="" disabled>Choose patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.username})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
