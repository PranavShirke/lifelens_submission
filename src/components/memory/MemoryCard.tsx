'use client';

import React from 'react';
import type { Memory } from '@/lib/types';
import { cn, formatRelativeTime, getSentimentEmoji, getTypeIcon } from '@/lib/utils';
import { MapPin, Star, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemoryCardProps {
  memory: Memory;
  compact?: boolean;
  showScore?: boolean;
  onClick?: () => void;
}

export default function MemoryCard({ memory, compact, showScore, onClick }: MemoryCardProps) {
  const typeBadgeColor: Record<string, string> = {
    image: 'badge-purple',
    audio: 'badge-blue',
    text: 'badge-green',
  };

  const sentimentColor: Record<string, string> = {
    happy: 'badge-green',
    sad: 'badge-blue',
    anxious: 'badge-yellow',
    neutral: 'badge-gray',
    angry: 'badge-red',
    confused: 'badge-purple',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'card card-lift p-4 cursor-pointer',
        compact && 'p-3'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('badge', typeBadgeColor[memory.type])}>
            {getTypeIcon(memory.type)} {memory.type}
          </span>
          <span className="text-xs text-text-muted">{formatRelativeTime(memory.timestamp)}</span>
        </div>
        {memory.isMilestone && (
          <Star className="w-4 h-4 text-warning fill-warning" />
        )}
      </div>

      {/* Media Preview */}
      {memory.type === 'image' && (
        <div className="w-full h-40 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 mb-3 flex items-center justify-center overflow-hidden">
          <div className="text-4xl">📷</div>
        </div>
      )}
      {memory.type === 'audio' && (
        <div className="w-full h-16 rounded-xl bg-gradient-to-r from-info/10 to-primary/10 mb-3 flex items-center justify-center gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary/40 rounded-full"
              style={{ height: `${12 + Math.sin(i * 0.8) * 10 + Math.random() * 8}px` }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <p className={cn(
        'text-sm text-text-primary leading-relaxed mb-3',
        !compact && 'line-clamp-3',
        compact && 'line-clamp-2'
      )}>
        {memory.caption || memory.transcript || memory.content || 'No content'}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {memory.personTags.map((tag) => (
          <span key={tag} className="badge badge-gray">
            <User className="w-3 h-3" /> {tag}
          </span>
        ))}
        {memory.sentiment && (
          <span className={cn('badge', sentimentColor[memory.sentiment])}>
            {getSentimentEmoji(memory.sentiment)} {memory.sentiment}
          </span>
        )}
        {memory.location && (
          <span className="badge badge-gray">
            <MapPin className="w-3 h-3" /> {memory.location.name}
          </span>
        )}
        {showScore && memory.score && (
          <span className="badge badge-purple">
            Score: {memory.score.toFixed(2)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
