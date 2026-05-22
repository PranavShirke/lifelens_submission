'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import { useSessionStore } from '@/lib/store/session-store';
import { getMemories } from '@/lib/api/memories';
import type { Memory } from '@/lib/types';
import { 
  Watch, Activity, Zap, Shield, Image as ImageIcon,
  HeartPulse, Droplets, Thermometer, Footprints,
  Sparkles, ChevronRight, Camera, Smartphone, Bluetooth
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WearableStatusCard from '@/components/wearable/WearableStatusCard';
import WearableHUD from '@/components/wearable/WearableHUD';
import MemoryCard from '@/components/memory/MemoryCard';
import { cn } from '@/lib/utils';

export default function WearablePage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker']}>
      <AppShell>
        <WearableContent />
      </AppShell>
    </RoleGuard>
  );
}

function WearableContent() {
  const { activePatientId } = useSessionStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHudOpen, setIsHudOpen] = useState(false);

  const fetchMemories = () => {
    const pid = activePatientId || 'patient_1';
    getMemories(pid).then((m) => {
      // Filter for those with wearable tags
      const wearableMemories = m.filter(mem => 
        mem.personTags.some(tag => tag.toLowerCase().includes('wearable') || tag.toLowerCase().includes('metaglasses'))
      );
      setMemories(wearableMemories);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMemories();
  }, [activePatientId]);

  const vitalsTrend = [
    18, 14, 12, 11, 12, 13, 14, 15, 17, 21,
    24, 20, 28, 30, 29, 37, 39, 34, 50, 49,
    41, 50, 37, 31, 35, 29, 25, 26, 24, 27,
    23, 16, 12, 10, 10, 11, 13, 14, 17, 18,
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <AnimatePresence>
        {isHudOpen && (
          <WearableHUD 
            onClose={() => setIsHudOpen(false)} 
            onCapture={fetchMemories} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Watch className="w-5 h-5 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#1E1B2E]">Health Data & Wearables</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">
            Connected devices tracking your environment, health, and memories.
          </p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsHudOpen(true)}
          className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase tracking-widest"
        >
          <Camera className="w-5 h-5" /> Launch Glasses HUD
        </motion.button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Row 1: Status & Connectivity */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <WearableStatusCard />
          
          <div className="card p-6 bg-slate-900 text-white border-white/5">
            <div className="flex items-center gap-2 mb-6 text-indigo-400">
               <Shield className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Privacy Controls</span>
            </div>
            <h4 className="font-bold text-sm mb-2">Encrypted Memory Stream</h4>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              All footage captured from Meta Glasses is end-to-end encrypted before being saved to your LifeLens private cloud.
            </p>
            <div className="space-y-3">
              <PrivacyToggle label="Auto-Blur Faces" defaultChecked />
              <PrivacyToggle label="Local Storage Only" />
              <PrivacyToggle label="Voice Command Activation" defaultChecked />
            </div>
          </div>
        </div>

        {/* Row 1: Interactive Health Visualization */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="card p-6 md:p-7 border-2 border-[#1E1B2E] shadow-[8px_8px_0_#1E1B2E] bg-gradient-to-br from-[#F2F6FF] via-white to-[#F7F4FF] relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-200/30 rounded-full blur-[110px] -mr-36 -mt-36" />

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1E1B2E] leading-none">Biometric Stream</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Real-time vitals from wearable</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]">
                <Zap className="w-3 h-3" /> Live
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
              <HealthStat icon={HeartPulse} accent="text-rose-600" bg="bg-rose-50" label="Heart Rate" value="72" unit="bpm" />
              <HealthStat icon={Droplets} accent="text-cyan-600" bg="bg-cyan-50" label="SpO2" value="98" unit="%" />
              <HealthStat icon={Thermometer} accent="text-amber-600" bg="bg-amber-50" label="Temp" value="36.6" unit="°C" />
              <HealthStat icon={Footprints} accent="text-violet-600" bg="bg-violet-50" label="Steps" value="4,821" unit="today" />
            </div>

            <div className="mt-6 rounded-2xl border-2 border-[#1E1B2E] bg-white p-4 shadow-[3px_3px_0_#1E1B2E] relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vitals trend (last 40 min)</p>
                <p className="text-[10px] font-bold text-slate-400">sampled every 1 min</p>
              </div>
              <div className="h-24 w-full flex items-end gap-1">
                {vitalsTrend.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h * 1.5}px` }}
                    className="flex-1 rounded-full bg-gradient-to-t from-indigo-500/65 to-indigo-300/75"
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent HUD Captures</h3>
                </div>
                <button className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                  View All Captures <ChevronRight className="w-3 h-3" />
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {loading ? (
                 <div className="col-span-2 text-center py-10">
                   <Loader />
                 </div>
               ) : memories.length === 0 ? (
                 <div className="col-span-2 card p-10 text-center bg-slate-50 border-dashed border-2">
                   <p className="text-sm font-bold text-slate-400">No photos captured from HUD yet</p>
                 </div>
               ) : (
                 memories.slice(0, 4).map(m => (
                   <MemoryCard key={m.id} memory={m} compact />
                 ))
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyToggle({ label, defaultChecked }: { label: string, defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked || false);
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-none">
      <span className="text-[11px] font-bold text-white/70">{label}</span>
      <button 
        onClick={() => setChecked(!checked)}
        className={cn("w-8 h-4 rounded-full relative transition-colors", checked ? "bg-indigo-500" : "bg-white/20")}
      >
        <motion.div 
           animate={{ x: checked ? 16 : 0 }}
           className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

function HealthStat({
  icon: Icon,
  label,
  value,
  unit,
  accent,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  accent: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-[#1E1B2E] bg-white p-3 shadow-[3px_3px_0_#1E1B2E]">
      <div className={`w-8 h-8 rounded-lg ${bg} border border-slate-200 flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${accent}`} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-black text-[#1E1B2E] leading-none">{value}</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">{unit}</span>
      </div>
    </div>
  );
}

function Loader() {
  return <div className="animate-pulse space-y-4">
    <div className="h-20 bg-slate-100 rounded-2xl" />
    <div className="h-20 bg-slate-100 rounded-2xl" />
  </div>
}
