'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(155,142,196,0.3)] hover:scale-105 transition-transform z-50 border border-[#9B8EC4]/20"
          style={{ background: 'linear-gradient(135deg, #9B8EC4, #7A6BB0)' }}
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Floating Assistant Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[360px] bg-[#1E1B2E] text-white rounded-[20px] p-6 shadow-[0_20px_60px_rgba(30,27,46,0.3)] border border-[#9B8EC4]/15 z-50 flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(155,142,196,0.2)' }}>
                  <Leaf className="w-5 h-5 text-[#C9C2E0]" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight">LifeLens Assistant</h3>
                  <p className="text-xs text-[#9896B0]">Always here to help</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[#9896B0] hover:text-white transition-colors bg-[#9B8EC4]/15 p-1.5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="bg-[#9B8EC4]/10 rounded-2xl p-4 text-sm text-[#C9C2E0] space-y-3 min-h-[160px]">
              <div className="bg-[#9B8EC4]/15 p-3 rounded-xl rounded-tl-sm w-fit max-w-[85%]">
                <p>Hello! I'm your LifeLens Assistant. 👋</p>
              </div>
              <div className="bg-[#9B8EC4]/15 p-3 rounded-xl rounded-tl-sm w-fit max-w-[85%]">
                <p>I noticed a missing medication schedule for donepezil today. Need me to log it?</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center">
              <button 
                className="rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity shadow"
                style={{ background: 'rgba(155,142,196,0.2)', color: '#C9C2E0' }}
              >
                Show recommendations
              </button>
            </div>

            {/* Input */}
            <div className="relative mt-2">
              <input
                type="text"
                placeholder="Ask me anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-black/30 border border-[#9B8EC4]/20 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#9B8EC4]/40 focus:border-[#9B8EC4]/30 placeholder-[#9896B0]/60"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #9B8EC4, #7A6BB0)' }}>
                <Send className="w-4 h-4 ml-0.5 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
