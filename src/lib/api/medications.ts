import { mockMedications, mockMedicationEvents, mockAdherenceData } from '@/lib/mock-data';
import type { Medication, MedicationEvent } from '@/lib/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getMedications(patientId: string): Promise<Medication[]> {
  await delay(500);
  return mockMedications.filter((m) => m.patientId === patientId);
}

export async function getMedicationEvents(patientId: string, date?: string): Promise<MedicationEvent[]> {
  await delay(400);
  let events = mockMedicationEvents;
  if (date) events = events.filter((e) => e.doseDate === date);
  return events;
}

export async function markDose(eventId: string, status: 'taken' | 'skipped', note?: string): Promise<MedicationEvent> {
  await delay(600);
  const event = mockMedicationEvents.find((e) => e.id === eventId);
  if (!event) throw new Error('Event not found');
  return { ...event, status, note: note || event.note, timestamp: new Date().toISOString() };
}

export async function addMedication(data: Partial<Medication>): Promise<Medication> {
  await delay(800);
  return {
    id: `med-${Date.now()}`,
    patientId: data.patientId || 'patient-1',
    name: data.name || '',
    dosage: data.dosage || '',
    frequency: data.frequency || '',
    schedule: data.schedule || [],
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    active: true,
    prescribedBy: data.prescribedBy,
    notes: data.notes,
  };
}

export async function getAdherenceData() {
  await delay(400);
  return mockAdherenceData;
}
