import { mockTriggers } from '@/lib/mock-data';
import type { Trigger } from '@/lib/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getTriggers(patientId: string): Promise<Trigger[]> {
  await delay(400);
  return mockTriggers.filter((t) => t.patientId === patientId && t.status === 'active');
}

export async function dismissTrigger(triggerId: string): Promise<void> {
  await delay(300);
  // Mock dismiss
}

export async function testAlert(patientId: string): Promise<{ message: string }> {
  await delay(500);
  return { message: 'Test alert sent successfully to configured notification channels.' };
}
