'use client';

import React from 'react';
import { Camera, Mic, FileText } from 'lucide-react';

interface MediaPreviewProps {
  type: 'image' | 'audio' | 'text';
  content?: string;
  imageUrl?: string;
}

export default function MediaPreview({ type, content, imageUrl }: MediaPreviewProps) {
  if (type === 'image') {
    return (
      <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Memory" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <Camera className="w-10 h-10 text-primary/40 mx-auto mb-2" />
            <p className="text-sm text-text-muted">Image preview</p>
          </div>
        )}
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="w-full h-20 rounded-xl bg-gradient-to-r from-info/10 to-primary/10 flex items-center justify-center px-4 gap-0.5">
        <Mic className="w-5 h-5 text-info/40 mr-3 flex-shrink-0" />
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="w-0.5 bg-primary/30 rounded-full flex-shrink-0"
            style={{ height: `${8 + Math.sin(i * 0.6) * 12 + Math.random() * 10}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full p-4 rounded-xl bg-background border border-border-light">
      <FileText className="w-5 h-5 text-success/40 mb-2" />
      <p className="text-sm text-text-secondary line-clamp-3">
        {content || 'Text memory content...'}
      </p>
    </div>
  );
}
