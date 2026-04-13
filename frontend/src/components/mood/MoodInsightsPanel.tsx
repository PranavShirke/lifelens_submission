'use client';

import React from 'react';
import { mockMoodData, mockVisitorCorrelations, mockTriggers } from '@/lib/mock-data';
import MoodTimelineChart from './MoodTimelineChart';
import { Activity, TrendingDown, TrendingUp, BarChart3, AlertTriangle, Download, Play } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useUIStore } from '@/lib/store/ui-store';

export default function MoodInsightsPanel() {
  const { addToast } = useUIStore();
  const moodData = mockMoodData;
  const recentScore = moodData[moodData.length - 1]?.score || 0;
  const prevScore = moodData[moodData.length - 7]?.score || 0;
  const trend = recentScore > prevScore ? 'up' : recentScore < prevScore ? 'down' : 'stable';
  const riskScore = Math.round(Math.max(0, Math.min(100, 100 - recentScore * 10)));

  const riskColor = riskScore > 70 ? 'text-danger' : riskScore > 40 ? 'text-warning' : 'text-success';
  const riskBg = riskScore > 70 ? 'bg-danger/10' : riskScore > 40 ? 'bg-warning/10' : 'bg-success/10';

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn('p-4 rounded-xl text-center', riskBg)}>
          <Activity className={cn('w-6 h-6 mx-auto mb-2', riskColor)} />
          <p className={cn('text-3xl font-bold', riskColor)}>{riskScore}</p>
          <p className="text-xs text-text-muted mt-1">Risk Score</p>
        </div>
        <div className="p-4 rounded-xl bg-primary/5 text-center">
          <p className="text-3xl font-bold text-primary">5</p>
          <p className="text-xs text-text-muted mt-1">Day Streak</p>
        </div>
        <div className="p-4 rounded-xl bg-background text-center">
          {trend === 'up' ? (
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-success" />
          ) : (
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-danger" />
          )}
          <p className="text-sm font-semibold text-text-primary">
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
          </p>
          <p className="text-xs text-text-muted mt-1">Mood Trend</p>
        </div>
        <div className="p-4 rounded-xl bg-background text-center">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-info" />
          <p className="text-3xl font-bold text-info">{moodData.length}</p>
          <p className="text-xs text-text-muted mt-1">Data Points</p>
        </div>
      </div>

      {/* Mood Timeline */}
      <div className="card p-5">
        <h4 className="font-semibold text-text-primary mb-4">30-Day Mood Timeline</h4>
        <MoodTimelineChart data={moodData} />
      </div>

      {/* Recent Alerts Table */}
      <div className="card p-5">
        <h4 className="font-semibold text-text-primary mb-4">Recent Alerts</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-left border-b border-border-light">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTriggers.map((t) => (
                <tr key={t.id} className="border-b border-border-light last:border-0">
                  <td className="py-3 text-text-secondary">{formatDate(t.timestamp)}</td>
                  <td className="py-3">{t.type.replace(/_/g, ' ')}</td>
                  <td className="py-3">
                    <span className={cn('badge', {
                      'badge-red': t.severity === 'urgent',
                      'badge-yellow': t.severity === 'high',
                      'badge-blue': t.severity === 'medium',
                      'badge-gray': t.severity === 'low',
                    })}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={cn('badge', t.status === 'active' ? 'badge-green' : 'badge-gray')}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Correlations */}
      <div className="card p-5">
        <h4 className="font-semibold text-text-primary mb-4">Visitor-Mood Correlations</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-left border-b border-border-light">
                <th className="pb-3 font-medium">Visitor</th>
                <th className="pb-3 font-medium">Visits</th>
                <th className="pb-3 font-medium">Avg Mood</th>
                <th className="pb-3 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {mockVisitorCorrelations.map((v) => (
                <tr key={v.visitorName} className="border-b border-border-light last:border-0">
                  <td className="py-3 font-medium">{v.visitorName}</td>
                  <td className="py-3 text-text-secondary">{v.visitCount}</td>
                  <td className="py-3">
                    <span className="font-semibold">{v.avgMood.toFixed(1)}</span>
                    <span className="text-text-muted">/10</span>
                  </td>
                  <td className="py-3">
                    {v.moodTrend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
                    {v.moodTrend === 'down' && <TrendingDown className="w-4 h-4 text-danger" />}
                    {v.moodTrend === 'stable' && <span className="text-text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => addToast({ type: 'info', message: 'Mood analysis started...' })} className="btn-gradient flex items-center gap-2 text-sm">
          <Play className="w-4 h-4" /> Run Analysis
        </button>
        <button onClick={() => addToast({ type: 'success', message: 'Test alert sent!' })} className="btn-outline flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" /> Test Alert
        </button>
        <button onClick={() => addToast({ type: 'success', message: 'Data exported!' })} className="btn-outline flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export JSON
        </button>
        <button onClick={() => addToast({ type: 'success', message: 'CSV exported!' })} className="btn-outline flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
    </div>
  );
}
