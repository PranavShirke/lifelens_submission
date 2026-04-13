'use client';

import React, { useState } from 'react';
import { Search, Bell, ChevronDown, X, Menu } from 'lucide-react';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';
import { cn } from '@/lib/utils';

export default function TopBar() {
  const { user } = useSessionStore();
  const { toggleSidebar } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Mobile Menu Button */}
        <button onClick={toggleSidebar} className="md:hidden p-2 -ml-2 rounded-xl text-[#5A576E] hover:bg-[#FFF5E6] transition-colors flex-shrink-0">
          <Menu className="w-6 h-6" />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-2xl min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9896B0]" />
            <input
              type="text"
              placeholder="Search memories, medications, alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#FF8C42]/30 rounded-[14px] pl-10 pr-4 py-2.5 outline-none text-sm transition-all text-[#1E1B2E] font-medium placeholder:text-[#9896B0]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[#9896B0] hover:text-[#1E1B2E]" />
              </button>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl hover:bg-[#FFF5E6] transition-colors"
            >
              <Bell className="w-5 h-5 text-[#5A576E]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4A0A0] rounded-full" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 card p-4 shadow-lg">
                <p className="text-sm font-semibold mb-3 text-[#1E1B2E]">Notifications</p>
                <div className="space-y-3">
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-[#FFF5E6]">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#D4A0A0] flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[#1E1B2E]">Mood decline alert detected</p>
                      <p className="text-xs text-[#9896B0]">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-[#FFF5E6]">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#C9A96E] flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[#1E1B2E]">Evening medication pending</p>
                      <p className="text-xs text-[#9896B0]">Due at 8:00 PM</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-[#FFF5E6]">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#7A9E7A] flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[#1E1B2E]">New memory saved successfully</p>
                      <p className="text-xs text-[#9896B0]">This morning</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FFF5E6] transition-colors">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #FF8C42, #7A9E7A)' }}
            >
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-[#1E1B2E]">{user?.fullName || 'User'}</p>
              <p className="text-xs text-[#9896B0] capitalize">{user?.role || 'guest'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#9896B0] hidden sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
