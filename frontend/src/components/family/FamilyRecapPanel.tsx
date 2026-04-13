'use client';

import React from 'react';
import { Sparkles, TrendingUp, Calendar, Star } from 'lucide-react';

export default function FamilyRecapPanel() {
  return (
    <div className="space-y-6">
      {/* AI Summary Card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary">Weekly AI Summary</h3>
          <span className="badge badge-green ml-auto">Stable</span>
        </div>
        <div className="text-sm text-text-secondary leading-relaxed space-y-3">
          <p>
            This week has been a positive one for Alice. She had 7 new memories recorded,
            including a beautiful sunrise walk at Juhu Beach that she marked as a milestone.
            Her social interactions have been strong, with visits from Priya (twice) and
            a video call with Carol and the grandchildren.
          </p>
          <p>
            Mood scores have remained stable, averaging 7.2/10 this week versus 6.8/10 last week,
            showing a slight upward trend. Morning walks continue to be a strong positive factor.
          </p>
          <p>
            Medication adherence was 87% this week — one evening dose of Memantine was missed
            on Tuesday. The morning routine remains excellent with 100% adherence for Donepezil
            and Vitamin D3.
          </p>
        </div>
      </div>

      {/* Mood Summary */}
      <div className="card p-6">
        <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success" /> Mood Overview
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-success/5">
            <p className="text-2xl font-bold text-success">7.2</p>
            <p className="text-xs text-text-muted">Avg Score</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary/5">
            <p className="text-2xl font-bold text-primary">↑ 6%</p>
            <p className="text-xs text-text-muted">vs Last Week</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-warning/5">
            <p className="text-2xl font-bold text-warning">1</p>
            <p className="text-xs text-text-muted">Concern Days</p>
          </div>
        </div>
      </div>

      {/* Key Highlights */}
      <div className="card p-6">
        <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-warning" /> Key Highlights
        </h4>
        <ul className="space-y-3">
          {[
            { icon: '🌊', text: 'Beautiful sunrise walk at Juhu Beach — marked as milestone' },
            { icon: '👨‍👩‍👧‍👦', text: 'Family visit at Gateway of India with Carol and kids' },
            { icon: '🎨', text: 'Started painting class at community center — positive new activity' },
            { icon: '📞', text: 'Successful video call with grandchildren Arjun and Meera' },
            { icon: '💊', text: '87% medication adherence this week — slight improvement' },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
