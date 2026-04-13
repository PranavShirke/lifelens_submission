'use client';

import React, { useState, useEffect } from 'react';
import type { Memory } from '@/lib/types';
import apiClient from '@/lib/api/client';
import { cn, formatRelativeTime, getSentimentEmoji, getTypeIcon } from '@/lib/utils';
import { MapPin, Star, User, Watch, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemoryCardProps {
  memory: Memory;
  compact?: boolean;
  showScore?: boolean;
  onClick?: () => void;
}

export default function MemoryCard({ memory, compact, showScore, onClick }: MemoryCardProps) {
  const [mediaData, setMediaData] = useState<{ image?: string; audio?: string } | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  useEffect(() => {
    if (memory.hasMedia && !memory.imageUrl && !memory.audioUrl && !mediaData) {
      setLoadingMedia(true);
      apiClient.get(`/memories/media/${memory.id}`)
        .then(res => {
          const img = res.data.image_base64 ? `data:image/jpeg;base64,${res.data.image_base64}` : undefined;
          const aud = res.data.audio_base64 ? `data:audio/wav;base64,${res.data.audio_base64}` : undefined;
          setMediaData({ image: img, audio: aud });
          setLoadingMedia(false);
        })
        .catch(() => setLoadingMedia(false));
    }
  }, [memory, mediaData]);

  const imageUrl = memory.imageUrl || mediaData?.image;
  const audioUrl = memory.audioUrl || mediaData?.audio;

  const isWearable = memory.personTags.some(tag => 
    tag.toLowerCase().includes('wearable') || tag.toLowerCase().includes('metaglasses')
  );
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
        <div className="flex items-center gap-2">
          {isWearable && (
            <span className="badge bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1 scale-90 origin-right">
              <Watch className="w-2.5 h-2.5" /> Wearable
            </span>
          )}
          {memory.isMilestone && (
            <Star className="w-4 h-4 text-warning fill-warning" />
          )}
        </div>
      </div>

      {/* Media Preview */}
      {memory.type === 'image' && (
        <div className="w-full h-40 rounded-xl bg-slate-100 mb-3 flex items-center justify-center overflow-hidden border border-slate-100 relative">
          {loadingMedia && (
            <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-10 backdrop-blur-sm">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          )}
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={memory.caption || 'Memory'} 
              className="w-full h-full object-cover relative z-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://api.dicebear.com/7.x/shapes/svg?seed=broken-img';
                target.className = 'w-12 h-12 opacity-20 relative z-0';
              }}
            />
          ) : !loadingMedia ? (
            <div className="text-4xl text-slate-300">📷</div>
          ) : null}
        </div>
      )}
      {memory.type === 'audio' && (
        <div className="w-full mb-3">
          {loadingMedia && <div className="text-xs text-slate-400 mb-2 animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Loading audio...</div>}
          {audioUrl ? (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <audio 
                src={audioUrl} 
                controls 
                className="w-full h-8"
              />
            </div>
          ) : !loadingMedia ? (
            <div className="w-full h-16 rounded-xl bg-gradient-to-r from-info/10 to-primary/10 flex items-center justify-center gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary/40 rounded-full"
                  style={{ height: `${12 + Math.sin(i * 0.8) * 10 + Math.random() * 8}px` }}
                />
              ))}
            </div>
          ) : null}
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
