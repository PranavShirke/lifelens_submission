'use client';

import React from 'react';
import { Watch, Battery, Signal, HardDrive, Cpu, Bluetooth } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function WearableStatusCard() {
  return (
    <div className="card p-6 lg:p-8 relative overflow-hidden group border border-indigo-500/20 shadow-2xl" style={{ background: 'linear-gradient(135deg, #1E1B2E 0%, #0F0D1A 100%)' }}>
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/40 rounded-2xl blur-md animate-pulse" />
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center relative z-10">
              <Watch className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Meta Glasses Gen 3</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active & Connected</span>
            </div>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-[9px] font-black text-slate-300 uppercase tracking-widest shadow-sm">
           Ver 4.2.0
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        <StatusItem icon={Battery} label="Battery" value="84%" accent="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" />
        <StatusItem icon={Signal} label="Signal" value="Strong" accent="text-indigo-400" bg="bg-indigo-400/10" border="border-indigo-400/20" />
        <StatusItem icon={HardDrive} label="Storage" value="12GB Free" accent="text-amber-400" bg="bg-amber-400/10" border="border-amber-400/20" />
        <StatusItem icon={Cpu} label="AI Load" value="12%" accent="text-purple-400" bg="bg-purple-400/10" border="border-purple-400/20" />
      </div>

      <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <Bluetooth className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300 tracking-wide">Linked to iPhone 15 Pro</span>
        </div>
        <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1">
          Sync Settings &rarr;
        </button>
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value, accent, bg, border }: any) {
  return (
    <div className={cn("p-4 rounded-[18px] bg-white/5 border backdrop-blur-sm hover:bg-white/10 transition-all cursor-default group", border)}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={cn("p-1.5 rounded-lg transition-colors group-hover:bg-white/10", bg)}>
          <Icon className={cn("w-4 h-4", accent)} />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-lg font-black text-white tracking-tight">{value}</p>
    </div>
  );
}
