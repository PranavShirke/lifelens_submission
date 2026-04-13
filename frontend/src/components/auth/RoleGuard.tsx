'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/session-store';
import type { Role } from '@/lib/types';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

const roleDefaultPaths: Record<Role, string> = {
  patient: '/home',
  caretaker: '/caretaker/dashboard',
  family: '/family/portal',
};

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const { isAuthenticated, role } = useSessionStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (role && !allowedRoles.includes(role)) {
      router.replace(roleDefaultPaths[role]);
    }
  }, [isAuthenticated, role, allowedRoles, router]);

  if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="skeleton w-16 h-16 rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
