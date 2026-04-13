'use client';

import React from 'react';
import type { Memory } from '@/lib/types';
import MemoryCard from './MemoryCard';
import { RefreshCw } from 'lucide-react';

interface MemoryListProps {
  memories: Memory[];
  loading?: boolean;
  onRefresh?: () => void;
  showScore?: boolean;
  compact?: boolean;
  readOnly?: boolean;
}

export default function MemoryList({ memories, loading, onRefresh, showScore, compact }: MemoryListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex gap-2 mb-3">
              <div className="skeleton w-16 h-5" />
              <div className="skeleton w-20 h-5" />
            </div>
            <div className="skeleton w-full h-32 mb-3" />
            <div className="skeleton w-3/4 h-4 mb-2" />
            <div className="skeleton w-1/2 h-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {onRefresh && (
        <div className="flex justify-end mb-4">
          <button onClick={onRefresh} className="btn-outline flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      )}
      {memories.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-text-secondary">No memories yet. Start creating memories!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} compact={compact} showScore={showScore} />
          ))}
        </div>
      )}
    </div>
  );
}
