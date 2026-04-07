'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="flex gap-2 mb-3">
        <Skeleton className="w-16 h-5" />
        <Skeleton className="w-20 h-5" />
      </div>
      <Skeleton className="w-full h-32 mb-3" />
      <Skeleton className="w-3/4 h-4 mb-2" />
      <Skeleton className="w-1/2 h-4" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 space-y-3">
        <Skeleton className="w-full h-8" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="w-full h-6" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonKPIRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 text-center">
          <Skeleton className="w-12 h-8 mx-auto mb-2" />
          <Skeleton className="w-20 h-4 mx-auto" />
        </div>
      ))}
    </div>
  );
}
