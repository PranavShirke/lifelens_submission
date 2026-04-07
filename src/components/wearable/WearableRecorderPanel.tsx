'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store/ui-store';

type RecordingState = 'idle' | 'recording' | 'processing';

interface ProcessStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export default function WearableRecorderPanel() {
  const [state, setState] = useState<RecordingState>('idle');
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useUIStore();

  const [steps, setSteps] = useState<ProcessStep[]>([
    { label: 'Recording', status: 'pending' },
    { label: 'Transcribing', status: 'pending' },
    { label: 'Embedding', status: 'pending' },
    { label: 'Saving', status: 'pending' },
  ]);

  const startRecording = () => {
    setState('recording');
    setTimer(0);
    intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    setSteps((s) => s.map((st, i) => ({ ...st, status: i === 0 ? 'active' : 'pending' })));
  };

  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState('processing');
    setSteps((s) => s.map((st, i) => ({ ...st, status: i === 0 ? 'done' : i === 1 ? 'active' : 'pending' })));

    // Simulate processing pipeline
    setTimeout(() => {
      setSteps((s) => s.map((st, i) => ({ ...st, status: i <= 1 ? 'done' : i === 2 ? 'active' : 'pending' })));
    }, 1500);
    setTimeout(() => {
      setSteps((s) => s.map((st, i) => ({ ...st, status: i <= 2 ? 'done' : 'active' })));
    }, 3000);
    setTimeout(() => {
      setSteps((s) => s.map((st) => ({ ...st, status: 'done' as const })));
      setState('idle');
      addToast({ type: 'success', message: 'Wearable memory captured and saved!' });
    }, 4500);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const stepIcon = (status: string) => {
    if (status === 'done') return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === 'active') return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    return <Circle className="w-5 h-5 text-text-muted" />;
  };

  return (
    <div className="space-y-8">
      {/* Record Section */}
      <div className="card p-8 text-center">
        <h3 className="font-semibold text-text-primary mb-6">Wearable Memory Capture</h3>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {state === 'recording' && (
              <div className="absolute inset-0 rounded-full bg-danger/20 pulse-ring" style={{ margin: '-16px' }} />
            )}
            <button
              onClick={state === 'idle' ? startRecording : state === 'recording' ? stopRecording : undefined}
              disabled={state === 'processing'}
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center transition-all',
                state === 'idle' && 'bg-gradient-to-br from-primary to-accent hover:shadow-lg hover:scale-105',
                state === 'recording' && 'bg-danger hover:bg-danger/90',
                state === 'processing' && 'bg-border opacity-50 cursor-not-allowed'
              )}
            >
              {state === 'recording' ? (
                <Square className="w-8 h-8 text-white fill-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

          <div className="text-3xl font-mono font-bold text-text-primary">{formatTimer(timer)}</div>

          <p className="text-sm text-text-muted capitalize">
            Status: {state === 'idle' ? 'Ready to record' : state}
          </p>
        </div>
      </div>

      {/* Processing Pipeline */}
      <div className="card p-6">
        <h4 className="font-semibold text-text-primary mb-4">Processing Pipeline</h4>
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-2">
                {stepIcon(step.status)}
                <span className={cn('text-xs font-medium', step.status === 'active' ? 'text-primary' : step.status === 'done' ? 'text-success' : 'text-text-muted')}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2', step.status === 'done' ? 'bg-success' : 'bg-border-light')} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
