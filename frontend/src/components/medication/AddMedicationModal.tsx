'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, Calendar, Check, AlertCircle } from 'lucide-react';
import { addMedication } from '@/lib/api/medications';
import { useUIStore } from '@/lib/store/ui-store';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function AddMedicationModal({ isOpen, onClose, patientId, onSuccess }: AddMedicationModalProps) {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    instructions: '',
    durationDays: '7',
    startDate: new Date().toISOString().split('T')[0],
  });
  
  const [times, setTimes] = useState<string[]>(['08:00']);

  const handleAddTime = () => {
    setTimes([...times, '12:00']);
  };

  const handleRemoveTime = (index: number) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index));
    }
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage) {
      addToast({ type: 'error', message: 'Name and dosage are required' });
      return;
    }

    setLoading(true);
    try {
      // Calculate end date
      const start = new Date(formData.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(formData.durationDays));
      
      await addMedication({
        patientId,
        name: formData.name,
        dosage: formData.dosage,
        frequency: `${times.length} times daily`,
        schedule: times,
        startDate: formData.startDate,
        endDate: end.toISOString().split('T')[0],
        notes: formData.instructions,
        prescribedBy: 'caretaker',
      });

      addToast({ type: 'success', message: 'Medication added successfully!' });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        dosage: '',
        instructions: '',
        durationDays: '7',
        startDate: new Date().toISOString().split('T')[0],
      });
      setTimes(['08:00']);
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to add medication' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Add New Medication
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-bold text-slate-700 mb-1.5 block">Medication Name</label>
                  <input
                    required
                    type="text"
                    className="input-base"
                    placeholder="e.g. Donepezil"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 block">Dosage</label>
                  <input
                    required
                    type="text"
                    className="input-base"
                    placeholder="e.g. 10mg"
                    value={formData.dosage}
                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 block">Duration (Days)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-base"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({...formData, durationDays: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center justify-between">
                  Schedule (Times)
                  <button 
                    type="button" 
                    onClick={handleAddTime}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Time
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {times.map((time, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          className="input-base pl-9 py-2 text-sm"
                          value={time}
                          onChange={(e) => handleTimeChange(index, e.target.value)}
                        />
                      </div>
                      {times.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTime(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Instructions</label>
                <textarea
                  className="input-base min-h-[80px] text-sm font-medium"
                  placeholder="e.g. Take after breakfast with water"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                  This medication routine will be automatically synced with the patient's dashboard for today and the next {formData.durationDays} days.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-1 btn-gradient py-3 text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Medication'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
