'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import type { MoodDataPoint } from '@/lib/types';

interface MoodTimelineChartProps {
  data: MoodDataPoint[];
}

export default function MoodTimelineChart({ data }: MoodTimelineChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7C5CBF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#7C5CBF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              fontSize: 12,
            }}
            formatter={(value: any) => [`${Number(value).toFixed(1)}`, 'Mood Score']}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#7C5CBF"
            strokeWidth={2.5}
            fill="url(#moodGradient)"
            dot={{ r: 2, fill: '#7C5CBF' }}
            activeDot={{ r: 5, fill: '#7C5CBF', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
