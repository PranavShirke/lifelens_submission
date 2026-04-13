'use client';

import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface UIState {
  agenticMode: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toasts: Toast[];
  globalLoading: boolean;

  toggleAgenticMode: () => void;
  setAgenticMode: (val: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (val: boolean) => void;
  setSidebarCollapsed: (val: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setGlobalLoading: (val: boolean) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>()((set) => ({
  agenticMode: false,
  sidebarOpen: true,
  sidebarCollapsed: false,
  toasts: [],
  globalLoading: false,

  toggleAgenticMode: () => set((s) => ({ agenticMode: !s.agenticMode })),
  setAgenticMode: (val) => set({ agenticMode: val }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setGlobalLoading: (val) => set({ globalLoading: val }),
}));
