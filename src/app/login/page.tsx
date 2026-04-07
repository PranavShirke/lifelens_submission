'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Stethoscope, Heart, Loader2, Info } from 'lucide-react';
import { loginUser, registerUser } from '@/lib/api/auth';
import { useSessionStore } from '@/lib/store/session-store';
import { useUIStore } from '@/lib/store/ui-store';
import { cn } from '@/lib/utils';
import { demoCredentials } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';

const roleCards = [
  { role: 'patient' as const, icon: User, label: 'Patient', color: '#9B8EC4', bg: '#F0EDF8' },
  { role: 'caretaker' as const, icon: Stethoscope, label: 'Caretaker', color: '#7A9E7A', bg: '#EAF2E9' },
  { role: 'family' as const, icon: Heart, label: 'Family', color: '#D4A0A0', bg: '#f9eded' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSessionStore();
  const { addToast } = useUIStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ username: '', password: '' });

  const [regData, setRegData] = useState({
    fullName: '', username: '', password: '', confirmPassword: '',
    role: 'patient' as 'patient' | 'caretaker' | 'family',
    patientId: '',
  });

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      addToast({ type: 'error', message: 'Please fill in all fields' });
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await loginUser(loginData.username, loginData.password);
      login(token, user);
      addToast({ type: 'success', message: `Welcome back, ${user.fullName}!` });
      const paths = { patient: '/home', caretaker: '/caretaker/dashboard', family: '/family/portal' };
      router.push(paths[user.role]);
    } catch (e: any) {
      addToast({ type: 'error', message: e.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regData.fullName || !regData.username || !regData.password) {
      addToast({ type: 'error', message: 'Please fill in required fields' });
      return;
    }
    if (regData.password !== regData.confirmPassword) {
      addToast({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await registerUser(regData);
      login(token, user);
      addToast({ type: 'success', message: 'Account created!' });
      const paths = { patient: '/home', caretaker: '/caretaker/dashboard', family: '/family/portal' };
      router.push(paths[user.role]);
    } catch (e: any) {
      addToast({ type: 'error', message: e.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
      `}</style>
      
      <div 
        className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden"
        style={{ background: '#FDFAF6', fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Soft atmospheric gradients matching landing page */}
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#F0EDF8] rounded-full blur-[120px] opacity-60 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#EAF2E9] rounded-full blur-[100px] opacity-60 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Main Card */}
          <div 
            style={{ 
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(155, 142, 196, 0.15)',
              boxShadow: '0 8px 40px rgba(30,27,46,0.07)',
            }}
            className="rounded-[20px] p-6 md:p-8"
          >
            {/* Header */}
            <div className="flex flex-col items-center justify-center text-center mb-5">
              <div 
                className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3"
                style={{ background: 'linear-gradient(135deg, #9B8EC4 0%, #7A9E7A 100%)' }}
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.5" />
                  <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="1.5" fill="white" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1E1B2E] mb-1">
                LifeLens
              </h1>
              <p className="text-[13px] text-[#5A576E]">Access your intelligent care vault</p>
            </div>

            {/* Subtle Tab Switcher */}
            <div className="flex bg-[#F6F5FA] p-1 rounded-[16px] shadow-[inset_0px_2px_4px_rgba(30,27,46,0.03)] border border-[#C9C2E0]/20 mb-5">
              <button 
                onClick={() => setTab('login')} 
                className={cn('flex-1 py-1.5 rounded-[12px] text-[13px] font-medium transition-all duration-300', tab === 'login' ? 'bg-white shadow-[0_2px_8px_rgba(155,142,196,0.15)] text-[#1E1B2E]' : 'text-[#9896B0] hover:text-[#5A576E]')}
              >
                Login
              </button>
              <button 
                onClick={() => setTab('register')} 
                className={cn('flex-1 py-1.5 rounded-[12px] text-[13px] font-medium transition-all duration-300', tab === 'register' ? 'bg-white shadow-[0_2px_8px_rgba(155,142,196,0.15)] text-[#1E1B2E]' : 'text-[#9896B0] hover:text-[#5A576E]')}
              >
                Register
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'login' ? (
                <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[10px] font-semibold text-[#9896B0] uppercase tracking-wider mb-1.5 block">Username</label>
                      <input 
                        className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#9B8EC4]/30 rounded-[14px] px-4 py-2.5 outline-none text-[14px] transition-all text-[#1E1B2E]"
                        placeholder="Enter username" 
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#9896B0] uppercase tracking-wider mb-1.5 block">Password</label>
                      <div className="relative">
                        <input 
                          className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#9B8EC4]/30 rounded-[14px] pl-4 pr-10 py-2.5 outline-none text-[14px] transition-all text-[#1E1B2E]"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter password" 
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()} 
                        />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9896B0] hover:text-[#5A576E] p-1">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleLogin} 
                      disabled={loading}
                      style={{ background: 'linear-gradient(135deg, #9B8EC4, #7A6BB0)' }}
                      className="w-full text-white rounded-full flex items-center justify-center gap-2 py-3 mt-5 hover:-translate-y-[1px] shadow-[0_6px_20px_rgba(155,142,196,0.3)] transition-all font-medium text-[14px]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Into LifeLens'}
                    </button>
                  </div>

                  {/* Demo credentials */}
                  <div className="mt-5 p-4 rounded-[18px] bg-[#F0EDF8]/60 border border-[#C9C2E0]/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-[14px] h-[14px] text-[#9B8EC4]" />
                      <span className="text-[10px] font-semibold text-[#9B8EC4] uppercase tracking-widest">Demo Access</span>
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      {demoCredentials.map((c) => (
                        <button 
                          key={c.username} 
                          onClick={() => setLoginData({ username: c.username, password: c.password })}
                          className="w-full flex items-center justify-between text-[12px] py-1.5 px-3 rounded-[10px] hover:bg-white border border-transparent hover:border-[#C9C2E0]/40 transition-all text-[#5A576E]"
                        >
                          <span className="font-medium">{c.label}</span>
                          <span className="text-[#9896B0] text-[11px]">{c.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="space-y-3.5">
                    <div>
                      <input 
                        className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#7A9E7A]/30 rounded-[14px] px-4 py-2.5 outline-none text-[14px] transition-all text-[#1E1B2E]"
                        placeholder="Full Name" 
                        value={regData.fullName}
                        onChange={(e) => setRegData({ ...regData, fullName: e.target.value })} 
                      />
                    </div>
                    <div>
                      <input 
                        className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#7A9E7A]/30 rounded-[14px] px-4 py-2.5 outline-none text-[14px] transition-all text-[#1E1B2E]"
                        placeholder="Username" 
                        value={regData.username}
                        onChange={(e) => setRegData({ ...regData, username: e.target.value })} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input 
                          className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#7A9E7A]/30 rounded-[14px] px-4 py-2.5 outline-none text-[14px] transition-all text-[#1E1B2E]"
                          type="password" placeholder="Password" value={regData.password}
                          onChange={(e) => setRegData({ ...regData, password: e.target.value })} 
                        />
                      </div>
                      <div>
                        <input 
                          className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#7A9E7A]/30 rounded-[14px] px-4 py-2.5 outline-none text-[14px] transition-all text-[#1E1B2E]"
                          type="password" placeholder="Confirm" value={regData.confirmPassword}
                          onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })} 
                        />
                      </div>
                    </div>

                    {/* Role selector */}
                    <div className="pt-1">
                      <label className="text-[10px] font-semibold text-[#9896B0] uppercase tracking-wider mb-1.5 block">I am a...</label>
                      <div className="grid grid-cols-3 gap-2">
                        {roleCards.map((r) => {
                          const isActive = regData.role === r.role;
                          return (
                            <button 
                              key={r.role} 
                              onClick={() => setRegData({ ...regData, role: r.role })}
                              style={{ 
                                background: isActive ? r.bg : '#f6f5fa',
                                borderColor: isActive ? r.color : 'transparent',
                                color: isActive ? r.color : '#9896B0',
                                boxShadow: isActive ? 'none' : 'inset 0px 2px 4px rgba(30,27,46,0.03)'
                              }}
                              className={cn("p-2 rounded-[12px] border flex flex-col items-center justify-center transition-all", isActive ? "" : "hover:-translate-y-[1px]")}
                            >
                              <r.icon className="w-4 h-4 mb-1" />
                              <span className="text-[10px] font-semibold">{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(regData.role === 'caretaker' || regData.role === 'family') && (
                      <div className="pt-1">
                        <select 
                          className="w-full bg-[#f6f5fa] border-none shadow-[inset_0px_3px_6px_rgba(30,27,46,0.05),inset_0px_-1px_2px_rgba(255,255,255,1)] focus:ring-2 focus:ring-[#7A9E7A]/30 rounded-[14px] px-4 py-2.5 outline-none text-[13px] transition-all text-[#1E1B2E]"
                          value={regData.patientId}
                          onChange={(e) => setRegData({ ...regData, patientId: e.target.value })}
                        >
                          <option value="">Select a patient to connect with...</option>
                          <option value="patient-1">Alice Sharma (Mock)</option>
                          <option value="patient-2">Ravi Kumar (Mock)</option>
                        </select>
                      </div>
                    )}

                    <button 
                      onClick={handleRegister} 
                      disabled={loading}
                      style={{ background: 'linear-gradient(135deg, #7A9E7A, #5A835A)' }}
                      className="w-full text-white rounded-full flex items-center justify-center gap-2 py-3 mt-5 hover:-translate-y-[1px] shadow-[0_6px_20px_rgba(122,158,122,0.3)] transition-all font-medium text-[14px]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Minimalist footer links */}
          <div className="flex items-center justify-center gap-5 mt-5">
            <button onClick={() => router.push('/')} className="text-[11px] text-[#9896B0] hover:text-[#9B8EC4] transition-colors">
              Return to Website
            </button>
            <span className="text-[#9896B0]/30">•</span>
            <button className="text-[11px] text-[#9896B0] hover:text-[#9B8EC4] transition-colors">
              Privacy & Security
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
