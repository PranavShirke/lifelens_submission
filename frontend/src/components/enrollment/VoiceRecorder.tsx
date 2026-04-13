'use client';

import React, { useRef, useState } from 'react';
import { Mic, Square, RotateCcw } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
}

export default function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      onRecordingComplete(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    onRecordingComplete(null);
  };

  return (
    <div className="space-y-3">
      {!isRecording && !audioUrl && (
        <button
          type="button"
          onClick={startRecording}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1E1B2E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Mic className="h-4 w-4" /> Record Voice Sample
        </button>
      )}

      {isRecording && (
        <button
          type="button"
          onClick={stopRecording}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Square className="h-4 w-4" /> Stop Recording
        </button>
      )}

      {audioUrl && (
        <div className="space-y-2">
          <audio src={audioUrl} controls className="w-full" />
          <button
            type="button"
            onClick={resetRecording}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      )}
    </div>
  );
}
