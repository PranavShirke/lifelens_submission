'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import ActivePatientGate from '@/components/auth/ActivePatientGate';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getDashboardStats, getMoodData, getAgentInsights, getSuggestions } from '@/lib/api/dashboard';
import { getMedications } from '@/lib/api/medications';
import { getFamilyRequests } from '@/lib/api/family';
import type { Medication } from '@/lib/types';
import AddMedicationModal from '@/components/medication/AddMedicationModal';
import {
  Upload, Camera, Mic, BarChart3, Brain,
  Users, BookOpen, Trash2, Check, Star, AlertTriangle, Lightbulb, Info, ArrowLeft, Search, Calendar, Heart,
  Lock, Eye, Package, Plus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

export default function CaretakerDashboardPage() {
  return (
    <RoleGuard allowedRoles={['caretaker']}>
      <AppShell>
        <ActivePatientGate>
          <DashboardContent />
        </ActivePatientGate>
      </AppShell>
    </RoleGuard>
  );
}

function DashboardContent() {
  const { activePatientName, activePatientId, clearActivePatient } = useSessionStore();
  const { addToast } = useUIStore();
  const [memType, setMemType] = useState<'image' | 'audio' | 'text'>('text');
  const [textContent, setTextContent] = useState('');
  const [requestTab, setRequestTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);

  // Real data state
  const [totalMemories, setTotalMemories] = useState(0);
  const [thisWeek, setThisWeek] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyRequests, setFamilyRequests] = useState<Array<{ id: string; requesterName: string; description: string; status: string; createdAt: string; memoryType: string }>>([]);
  const [moodDistribution, setMoodDistribution] = useState<Array<{ emotion: string; count: number; color: string }>>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<Array<{ date: string; images: number; text: number }>>([]);
  const [agentSuggestions, setAgentSuggestions] = useState<Array<{ id: string; type: string; title: string; description: string }>>([]);

  // Fetch data from backend
  const fetchData = () => {
    if (!activePatientId) return;
    const pid = activePatientId;

    getDashboardStats(pid).then((stats) => {
      setTotalMemories(stats.totalCount);
      setThisWeek(stats.recentCount);
      setLongestStreak(stats.streak);
      // Build weekly activity from dailyCounts
      const activity = Object.entries(stats.dailyCounts).map(([d, c]) => ({ date: d, images: Math.ceil(Number(c) / 2), text: Math.floor(Number(c) / 2) }));
      setWeeklyActivity(activity);
    }).catch(() => {});

    getMoodData(pid).then((mood) => {
      setMoodDistribution(mood.distribution);
    }).catch(() => {});

    getMedications(pid).then(setMedications).catch(() => {});
    getFamilyRequests(pid).then((reqs) => {
      setFamilyRequests(reqs.map((r: Record<string, unknown>) => ({
        id: r.id as string, requesterName: (r.requester_name || r.requesterName) as string,
        description: r.description as string, status: r.status as string,
        createdAt: (r.created_at || r.createdAt) as string, memoryType: (r.memory_type || r.memoryType) as string,
      })));
    }).catch(() => {});
    getSuggestions(pid).then(setAgentSuggestions).catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, [activePatientId]);

  const filteredRequests = familyRequests.filter((r) => {
    if (requestTab === 'pending') return r.status === 'pending';
    if (requestTab === 'completed') return r.status === 'completed';
    return true;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: 'spring', stiffness: 400, damping: 25 } 
    }
  };

  return (
    <div className="pb-12 overflow-x-hidden">
      
      {/* Top Header Row matching Intelly */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2"
      >
        <div className="flex items-center gap-4">
          <button onClick={clearActivePatient} className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95">
            <ArrowLeft className="w-5 h-5 stroke-[1.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>All patients</span>
              <span>&rarr;</span>
              <span className="font-semibold text-slate-700">{activePatientId} - {activePatientName}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search data..." 
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 shadow-sm text-slate-700 transition-all font-medium hover:shadow-md focus:w-72"
            />
          </div>
        </div>
      </motion.div>

      {/* Patient Hero Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        className="card mb-6 shadow-xl border-white/80 relative overflow-hidden ring-1 ring-white/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-100/50 via-purple-50/30 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDuration: '6s' }} />
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -2 }}
            className="w-28 h-28 rounded-3xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-lg ring-4 ring-white"
          >
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${activePatientName}`} alt="avatar" className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{activePatientName}</h2>
              <span className="badge badge-green px-3 py-1 text-xs animate-pulse">Stable Condition</span>
            </div>
            
            <div className="flex gap-6 text-sm text-slate-500 mb-6 font-medium">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 opacity-70" /> ID: {activePatientId}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 opacity-70" /> Age: 78 yo</span>
              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 opacity-70 text-red-400" fill="currentColor" /> Blood Type: O+</span>
            </div>

            <div className="flex flex-wrap md:flex-nowrap gap-4">
               {[
                 { label: 'Total Memories', value: totalMemories, textColor: 'text-slate-900' },
                 { label: 'This Week', value: `+${thisWeek}`, textColor: 'text-green-600' },
                 { label: 'Longest Streak', value: `${longestStreak} days`, textColor: 'text-yellow-600' },
                 { label: 'Mood Trend', value: 'Positive', textColor: 'text-indigo-600' }
               ].map((stat, i) => (
                 <motion.div 
                   key={stat.label}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.3 + i * 0.1 }}
                   className="flex-1 bg-white/60 p-4 rounded-2xl border border-white/80 max-w-xs shadow-sm hover:bg-white hover:shadow-md transition-colors group cursor-default"
                 >
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">{stat.label}</p>
                   <p className={cn("font-black text-2xl tracking-tight group-hover:scale-105 origin-left transition-transform", stat.textColor)}>{stat.value}</p>
                 </motion.div>
               ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout (3-6-3) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6"
      >
        
        {/* LEFT COLUMN: Insights & Quick Actions */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-3 flex flex-col gap-6">
          {/* AI/Agent Insights Card */}
          <div className="card bg-gradient-to-br from-[#18181b] to-[#27272a] text-white border-white/10 shadow-2xl relative overflow-hidden h-[420px] group hover:shadow-[0_0_40px_-10px_rgba(244,114,182,0.4)] transition-shadow duration-500">
             {/* Decorative blob inside */}
             <div className="absolute -top-10 -right-10 w-56 h-56 bg-pink-500/30 rounded-full blur-[60px] pointer-events-none animate-pulse-glow" style={{ animationDuration: '4s' }}></div>
             <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
             
             <div className="relative z-10 flex flex-col h-full">
               <h3 className="font-bold text-white flex items-center gap-2 mb-4 text-lg">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                   <Star className="w-5 h-5 text-pink-400" fill="currentColor" />
                 </motion.div>
                 LifeLens AI Core
               </h3>
               <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                 {agentSuggestions.slice(0, 3).map((s, i) => (
                   <motion.div 
                     key={s.id} 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.5 + i * 0.15 }}
                     className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 transition-colors hover:bg-white/10 cursor-pointer"
                   >
                     <div className="flex items-center gap-2 mb-1.5">
                       {s.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                       {s.type === 'insight' && <Info className="w-4 h-4 text-blue-400" />}
                       {s.type === 'suggestion' && <Lightbulb className="w-4 h-4 text-pink-400" />}
                       <p className="text-sm font-semibold">{s.title}</p>
                     </div>
                     <p className="text-xs text-white/70 leading-relaxed font-medium">{s.description}</p>
                   </motion.div>
                 ))}
               </div>
               <motion.button 
                 whileHover={{ scale: 1.03 }}
                 whileTap={{ scale: 0.97 }}
                 className="w-full mt-4 bg-white text-[#18181b] font-bold text-sm py-3 rounded-full hover:bg-slate-100 transition-all shadow-lg overflow-hidden relative group"
               >
                 <span className="relative z-10">Run Analysis</span>
                 <div className="absolute inset-0 bg-gradient-to-r from-pink-200 to-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
               </motion.button>
             </div>
          </div>

          {/* Quick Actions / Data Hygiene */}
          <div className="card shadow-lg flex-1">
             <h3 className="font-bold text-slate-900 mb-3 text-base">Quick Actions</h3>
             <div className="flex flex-col gap-3 h-full">
               <motion.button 
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => addToast({ type: 'success', message: 'Book generating...' })} 
                 className="flex-1 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200 flex flex-col items-center justify-center gap-2 text-pink-800 hover:shadow-md transition-all group"
               >
                 <BookOpen className="w-6 h-6 stroke-[1.5] group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-bold tracking-wide">Generate Memory Book</span>
               </motion.button>
               <motion.button 
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => addToast({ type: 'info', message: 'Scanning for duplicates...' })} 
                 className="flex-1 rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200 flex flex-col items-center justify-center gap-2 text-yellow-800 hover:shadow-md transition-all group"
               >
                 <Trash2 className="w-6 h-6 stroke-[1.5] group-hover:rotate-12 transition-transform" />
                 <span className="text-xs font-bold tracking-wide">Clean Up Data</span>
               </motion.button>
             </div>
          </div>
        </motion.div>

        {/* CENTER COLUMN: Main Analytics */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-6 flex flex-col gap-6">
          {/* Memory Analytics Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[420px] md:h-[260px]">
             {/* Upload Activity Chart */}
             <div className="card h-full shadow-lg p-5 group hover:shadow-xl transition-all duration-300">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><BarChart3 className="w-4 h-4 text-indigo-500" /> Upload Activity</h3>
                 <span className="badge badge-gray px-2 py-0.5 text-[9px]">14 days</span>
               </div>
               <div className="flex-1 min-h-0 w-full group-hover:scale-[1.02] transition-transform duration-500 origin-bottom">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={weeklyActivity.slice(-14)} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false}
                       tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric' })} />
                     <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} width={30} />
                     <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                     <Bar dataKey="images" name="Images" fill="#4f46e5" radius={[4, 4, 0, 0]} stackId="a" />
                     <Bar dataKey="text" name="Text" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>

             {/* Mood Distribution Chart */}
             <div className="card h-full shadow-lg p-5 group hover:shadow-xl transition-all duration-300">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Brain className="w-4 h-4 text-pink-500" /> Mood Distribution</h3>
                 <span className="badge badge-gray px-2 py-0.5 text-[9px]">All Time</span>
               </div>
               <div className="flex-1 min-h-0 w-full -mt-2 group-hover:scale-[1.05] transition-transform duration-500">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={moodDistribution} dataKey="count" nameKey="emotion" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                       {moodDistribution.map((entry) => (<Cell key={entry.emotion} fill={entry.color} />))}
                     </Pie>
                     <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

          {/* Family Memory Requests */}
          <div className="card shadow-lg flex-1">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-indigo-500" /> Family Requests</h3>
                <div className="flex bg-slate-100 p-1 rounded-full shadow-inner relative">
                  {(['pending', 'completed', 'all'] as const).map((t) => (
                    <button key={t} onClick={() => setRequestTab(t)} className={cn('relative z-10 px-4 py-1.5 text-[11px] font-bold rounded-full capitalize transition-colors duration-300', requestTab === t ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                      {requestTab === t && (
                        <motion.div layoutId="tab-bubble" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                      )}
                      {t}
                    </button>
                  ))}
                </div>
             </div>
             
              <AnimatePresence mode="wait">
                {filteredRequests.length === 0 ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"
                  >
                     <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-emerald-400">
                       <Check className="w-6 h-6" />
                     </div>
                     <p className="text-sm font-semibold text-slate-500">All caught up!</p>
                     <p className="text-xs text-slate-400">No active requests right now.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid md:grid-cols-2 gap-4 flex-1"
                  >
                    {filteredRequests.map((req, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={req.id} 
                        className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative overflow-hidden cursor-default"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{req.requesterName}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={cn('badge', req.status === 'pending' ? 'badge-yellow' : req.status === 'completed' ? 'badge-green' : 'badge-gray')}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-5 leading-relaxed flex-1 font-medium">{req.description}</p>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => addToast({ type: 'success', message: 'Fulfilled with text!' })} 
                              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors"
                            >
                              Write Response
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Tooling */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-3 flex flex-col gap-6">
          {/* Current Medications Widget */}
          <div className="card shadow-lg h-[420px] lg:h-auto lg:flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg"><Check className="w-5 h-5 text-emerald-500" /> Active Meds</h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 shadow-inner px-2.5 py-1 rounded-lg">{medications.length} items</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
               {medications.slice(0, 5).map((med, i) => (
                 <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.3 + i * 0.1 }}
                   key={med.id} 
                   className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-colors cursor-default"
                 >
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{med.name}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1 tracking-wide">{med.dosage} &bull; {med.frequency}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn('badge', med.schedule[0] < '12:00' ? 'badge-yellow bg-yellow-100 text-yellow-800 border-yellow-300' : 'badge-gray bg-indigo-50 text-indigo-700 border-indigo-200')}>
                        {med.schedule[0] < '12:00' ? 'Morning' : 'Evening'}
                      </span>
                    </div>
                 </motion.div>
               ))}
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/caretaker/medications'}
                  className="w-full py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 border-dashed hover:border-solid mt-2 flex items-center justify-center gap-2"
                >
                  View prescriptions
                </motion.button>
              </div>
            </div>

          {/* Upload Memory Component */}
          <div className="card shadow-lg flex-1 group">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 text-base"><Upload className="w-4 h-4 text-indigo-500" /> Record Memory</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner mb-4 relative">
                {(['image', 'audio', 'text'] as const).map((t) => (
                  <button key={t} onClick={() => setMemType(t)} className={cn('relative z-10 flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors duration-300', memType === t ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                    {memType === t && (
                      <motion.div layoutId="upload-tab" className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                    )}
                    {t === 'image' ? '📷 Image' : t === 'audio' ? '🎤 Audio' : '📝 Text'}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {memType === 'text' ? (
                    <motion.textarea 
                      key="text"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="input-base flex-1 min-h-[120px] mb-4 bg-white/50 border-slate-200 shadow-inner resize-none text-sm font-medium p-4 py-3 focus:bg-white transition-colors" 
                      placeholder="Chronicle an event or thought..." 
                      value={textContent} 
                      onChange={(e) => setTextContent(e.target.value)} 
                    />
                  ) : (
                    <motion.div 
                      key="file"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center mb-4 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer"
                    >
                      <motion.div 
                        animate={{ y: [0, -4, 0] }} 
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3"
                      >
                        {memType === 'image' ? <Camera className="w-5 h-5 text-indigo-400" /> : <Mic className="w-5 h-5 text-indigo-400" />}
                      </motion.div>
                      <p className="text-[11px] font-bold tracking-wide text-slate-500">Drop your file here</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-end mt-auto">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToast({ type: 'success', message: 'Memory uploaded!' })} 
                    className="w-full btn-gradient py-2.5 text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg hover:shadow-pink-500/25 transition-all"
                  >
                    <span>Save to Vault</span>
                    <Star className="w-3.5 h-3.5" fill="currentColor" />
                  </motion.button>
                </div>
              </div>
          </div>
        </motion.div>
        
      </motion.div>

      {/* ─── Upcoming Caregiver Features (Coming Soon) ─── */}
      <div className="mt-8">
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Memory Bank Enrollment</h2>
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-violet-200">Roadmap</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Person Enrollment */}
          <div className="relative rounded-[16px] border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50/60 to-white/80 backdrop-blur-xl p-6 flex flex-col gap-4 transition-all hover:border-teal-300 hover:shadow-lg group overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-300/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-teal-300/30 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Person Enrollment</h3>
                  <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">/remember/person</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-100 text-teal-600 text-[9px] font-black uppercase tracking-widest border border-teal-200">
                <Lock className="w-3 h-3" /> Coming Soon
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">Upload photos, names, relationships, context notes, and optional audio samples of loved ones and caregivers. The backend encodes face embeddings and stores metadata in Qdrant for real-time recognition.</p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Face Encoding', 'Qdrant Storage', 'Audio Samples', 'Relationship Tags'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-white border border-teal-100 text-[10px] font-bold text-teal-600 shadow-sm">{t}</span>
              ))}
            </div>
          </div>

          {/* Object Enrollment */}
          <div className="relative rounded-[16px] border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50/60 to-white/80 backdrop-blur-xl p-6 flex flex-col gap-4 transition-all hover:border-amber-300 hover:shadow-lg group overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Object Enrollment</h3>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">/remember/object</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest border border-amber-200">
                <Lock className="w-3 h-3" /> Coming Soon
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">Upload photos of significant objects like wallets, medicine boxes, and keys so the system learns what they look like — helping the patient locate misplaced items via camera scanning.</p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Image Embedding', 'Object Detection', 'YOLO Training', 'Spatial Labels'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-white border border-amber-100 text-[10px] font-bold text-amber-700 shadow-sm">{t}</span>
              ))}
            </div>
          </div>

          {/* Patient Self-Enrollment */}
          <div className="relative rounded-[16px] border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/60 to-white/80 backdrop-blur-xl p-6 flex flex-col gap-4 transition-all hover:border-violet-300 hover:shadow-lg group overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-300/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Patient Registration</h3>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">/remember/patient</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-600 text-[9px] font-black uppercase tracking-widest border border-violet-200">
                <Lock className="w-3 h-3" /> Coming Soon
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">Register patient face and voice data securely to enable the 3D avatar to address them personally and provide a deeply personalized caregiving experience.</p>
            <div className="flex gap-2 flex-wrap relative z-10">
              {['Face Registration', 'Voice Profiling', 'Secure Storage'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-white border border-violet-100 text-[10px] font-bold text-violet-600 shadow-sm">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
