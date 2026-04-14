'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useUIStore } from '@/lib/store/ui-store';
import { useSessionStore } from '@/lib/store/session-store';
import { submitFamilyRequest } from '@/lib/api/family';

export default function MemoryRequestForm() {
  const { addToast } = useUIStore();
  const { activePatientId, user } = useSessionStore();
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      addToast({ type: 'error', message: 'Please write a message for the caretaker' });
      return;
    }
    
    setSubmitting(true);
    try {
      const pid = activePatientId || 'patient_1';
      const requesterName = user?.fullName || 'Family Member';
      
      await submitFamilyRequest({
        patient_id: pid,
        requester_name: requesterName,
        memory_type: 'text',
        description,
        details: {},
      });
      
      addToast({ type: 'success', message: 'Request sent to caretaker! 💌' });
      setDescription('');
    } catch {
      addToast({ type: 'error', message: 'Failed to submit request. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="text-sm font-medium text-text-secondary mb-1 block">Message to Caretaker *</label>
        <textarea
          className="input-base min-h-[120px]"
          placeholder="Write a request or message for the caretaker... e.g. 'Please capture a photo of mom at the garden today'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex items-center gap-2 disabled:opacity-50">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
        {submitting ? 'Sending...' : 'Send Request'}
      </button>
    </div>
  );
}

