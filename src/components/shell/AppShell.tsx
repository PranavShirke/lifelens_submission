'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAssistantWidget from './AIAssistantWidget';
import ToastContainer from '@/components/ui/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/store/ui-store';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  return (
    <div className="flex h-screen w-full relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #F0EDF8 0%, #FDFAF6 40%, #F7F3EC 70%, #EAF2E9 100%)' }}>
      {/* Atmospheric washes */}
      <div className="bg-mesh-1"></div>
      <div className="bg-mesh-2"></div>

      {/* Sidebar (Desktop) — flat edge, no padding */}
      <motion.div 
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="h-full hidden md:block relative z-20 flex-shrink-0"
      >
        <Sidebar />
      </motion.div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-[#1E1B2E]/30 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 h-full w-[240px] z-[70] md:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Pane */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col flex-1 h-full overflow-hidden relative z-10"
      >
        <TopBar />
        
        <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </motion.div>
      
      <AIAssistantWidget />
      <ToastContainer />
    </div>
  );
}
