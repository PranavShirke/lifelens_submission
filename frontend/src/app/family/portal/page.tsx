'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import ActivePatientGate from '@/components/auth/ActivePatientGate';
import FamilyRecapPanel from '@/components/family/FamilyRecapPanel';
import MemoryRequestForm from '@/components/family/MemoryRequestForm';
import MemoryList from '@/components/memory/MemoryList';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';
import { cn, formatDate } from '@/lib/utils';
import { getMemories, getMemoryMedia } from '@/lib/api/memories';
import { getFamilyRequests, getMessages, postMessage } from '@/lib/api/family';
import type { Memory } from '@/lib/types';
import { Heart, Camera, Star, Send, MessageCircle, ImageIcon, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FamilyPortalPage() {
  return (
    <RoleGuard allowedRoles={['family']}>
      <AppShell>
        <ActivePatientGate>
          <PortalContent />
        </ActivePatientGate>
      </AppShell>
    </RoleGuard>
  );
}

function GalleryCard({ memory }: { memory: Memory }) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getMemoryMedia(memory.id)
      .then((media) => {
        if (!cancelled && media.imageUrl) {
          setImageUrl(media.imageUrl);
        } else if (!cancelled) {
          setError(true);
        }
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memory.id]);

  return (
    <div className="card card-lift overflow-hidden cursor-pointer group">
      <div className="aspect-square bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center relative overflow-hidden">
        {loading ? (
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={memory.caption || 'Memory photo'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : error ? (
          <ImageIcon className="w-8 h-8 text-text-muted opacity-40" />
        ) : null}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>
      <div className="p-3">
        <p className="text-xs text-text-secondary line-clamp-2">{memory.caption || 'Untitled photo'}</p>
        <p className="text-[10px] text-text-muted mt-1">{formatDate(memory.timestamp)}</p>
      </div>
    </div>
  );
}

function PortalContent() {
  const { activePatientName, activePatientId, user } = useSessionStore();
  const { addToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'recap' | 'lane' | 'gallery' | 'milestones' | 'request' | 'messages'>('recap');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; authorName: string; content: string; timestamp: string }>>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [familyRequests, setFamilyRequests] = useState<Array<{ id: string; requesterName: string; description: string; status: string; createdAt: string; memoryType: string }>>([]);

  useEffect(() => {
    const pid = activePatientId || 'patient_1';
    getMemories(pid).then(setAllMemories).catch(() => {});
    getFamilyRequests(pid).then((reqs) => {
      setFamilyRequests(reqs.map((r: Record<string, unknown>) => ({
        id: r.id as string, requesterName: (r.requester_name || r.requesterName) as string,
        description: r.description as string, status: r.status as string,
        createdAt: (r.created_at || r.createdAt) as string, memoryType: (r.memory_type || r.memoryType) as string,
      })));
    }).catch(() => {});
    getMessages(pid).then((msgs) => {
      setMessages(msgs.map((m: Record<string, unknown>) => ({
        id: m.id as string, authorName: (m.authorName || m.author_name) as string,
        content: m.content as string, timestamp: m.timestamp as string,
      })));
    }).catch(() => {});
  }, [activePatientId]);

  const tabs = [
    { key: 'recap' as const, label: '📋 Memory Recap', icon: BookOpen },
    { key: 'lane' as const, label: '📸 Memory Lane', icon: Camera },
    { key: 'gallery' as const, label: '🖼️ Gallery', icon: ImageIcon },
    { key: 'milestones' as const, label: '⭐ Milestones', icon: Star },
    { key: 'request' as const, label: '💌 Request', icon: Heart },
    { key: 'messages' as const, label: '💬 Messages', icon: MessageCircle },
  ];

  const milestoneMemories = allMemories.filter((m) => m.isMilestone);
  const imageMemories = allMemories.filter((m) => m.type === 'image');
  const filteredMemories = typeFilter === 'all' ? allMemories : allMemories.filter((m) => m.type === typeFilter);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const pid = activePatientId || 'patient_1';
    const authorName = user?.fullName || 'Family Member';
    try {
      await postMessage(pid, authorName, newMessage);
      setMessages((prev) => [{
        id: `msg-${Date.now()}`, authorName,
        content: newMessage, timestamp: new Date().toISOString()
      }, ...prev]);
      setNewMessage('');
      addToast({ type: 'success', message: 'Message sent to patient! 💛' });
    } catch {
      addToast({ type: 'error', message: 'Failed to send message' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Heart className="w-6 h-6 text-accent" /> Memory Portal
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Viewing memories for <span className="font-medium text-primary">{activePatientName}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeTab === t.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card text-text-secondary hover:bg-background border border-border-light'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Tab 1: Memory Recap */}
        {activeTab === 'recap' && (
          <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FamilyRecapPanel />
          </motion.div>
        )}

        {/* Tab 2: Memory Lane */}
        {activeTab === 'lane' && (
          <motion.div key="lane" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex gap-2 mb-4">
              {['all', 'image', 'audio', 'text'].map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={cn('px-3 py-1 text-xs rounded-full capitalize',
                    typeFilter === t ? 'bg-primary text-white' : 'bg-border-light text-text-secondary')}>
                  {t}
                </button>
              ))}
            </div>
            <MemoryList memories={filteredMemories} />
          </motion.div>
        )}

        {/* Tab 3: Photo Gallery */}
        {activeTab === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {imageMemories.length === 0 ? (
              <div className="card p-12 text-center">
                <ImageIcon className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                <p className="text-sm text-text-muted font-medium">No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {imageMemories.map((m) => (
                  <GalleryCard key={m.id} memory={m} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 4: Milestones */}
        {activeTab === 'milestones' && (
          <motion.div key="milestones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative pl-8">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-primary/20" />
              {milestoneMemories.map((m, i) => (
                <div key={m.id} className={cn('relative mb-8', i % 2 === 0 ? '' : '')}>
                  <div className="absolute left-[-22px] w-4 h-4 rounded-full bg-primary border-2 border-card z-10" />
                  <div className="card p-4 ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="text-xs text-text-muted">{formatDate(m.timestamp)}</span>
                    </div>
                    {m.type === 'image' && (
                      <div className="w-full h-32 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
                        <span className="text-3xl">📷</span>
                      </div>
                    )}
                    <p className="text-sm text-text-primary">{m.caption || m.transcript || m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab 5: Request a Memory */}
        {activeTab === 'request' && (
          <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-semibold text-text-primary mb-4">Request a Memory</h3>
                <MemoryRequestForm />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-4">Past Requests</h3>
                <div className="space-y-3">
                  {familyRequests.map((req) => (
                    <div key={req.id} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge badge-gray capitalize">{req.memoryType}</span>
                        <span className={cn('badge', req.status === 'pending' ? 'badge-yellow' : 'badge-green')}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">{req.description}</p>
                      <p className="text-xs text-text-muted mt-2">{formatDate(req.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 6: Message Board */}
        {activeTab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card p-6 mb-4">
              <h3 className="font-semibold text-text-primary mb-3">Leave a Message</h3>
              <div className="flex gap-3">
                <textarea className="input-base flex-1 min-h-[60px]" placeholder="Write a loving message..."
                  value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                <button onClick={handleSendMessage} className="btn-gradient self-end flex items-center gap-2">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                      {msg.authorName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-text-primary">{msg.authorName}</span>
                    <span className="text-xs text-text-muted ml-auto">{formatDate(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-text-secondary pl-9">{msg.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
