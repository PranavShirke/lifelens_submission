'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role, PatientInfo } from '@/lib/types';

interface SessionState {
  token: string | null;
  user: User | null;
  role: Role | null;
  activePatientId: string | null;
  activePatientName: string | null;
  patients: PatientInfo[];
  isAuthenticated: boolean;

  login: (token: string, user: User) => void;
  logout: () => void;
  setActivePatient: (patientId: string, patientName: string) => void;
  clearActivePatient: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      role: null,
      activePatientId: null,
      activePatientName: null,
      patients: [],
      isAuthenticated: false,

      login: (token: string, user: User) =>
        set({
          token,
          user,
          role: user.role,
          isAuthenticated: true,
          patients: user.patients || [],
          activePatientId: user.role === 'patient' ? user.patientId || user.id : null,
          activePatientName: user.role === 'patient' ? user.fullName : null,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          role: null,
          activePatientId: null,
          activePatientName: null,
          patients: [],
          isAuthenticated: false,
        }),

      setActivePatient: (patientId: string, patientName: string) =>
        set({ activePatientId: patientId, activePatientName: patientName }),

      clearActivePatient: () =>
        set({ activePatientId: null, activePatientName: null }),
    }),
    {
      name: 'lifelens-session',
    }
  )
);
