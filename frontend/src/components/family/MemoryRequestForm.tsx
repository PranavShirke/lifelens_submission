'use client';

import React, { useState } from 'react';
import { Send, CalendarDays, MapPin, Users, FileText, Loader2 } from 'lucide-react';
import LocationSelector from '@/components/memory/LocationSelector';
import { useUIStore } from '@/lib/store/ui-store';
import { useSessionStore } from '@/lib/store/session-store';
import { submitFamilyRequest } from '@/lib/api/family';

export default function MemoryRequestForm() {
  const { addToast } = useUIStore();
  const { activePatientId, user } = useSessionStore();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    memoryType: 'image' as 'image' | 'audio' | 'text',
    description: '',
    peopleInvolved: '',
    eventDate: '',
    location: null as { lat: number; lon: number; name: string } | null,
  });

  const handleSubmit = async () => {
    if (!formData.description) {
      addToast({ type: 'error', message: 'Please provide a description' });
      return;
    }
    
    setSubmitting(true);
    try {
      const pid = activePatientId || 'patient_1';
      const requesterName = user?.fullName || 'Family Member';
      
      await submitFamilyRequest({
        patient_id: pid,
        requester_name: requesterName,
        memory_type: formData.memoryType,
        description: formData.description,
        details: {
          people_involved: formData.peopleInvolved,
          event_date: formData.eventDate,
          location: formData.location?.name || '',
        },
      });
      
      addToast({ type: 'success', message: 'Memory request submitted successfully! 💌' });
      setFormData({ memoryType: 'image', description: '', peopleInvolved: '', eventDate: '', location: null });
    } catch {
      addToast({ type: 'error', message: 'Failed to submit request. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      {/* Type selector */}
      <div>
        <label className="text-sm font-medium text-text-secondary mb-2 block">
          <FileText className="w-3.5 h-3.5 inline mr-1" /> Memory Type
        </label>
        <div className="pill-tabs w-fit">
          {(['image', 'audio', 'text'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFormData({ ...formData, memoryType: type })}
              className={`pill-tab ${formData.memoryType === type ? 'active' : ''}`}
            >
              {type === 'image' ? '📷 Image' : type === 'audio' ? '🎤 Audio' : '📝 Text'}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-text-secondary mb-1 block">Description *</label>
        <textarea
          className="input-base min-h-[100px]"
          placeholder="Describe the memory you'd like captured..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* People */}
      <div>
        <label className="text-sm font-medium text-text-secondary mb-1 block">
          <Users className="w-3.5 h-3.5 inline mr-1" /> People Involved
        </label>
        <input
          className="input-base"
          placeholder="e.g. Priya, Amit (comma-separated)"
          value={formData.peopleInvolved}
          onChange={(e) => setFormData({ ...formData, peopleInvolved: e.target.value })}
        />
      </div>

      {/* Date */}
      <div>
        <label className="text-sm font-medium text-text-secondary mb-1 block">
          <CalendarDays className="w-3.5 h-3.5 inline mr-1" /> Event Date
        </label>
        <input
          type="date"
          className="input-base"
          value={formData.eventDate}
          onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
        />
      </div>

      {/* Location */}
      <LocationSelector value={formData.location} onChange={(loc) => setFormData({ ...formData, location: loc })} />

      <button onClick={handleSubmit} disabled={submitting} className="btn-gradient flex items-center gap-2 disabled:opacity-50">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </div>
  );
}
