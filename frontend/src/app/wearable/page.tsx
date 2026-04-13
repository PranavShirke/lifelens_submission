'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import { useSessionStore } from '@/lib/store/session-store';
import { getMemories } from '@/lib/api/memories';
import type { Memory } from '@/lib/types';
import { 
  Watch, Activity, Zap, Shield, Image as ImageIcon, 
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
          <div className="card p-8 bg-gradient-to-br from-indigo-600 to-violet-700 border-none shadow-2xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-[80px] -ml-24 -mb-24" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white leading-none">Biometric Stream</h3>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Real-time vitals from wearable</p>
                  </div>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  <Zap className="w-3 h-3 animate-pulse" /> Live
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <HealthStat icon="❤️" label="Heart Rate" value="72" unit="bpm" />
              <HealthStat icon="💨" label="SpO2" value="98" unit="%" />
              <HealthStat icon="🌡️" label="Temp" value="36.6" unit="°C" />
              <HealthStat icon="👣" label="Steps" value="4,821" unit="today" />
            </div>

            <div className="mt-10 h-32 w-full flex items-end gap-1 relative z-10">
               {Array.from({ length: 40 }).map((_, i) => (
                 <motion.div 
                   key={i}
                   initial={{ height: 20 }}
                   animate={{ height: [20, 60 + Math.random() * 40, 20] }}
                   transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                   className="flex-1 bg-white/20 rounded-full h-full"
                 />
               ))}
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

function HealthStat({ icon, label, value, unit }: any) {
  return (
    <div className="text-white">
      <div className="text-lg mb-1">{icon}</div>
      <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black">{value}</span>
        <span className="text-[10px] font-bold text-indigo-200 uppercase">{unit}</span>
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
