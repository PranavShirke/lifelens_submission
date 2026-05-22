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
      setTextContent(''); setPersonTags(''); setLocation(null); setIsMilestone(false); setCapturedFile(null); setShowWebcam(false);
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
      <div className="grid grid-cols-12 gap-5">
        {/* Greeting */}
        <motion.div variants={fadeUp} className="col-span-12 lg:col-span-5">
          <div className="card h-full p-7 shadow-lg flex flex-row items-center gap-5 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-bl from-[#FFC299]/30 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#B5CEB5]/20 to-transparent rounded-full blur-2xl pointer-events-none" />
            <motion.img whileHover={{ scale: 1.08, rotate: -3 }} src={`https://api.dicebear.com/7.x/notionists/svg?seed=${firstName}`} alt="avatar" className="w-16 h-16 rounded-2xl bg-[#FFF5E6] shadow-md ring-4 ring-white flex-shrink-0 object-cover" />
            <div className="relative z-10 min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-[#1E1B2E]">{getGreeting()}, {firstName} 👋</h1>
              <p className="text-xs font-semibold text-[#9896B0] mt-1 uppercase tracking-wider">{todayStr}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stat Cards */}
        {[
          { label: 'Memories', value: memories.length.toString(), icon: Heart, color: 'text-[#FF8C42]', bg: 'bg-[#FFF5E6]', href: '/memory-lane' },
          { label: 'Adherence', value: `${adherence}%`, icon: Pill, color: 'text-[#7A9E7A]', bg: 'bg-[#EAF2E9]' },
          { label: 'Mood', value: 'Positive', icon: TrendingUp, color: 'text-[#C9A96E]', bg: 'bg-[#FDF8EE]' },
        ].map((s, i) => (
          <motion.div key={s.label} variants={fadeUp} className="col-span-12 sm:col-span-4 lg:col-span-2 xl:col-span-2">
            {s.href ? (
              <Link href={s.href} className="card h-full p-5 cursor-pointer group hover:-translate-y-1 transition-all block">
                <StatContent s={s} adherence={adherence} />
              </Link>
            ) : (
              <div className="card h-full p-5 cursor-default group hover:-translate-y-1 transition-all">
                <StatContent s={s} adherence={adherence} />
              </div>
            )}
          </motion.div>
        ))}

        {/* AI Flash Insight */}
        <motion.div variants={fadeUp} className="col-span-12 lg:col-span-1 xl:col-span-1 hidden lg:block">
          <div className="card h-full shadow-lg flex flex-col items-center justify-center p-3 relative overflow-hidden group cursor-pointer" style={{ background: 'linear-gradient(135deg, #1E1B2E, #2A2640)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF8C42]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Zap className="w-5 h-5 text-[#FFC299] relative z-10" fill="currentColor" />
            <span className="text-[9px] font-black uppercase tracking-widest mt-2 relative z-10 text-center leading-tight text-white/80">AI<br />Tip</span>
          </div>
        </motion.div>
      </div>

      {/* ─── ROW 2: Main Workspace + Sidebar ─── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Left: Main Content Area */}
        <motion.div variants={fadeUp} className="col-span-12 lg:col-span-8 flex flex-col gap-5">

          {/* Tab Bar */}
          <div className="flex items-center justify-between">
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
                          <input className="input-base max-w-[200px] py-2 text-xs" placeholder="Tag people..." value={personTags} onChange={(e) => setPersonTags(e.target.value)} />
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
                        <div className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm font-medium',
                          msg.role === 'user' ? 'text-white rounded-tr-sm' : 'bg-white border border-[#FFC299]/15 rounded-tl-sm shadow-sm')}
                          style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #1E1B2E, #2A2640)' } : {}}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          {msg.evidence && msg.evidence.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#FFC299]/15">
                              <p className="text-[10px] font-black text-[#9896B0] uppercase tracking-widest mb-2">📚 Referenced</p>
                              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {msg.evidence.map((m, index) => (<div key={`${m.id}-${index}`} className="flex-shrink-0 w-56"><MemoryCard memory={m} compact /></div>))}
                              </div>
                            </div>
                          )}
                          {msg.agentWorkflow && agenticMode && <div className="mt-3"><AgentWorkflowTabs workflow={msg.agentWorkflow} /></div>}
                          {msg.role === 'assistant' && (
                            <button className="mt-2 text-[10px] text-[#9896B0] hover:text-[#FF8C42] flex items-center gap-1 font-bold"><Volume2 className="w-3 h-3" /> Listen</button>
                          )}
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
                      <input className="flex-1 bg-transparent py-3.5 text-sm font-medium outline-none placeholder:text-[#9896B0]" placeholder="Ask about your memories..."
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



      {/* ─── ROW 4: Upcoming Features (Coming Soon) ─── */}
      <motion.div variants={fadeUp}>
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Edge Features</h2>
          <span className="px-3 py-1 rounded-[10px] border-2 border-[#1E1B2E] bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[9px] font-black uppercase tracking-widest shadow-[3px_3px_0_#1E1B2E]">Roadmap</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 3D Avatar + Chat */}
          <Link href="/avatar-assistant" className="relative rounded-[14px] border-2 border-[#1E1B2E] bg-gradient-to-br from-violet-50/75 to-white p-6 flex flex-col gap-4 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#1E1B2E] shadow-[5px_5px_0_#1E1B2E] group overflow-hidden block">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-300/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-violet-300/30 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-100 border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">3D Avatar Assistant</h3>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Full-Screen Experience</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#EAF2E9] text-[#5A835A] text-[9px] font-black uppercase tracking-widest border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">A full-screen 3D avatar companion that speaks naturally, recognises faces through the camera, answers questions about memories, and provides contextual support — all in real-time.</p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Llama 3 LLM', 'Real-time TTS', 'Qdrant Vector DB', '3D Rendering'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-[8px] bg-white border-2 border-[#1E1B2E] text-[10px] font-bold text-violet-600 shadow-[2px_2px_0_rgba(30,27,46,0.45)]">{t}</span>
              ))}
            </div>
          </Link>

          {/* Face Recognition */}
          <Link href="/avatar-assistant" className="relative rounded-[14px] border-2 border-[#1E1B2E] bg-gradient-to-br from-cyan-50/75 to-white p-6 flex flex-col gap-4 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#1E1B2E] shadow-[5px_5px_0_#1E1B2E] group overflow-hidden block">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-300/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-cyan-300/30 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-100 border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                  <Camera className="w-5 h-5 text-cyan-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Face Recognition</h3>
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">&quot;Who is this?&quot;</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#EAF2E9] text-[#5A835A] text-[9px] font-black uppercase tracking-widest border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">Point your camera at a person. The system captures a frame, compares it against the Qdrant face database, and the avatar verbally introduces them — <em>&quot;This is John, your son.&quot;</em></p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Face Embedding', 'Qdrant Matching', 'Avatar Voice'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-[8px] bg-white border-2 border-[#1E1B2E] text-[10px] font-bold text-cyan-600 shadow-[2px_2px_0_rgba(30,27,46,0.45)]">{t}</span>
              ))}
            </div>
          </Link>

          {/* Object Tracking */}
          <Link href="/avatar-assistant" className="relative rounded-[14px] border-2 border-[#1E1B2E] bg-gradient-to-br from-amber-50/80 to-white p-6 flex flex-col gap-4 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#1E1B2E] shadow-[5px_5px_0_#1E1B2E] group overflow-hidden block">
            <div className="absolute top-0 left-0 w-40 h-40 bg-amber-300/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-amber-300/30 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                  <Search className="w-5 h-5 text-amber-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Object Tracking</h3>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">&quot;Where are my keys?&quot;</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#EAF2E9] text-[#5A835A] text-[9px] font-black uppercase tracking-widest border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">The camera scans for enrolled objects like medicine boxes, wallets, or keys. When spotted, the avatar announces — <em>&quot;I found your Medicine Box on the table.&quot;</em></p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Object Detection', 'YOLO Model', 'Spatial Mapping'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-[8px] bg-white border-2 border-[#1E1B2E] text-[10px] font-bold text-amber-700 shadow-[2px_2px_0_rgba(30,27,46,0.45)]">{t}</span>
              ))}
            </div>
          </Link>

          {/* Voice Playback */}
          <Link href="/avatar-assistant" className="relative rounded-[14px] border-2 border-[#1E1B2E] bg-gradient-to-br from-pink-50/75 to-white p-6 flex flex-col gap-4 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#1E1B2E] shadow-[5px_5px_0_#1E1B2E] group overflow-hidden block">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-300/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-pink-300/30 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-pink-100 border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] flex items-center justify-center group-hover:bg-pink-500 transition-colors">
                  <Volume2 className="w-5 h-5 text-pink-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Voice Playback</h3>
                  <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">&quot;How does John talk?&quot;</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#EAF2E9] text-[#5A835A] text-[9px] font-black uppercase tracking-widest border-2 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E]">
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">Store voice samples of relatives. When the patient asks to hear a familiar voice, the AI retrieves and synthesizes the saved audio — bringing comfort through recognition.</p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Voice Cloning', 'Audio Retrieval', 'TTS Synthesis'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-[8px] bg-white border-2 border-[#1E1B2E] text-[10px] font-bold text-pink-600 shadow-[2px_2px_0_rgba(30,27,46,0.45)]">{t}</span>
              ))}
            </div>
          </Link>
        </div>
      </motion.div>

    </motion.div>
  );
}
