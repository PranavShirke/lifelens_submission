import apiClient from './client';
import type { Trigger } from '@/lib/types';

export async function getTriggers(patientId: string): Promise<Trigger[]> {
  const { data } = await apiClient.get(`/triggers/${patientId}`);
  return (data.triggers || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    patientId: t.patientId as string,
    type: t.type as Trigger['type'],
    severity: t.severity as Trigger['severity'],
    message: t.message as string,
    timestamp: t.timestamp as string,
    status: t.status as Trigger['status'],
    details: t.details as string | undefined,
  }));
}

export async function dismissTrigger(triggerId: string, patientId?: string): Promise<void> {
  await apiClient.post(`/triggers/${triggerId}/dismiss`, null, {
    params: { patient_id: patientId || '' },
  });
}

export async function testAlert(patientId: string): Promise<{ message: string }> {
  const { data } = await apiClient.post('/triggers/test-alert', null, {
    params: { patient_id: patientId },
  });
  return { message: data.message || 'Alert sent.' };
}
