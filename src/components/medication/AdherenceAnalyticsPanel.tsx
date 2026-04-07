'use client';

import React from 'react';
import { mockAdherenceData } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Target, Flame } from 'lucide-react';

export default function AdherenceAnalyticsPanel() {
  const data = mockAdherenceData;
  const avgAdherence = Math.round(data.reduce((a, d) => a + d.adherence, 0) / data.length);
  const totalTaken = data.reduce((a, d) => a + d.taken, 0);
  const totalMissed = data.reduce((a, d) => a + d.missed, 0);
  const streak = 5; // Mock streak

  const kpis = [
    { label: 'Avg Adherence', value: `${avgAdherence}%`, icon: Target, color: 'text-primary' },
    { label: 'Current Streak', value: `${streak} days`, icon: Flame, color: 'text-warning' },
    { label: 'Missed This Week', value: String(totalMissed), icon: TrendingUp, color: 'text-danger' },
  ];

  return (
    <div>
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="p-4 rounded-xl border border-border-light bg-background text-center">
            <k.icon className={`w-5 h-5 mx-auto mb-2 ${k.color}`} />
            <p className="text-xl font-bold text-text-primary">{k.value}</p>
            <p className="text-xs text-text-muted mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="taken" name="Taken" fill="#7C5CBF" radius={[6, 6, 0, 0]} />
            <Bar dataKey="missed" name="Missed" fill="#F5A3BE" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
