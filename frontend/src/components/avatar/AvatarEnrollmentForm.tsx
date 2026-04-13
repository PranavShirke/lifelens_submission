'use client';

import { FormEvent, useRef, useState } from 'react';
import { Mic, Package, Save, Square, UserPlus, X } from 'lucide-react';
import type { AvatarEnrollmentDraft, AvatarEntityKind } from '@/lib/types/avatar';

interface AvatarEnrollmentFormProps {
  type: AvatarEntityKind;
  onCancel: () => void;
  onSubmit: (draft: AvatarEnrollmentDraft) => Promise<void>;
  isSubmitting: boolean;
}

export default function AvatarEnrollmentForm({
  type,
  onCancel,
  onSubmit,
  isSubmitting,
}: AvatarEnrollmentFormProps) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Acquaintance');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isPersonLike = type === 'person' || type === 'patient';

  const startRecording = async () => {
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
        const file = new File([blob], `voice-sample-${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(file);

        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
        }
        setAudioPreviewUrl(URL.createObjectURL(blob));

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch {
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

  const resetAudio = () => {
    setAudioFile(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      type,
      name,
      relation: isPersonLike ? relation : undefined,
      age: isPersonLike && age.trim() ? Number(age) : undefined,
      notes,
      audioFile: isPersonLike ? audioFile : undefined,
    });
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5E6] text-[#FF8C42]">
            {isPersonLike ? <UserPlus className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#1E1B2E]">
              {isPersonLike ? 'Enroll Person' : 'Enroll Object'}
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9896B0]">
              Capture details, then take a camera photo
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="rounded-xl p-2 text-[#5A576E] transition-colors hover:bg-[#FFF5E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C42]"
          aria-label="Close enrollment"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="enroll-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
            {isPersonLike ? 'Name' : 'Object Name'}
          </label>
          <input
            id="enroll-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="input-base"
            placeholder={isPersonLike ? 'e.g. Maria Dsouza' : 'e.g. Medicine Box'}
          />
        </div>

        {isPersonLike ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="enroll-relation" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
                Relation
              </label>
              <select
                id="enroll-relation"
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                className="input-base"
              >
                <option>Acquaintance</option>
                <option>Family</option>
                <option>Friend</option>
                <option>Caregiver</option>
                <option>Doctor</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="enroll-age" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
                Age (optional)
              </label>
              <input
                id="enroll-age"
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="input-base"
                placeholder="e.g. 64"
              />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="enroll-notes" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#5A576E]">
            Notes
          </label>
          <textarea
            id="enroll-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="input-base min-h-[96px] resize-y"
            placeholder={isPersonLike ? 'Helpful context, habits, or reminders.' : 'Where this object is usually kept.'}
          />
        </div>

        {isPersonLike ? (
          <div className="rounded-2xl border border-[#FF8C42]/20 bg-[#FFF5E6]/70 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-[#5A576E]">Optional Voice Sample</p>

            {!isRecording && !audioFile ? (
              <button type="button" onClick={startRecording} className="btn-outline inline-flex w-full items-center justify-center gap-2 text-xs">
                <Mic className="h-4 w-4" />
                Record Voice
              </button>
            ) : null}

            {isRecording ? (
              <button type="button" onClick={stopRecording} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4A0A0] px-4 py-2 text-xs font-bold text-[#1E1B2E]">
                <Square className="h-4 w-4" />
                Stop Recording
              </button>
            ) : null}

            {audioPreviewUrl ? (
              <div className="space-y-2">
                <audio controls src={audioPreviewUrl} className="w-full" />
                <button type="button" onClick={resetAudio} className="w-full rounded-full border border-[#FF8C42]/25 bg-white px-4 py-2 text-xs font-bold text-[#5A576E]">
                  Reset Voice Sample
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <button type="submit" disabled={isSubmitting || !name.trim()} className="btn-gradient inline-flex w-full items-center justify-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-60">
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Preparing Capture...' : 'Continue To Camera'}
        </button>
      </form>
    </div>
  );
}
