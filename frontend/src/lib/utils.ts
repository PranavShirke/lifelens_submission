import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getSentimentEmoji(sentiment?: string): string {
  const map: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    anxious: '😰',
    neutral: '😐',
    angry: '😠',
    confused: '😵',
  };
  return map[sentiment || 'neutral'] || '😐';
}

export function getTypeIcon(type: string): string {
  const map: Record<string, string> = {
    image: '📷',
    audio: '🎤',
    text: '📝',
    video: '🎥',
  };
  return map[type] || '📝';
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#6B7280',
  };
  return map[severity] || '#6B7280';
}
