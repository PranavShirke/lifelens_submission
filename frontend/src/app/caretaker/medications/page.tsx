'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import ActivePatientGate from '@/components/auth/ActivePatientGate';
import { useSessionStore } from '@/lib/store/session-store';
import { getMedications } from '@/lib/api/medications';
import type { Medication } from '@/lib/types';
import { Pill, Plus, Calendar, Info, Edit3, Trash2 } from 'lucide-react';
import AddMedicationModal from '@/components/medication/AddMedicationModal';
import AdherenceAnalyticsPanel from '@/components/medication/AdherenceAnalyticsPanel';
import { motion } from 'framer-motion';

export default function CaretakerMedicationsPage() {
  return (
    <RoleGuard allowedRoles={['caretaker']}>
      <AppShell>
        <ActivePatientGate>
          <CaretakerMedicationsContent />
        </ActivePatientGate>
      </AppShell>
    </RoleGuard>
  );
}

function CaretakerMedicationsContent() {
  const { activePatientId, activePatientName } = useSessionStore();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMedications = async () => {
    if (!activePatientId) return;
    try {
      const data = await getMedications(activePatientId);
      setMedications(data);
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [activePatientId]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Pill className="w-7 h-7 text-indigo-600" />
            </div>
            Medication Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Manage prescriptions and routines for <span className="text-indigo-600 font-bold">{activePatientName}</span>
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-gradient px-6 py-3 rounded-2xl shadow-lg shadow-indigo-200 flex items-center gap-2 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Add Medication
        </button>
      </div>

      <div className="mb-8">
        <AdherenceAnalyticsPanel patientId={activePatientId || ''} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : medications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No medications yet</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            Click the &quot;Add Medication&quot; button to start managing {activePatientName}&apos;s routine.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {medications.map((med) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={med.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-400 hover:text-rose-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <Pill className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">{med.name}</h3>
                  <p className="text-slate-500 font-bold text-sm">{med.dosage}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">{med.frequency}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {med.schedule.map((time, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                      {time}
                    </span>
                  ))}
                </div>
              </div>

              {med.notes && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instructions</span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {med.notes}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AddMedicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={activePatientId || ''}
        onSuccess={fetchMedications}
      />
    </div>
  );
}
