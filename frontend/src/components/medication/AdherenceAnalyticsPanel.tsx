'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, Target, Flame, Loader2 } from 'lucide-react';
import { getAdherenceData } from '@/lib/api/medications';

interface AdherenceAnalyticsPanelProps {
  patientId: string;
}

export default function AdherenceAnalyticsPanel({ patientId }: AdherenceAnalyticsPanelProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    getAdherenceData(patientId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch adherence:', err);
        setLoading(false);
      });
  }, [patientId]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const avgAdherence = data.length > 0 
    ? Math.round(data.reduce((a, d) => a + (d.adherence || 0), 0) / data.length)
    : 0;
  
  const totalTaken = data.reduce((a, d) => a + (d.taken || 0), 0);
  const totalMissed = data.reduce((a, d) => a + (d.missed || 0), 0);
  
  // Simple streak calculation (consecutive days with 100% adherence)
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].adherence >= 100) streak++;
    else break;
  }

  const chartData = data.map((d) => {
    const safeDate = d.date || d.day || '';
    const dayLabel = safeDate
      ? new Date(safeDate).toLocaleDateString('en-IN', { weekday: 'short' })
      : 'N/A';

    return {
      ...d,
      day: dayLabel,
      taken: Number(d.taken || 0),
      missed: Number(d.missed || 0),
      skipped: Number(d.skipped || 0),
      adherence: Number(d.adherence || 0),
    };
  });

  const kpis = [
    { label: 'Avg Adherence', value: `${avgAdherence}%`, icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Current Streak', value: `${streak} days`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Total Taken', value: String(totalTaken), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Adherence Analytics</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Last 7 Days Activity</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 text-center transition-transform hover:scale-[1.02]">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{k.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="h-48 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
            <p className="text-xs font-semibold text-slate-400">No adherence events for the selected window</p>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} 
              axisLine={false} 
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} 
              axisLine={false} 
              tickLine={false} 
              domain={[0, 'auto']} 
            />
            <Tooltip
              cursor={{ fill: '#F8FAFC' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px',
                fontSize: '12px'
              }}
              itemStyle={{ fontWeight: 700 }}
              labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#1E293B' }}
            />
            <Bar dataKey="taken" name="Taken" radius={[4, 4, 0, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.adherence >= 100 ? '#10B981' : '#6366F1'} />
              ))}
            </Bar>
            <Bar dataKey="missed" name="Missed" fill="#FDA4AF" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
