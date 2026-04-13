'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  Search,
  Square,
  UploadCloud,
  UserPlus,
  Volume2,
} from 'lucide-react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import ActivePatientGate from '@/components/auth/ActivePatientGate';
import AvatarCameraModal from '@/components/avatar/AvatarCameraModal';
import { useUIStore } from '@/lib/store/ui-store';
import { findObject, recognizePerson, rememberPerson } from '@/lib/api/avatar';
import type { AvatarObject, AvatarPerson } from '@/lib/types/avatar';

type ScanAction = 'recognize-person' | 'find-object';

interface EnrollmentSnapshot {
  name: string;
  relation: string;
  notes: string;
  avatarUrl?: string | null;
}

export default function RememberPersonPage() {
  return (
    <RoleGuard allowedRoles={['caretaker']}>
      <AppShell>
        <ActivePatientGate>
          <RememberPersonContent />
        </ActivePatientGate>
      </AppShell>
    </RoleGuard>
  );
}

function RememberPersonContent() {
  const { addToast } = useUIStore();

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Family');
  const [relationTagsInput, setRelationTagsInput] = useState('Family, Trusted');
  const [notes, setNotes] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentSnapshot | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanAction, setScanAction] = useState<ScanAction | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [recognizedPerson, setRecognizedPerson] = useState<AvatarPerson | null>(null);
  const [foundObject, setFoundObject] = useState<AvatarObject | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cameraTitle = useMemo(() => {
    if (scanAction === 'recognize-person') return 'Recognize Person';
    if (scanAction === 'find-object') return 'Find Object';
    return 'Camera';
  }, [scanAction]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioPreview, photoPreview]);

  const setPhoto = (file: File | null) => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const setAudio = (file: File | null, previewUrl?: string | null) => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
    }
    setAudioFile(file);
    setAudioPreview(previewUrl ?? (file ? URL.createObjectURL(file) : null));
  };

  const startRecording = async () => {
    if (typeof window === 'undefined' || !window.MediaRecorder) {
      addToast({ type: 'error', message: 'Audio recording is not supported in this browser.' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([blob], `voice-sample-${Date.now()}.webm`, { type: 'audio/webm' });
        setAudio(recordedFile, URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      addToast({ type: 'error', message: 'Microphone permission denied or unavailable.' });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return;
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleEnroll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!photoFile) {
      addToast({ type: 'warning', message: 'Upload a clear person photo before enrolling.' });
      return;
    }

    setIsEnrolling(true);
    try {
      const relationTags = relationTagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const response = await rememberPerson({
        name: name.trim(),
        relation,
        relationTags,
        notes: notes.trim(),
        file: photoFile,
        audioFile,
      });

      if (response.status === 'stored') {
        setEnrollment({
          name: name.trim(),
          relation,
          notes: notes.trim(),
          avatarUrl: response.avatar_url,
        });
        addToast({ type: 'success', message: `${name.trim()} has been enrolled.` });
      } else {
        addToast({ type: 'warning', message: response.message || 'Enrollment was not completed.' });
      }
    } catch {
      addToast({ type: 'error', message: 'Enrollment failed. Please try again.' });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCameraCapture = async (file: File) => {
    if (!scanAction) {
      return;
    }

    setCameraOpen(false);
    setIsScanning(true);

    try {
      if (scanAction === 'recognize-person') {
        const result = await recognizePerson(file);
        if (result.status === 'identified' && result.person) {
          setRecognizedPerson(result.person);
          addToast({ type: 'success', message: `Recognized ${result.person.name}.` });
        } else {
          setRecognizedPerson(null);
          addToast({ type: 'info', message: 'No known person recognized in this frame.' });
        }
      }

      if (scanAction === 'find-object') {
        const result = await findObject(file);
        if (result.status === 'identified' && result.object) {
          setFoundObject(result.object);
          addToast({ type: 'success', message: `Found ${result.object.name}.` });
        } else {
          setFoundObject(null);
          addToast({ type: 'info', message: 'No known object match found.' });
        }
      }
    } catch {
      addToast({ type: 'error', message: 'Camera scan failed. Please retry.' });
    } finally {
      setScanAction(null);
      setIsScanning(false);
    }
  };

  const playStoredVoice = (audioBase64?: string | null) => {
    if (!audioBase64) {
      addToast({ type: 'warning', message: 'No familiar voice sample is stored for this person yet.' });
      return;
    }

    try {
      const bytes = Uint8Array.from(window.atob(audioBase64), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        addToast({ type: 'warning', message: 'Unable to play voice sample.' });
      });
    } catch {
      addToast({ type: 'warning', message: 'Unable to decode voice sample.' });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="card p-5 md:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9896B0]">Caregiver Flow</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#1E1B2E] md:text-3xl">Person Enrollment And Recognition</h1>
        <p className="mt-2 text-sm font-medium text-[#5A576E]">
          Enroll familiar people with photo, relationship tags, notes, and an optional voice sample. Use the camera tools to
          recognize people or locate remembered objects.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <section className="card p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF5E6] text-[#FF8C42]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#1E1B2E]">Enroll Person</h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9896B0]">Route: /remember/person</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleEnroll}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
                  Name
                </label>
                <input
                  id="name"
                  className="input-base"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Suman Naik"
                  required
                />
              </div>

              <div>
                <label htmlFor="relation" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
                  Primary Relation
                </label>
                <select
                  id="relation"
                  className="input-base"
                  value={relation}
                  onChange={(event) => setRelation(event.target.value)}
                >
                  <option>Family</option>
                  <option>Friend</option>
                  <option>Caregiver</option>
                  <option>Doctor</option>
                  <option>Neighbor</option>
                  <option>Acquaintance</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="relation-tags" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
                Relationship Tags
              </label>
              <input
                id="relation-tags"
                className="input-base"
                value={relationTagsInput}
                onChange={(event) => setRelationTagsInput(event.target.value)}
                placeholder="Family, Daughter, Emergency Contact"
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
                Notes
              </label>
              <textarea
                id="notes"
                className="input-base min-h-[92px] resize-y"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Helpful reminders: how they speak, routines, or important context."
              />
            </div>

            <div className="rounded-2xl border border-[#FF8C42]/18 bg-[#FFF5E6]/60 p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#5A576E]">Enrollment Photo</p>
              <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#FF8C42]/25 bg-white px-4 py-6 text-center transition-colors hover:bg-[#FFF5E6]">
                <UploadCloud className="h-6 w-6 text-[#FF8C42]" />
                <span className="text-xs font-bold text-[#5A576E]">Click to upload a face photo</span>
                <span className="text-[11px] font-semibold text-[#9896B0]">JPG/PNG, clear face, front view</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setPhoto(event.target.files?.[0] || null)}
                />
              </label>

              {photoPreview ? (
                <img src={photoPreview} alt="Enrollment preview" className="mt-3 h-40 w-full rounded-xl border border-[#FF8C42]/15 object-cover" />
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#7A9E7A]/20 bg-[#EAF2E9]/70 p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#4B754B]">Optional Familiar Voice Sample</p>
              <div className="flex flex-wrap gap-2">
                {!isRecording ? (
                  <button type="button" className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-xs" onClick={startRecording}>
                    <Mic className="h-4 w-4" />
                    Record
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-[#D4A0A0] px-4 py-2 text-xs font-bold text-[#1E1B2E]"
                    onClick={stopRecording}
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                )}

                <label className="btn-outline inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-xs">
                  <UploadCloud className="h-4 w-4" />
                  Upload Audio
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(event) => setAudio(event.target.files?.[0] || null)}
                  />
                </label>

                {audioFile ? (
                  <button
                    type="button"
                    className="rounded-full border border-[#FF8C42]/25 bg-white px-4 py-2 text-xs font-bold text-[#5A576E]"
                    onClick={() => setAudio(null, null)}
                  >
                    Clear Sample
                  </button>
                ) : null}
              </div>

              {audioPreview ? <audio controls src={audioPreview} className="mt-3 w-full" /> : null}
            </div>

            <button
              type="submit"
              disabled={isEnrolling || !name.trim() || !photoFile}
              className="btn-gradient inline-flex w-full items-center justify-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isEnrolling ? 'Enrolling Person...' : 'Save Person Memory'}
            </button>
          </form>

          {enrollment ? (
            <div className="mt-4 rounded-2xl border border-[#7A9E7A]/30 bg-[#EAF2E9] p-4 text-sm text-[#1E1B2E]">
              <p className="font-bold">Saved: {enrollment.name}</p>
              <p className="mt-1 text-xs font-semibold text-[#5A576E]">Relation: {enrollment.relation}</p>
              {enrollment.notes ? <p className="mt-2 text-xs text-[#5A576E]">{enrollment.notes}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="card p-5 md:p-6">
            <h2 className="text-lg font-black tracking-tight text-[#1E1B2E]">Camera Actions</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#9896B0]">
              Recognize people and find objects using live capture
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="btn-outline inline-flex items-center justify-center gap-2 px-4 py-3 text-xs"
                onClick={() => {
                  setScanAction('recognize-person');
                  setCameraOpen(true);
                }}
              >
                <Camera className="h-4 w-4" />
                Recognize Person
              </button>
              <button
                type="button"
                className="btn-outline inline-flex items-center justify-center gap-2 px-4 py-3 text-xs"
                onClick={() => {
                  setScanAction('find-object');
                  setCameraOpen(true);
                }}
              >
                <Search className="h-4 w-4" />
                Find Object
              </button>
            </div>

            {isScanning ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FF8C42]/25 bg-[#FFF5E6] px-4 py-2 text-xs font-bold text-[#5A576E]">
                <Loader2 className="h-4 w-4 animate-spin text-[#FF8C42]" />
                Processing camera frame...
              </div>
            ) : null}
          </div>

          <div className="card p-5 md:p-6">
            <h3 className="text-base font-black tracking-tight text-[#1E1B2E]">Latest Recognition Result</h3>
            {recognizedPerson ? (
              <div className="mt-3 rounded-2xl border border-[#FF8C42]/20 bg-white p-4">
                <p className="text-sm font-bold text-[#1E1B2E]">{recognizedPerson.name}</p>
                <p className="mt-1 text-xs font-semibold text-[#5A576E]">Relation: {recognizedPerson.relation || 'Unknown'}</p>
                {recognizedPerson.notes ? <p className="mt-2 text-xs text-[#5A576E]">{recognizedPerson.notes}</p> : null}
                {recognizedPerson.audio ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#7A9E7A]/30 bg-[#EAF2E9] px-3 py-1.5 text-xs font-bold text-[#4B754B]"
                    onClick={() => playStoredVoice(recognizedPerson.audio)}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Play Familiar Voice
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs font-semibold text-[#9896B0]">No recognized person yet.</p>
            )}
          </div>

          <div className="card p-5 md:p-6">
            <h3 className="text-base font-black tracking-tight text-[#1E1B2E]">Latest Object Result</h3>
            {foundObject ? (
              <div className="mt-3 rounded-2xl border border-[#FF8C42]/20 bg-white p-4">
                <p className="text-sm font-bold text-[#1E1B2E]">{foundObject.name}</p>
                {foundObject.location ? <p className="mt-1 text-xs font-semibold text-[#5A576E]">Location: {foundObject.location}</p> : null}
                {foundObject.notes ? <p className="mt-2 text-xs text-[#5A576E]">{foundObject.notes}</p> : null}
                {foundObject.image ? (
                  <img
                    src={foundObject.image.startsWith('data:') ? foundObject.image : `data:image/jpeg;base64,${foundObject.image}`}
                    alt={foundObject.name}
                    className="mt-3 h-32 w-full rounded-xl border border-[#FF8C42]/15 object-cover"
                  />
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs font-semibold text-[#9896B0]">No object result yet.</p>
            )}
          </div>
        </section>
      </div>

      <AvatarCameraModal
        open={cameraOpen}
        title={cameraTitle}
        onClose={() => {
          setCameraOpen(false);
          setScanAction(null);
        }}
        onCapture={handleCameraCapture}
        isProcessing={isScanning}
      />
    </div>
  );
}
