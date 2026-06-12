'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Cpu, Loader2, MessageSquare, Mic, ShieldAlert, X } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import HolographicCore from './HolographicCore';

interface AvatarStageProps {
  isSpeaking: boolean;
  isProcessing: boolean;
  statusText: string;
  utterance: string | null;
  runtimeReady: boolean;
  runtimeError: string | null;
  mode: 'person' | 'object';
  onStopSpeaking?: () => void;
}

export default function AvatarStage({
  isSpeaking,
  isProcessing,
  statusText,
  utterance,
  runtimeReady,
  runtimeError,
  mode,
  onStopSpeaking,
}: AvatarStageProps) {
  return (
    <section className="relative h-full min-h-[220px] md:min-h-[360px] overflow-hidden rounded-none md:rounded-r-[24px] border-r border-[#FF8C42]/15 bg-gradient-to-b from-[#1E1B2E] to-[#2A2640] text-white transition-all">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,194,153,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(122,158,122,0.2),transparent_50%)]" />

      <div className="relative z-10 flex h-full flex-col p-4 md:p-6">
        <div className="mb-3 md:mb-5 flex items-center justify-between">
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] text-[#FFC299]">Avatar Companion</p>
            <h1 className="mt-0.5 text-lg md:text-xl font-black tracking-tight">3D Assistant</h1>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] font-bold">
            {mode === 'person' ? <Camera className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <Cpu className="h-3 w-3 md:h-3.5 md:w-3.5" />}
            {mode === 'person' ? 'Person Scan' : 'Object Scan'}
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-2 py-1">
          <div className="absolute h-[160px] w-[160px] md:h-[300px] md:w-[300px] rounded-full bg-[#FF8C42]/20 blur-[60px] md:blur-[82px]" />
          <div className="relative z-10 h-full min-h-[140px] md:min-h-[250px] w-full max-w-[460px] max-h-[360px]">
            <Canvas
              camera={{ position: [0, 1.5, 9.2], fov: 40, near: 0.1, far: 70 }}
              gl={{ precision: 'highp', powerPreference: 'high-performance', antialias: true }}
              dpr={[1, 1.75]}
            >
              <HolographicCore isSpeaking={isSpeaking} />
            </Canvas>
          </div>
        </div>

        <div className="mt-3 md:mt-5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {isSpeaking ? (
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip icon={<Mic className="h-3.5 w-3.5" />} label="Speaking" tone="success" />
                {onStopSpeaking && (
                  <button 
                    onClick={onStopSpeaking}
                    className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/25 hover:bg-red-500/35 text-red-200 px-2.5 py-1 text-[10px] font-black cursor-pointer shadow-lg animate-pulse transition-all select-none"
                    title="Stop speaking"
                  >
                    <X className="h-3 w-3" /> Stop Voice
                  </button>
                )}
              </div>
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
                className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs md:text-sm leading-relaxed text-[#FFF5E6]"
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
