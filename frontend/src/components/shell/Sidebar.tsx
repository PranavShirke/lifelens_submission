'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/lib/store/session-store';
import { cn } from '@/lib/utils';
import {
  Home, Calendar, User, BarChart3, GraduationCap,
  MessageSquare, Pill, MapPin, Settings, Image,
  LogOut, LayoutDashboard, FileText, HeartPulse, ChevronRight, Bot, UserPlus
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

const generalItems: NavItem[] = [
  { label: 'Dashboard', href: '/home', icon: LayoutDashboard, roles: ['patient'] },
  { label: 'Dashboard', href: '/caretaker/dashboard', icon: LayoutDashboard, roles: ['caretaker'] },
  { label: 'Portal', href: '/family/portal', icon: Home, roles: ['family'] },
  { label: 'Patients', href: '/caretaker/dashboard', icon: User, roles: ['caretaker'] },
];

const toolItems: NavItem[] = [
  { label: 'Ask LifeLens', href: '/home?tab=ask', icon: MessageSquare, roles: ['patient'] },
  { label: 'Avatar Assistant', href: '/avatar-assistant', icon: Bot, roles: ['patient', 'caretaker'] },
  { label: 'Enroll Person', href: '/remember/person', icon: UserPlus, roles: ['caretaker'] },
  { label: 'Memory Lane', href: '/memory-lane', icon: Image },
  { label: 'Medications', href: '/medications', icon: Pill, roles: ['patient'] },
  { label: 'Medications', href: '/caretaker/medications', icon: Pill, roles: ['caretaker'] },
  { label: 'Memory Map', href: '/map', icon: MapPin },
  { label: 'Health Data', href: '/wearable', icon: HeartPulse, roles: ['patient', 'caretaker'] },
  { label: 'Settings', href: '#', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useSessionStore();
  const role = user?.role || 'patient';
  const firstName = user?.fullName?.split(' ')[0] || 'User';

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => !item.roles || item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === '#') return false;
    if (href.includes('?')) return pathname === href.split('?')[0];
    return pathname === href;
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link href={item.href} className="block relative group">
        {active && (
          <motion.div 
            layoutId="sidebarActive"
            className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-[#FF8C42]"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <div className={cn(
          'flex items-center gap-3 px-4 py-[9px] text-[13px] font-medium transition-all',
          active
            ? 'text-white bg-[#FF8C42]/15'
            : 'text-[#9896B0] hover:text-white hover:bg-[#FF8C42]/5'
        )}>
          <item.icon className={cn('w-4 h-4 stroke-[1.7] flex-shrink-0', active && 'text-[#FF8C42]')} />
          <span className="flex-1">{item.label}</span>
          {active && <ChevronRight className="w-3.5 h-3.5 text-[#FF8C42] opacity-60" />}
        </div>
      </Link>
    );
  };

  return (
    <aside className="w-[240px] h-full flex flex-col border-r border-[#FF8C42]/10 relative z-50" style={{ background: '#1E1B2E' }}>
      
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-[#FF8C42]/10">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF8C42 0%, #7A9E7A 100%)' }}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.5" />
              <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="7" r="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-[17px] font-extrabold tracking-tight text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>LifeLens</span>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-[#FF8C42]/10">
        <div className="flex items-center gap-2.5 px-1">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF8C42, #7A9E7A)' }}
          >
            {firstName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white/90 truncate leading-tight">{user?.fullName || 'User'}</p>
            <p className="text-[11px] text-[#9896B0] capitalize leading-tight">{user?.role || 'guest'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-3 custom-scrollbar">
        {/* General */}
        <div className="mb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9896B0] px-5 mb-1">General</p>
          {filterByRole(generalItems).map((item) => (
            <NavLink key={item.label + item.href} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="mx-5 my-2 border-t border-[#FF8C42]/10" />

        {/* Tools */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9896B0] px-5 mb-1">Tools</p>
          {filterByRole(toolItems).map((item) => (
            <NavLink key={item.label + item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-4 py-3 border-t border-[#FF8C42]/10">
        <button
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
          className="group flex items-center gap-3 px-4 py-2 text-[13px] font-medium text-[#9896B0] hover:text-[#D4A0A0] hover:bg-[#D4A0A0]/10 transition-all w-full rounded-lg"
        >
          <LogOut className="w-4 h-4 stroke-[1.7] group-hover:-translate-x-0.5 transition-transform" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
