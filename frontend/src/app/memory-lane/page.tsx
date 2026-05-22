'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import { useSessionStore } from '@/lib/store/session-store';
import { getMemories } from '@/lib/api/memories';
import type { Memory } from '@/lib/types';
import MemoryTimeline from '@/components/memory/MemoryTimeline';
import { cn } from '@/lib/utils';
import { Image, Search, Calendar, Filter, Sparkles, BookHeart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MemoryLanePage() {
  return (
    <RoleGuard allowedRoles={['patient', 'caretaker']}>
      <AppShell>
        <MemoryLaneContent />
      </AppShell>
    </RoleGuard>
  );
}

function MemoryLaneContent() {
  const { activePatientId } = useSessionStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'audio' | 'milestone'>('all');

  useEffect(() => {
    const pid = activePatientId || 'patient_1';
    setLoading(true);
    getMemories(pid)
      .then((m) => {
        setMemories(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activePatientId]);

  const filteredMemories = memories.filter(m => {
    const matchesSearch = 
      m.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.personTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = 
      filterType === 'all' || 
      (filterType === 'milestone' ? m.isMilestone : m.type === filterType);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto pb-20 overflow-x-hidden">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF5E6] border border-[#FFC299]/20 flex items-center justify-center">
                <Image className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#1E1B2E]">Memory Lane</h1>
            </div>
            <p className="text-slate-500 font-medium ml-1">
              Your personal timeline of moments, conversations, and milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#FF8C42] transition-colors" />
              <input 
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium w-full md:w-64 focus:ring-2 focus:ring-[#FF8C42]/20 focus:border-[#FF8C42] focus:bg-white transition-all outline-none"
              />
            </div>
            <button className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-[#FF8C42] transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats / Filter Bar */}
        <div className="flex items-center gap-3 mt-8 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setFilterType('all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap",
              filterType === 'all' ? "bg-[#1E1B2E] text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF8C42]"
            )}
          >
            <Calendar className="w-3.5 h-3.5" /> All Time
          </button>
          <button 
            onClick={() => setFilterType('image')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap",
              filterType === 'image' ? "bg-[#1E1B2E] text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF8C42]"
            )}
          >
             Photos
          </button>
          <button 
            onClick={() => setFilterType('audio')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap",
              filterType === 'audio' ? "bg-[#1E1B2E] text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF8C42]"
            )}
          >
             Audio
          </button>
          <button 
            onClick={() => setFilterType('milestone')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap",
              filterType === 'milestone' ? "bg-[#1E1B2E] text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:border-[#FF8C42]"
            )}
          >
             Milestones
          </button>
          <div className="h-4 w-px bg-slate-200 mx-2" />
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100 whitespace-nowrap">
            <Sparkles className="w-3 h-3" /> Showing: {filteredMemories.length}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <MemoryTimeline memories={filteredMemories} loading={loading} />
    </div>
  );
}
