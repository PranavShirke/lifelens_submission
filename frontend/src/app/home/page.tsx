'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';
import { cn, getGreeting } from '@/lib/utils';
import {
  Camera, Mic, Upload, Star, Send, Volume2, Brain,
  Sparkles, Clock, Pill, AlertTriangle, Lightbulb, Loader2, Lock,
  Heart, TrendingUp, Zap, ChevronRight, Image, PenLine, MicIcon, Search,
  PhoneCall, CheckCircle2, Circle, Info, Plus, X
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import MemoryCard from '@/components/memory/MemoryCard';
import LocationSelector from '@/components/memory/LocationSelector';
import MilestoneToggle from '@/components/memory/MilestoneToggle';
import AgentWorkflowTabs from '@/components/agents/AgentWorkflowTabs';
import WebcamCapture from '@/components/memory/WebcamCapture';
import {
  mockChatMessages
} from '@/lib/mock-data';
import type { ChatMessage, Memory, Trigger, Medication, MedicationEvent } from '@/lib/types';
import { askLifeLens, createMemory, getMemories, uploadImage } from '@/lib/api/memories';
import { getMedications, getMedicationEvents, markDose } from '@/lib/api/medications';
import { getTriggers, dismissTrigger } from '@/lib/api/triggers';
import { getReminders, createReminder, completeReminder, getSuggestions } from '@/lib/api/dashboard';

interface ParsedResponse {
  summary: string;
  details: string[];
  reflection: string;
  isStructured: boolean;
}

function parseDementiaResponse(text: string): ParsedResponse {
  if (!text) return { summary: '', details: [], reflection: '', isStructured: false };
  
  const summaryMarker = '### 🌟 Summary';
  const detailsMarker = '### 🔍 Memory Details';
  const reflectionMarker = '### 💭 Reflection';
  
  const hasSummary = text.includes(summaryMarker);
  
  if (!hasSummary) {
    return {
      summary: text,
      details: [],
      reflection: '',
      isStructured: false
    };
  }
  
  let summary = '';
  let detailsText = '';
  let reflection = '';
  
  const summaryIndex = text.indexOf(summaryMarker);
  const detailsIndex = text.indexOf(detailsMarker);
  const reflectionIndex = text.indexOf(reflectionMarker);
  
  // Extract Summary
  if (detailsIndex !== -1) {
    summary = text.slice(summaryIndex + summaryMarker.length, detailsIndex).trim();
  } else if (reflectionIndex !== -1) {
    summary = text.slice(summaryIndex + summaryMarker.length, reflectionIndex).trim();
  } else {
    summary = text.slice(summaryIndex + summaryMarker.length).trim();
  }
  
  // Extract Details
  if (detailsIndex !== -1) {
    if (reflectionIndex !== -1) {
      detailsText = text.slice(detailsIndex + detailsMarker.length, reflectionIndex).trim();
    } else {
      detailsText = text.slice(detailsIndex + detailsMarker.length).trim();
    }
  }
  
  // Extract Reflection
  if (reflectionIndex !== -1) {
    reflection = text.slice(reflectionIndex + reflectionMarker.length).trim();
  }
  
  // Parse details bullet points
  const details: string[] = [];
  if (detailsText) {
    const lines = detailsText.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*[\*\-\•]\s*/, '').trim();
      if (cleanLine) {
        details.push(cleanLine);
      }
    }
  }
  
  return {
    summary,
    details,
    reflection,
    isStructured: true
  };
}

function DementiaResponse({
  content,
  msgId,
  handleListen,
  speakingId
}: {
  content: string;
  msgId: string;
  handleListen: (id: string, text: string) => void;
  speakingId: string | null;
}) {
  const parsed = parseDementiaResponse(content);
  let textToSpeak = content;
  if (parsed.isStructured) {
    const detailsText = parsed.details.join('. ');
    textToSpeak = `${parsed.summary}. ${detailsText}. ${parsed.reflection}`;
  }
  const isSpeaking = speakingId === msgId;

  if (!parsed.isStructured) {
    return (
      <div className="flex flex-col gap-3">
        <p className="whitespace-pre-wrap leading-relaxed text-sm font-bold text-slate-800">{content}</p>
        <button
          onClick={() => handleListen(msgId, textToSpeak)}
          className={cn(
            "mt-1 text-[10px] flex items-center gap-1.5 font-bold transition-all py-1 px-2.5 rounded-lg border w-fit shadow-sm cursor-pointer",
            isSpeaking
              ? "bg-red-50 text-red-500 border-red-100 hover:bg-red-100 animate-pulse"
              : "bg-slate-50 text-slate-500 border-slate-100 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          {isSpeaking ? <X className="w-3 h-3" /> : <Volume2 className="w-3.5 h-3.5" />}
          {isSpeaking ? 'Stop Listening' : 'Listen'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-1 text-slate-800">
      {/* 1. Summary Card (Main answer) */}
      <div className="bg-[#FFFDF9] border-2 border-[#FF8C42]/20 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-[#FF8C42]/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200 mt-0.5">
            <Star className="w-5 h-5 text-[#FF8C42]" fill="currentColor" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-[10px] font-black text-[#FF8C42] uppercase tracking-wider">The Main Answer</h4>
            <p className="text-base lg:text-[17px] font-black text-slate-800 leading-relaxed">
              {parsed.summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Details Grid (if details exist) */}
      {parsed.details.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 mt-1">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memory Details</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {parsed.details.map((detail, index) => {
              let icon = <Info className="w-4 h-4 text-indigo-400" />;
              let label = '';
              let value = detail;
              let bg = 'bg-slate-50 border-slate-100';

              const lowerDetail = detail.toLowerCase();
              if (lowerDetail.includes('when')) {
                icon = <Clock className="w-4 h-4 text-amber-500" />;
                label = 'When';
                const idx = lowerDetail.indexOf('when:');
                value = idx !== -1 ? detail.slice(idx + 5).trim() : detail;
                bg = 'bg-amber-50/40 border-amber-100/50';
              } else if (lowerDetail.includes('where')) {
                icon = <Search className="w-4 h-4 text-rose-500" />;
                label = 'Where';
                const idx = lowerDetail.indexOf('where:');
                value = idx !== -1 ? detail.slice(idx + 6).trim() : detail;
                bg = 'bg-rose-50/40 border-rose-100/50';
              } else if (lowerDetail.includes('who')) {
                icon = <Heart className="w-4 h-4 text-pink-500" />;
                label = 'Who';
                const idx = lowerDetail.indexOf('who:');
                value = idx !== -1 ? detail.slice(idx + 4).trim() : detail;
                bg = 'bg-pink-50/40 border-pink-100/50';
              } else if (lowerDetail.includes('what happened')) {
                icon = <Sparkles className="w-4 h-4 text-emerald-500" />;
                label = 'What happened';
                const idx = lowerDetail.indexOf('what happened:');
                value = idx !== -1 ? detail.slice(idx + 14).trim() : detail;
                bg = 'bg-emerald-50/40 border-emerald-100/50';
              }

              // Strip formatting leftover markers
              const cleanValue = value
                .replace(/\*\*+/g, '')
                .replace(/📅|📍|👥|💡/g, '')
                .replace(/^[:\s]+/, '')
                .trim();

              return (
                <div key={index} className={cn("p-3.5 rounded-xl border flex gap-3 items-start shadow-sm", bg)}>
                  <div className="shrink-0 mt-0.5">{icon}</div>
                  <div>
                    {label && <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>}
                    <p className="text-xs font-black text-slate-800 leading-snug">{cleanValue}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Reflection (Comfort note) */}
      {parsed.reflection && (
        <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-xl p-3.5 flex gap-3 items-center shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-indigo-100/50 flex items-center justify-center shrink-0 border border-indigo-200">
            <Heart className="w-4 h-4 text-indigo-500" fill="currentColor" />
          </div>
          <p className="text-xs font-bold text-indigo-700/90 italic leading-relaxed">
            {parsed.reflection.replace(/\*\*+/g, '').trim()}
          </p>
        </div>
      )}

      {/* 4. Listen Trigger */}
      <button
        onClick={() => handleListen(msgId, textToSpeak)}
        className={cn(
          "mt-1 text-[11px] flex items-center gap-1.5 font-black transition-all py-2 px-4 rounded-xl border w-fit shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer select-none",
          isSpeaking
            ? "bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse shadow-red-200"
            : "bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:bg-slate-50"
        )}
      >
        {isSpeaking ? <X className="w-3.5 h-3.5" /> : <Volume2 className="w-4 h-4" />}
        {isSpeaking ? 'Stop Listening' : 'Listen to Answer'}
      </button>
    </div>
  );
}

export default function PatientHomePage() {
  return (
    <RoleGuard allowedRoles={['patient']}>
      <AppShell><PatientHomeContent /></AppShell>
    </RoleGuard>
  );
}

function PatientHomeContent() {
  const { user, activePatientId } = useSessionStore();
  const { agenticMode, toggleAgenticMode, addToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'remember' | 'ask' | 'lane'>('remember');
  const [memoryType, setMemoryType] = useState<'image' | 'audio' | 'text'>('image');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medEvents, setMedEvents] = useState<MedicationEvent[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [suggestions, setSuggestionsData] = useState<Array<{ id: string; type: string; title: string; description: string }>>([]);
  const [reminders, setReminders] = useState<Array<{ id: string; task: string; time: string; completed: boolean }>>([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderTask, setNewReminderTask] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  const [textContent, setTextContent] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [personTags, setPersonTags] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [isMilestone, setIsMilestone] = useState(false);
  const [saving, setSaving] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // 1. Remove markdown bolding asterisks, hashes, underscores, backticks
    .replace(/\*\*+/g, '')       // bold asterisks
    .replace(/\*/g, '')          // single asterisks
    .replace(/#+/g, '')          // header hashes
    .replace(/_+/g, '')          // underscores
    .replace(/`+/g, '')          // backticks
    .replace(/^\s*[\-\+\*]\s+/gm, '') // list markers at start of lines
    // 2. Remove standard labels/keys for more natural, human-like voice synthesis
    .replace(/when:|where:|who:|what happened:/gi, '')
    // 3. Remove all emojis (standard and extended Unicode ranges)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1FFFF}]|[\u{2B50}]|[\u{2B06}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{25FF}]/gu, '')
    // 4. Collapse multiple spaces / periods / empty lines
    .replace(/\s+/g, ' ')
    .replace(/\.+/g, '.')
    .trim();
}

  const handleListen = (msgId: string, textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean up Markdown and special markers from text for clean speech synthesis
    const cleanText = cleanTextForSpeech(textToSpeak);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Find a nice warm voice if possible
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      v.name.includes('Google US English') || 
      v.name.includes('Natural') || 
      v.name.includes('Microsoft Zira') || 
      v.name.includes('Samantha')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    
    utterance.rate = 0.82; // Slower paced to be highly accessible and comforting for dementia patients
    utterance.pitch = 1.05; // Slightly warmer/friendly pitch
    
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Stop reading if component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fetch real data from API on mount
  useEffect(() => {
    const pid = activePatientId || 'patient_1';
    getMemories(pid).then((m) => { setMemories(m); setLoadingMemories(false); }).catch(() => setLoadingMemories(false));
    getMedications(pid).then(setMedications).catch(() => { });
    getMedicationEvents(pid).then(setMedEvents).catch(() => { });
    getTriggers(pid).then(setTriggers).catch(() => { });
    getSuggestions(pid).then(setSuggestionsData).catch(() => { });
    getReminders(pid).then(setReminders).catch(() => { });
  }, [activePatientId]);

  const handleAddReminder = async () => {
    if (!newReminderTask.trim()) { addToast({ type: 'error', message: 'Please enter a task' }); return; }
    setSavingReminder(true);
    try {
      const pid = activePatientId || 'patient_1';
      const rem = await createReminder(pid, newReminderTask, newReminderTime || 'Anytime');
      setReminders(prev => [...prev, rem]);
      setNewReminderTask(''); setNewReminderTime(''); setShowAddReminder(false);
      addToast({ type: 'success', message: 'Reminder added! ⏰' });
    } catch { addToast({ type: 'error', message: 'Failed to add reminder' }); }
    finally { setSavingReminder(false); }
  };

  const handleCompleteReminder = async (remId: string) => {
    try {
      await completeReminder(remId);
      setReminders(prev => prev.filter(r => r.id !== remId));
      addToast({ type: 'success', message: 'Reminder completed! ✅' });
    } catch { addToast({ type: 'error', message: 'Failed to complete reminder' }); }
  };

  useEffect(() => {
    if (chatEndRef.current && chatEndRef.current.parentElement) {
      chatEndRef.current.parentElement.scrollTop = chatEndRef.current.parentElement.scrollHeight;
    }
  }, [chatMessages, asking]);

  const handleSaveMemory = async () => {
    if (memoryType === 'image' && !capturedFile) {
      addToast({ type: 'error', message: 'Please capture or upload an image first.' });
      return;
    }

    setSaving(true);
    try {
      if (memoryType === 'image' && capturedFile) {
        await uploadImage(capturedFile, activePatientId || 'patient_1', {
          caption: photoCaption || undefined,
          tags: personTags,
          isMilestone,
          location: location || undefined
        });
        const freshMemories = await getMemories(activePatientId || 'patient_1');
        setMemories(freshMemories);
      } else {
        const mem = await createMemory({
          type: memoryType, patientId: activePatientId || 'patient-1',
          content: memoryType === 'text' ? textContent : undefined,
          caption: memoryType === 'image' ? 'New photo memory' : undefined,
          transcript: memoryType === 'audio' ? 'New audio memory' : undefined,
          personTags: personTags.split(',').map((t) => t.trim()).filter(Boolean),
          location: location || undefined, isMilestone,
        });
        setMemories((prev) => [mem, ...prev]);
      }

      addToast({ type: 'success', message: 'Memory saved successfully! 🧠' });
      setTextContent(''); setPhotoCaption(''); setPersonTags(''); setLocation(null); setIsMilestone(false); setCapturedFile(null); setShowWebcam(false);
    } catch { addToast({ type: 'error', message: 'Failed to save memory' }); }
    finally { setSaving(false); }
  };

  const handleToggleMedication = async (medId: string, currentTime: string, currentStatus: string) => {
    // Priority: Store activePatientId > User's patientId > User's ID
    const pid = activePatientId || user?.patientId || user?.id;

    if (!pid || !medId) {
      console.error('[Medication] Missing IDs:', { pid, medId });
      addToast({ type: 'error', message: 'Unable to identify patient or medication' });
      return;
    }

    const newStatus = currentStatus === 'taken' ? 'skipped' : 'taken';

    // Optimistic update
    const previousEvents = [...medEvents];
    setMedEvents(prev => prev.map(e => (e.medicationId === medId && e.doseTime === currentTime) ? { ...e, status: newStatus } : e));

    try {
      console.log('[Medication] Updating status:', { pid, medId, currentTime, newStatus });
      await markDose('temp-id', newStatus, '', medId, pid, currentTime);
      addToast({ type: 'success', message: `Medication marked as ${newStatus}` });
      // Re-fetch to sync with server truth
      getMedicationEvents(pid).then(setMedEvents).catch(() => { });
    } catch (error: any) {
      console.error('[Medication] Update failed:', error.response?.data || error.message);
      setMedEvents(previousEvents);
      addToast({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to update medication status'
      });
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const userMsg: ChatMessage = { id: `cm-${Date.now()}`, role: 'user', content: question, timestamp: new Date().toISOString() };
    setChatMessages((prev) => [...prev, userMsg]);
    setQuestion(''); setAsking(true);
    try {
      const reply = await askLifeLens(question, activePatientId || 'patient-1', agenticMode);
      setChatMessages((prev) => [...prev, reply]);
    } catch { addToast({ type: 'error', message: 'Failed to get response' }); }
    finally { setAsking(false); }
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayDate = today.toISOString().split('T')[0];
  const todayEvents = medEvents.filter((e) => e.doseDate === todayDate);
  const takenCount = todayEvents.filter((e) => e.status === 'taken').length;
  const adherence = todayEvents.length > 0 ? Math.round((takenCount / todayEvents.length) * 100) : 0;
  const firstName = user?.fullName?.split(' ')[0] || 'Patient';

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } };

  const StatContent = ({ s, adherence }: { s: any, adherence: number }) => (
    <>
      <div className="flex justify-between items-start mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.bg)}>
          <s.icon className={cn("w-4 h-4", s.color)} />
        </div>
        {s.label === 'Adherence' && (
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[#EAF2E9]" />
              <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={`${(adherence / 100) * 100} 100`} className="text-[#7A9E7A] transition-all duration-1000" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-2xl font-black tracking-tight text-[#1E1B2E] group-hover:scale-105 origin-left transition-transform">{s.value}</p>
      <p className="text-[10px] font-extrabold text-[#9896B0] uppercase tracking-widest mt-1">{s.label}</p>
    </>
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="pb-10 space-y-6">

      {/* ─── ROW 1: Welcome + Quick Stats ─── */}
      <motion.div variants={fadeUp} className="w-full">
        <div className="relative w-full p-6 lg:p-8 rounded-[28px] flex flex-col lg:flex-row items-center justify-between gap-6 overflow-hidden bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Refined Mesh Gradient Background */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-[28px] z-0">
            <div className="absolute -top-[30%] -right-[10%] w-[50%] h-[150%] bg-gradient-to-b from-indigo-50/80 to-purple-50/40 blur-[60px] rotate-12" />
            <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[120%] bg-gradient-to-t from-amber-50/80 to-orange-50/40 blur-[60px] -rotate-12" />
          </div>
          
          <div className="flex items-center gap-5 relative z-10 w-full lg:w-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl blur-md" />
              <motion.img whileHover={{ scale: 1.05, rotate: -2 }} src={`https://api.dicebear.com/7.x/notionists/svg?seed=${firstName}`} alt="avatar" className="relative w-16 h-16 rounded-2xl bg-white shadow-sm ring-4 ring-white flex-shrink-0 object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[26px] font-black tracking-tight text-slate-800 truncate mb-1">{getGreeting()}, {firstName} 👋</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{todayStr}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-3 relative z-10 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
            {[
              { label: 'Total Memories', value: memories.length.toString(), icon: Heart, iconBg: 'bg-indigo-50 text-indigo-500', href: '/memory-lane' },
              { label: 'Adherence', value: `${adherence}%`, icon: Pill, iconBg: 'bg-emerald-50 text-emerald-500' },
              { label: 'Mood', value: 'Positive', icon: TrendingUp, iconBg: 'bg-amber-50 text-amber-500' },
            ].map((s) => {
              const InnerContent = (
                <>
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]", s.iconBg)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start justify-center pt-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</span>
                    <span className="text-sm font-black tracking-tight text-slate-800 leading-none">{s.value}</span>
                  </div>
                </>
              );

              const className = "bg-white border border-slate-100/80 hover:bg-slate-50/80 rounded-full pl-2 pr-6 py-2 flex items-center gap-3.5 transition-all hover:-translate-y-1 hover:border-slate-200 hover:shadow-md shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer shrink-0 select-none";

              if (s.href) {
                return <Link key={s.label} href={s.href} className={className}>{InnerContent}</Link>;
              }
              return <div key={s.label} className={className}>{InnerContent}</div>;
            })}
          </div>
        </div>
      </motion.div>

      {/* ─── ROW 2: Main Workspace + Sidebar ─── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Left: Main Content Area */}
        <motion.div variants={fadeUp} className="col-span-12 lg:col-span-8 flex flex-col gap-5">

          {/* Tab Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex p-1 rounded-[16px] gap-1" style={{ background: '#F6F5FA', border: '1px solid rgba(255, 140, 66,0.12)', boxShadow: 'inset 0px 2px 4px rgba(30,27,46,0.03)' }}>
                {([
                  { key: 'remember' as const, label: 'Remember', icon: Star },
                  { key: 'ask' as const, label: 'Ask AI', icon: Brain },
                ]).map((t) => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={cn("relative flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-[12px] transition-all z-10",
                      activeTab === t.key ? 'text-[#1E1B2E]' : 'text-[#9896B0] hover:text-[#5A576E]')}>
                    {activeTab === t.key && <motion.div layoutId="main-tab" className="absolute inset-0 bg-white rounded-[12px] -z-10" style={{ boxShadow: '0 2px 8px rgba(255, 140, 66,0.15)' }} transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowGuide(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-[#F6F5FA] hover:bg-[#FF8C42]/10 text-[#9896B0] hover:text-[#FF8C42] border border-[#FF8C42]/10 shadow-[inset_0px_2px_4px_rgba(30,27,46,0.02)] transition-all cursor-pointer select-none"
                title="View Dashboard Guide"
              >
                ?
              </button>
            </div>
            <Link href="/memory-lane" className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#FF8C42] hover:bg-[#FF8C42]/10 rounded-xl transition-all">
              View Memory Lane <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {/* ── Remember This ── */}
            {activeTab === 'remember' && (
              <motion.div key="remember" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <div className="card p-0 shadow-xl overflow-hidden">
                  {/* Memory type selector strip */}
                  <div className="flex border-b border-slate-100">
                    {([
                      { key: 'image' as const, label: 'Photo', icon: Camera, accent: 'indigo' },
                      { key: 'audio' as const, label: 'Audio', icon: MicIcon, accent: 'pink' },
                      { key: 'text' as const, label: 'Write', icon: PenLine, accent: 'amber' },
                    ]).map((t) => (
                      <button key={t.key} onClick={() => setMemoryType(t.key)}
                        className={cn("flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-bold transition-all border-b-2 relative",
                          memoryType === t.key
                            ? 'text-slate-900 border-slate-900 bg-white'
                            : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/50')}>
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    <AnimatePresence mode="wait">
                      {memoryType === 'image' && (
                        <motion.div key="img" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-indigo-50/10 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group relative">

                          {showWebcam ? (
                            <WebcamCapture
                              onCapture={(file) => {
                                setCapturedFile(file);
                                setShowWebcam(false);
                                addToast({ type: 'success', message: 'Photo securely captured!' });
                              }}
                              onCancel={() => setShowWebcam(false)}
                            />
                          ) : (
                            <>
                              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:shadow-indigo-200 transition-shadow">
                                <Camera className="w-6 h-6 text-indigo-500" />
                              </motion.div>
                              <p className="text-sm font-bold text-slate-700 mb-4 text-center px-4">
                                {capturedFile ? `Ready to upload: ${capturedFile.name}` : "Add a live photo memory"}
                              </p>
                              <div className="flex gap-3 relative z-10 w-full justify-center">
                                <label className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:shadow-md transition-all cursor-pointer">
                                  <Upload className="w-3.5 h-3.5" />Browse
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setCapturedFile(e.target.files[0]);
                                      addToast({ type: 'success', message: 'Image attached!' });
                                    }
                                  }} />
                                </label>
                                <button onClick={() => setShowWebcam(true)} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-600 transition-all cursor-pointer">
                                  <Camera className="w-3.5 h-3.5" />Take Photo
                                </button>
                              </div>
                              <p className="text-xs text-slate-400 font-medium mt-4">{capturedFile ? `${(capturedFile.size / 1024 / 1024).toFixed(2)} MB` : "PNG, JPG up to 10MB"}</p>
                            </>
                          )}
                        </motion.div>
                      )}
                      {memoryType === 'audio' && (
                        <motion.div key="aud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="border-2 border-dashed border-pink-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-pink-50/30 hover:border-pink-400 transition-all">
                          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-pink-100 mb-4">
                            <Mic className="w-6 h-6 text-pink-500" />
                          </motion.div>
                          <p className="text-sm font-bold text-slate-700 mb-3">Record a voice memory</p>
                          <div className="flex gap-3">
                            <button className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:shadow-md transition-all flex items-center gap-2"><Upload className="w-3.5 h-3.5" />Upload</button>
                            <button className="px-5 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all flex items-center gap-2"><Mic className="w-3.5 h-3.5" />Record</button>
                          </div>
                        </motion.div>
                      )}
                      {memoryType === 'text' && (
                        <motion.div key="txt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <textarea className="input-base min-h-[140px] text-base resize-none bg-slate-50 focus:bg-white" placeholder="What happened today? Write it down..."
                            value={textContent} onChange={(e) => setTextContent(e.target.value)} />
                          <p className="text-[10px] font-bold text-slate-400 text-right mt-1.5 uppercase tracking-wider">{textContent.length} chars</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100 flex-wrap gap-3">
                      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                        {memoryType === 'image' && (
                          <>
                            <input className="input-base max-w-[200px] py-2 text-xs" placeholder="Tag people..." value={personTags} onChange={(e) => setPersonTags(e.target.value)} />
                            <input className="input-base flex-1 min-w-[200px] py-2 text-xs" placeholder="Tell us about this photo... (e.g. Went to this hotel...)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
                          </>
                        )}
                        <LocationSelector value={location} onChange={setLocation} />
                        <MilestoneToggle checked={isMilestone} onChange={setIsMilestone} />
                      </div>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={handleSaveMemory} disabled={saving}
                        className="btn-gradient flex items-center gap-2 px-8 py-3 text-sm shadow-xl">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" fill="currentColor" />}
                        Save Memory
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Ask LifeLens ── */}
            {activeTab === 'ask' && (
              <motion.div key="ask" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="card overflow-hidden flex flex-col shadow-xl p-0" style={{ height: 'min(600px, calc(100vh - 320px))' }}>
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FF8C42] via-[#FFC299] to-[#7A9E7A]" />

                  <div className="px-6 py-4 border-b border-[#FFC299]/15 bg-white/70 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF5E6] border border-[#FFC299]/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-[#FF8C42]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1E1B2E] text-sm">Ask LifeLens</h3>
                        <p className="text-[9px] uppercase font-black tracking-widest text-[#FF8C42]">AI Memory Assistant</p>
                      </div>
                    </div>
                    <button onClick={toggleAgenticMode}
                      className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all',
                        agenticMode ? 'text-white shadow-lg' : 'bg-[#FFF5E6] text-[#5A576E] hover:text-[#1E1B2E]')}
                      style={agenticMode ? { background: 'linear-gradient(135deg, #FF8C42, #E67329)' } : {}}>
                      <Sparkles className="w-3.5 h-3.5" /> Agentic {agenticMode ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 bg-[#FDFAF6]/30 custom-scrollbar">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-[#FFC299]/15 flex items-center justify-center flex-shrink-0 mt-1">
                            <Brain className="w-4 h-4 text-[#FF8C42]" />
                          </div>
                        )}
                        <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium',
                          msg.role === 'user' ? 'text-white rounded-tr-sm' : 'bg-white border border-[#FFC299]/15 rounded-tl-sm shadow-sm')}
                          style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #1E1B2E, #2A2640)' } : {}}>
                          {msg.role === 'user' ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          ) : (
                            <DementiaResponse
                              content={msg.content}
                              msgId={msg.id}
                              handleListen={handleListen}
                              speakingId={speakingId}
                            />
                          )}
                          {msg.evidence && msg.evidence.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-[#FFC299]/15">
                              <p className="text-[10px] font-black text-[#9896B0] uppercase tracking-widest mb-2">📚 Stored Memories Found</p>
                              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {msg.evidence.map((m, index) => (<div key={`${m.id}-${index}`} className="flex-shrink-0 w-56"><MemoryCard memory={m} compact /></div>))}
                              </div>
                            </div>
                          )}
                          {msg.agentWorkflow && agenticMode && <div className="mt-4 border-t border-[#FFC299]/15 pt-3"><AgentWorkflowTabs workflow={msg.agentWorkflow} /></div>}
                        </div>
                      </div>
                    ))}
                    {asking && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-[#FFC299]/15 flex items-center justify-center animate-pulse"><Brain className="w-4 h-4 text-[#FF8C42]" /></div>
                        <div className="bg-white border border-[#FFC299]/15 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"><div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FF8C42] animate-bounce" /><div className="w-2 h-2 rounded-full bg-[#7A9E7A] animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-[#FF8C42] animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 bg-white border-t border-[#FFC299]/15">
                    <div className="flex items-center gap-2 rounded-2xl pr-2 pl-5 focus-within:ring-2 focus-within:ring-[#FF8C42]/20 transition-all" style={{ background: '#f6f5fa', boxShadow: 'inset 0px 3px 6px rgba(30,27,46,0.05), inset 0px -1px 2px rgba(255,255,255,1)' }}>
                      <input className="flex-1 bg-transparent py-3.5 text-sm font-medium border-0 focus:outline-none focus:ring-0 focus:border-transparent placeholder:text-[#9896B0]" placeholder="Ask about your memories..."
                        value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} />
                      <button onClick={handleAsk} disabled={asking} className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF8C42, #E67329)' }}>
                        <Send className={cn("w-4 h-4", asking && "animate-pulse")} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Ask LifeLens ── */}
          </AnimatePresence>

          {/* ─── AI Insights + Live Alerts (Moved here to fill gap) ─── */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* AI Suggestions — compact, max 2 */}
            <div className="lg:col-span-5 card p-5 bg-gradient-to-br from-indigo-50/70 to-white border-2 border-[#1E1B2E] shadow-[6px_6px_0_#1E1B2E]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]"><Lightbulb className="w-3.5 h-3.5 text-indigo-500" /></div>
                  <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">AI Insights</h4>
                </div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{suggestions.length} total</span>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">No insights yet</p>
                  </div>
                ) : (
                  suggestions.slice(0, 2).map((s) => (
                    <motion.div whileHover={{ x: 2 }} key={s.id} className="p-3 rounded-xl bg-white border-2 border-[#1E1B2E] shadow-[3px_3px_0_rgba(30,27,46,0.45)] transition-all cursor-default group">
                      <div className="flex items-start gap-2.5">
                        <div className={cn("w-7 h-7 rounded-lg border-2 border-[#1E1B2E] shadow-[2px_2px_0_rgba(30,27,46,0.35)] flex items-center justify-center flex-shrink-0 mt-0.5",
                          s.type === 'warning' ? 'bg-yellow-50 text-yellow-500' : s.type === 'insight' ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'
                        )}>
                          {s.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : s.type === 'insight' ? <TrendingUp className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{s.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 mt-0.5">{s.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Live Alerts — real-time triggers with dismiss */}
            <div className="lg:col-span-7 card p-5 border-2 border-[#1E1B2E] shadow-[6px_6px_0_#1E1B2E]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-50 rounded-lg border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /></div>
                  <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">Live Alerts</h4>
                </div>
                {triggers.length > 0 && (
                  <span className={cn("px-2 py-0.5 rounded-[10px] border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] text-[9px] font-black uppercase tracking-widest",
                    triggers.some(t => t.severity === 'urgent') ? "bg-red-100 text-red-600" :
                      triggers.some(t => t.severity === 'high') ? "bg-yellow-100 text-yellow-700" :
                        "bg-slate-100 text-slate-500"
                  )}>
                    {triggers.length} active
                  </span>
                )}
              </div>

              {triggers.length === 0 ? (
                <div className="py-6 text-center rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs text-emerald-600 font-bold">All clear — no active alerts</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                  <AnimatePresence>
                    {triggers.slice(0, 5).map((trigger) => {
                      const colors = {
                        urgent: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
                        high: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
                        medium: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
                        low: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-400', badge: 'bg-slate-100 text-slate-600' },
                      }[trigger.severity] || { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-400', badge: 'bg-slate-100 text-slate-600' };

                      return (
                        <motion.div
                          key={trigger.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          layout
                          className={cn("p-3 rounded-xl border-2 border-[#1E1B2E] shadow-[3px_3px_0_rgba(30,27,46,0.45)] flex items-start gap-3 group transition-colors", colors.bg, colors.border)}
                        >
                          <div className={cn("w-7 h-7 rounded-lg border-2 border-[#1E1B2E] shadow-[2px_2px_0_rgba(30,27,46,0.35)] flex items-center justify-center flex-shrink-0 mt-0.5 bg-white", colors.icon)}>
                            {trigger.severity === 'urgent' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn("px-1.5 py-0.5 rounded-[8px] border border-[#1E1B2E]/35 text-[8px] font-black uppercase tracking-widest", colors.badge)}>
                                {trigger.severity}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 leading-snug">{trigger.message}</p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const pid = activePatientId || 'patient_1';
                                await dismissTrigger(trigger.id, pid);
                                setTriggers(prev => prev.filter(t => t.id !== trigger.id));
                                addToast({ type: 'success', message: 'Alert dismissed' });
                              } catch { addToast({ type: 'error', message: 'Failed to dismiss' }); }
                            }}
                            className="w-6 h-6 rounded-lg bg-white/80 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Sidebar */}
        <motion.div variants={fadeUp} className="col-span-12 lg:col-span-4 flex flex-col gap-5">

          {/* Compact Unified Avatar Assistant */}
          <Link href="/avatar-assistant" className="relative rounded-[20px] p-[2px] overflow-hidden group block transition-transform hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-[spin_4s_linear_infinite] opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-lg opacity-20 group-hover:opacity-50 transition-opacity" />
            
            <div className="relative h-full rounded-[18px] bg-[#1E1B2E] p-5 flex flex-col gap-4 z-10 overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-xl blur-sm animate-pulse" />
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center relative z-10 shadow-lg">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-base tracking-tight text-white">Avatar Assistant</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-1 text-[8px] font-bold text-indigo-400 uppercase tracking-widest"><Camera className="w-2.5 h-2.5" /> Vision</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1 text-[8px] font-bold text-pink-400 uppercase tracking-widest"><Search className="w-2.5 h-2.5" /> AI</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex gap-0.5 mb-1">
                    <div className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[7px] font-bold text-white/50 uppercase tracking-widest">Live</span>
                </div>
              </div>
              
              <p className="text-xs text-white/60 font-medium leading-relaxed">
                AI companion is active. Monitoring face, objects, and providing real-time voice context.
              </p>
            </div>
          </Link>

          {/* Medications — Elegant Dark */}
          <div className="card p-5 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, #1E1B2E, #2A2640)', border: '1px solid rgba(255, 140, 66,0.1)' }}>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#7A9E7A]/10 blur-[40px] rounded-full pointer-events-none transition-colors" />
            <div className="flex items-center gap-2.5 mb-5 relative z-10">
              <div className="p-2 bg-[#7A9E7A]/20 rounded-xl"><Pill className="w-4 h-4 text-[#B5CEB5]" /></div>
              <h4 className="font-extrabold text-sm tracking-tight text-white/90">Medications Schedule</h4>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[15%_25%_45%_15%] gap-2 px-3 pb-2 border-b border-white/5 mb-2 relative z-10">
              <p className="text-[9px] font-bold text-[#9896B0]/60 uppercase tracking-widest">Time</p>
              <p className="text-[9px] font-bold text-[#9896B0]/60 uppercase tracking-widest text-center">Status</p>
              <p className="text-[9px] font-bold text-[#9896B0]/60 uppercase tracking-widest">Activity</p>
              <p className="text-[9px] font-bold text-[#9896B0]/60 uppercase tracking-widest text-right">Action</p>
            </div>

            <div className="space-y-1 relative z-10">
              {medEvents.length === 0 ? (
                <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">No scheduled meds today</p>
                </div>
              ) : (
                medEvents.slice(0, 6).map((med) => {
                  const isTaken = med.status === 'taken';
                  return (
                    <div key={`${med.medicationId}-${med.doseTime}`} className="p-3 rounded-xl hover:bg-[#FF8C42]/10 transition-colors group">
                      <div className="grid grid-cols-[15%_25%_45%_15%] gap-2 items-center">
                        <span className="text-[10px] font-bold text-[#9896B0]">{med.doseTime}</span>
                        <div className="flex justify-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            isTaken ? "bg-[#7A9E7A]/20 text-[#B5CEB5]" : "bg-white/10 text-[#FFC299]/70"
                          )}>
                            {isTaken ? 'Taken' : 'Pend'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/90 truncate">{med.medicationName}</p>
                          <p className="text-[10px] text-[#9896B0]/60 font-medium truncate">{med.doseTime}</p>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleToggleMedication(med.medicationId, med.doseTime, med.status)}
                            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-colors", isTaken ? "bg-[#7A9E7A]/20" : "bg-white/10 hover:bg-[#7A9E7A]/20 hover:text-[#B5CEB5]")}
                          >
                            {isTaken ? <CheckCircle2 className="w-4 h-4 text-[#B5CEB5]" /> : <Circle className="w-4 h-4 text-[#9896B0]/60" />}
                          </button>
                        </div>
                      </div>
                      {med.note && (
                        <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 overflow-hidden transition-all duration-300 ease-in-out">
                          <div className="mt-2 pl-[15%] flex items-start gap-2 border-t border-white/5 pt-2">
                            <Info className="w-3 h-3 text-[#FF8C42] mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-[#9896B0] font-medium leading-relaxed italic">
                              How to take: {med.note}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Daily Reminders */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FDF8EE] rounded-xl border border-[#C9A96E]/20 shadow-sm"><Clock className="w-4 h-4 text-[#C9A96E]" /></div>
                <h4 className="font-extrabold text-sm text-[#1E1B2E] tracking-tight">Active Reminders</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-yellow text-[9px] shadow-sm">{reminders.length} active</span>
                <button onClick={() => setShowAddReminder(!showAddReminder)} className="w-7 h-7 rounded-full bg-[#FDF8EE] border border-[#C9A96E]/20 flex items-center justify-center hover:bg-[#C9A96E]/20 transition-colors text-[#C9A96E]">
                  {showAddReminder ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Add Reminder Form */}
            <AnimatePresence>
              {showAddReminder && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="p-4 rounded-xl bg-[#FDF8EE]/50 border border-[#C9A96E]/15 space-y-3">
                    <input className="input-base py-2 text-xs w-full" placeholder="What do you need to remember?" value={newReminderTask} onChange={(e) => setNewReminderTask(e.target.value)} />
                    <div className="flex gap-2">
                      <input className="input-base py-2 text-xs flex-1" placeholder="When? e.g. 3pm, Tomorrow" value={newReminderTime} onChange={(e) => setNewReminderTime(e.target.value)} />
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddReminder} disabled={savingReminder} className="px-4 py-2 rounded-xl bg-[#C9A96E] text-white text-xs font-bold hover:bg-[#B8944E] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                        {savingReminder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table Header */}
            <div className="grid grid-cols-[20%_60%_20%] gap-2 px-3 pb-2 border-b border-border-light mb-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Task</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Done</p>
            </div>

            <div className="space-y-1">
              {reminders.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-400 font-medium">No active reminders</p>
                  <button onClick={() => setShowAddReminder(true)} className="text-xs text-[#C9A96E] font-bold mt-1 hover:underline">Add one →</button>
                </div>
              ) : (
                reminders.slice(0, 5).map((r) => (
                  <motion.div whileHover={{ x: 2 }} key={r.id} className="grid grid-cols-[20%_60%_20%] gap-2 items-center p-3 rounded-xl bg-background border border-transparent hover:border-border-light shadow-sm transition-all cursor-default group/line">
                    <span className="text-[10px] font-bold text-slate-500">{r.time}</span>
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{r.task}</p>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => handleCompleteReminder(r.id)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-[#EAF2E9] hover:text-[#7A9E7A] transition-colors text-slate-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <div 
            onClick={() => setShowGuide(false)}
            className="fixed inset-0 md:left-[240px] z-[10000] bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer p-4 md:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-[85%] max-h-[72vh] flex items-center justify-center"
            >
              <img 
                src="/3.png" 
                alt="Dashboard Guide" 
                className="max-w-full max-h-[72vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
