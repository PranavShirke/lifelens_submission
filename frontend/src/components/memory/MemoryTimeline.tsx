'use client';

import React, { useMemo } from 'react';
import type { Memory } from '@/lib/types';
import MemoryCard from './MemoryCard';
import { Calendar, ChevronDown, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MemoryTimelineProps {
  memories: Memory[];
  loading?: boolean;
}

export default function MemoryTimeline({ memories, loading }: MemoryTimelineProps) {
  // Group memories by Year and Month
  const groupedMemories = useMemo(() => {
    const groups: Record<string, Record<string, Memory[]>> = {};

    memories.forEach((mem) => {
      const date = new Date(mem.timestamp);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('default', { month: 'long' });

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      groups[year][month].push(mem);
    });

    // Sort years descending
    const sortedYears = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));
    
    return sortedYears.map(year => ({
      year,
      months: Object.keys(groups[year]).map(month => ({
        month,
        memories: groups[year][month].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      }))
    }));
  }, [memories]);

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-32 bg-slate-100 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="card p-12 text-center bg-slate-50/50 border-dashed border-2 border-slate-200">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Your timeline is empty</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Start capturing moments on your dashboard to see them organized here by date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 overflow-x-hidden">
      {groupedMemories.map((yearGroup) => (
        <div key={yearGroup.year} className="relative">
          {/* Year Header */}
          <div className="sticky top-0 z-20 py-4 bg-white/80 backdrop-blur-md -mx-4 px-4 mb-6">
            <h2 className="text-2xl font-black tracking-tight text-[#1E1B2E] flex items-center gap-3">
              {yearGroup.year}
              <div className="h-px flex-1 bg-gradient-to-r from-[#FF8C42]/20 to-transparent" />
            </h2>
          </div>

          <div className="space-y-10 pl-4 border-l-2 border-slate-100 ml-2">
            {yearGroup.months.map((monthGroup) => (
              <div key={monthGroup.month} className="relative">
                {/* Month Indicator Dot */}
                <div className="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-[#FF8C42] shadow-sm" />
                
                <h3 className="text-sm font-black uppercase tracking-widest text-[#9896B0] mb-6">
                  {monthGroup.month}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                  {monthGroup.memories.map((mem) => (
                    <motion.div
                      key={mem.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      className="h-full"
                    >
                      <MemoryCard memory={mem} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
