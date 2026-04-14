'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Calendar, Star, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store/session-store';
import { getFamilySummary } from '@/lib/api/family';
import { getMoodData, getDashboardStats } from '@/lib/api/dashboard';
import { getAdherenceData } from '@/lib/api/medications';

export default function FamilyRecapPanel() {
  const { activePatientId, activePatientName } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [highlights, setHighlights] = useState<any[]>([]);
  const [avgMood, setAvgMood] = useState(0);
  const [moodTrend, setMoodTrend] = useState('');
  const [totalMemories, setTotalMemories] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const pid = activePatientId || 'patient_1';
    setLoading(true);
    setError(false);

    Promise.allSettled([
      getFamilySummary(pid, 'week'),
      getMoodData(pid, 90),
      getDashboardStats(pid),
      getAdherenceData(pid, 7),
    ]).then(([summaryResult, moodResult, statsResult, adherenceResult]) => {
      // Summary
      if (summaryResult.status === 'fulfilled') {
        const data = summaryResult.value;
        setSummary(data.summary || '');
        setHighlights(data.highlights || []);
      }

      // Mood
      if (moodResult.status === 'fulfilled') {
        const moodTrendData = moodResult.value.moodTrend || [];
        if (moodTrendData.length > 0) {
          const avg = moodTrendData.reduce((s: number, m: { score: number }) => s + m.score, 0) / moodTrendData.length;
          setAvgMood(Math.round(avg * 10) / 10);
          // Check trend vs 2 weeks ago
          const halfLen = Math.floor(moodTrendData.length / 2);
          const firstHalf = moodTrendData.slice(0, halfLen);
          const secondHalf = moodTrendData.slice(halfLen);
          const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s: number, m: { score: number }) => s + m.score, 0) / firstHalf.length : 0;
          const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s: number, m: { score: number }) => s + m.score, 0) / secondHalf.length : 0;
          const diff = Math.round(((secondAvg - firstAvg) / (firstAvg || 1)) * 100);
          setMoodTrend(diff >= 0 ? `↑ ${diff}%` : `↓ ${Math.abs(diff)}%`);
        }
      }

      // Stats
      if (statsResult.status === 'fulfilled') {
        const data = statsResult.value;
        setTotalMemories(data.totalCount);
        setRecentCount(data.recentCount);
      }

      // Adherence
      if (adherenceResult.status === 'fulfilled') {
        const data = adherenceResult.value;
        if (data.length > 0) {
          const totalTaken = data.reduce((s: number, d: { taken: number }) => s + d.taken, 0);
          const totalDoses = data.reduce((s: number, d: { total: number }) => s + d.total, 0);
          setAdherenceRate(totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0);
        }
      }

      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [activePatientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-sm text-text-muted font-medium">Loading weekly recap...</span>
      </div>
    );
  }

  const patientName = activePatientName || 'the patient';

  return (
    <div className="space-y-6">
      {/* AI Summary Card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary">Weekly AI Summary</h3>
          <span className="badge badge-green ml-auto">This Week</span>
        </div>
        <div className="text-sm text-text-secondary leading-relaxed space-y-3">
          {/* Always show real data-driven stats first */}
          <p>
            This week, {patientName} had <strong>{recentCount} new memories</strong> recorded out of a total of {totalMemories} memories.
            {adherenceRate > 0 && ` Medication adherence was ${adherenceRate}% for the week.`}
          </p>
          <p>
            {avgMood > 6 
              ? `The overall mood trend has been positive, averaging ${avgMood}/10.` 
              : avgMood > 4 
                ? `The mood has been moderate this week, averaging ${avgMood}/10. Consider planning uplifting activities.`
                : avgMood > 0
                  ? `The mood has been lower than usual, averaging ${avgMood}/10. Extra care and attention may be needed.`
                  : 'No mood data available for this period.'
            }
          </p>
          {/* Show LLM narrative as additional AI insight if available */}
          {summary && (
            <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-semibold text-primary mb-1">✨ AI Insight</p>
              <p className="text-sm text-text-secondary">{summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mood Summary */}
      <div className="card p-6">
        <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" /> Mood Overview
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-success/5">
            <p className="text-2xl font-bold text-success">{avgMood || '—'}</p>
            <p className="text-xs text-text-muted">Avg Score</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary/5">
            <p className="text-2xl font-bold text-primary">{moodTrend || '—'}</p>
            <p className="text-xs text-text-muted">vs Last Week</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-warning/5">
            <p className="text-2xl font-bold text-warning">{adherenceRate}%</p>
            <p className="text-xs text-text-muted">Med Adherence</p>
          </div>
        </div>
      </div>

      {/* Key Highlights */}
      <div className="card p-6">
        <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-warning" /> Key Highlights
        </h4>
        <ul className="space-y-3">
          {highlights.length > 0 ? (
            highlights.map((item, i) => {
              const text = typeof item === 'string' ? item : (item as { title?: string; description?: string }).description || (item as { title?: string }).title || JSON.stringify(item);
              return (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                  <span className="text-lg flex-shrink-0">✨</span>
                  <span>{text}</span>
                </li>
              );
            })
          ) : (
            <>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <span className="text-lg flex-shrink-0">📊</span>
                <span>{recentCount} new memories added this week ({totalMemories} total)</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <span className="text-lg flex-shrink-0">😊</span>
                <span>Average mood score: {avgMood}/10</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <span className="text-lg flex-shrink-0">💊</span>
                <span>{adherenceRate}% medication adherence this week</span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
