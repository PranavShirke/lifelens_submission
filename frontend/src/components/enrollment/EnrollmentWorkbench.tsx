'use client';

import React, { useMemo, useState } from 'react';
import { Lock, Eye, UserRoundPlus, PackagePlus, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';
import WebcamCapture from '@/components/memory/WebcamCapture';
import VoiceRecorder from './VoiceRecorder';
import EnrollmentHistoryPanel from './EnrollmentHistoryPanel';
import { enrollObject, enrollPerson, type EnrollmentType } from '@/lib/api/enrollment';

interface CardSpec {
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  type: EnrollmentType;
}

const cards: CardSpec[] = [
  {
    title: 'Person Enrollment',
    subtitle: '/REMEMBER/PERSON',
    description: 'Upload face photo, relation and optional voice sample for quick caregiver recall.',
    accent: 'border-teal-300 bg-teal-50/40',
    type: 'person',
  },
  {
    title: 'Object Enrollment',
    subtitle: '/REMEMBER/OBJECT',
    description: 'Register important objects like medicine box, wallet or keys with contextual notes.',
    accent: 'border-amber-300 bg-amber-50/40',
    type: 'object',
  },
];

export default function EnrollmentWorkbench() {
  const { activePatientId, activePatientName } = useSessionStore();
  const { addToast } = useUIStore();

  const [activeType, setActiveType] = useState<EnrollmentType>('person');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Acquaintance');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedCard = useMemo(() => cards.find((c) => c.type === activeType)!, [activeType]);

  const resetForm = () => {
    setName('');
    setRelation('Acquaintance');
    setAge('');
    setNotes('');
    setImageFile(null);
    setAudioBlob(null);
    setShowCamera(false);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activePatientId) {
      addToast({ type: 'error', message: 'Select a patient before enrollment.' });
      return;
    }
    if (!imageFile) {
      addToast({ type: 'warning', message: 'Please upload or capture a photo first.' });
      return;
    }

    setSubmitting(true);
    try {
      if (activeType === 'person') {
        await enrollPerson({
          patientId: activePatientId,
          name,
          relation,
          age,
          notes,
          imageFile,
          audioBlob,
        });
      } else {
        await enrollObject({
          patientId: activePatientId,
          name,
          notes,
          imageFile,
        });
      }

      addToast({ type: 'success', message: `${name} enrolled successfully.` });
      resetForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      addToast({ type: 'error', message: 'Enrollment failed. Check backend logs and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-black text-[#1E1B2E]">Memory Bank Enrollment</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Caretaker mode for <span className="font-bold text-[#FF8C42]">{activePatientName || 'selected patient'}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const active = card.type === activeType;
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => setActiveType(card.type)}
              className={`rounded-3xl border-2 p-5 text-left transition-all ${card.accent} ${active ? 'ring-2 ring-[#FF8C42] shadow-lg scale-[1.01]' : 'opacity-90 hover:opacity-100'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-black tracking-wide text-slate-700">
                  {card.type === 'person' && <UserRoundPlus className="h-4 w-4" />}
                  {card.type === 'object' && <PackagePlus className="h-4 w-4" />}
                  {card.title}
                </div>
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-black tracking-wide text-slate-600">
                  {card.subtitle}
                </span>
              </div>
              <p className="text-sm text-slate-700">{card.description}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">{selectedCard.title}</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedCard.subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            <Lock className="h-3.5 w-3.5" /> Qdrant secured
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#FF8C42] focus:outline-none"
                placeholder={activeType === 'object' ? 'Medicine Box' : 'Mary Smith'}
              />
            </div>

            {activeType !== 'object' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Relation</label>
                  <input
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#FF8C42] focus:outline-none"
                    placeholder="Daughter"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Age</label>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#FF8C42] focus:outline-none"
                    placeholder="68"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#FF8C42] focus:outline-none"
                placeholder="Context that helps patient recall this person/object."
              />
            </div>

            {activeType === 'person' && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Voice Sample (Optional)</p>
                <VoiceRecorder onRecordingComplete={setAudioBlob} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">Photo Upload</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1E1B2E] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
                  <UploadCloud className="h-4 w-4" /> Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const nextFile = e.target.files?.[0] || null;
                      setImageFile(nextFile);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowCamera((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Eye className="h-4 w-4" /> {showCamera ? 'Close Camera' : 'Use Camera'}
                </button>
              </div>

              {imageFile && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">Selected: {imageFile.name}</p>
              )}

              {showCamera && (
                <div className="mt-4">
                  <WebcamCapture
                    onCapture={(captured) => {
                      setImageFile(captured);
                      setShowCamera(false);
                      addToast({ type: 'success', message: 'Photo captured successfully.' });
                    }}
                    onCancel={() => setShowCamera(false)}
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Storage behavior</p>
              <ul className="space-y-1 text-xs font-medium text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Uses dedicated Qdrant enrollment collection.</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Keeps existing memory and medication flows untouched.</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Safe rollback by removing this route/module only.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim() || !imageFile}
              className="w-full rounded-2xl bg-[#FF8C42] px-4 py-3 text-sm font-black text-white shadow hover:bg-[#f97b2c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving to Qdrant...' : `Enroll ${activeType === 'object' ? 'Object' : 'Person'}`}
            </button>
          </div>
        </form>
      </div>

      <EnrollmentHistoryPanel refreshKey={refreshKey} />
    </div>
  );
}
