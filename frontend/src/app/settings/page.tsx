'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import { useSessionStore } from '@/lib/store/session-store';
import { getEnrollmentRecords, type EnrollmentRecord } from '@/lib/api/enrollment';
import { Volume2, User, Package, Calendar, Clock } from 'lucide-react';
import { useUIStore } from '@/lib/store/ui-store';

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker']}>
      <AppShell>
        <EnrollmentDirectory />
      </AppShell>
    </RoleGuard>
  );
}

function EnrollmentDirectory() {
  const { activePatientId } = useSessionStore();
  const { addToast } = useUIStore();
  const [records, setRecords] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'person' | 'object'>('person');

  // Track created audio urls so we can dispose of them to avoid memory leaks
  const audioUrlsRef = useRef<string[]>([]);
  // Keep track of the currently playing audio
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchIt = async () => {
      try {
        setLoading(true);
        const data = await getEnrollmentRecords(activePatientId || 'patient_1');
        if (mounted) setRecords(data);
      } catch (err) {
        if (mounted) addToast({ type: 'error', message: 'Failed to load enrollment records.' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchIt();

    return () => {
      mounted = false;
      // Cleanup object urls and stop any playing audio
      audioUrlsRef.current.forEach(URL.revokeObjectURL);
      if (currentAudioRef.current) {
         currentAudioRef.current.pause();
      }
    };
  }, [activePatientId, addToast]);

  const handlePlayVoice = (id: string, audioBase64: string) => {
    // Stop currently playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    
    // Toggle off if already playing
    if (playingAudioId === id) {
      setPlayingAudioId(null);
      return;
    }

    try {
      const bytes = Uint8Array.from(window.atob(audioBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'audio/webm' }); // webm is standard from our recorder
      const url = URL.createObjectURL(blob);
      audioUrlsRef.current.push(url);

      const audio = new Audio(url);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudioId(null);
      };
      
      audio.play();
      setPlayingAudioId(id);
    } catch {
      addToast({ type: 'error', message: 'Unable to playback voice sample.' });
      setPlayingAudioId(null);
    }
  };

  const filtered = records.filter(r => r.enrollment_type === tab);

  const getImageUrl = (b64: string) => {
    if (b64.startsWith('data:image')) return b64;
    return `data:image/jpeg;base64,${b64}`;
  };

  const getValidDate = (tsString: string) => {
    if (tsString.includes('T') || tsString.includes('-')) {
        return new Date(tsString);
    }
    const ts = parseInt(tsString);
    // If it's a 10-digit Unix timestamp (seconds), convert to milliseconds.
    return ts < 10000000000 ? new Date(ts * 1000) : new Date(ts);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Enrollments</h1>
        <p className="text-slate-500 mt-2 font-medium">
          View people and objects currently recognized by the Avatar Assistant and Glasses HUD.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            tab === 'person' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          onClick={() => setTab('person')}
        >
          <User className="w-4 h-4" />
          Enrolled People
        </button>
        <button
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            tab === 'object' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          onClick={() => setTab('object')}
        >
          <Package className="w-4 h-4" />
          Enrolled Objects
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center bg-slate-50/50 border-2 border-dashed border-slate-200">
          <p className="text-sm font-bold text-slate-400">No {tab === 'person' ? 'people' : 'objects'} enrolled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(record => (
            <div key={record.id} className="card p-0 overflow-hidden bg-white hover:shadow-xl transition-shadow border border-slate-100 group">
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                 {record.image_base64 ? (
                   <img 
                      src={getImageUrl(record.image_base64)} 
                      alt={record.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                     {tab === 'person' ? <User className="w-12 h-12 mb-2" /> : <Package className="w-12 h-12 mb-2" />}
                     <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                   </div>
                 )}
                 
                 {/* Top Badge */}
                 <div className="absolute top-3 left-3 flex gap-2">
                    {tab === 'person' && record.relation && (
                       <span className="px-3 py-1 bg-white/90 backdrop-blur text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                         {record.relation}
                       </span>
                    )}
                 </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{record.name}</h3>
                    {tab === 'person' && record.age && (
                      <p className="text-xs font-bold text-slate-400 mt-1">{record.age} years old</p>
                    )}
                  </div>
                  {/* Play Voice Button */}
                  {tab === 'person' && record.audio_base64 && (
                    <button 
                       onClick={() => handlePlayVoice(record.id, record.audio_base64 as string)}
                       className={`p-3 rounded-full flex-shrink-0 transition-all shadow-sm ${playingAudioId === record.id ? 'bg-primary text-white shadow-primary/30 scale-110 animate-pulse' : 'bg-slate-50 text-primary hover:bg-primary/10'}`}
                       title="Play voice sample"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {record.notes && (
                  <p className="text-sm text-slate-600 mb-6 line-clamp-2">
                    "{record.notes}"
                  </p>
                )}

                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-4 mt-auto">
                    {record.timestamp ? (
                      <span className="flex items-center gap-1.5 w-full">
                         <Calendar className="w-3 h-3" />
                         Enrolled on {getValidDate(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 w-full">
                         <Clock className="w-3 h-3" /> Enrolled Recently
                      </span>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
