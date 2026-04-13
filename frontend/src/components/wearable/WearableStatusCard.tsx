'use client';

import React from 'react';
import { Watch, Battery, Signal, HardDrive, Cpu, Bluetooth } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function WearableStatusCard() {
  return (
    <div className="card p-6 relative overflow-hidden group">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-100/50 transition-colors" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Watch className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-tight">Meta Glasses Gen 3</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Connected</span>
            </div>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
           Ver 4.2.0
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <StatusItem icon={Battery} label="Battery" value="84%" color="text-emerald-500" bg="bg-emerald-50" />
        <StatusItem icon={Signal} label="Signal" value="Strong" color="text-indigo-500" bg="bg-indigo-50" />
        <StatusItem icon={HardDrive} label="Storage" value="12GB Free" color="text-amber-500" bg="bg-amber-50" />
        <StatusItem icon={Cpu} label="AI Load" value="12%" color="text-violet-500" bg="bg-violet-50" />
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-400">Linked to iPhone 15 Pro</span>
        </div>
        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
          Sync Settings
        </button>
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:shadow-md transition-all cursor-default">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-lg", bg)}>
          <Icon className={cn("w-3.5 h-3.5", color)} />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}
