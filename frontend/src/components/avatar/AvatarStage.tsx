'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Cpu, Loader2, MessageSquare, Mic, ShieldAlert } from 'lucide-react';

interface AvatarStageProps {
  isSpeaking: boolean;
  isProcessing: boolean;
  statusText: string;
  utterance: string | null;
  runtimeReady: boolean;
  runtimeError: string | null;
  mode: 'person' | 'object';
}

export default function AvatarStage({
  isSpeaking,
  isProcessing,
  statusText,
  utterance,
  runtimeReady,
  runtimeError,
  mode,
}: AvatarStageProps) {
  const avatarSrc = isSpeaking ? '/avatar/speaking.gif' : '/avatar/idle.gif';

  return (
    <section className="relative h-full min-h-[360px] overflow-hidden rounded-none md:rounded-r-[24px] border-r border-[#FF8C42]/15 bg-gradient-to-b from-[#1E1B2E] to-[#2A2640] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,194,153,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(122,158,122,0.2),transparent_50%)]" />

      <div className="relative z-10 flex h-full flex-col p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FFC299]">Avatar Companion</p>
            <h1 className="mt-1 text-xl font-black tracking-tight">3D Assistant</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold">
            {mode === 'person' ? <Camera className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
            {mode === 'person' ? 'Person Scan' : 'Object Scan'}
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="absolute h-[280px] w-[280px] rounded-full bg-[#FF8C42]/20 blur-[80px]" />
          <motion.img
            src={avatarSrc}
            alt="LifeLens avatar companion"
            initial={{ opacity: 0.7, scale: 0.98 }}
            animate={{ opacity: 1, scale: isSpeaking ? 1.02 : 1 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 max-h-[340px] w-full max-w-[420px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isSpeaking ? (
              <StatusChip icon={<Mic className="h-3.5 w-3.5" />} label="Speaking" tone="success" />
            ) : isProcessing ? (
              <StatusChip icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />} label={statusText || 'Thinking'} tone="info" />
            ) : (
              <StatusChip icon={<MessageSquare className="h-3.5 w-3.5" />} label="Listening" tone="idle" />
            )}

            {runtimeReady && <StatusChip icon={<Cpu className="h-3.5 w-3.5" />} label="Runtime Ready" tone="success" />}
            {runtimeError && <StatusChip icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Runtime Issue" tone="warn" />}
          </div>

          {runtimeError ? (
            <p className="rounded-xl border border-[#D4A0A0]/35 bg-[#D4A0A0]/15 px-3 py-2 text-xs text-[#FFF5E6]">{runtimeError}</p>
          ) : null}

          <AnimatePresence mode="wait">
            {utterance ? (
              <motion.p
                key={utterance}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm leading-relaxed text-[#FFF5E6]"
              >
                <span aria-hidden>&ldquo;</span>
                {utterance}
                <span aria-hidden>&rdquo;</span>
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function StatusChip({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'success' | 'info' | 'idle' | 'warn';
}) {
  const tones = {
    success: 'border-[#7A9E7A]/45 bg-[#7A9E7A]/20 text-[#DDF2DC]',
    info: 'border-[#FFC299]/45 bg-[#FF8C42]/20 text-[#FFE6D5]',
    idle: 'border-white/20 bg-white/10 text-white/90',
    warn: 'border-[#D4A0A0]/45 bg-[#D4A0A0]/20 text-[#FFE1E1]',
  } as const;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${tones[tone]}`}>
      {icon}
      {label}
    </span>
  );
}
