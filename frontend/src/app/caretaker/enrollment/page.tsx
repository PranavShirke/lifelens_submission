'use client';

import React from 'react';
import AppShell from '@/components/shell/AppShell';
import RoleGuard from '@/components/auth/RoleGuard';
import ActivePatientGate from '@/components/auth/ActivePatientGate';
import EnrollmentWorkbench from '@/components/enrollment/EnrollmentWorkbench';

export default function CaretakerEnrollmentPage() {
  return (
    <RoleGuard allowedRoles={['caretaker']}>
      <AppShell>
        <ActivePatientGate>
          <EnrollmentWorkbench />
        </ActivePatientGate>
      </AppShell>
    </RoleGuard>
  );
}
