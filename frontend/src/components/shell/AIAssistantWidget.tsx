'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, MapPin, Phone, HelpCircle, ArrowRight, Search, Sparkles, MessageSquare, Pill, Heart, Navigation, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/lib/store/session-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface GuideItem {
  title: string;
  keywords: string[];
  location: string;
  path: string;
  desc: string;
  instructions: string;
  icon: React.ReactNode;
}

export default function AIAssistantWidget() {
  const { user } = useSessionStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'steps' | 'care'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GuideItem[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);

  const firstName = user?.fullName?.split(' ')[0] || 'friend';

  const GUIDE_ITEMS: GuideItem[] = [
    {
      title: 'Medications & Pills',
      keywords: ['pill', 'med', 'medicine', 'doctor', 'pills', 'donepezil', 'rx', 'dose', 'schedule'],
      location: 'Medications Schedule',
      path: '/medications',
      desc: 'Located on your main screen dashboard or via the Pill icon in the left menu.',
      instructions: 'Shows your daily pill schedule. Click the checkmark circle next to any medication when you have taken it so you and your caregiver know it\'s completed!',
      icon: <Pill className="w-4 h-4 text-emerald-500" />
    },
    {
      title: 'Photos & Stored Memories',
      keywords: ['photo', 'memory', 'lane', 'album', 'picture', 'photos', 'memories', 'past', 'yesterday'],
      location: 'Memory Lane',
      path: '/memory-lane',
      desc: 'Located by clicking "Memory Lane" in the left menu, or the link on the home page.',
      instructions: 'This stores all your beautiful photo memories, audio diaries, and notes. Scroll through them warmly to remember your wonderful experiences and family moments.',
      icon: <Heart className="w-4 h-4 text-pink-500" />
    },
    {
      title: 'Avatar Assistant (Face & Object scanner)',
      keywords: ['avatar', 'companion', 'camera', 'scan', 'face', 'object', 'find', 'identify', '3d'],
      location: 'Avatar Assistant',
      path: '/avatar-assistant',
      desc: 'Accessed by clicking "Avatar Assistant" in the left menu or the flashing card on your dashboard.',
      instructions: 'Allows you to scan faces to recognize family, identify and locate key household objects (like your glasses or meds), and talk directly to your 3D robot companion.',
      icon: <Sparkles className="w-4 h-4 text-[#FF8C42]" />
    },
    {
      title: 'Ask AI Chatbot',
      keywords: ['ask', 'chat', 'chatbot', 'question', 'brain', 'ai', 'help', 'noodles', 'cook', 'noodle'],
      location: 'Ask AI (Home Page)',
      path: '/home',
      desc: 'Found on the main home screen under the "Ask AI" tab.',
      instructions: 'A helpful companion where you can type or ask questions about your memories (e.g. "who did I walk with?") or general help (e.g. "how do I boil water?").',
      icon: <HelpCircle className="w-4 h-4 text-indigo-500" />
    }
  ];

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const cleanQuery = searchQuery.toLowerCase().trim();
    const matches = GUIDE_ITEMS.filter(item => 
      item.title.toLowerCase().includes(cleanQuery) ||
      item.desc.toLowerCase().includes(cleanQuery) ||
      item.keywords.some(keyword => cleanQuery.includes(keyword) || keyword.includes(cleanQuery))
    );
    setSearchResults(matches);
  }, [searchQuery]);

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(255,140,66,0.35)] hover:scale-105 active:scale-95 transition-transform z-50 border border-[#FF8C42]/20 cursor-pointer animate-[pulse_3s_infinite]"
          style={{ background: 'linear-gradient(135deg, #FF8C42, #E67329)' }}
          title="App Guidebook & Directory"
        >
          <BookOpen className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Floating Assistant Guidebook Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.93 }}
            className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-32px)] bg-[#1A1829] text-white rounded-[24px] border-2 border-[#FF8C42]/25 shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-50 flex flex-col overflow-hidden max-h-[580px]"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-gradient-to-r from-[#211E36] to-[#1A1829] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
                  <BookOpen className="w-5 h-5 text-[#FF8C42]" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight text-white leading-tight">Your App Guidebook</h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#FFC299] mt-0.5">Need help finding something?</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsOpen(false); setSelectedGuide(null); }} 
                className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Welcome banner */}
            <div className="px-5 py-3.5 bg-orange-500/5 border-b border-orange-500/10 flex items-center gap-2">
              <span className="text-base">👋</span>
              <p className="text-xs font-bold text-[#FFC299]">
                Hello, {firstName}! If you ever forget how to use this app, just look here.
              </p>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-[#141220] border-b border-white/5 relative">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 focus-within:ring-2 focus-within:ring-[#FF8C42]/20 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Type what you are looking for... (e.g. pills)"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedGuide(null); }}
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-bold"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>

            {/* Navigation Tabs (Hidden when search query is typed) */}
            {!searchQuery && !selectedGuide && (
              <div className="flex border-b border-white/5 bg-[#141220] p-1 gap-1">
                {([
                  { key: 'map' as const, label: 'App Map', icon: MapPin },
                  { key: 'steps' as const, label: 'How-To', icon: Info },
                  { key: 'care' as const, label: 'Emergency', icon: Phone },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer",
                      activeTab === tab.key 
                        ? 'bg-orange-500/10 text-[#FF8C42] border border-orange-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    )}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#1A1829] min-h-[220px]">
              
              {/* --- SEARCH RESULTS --- */}
              {searchQuery && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Search Results ({searchResults.length})</p>
                  {searchResults.length === 0 ? (
                    <div className="p-6 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                      <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400">I couldn't find that in the guidebook.</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Try searching for 'pills', 'memories', or 'companion'.</p>
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.title}
                        onClick={() => setSelectedGuide(item)}
                        className="w-full text-left p-3.5 rounded-xl border border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/20 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#211E36] flex items-center justify-center border border-white/10 shrink-0">{item.icon}</div>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-[#FF8C42] transition-colors">{item.title}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.location}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#FF8C42] group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* --- SELECTED GUIDE PAGE --- */}
              {selectedGuide && (
                <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedGuide(null)} 
                    className="text-[10px] font-black uppercase tracking-widest text-[#FFC299] hover:underline flex items-center gap-1.5 mb-2 cursor-pointer"
                  >
                    ← Back to List
                  </button>
                  <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-[#FF8C42]/5 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center gap-2.5 mb-2">
                      {selectedGuide.icon}
                      <h4 className="text-sm font-black text-white">{selectedGuide.title}</h4>
                    </div>
                    <p className="text-[10px] font-extrabold text-[#FFC299] uppercase tracking-wider mb-1.5">Where is it?</p>
                    <p className="text-xs font-semibold text-slate-200 leading-relaxed mb-4">{selectedGuide.desc}</p>
                    
                    <p className="text-[10px] font-extrabold text-[#FFC299] uppercase tracking-wider mb-1.5">How to use it?</p>
                    <p className="text-xs font-semibold text-slate-300 leading-relaxed mb-5">{selectedGuide.instructions}</p>

                    <button 
                      onClick={() => handleNavigate(selectedGuide.path)}
                      className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #FF8C42, #E67329)' }}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Take Me There Now
                    </button>
                  </div>
                </div>
              )}

              {/* --- APP MAP TAB --- */}
              {!searchQuery && !selectedGuide && activeTab === 'map' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">App Directory (Click to learn more)</p>
                  {GUIDE_ITEMS.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => setSelectedGuide(item)}
                      className="w-full text-left p-3.5 rounded-xl border border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/20 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#211E36] flex items-center justify-center border border-white/10 shrink-0">{item.icon}</div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-[#FF8C42] transition-colors">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.location}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#FF8C42] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {/* --- STEP-BY-STEP TAB --- */}
              {!searchQuery && !selectedGuide && activeTab === 'steps' && (
                <div className="space-y-3.5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Common Questions</p>
                  
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1.5">
                    <p className="text-xs font-black text-white">How do I add a new photo memory?</p>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">
                      Go to the **Remember** tab at the top of the screen, choose **Photo**, then click **Take Photo** or **Browse** to attach a memory. Click **Save Memory** at the bottom!
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1.5">
                    <p className="text-xs font-black text-white">How do I check my meds?</p>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">
                      On your home screen dashboard, scroll down to the **Medications Schedule** box. You can see a list of today's pills and mark them taken.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1.5">
                    <p className="text-xs font-black text-white">How do I find a lost item?</p>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">
                      Open **Avatar Assistant** via the Sidebar, click **Scan Object** at the top, and capture a photo. The app will search its database and tell you where it's usually kept!
                    </p>
                  </div>
                </div>
              )}

              {/* --- EMERGENCY HELP TAB --- */}
              {!searchQuery && !selectedGuide && activeTab === 'care' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/5 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                      <Phone className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Caregiver Emergency Help</h4>
                      <p className="text-xs font-medium text-slate-300 mt-1 leading-relaxed">
                        Need immediate help or want to speak with your primary caretaker?
                      </p>
                    </div>
                    <div className="p-3 bg-[#1A1829] rounded-xl border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Caregiver</p>
                      <p className="text-sm font-black text-[#FF8C42] mt-0.5">Suman Naik</p>
                      <p className="text-xs font-bold text-slate-300 mt-1 flex items-center justify-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        +91 98765 43210
                      </p>
                    </div>
                    <button
                      onClick={() => handleNavigate('/family')}
                      className="w-full py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      View Caregivers Directory
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
