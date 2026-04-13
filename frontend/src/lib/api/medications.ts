import apiClient from './client';
import type { Medication, MedicationEvent } from '@/lib/types';

export async function getMedications(patientId: string): Promise<Medication[]> {
  const { data } = await apiClient.get(`/medications/${patientId}`);
  return (data.medications || []).map((m: Record<string, unknown>) => ({
    id: m.medication_id || m.id || `med-${Date.now()}`,
    patientId: m.patient_id as string,
    name: m.name as string,
    dosage: m.dosage as string,
    frequency: m.frequency as string,
    schedule: (m.schedule as string[]) || [],
    startDate: m.start_date as string,
    endDate: m.end_date as string | undefined,
    active: m.active as boolean,
    prescribedBy: m.prescribed_by as string | undefined,
    notes: m.notes as string | undefined,
  }));
}

export async function getMedicationEvents(patientId: string, date?: string): Promise<MedicationEvent[]> {
  const { data } = await apiClient.get(`/medications/${patientId}/events`, { params: { date } });
  return (data.events || []).map((e: Record<string, unknown>) => ({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    medicationId: e.medication_id as string,
    medicationName: e.medication_name as string,
    status: e.status as MedicationEvent['status'],
    doseTime: e.scheduled_time as string,
    doseDate: e.dose_date || new Date().toISOString().split('T')[0],
    note: e.notes as string || '',
    timestamp: e.is_overdue ? '' : new Date().toISOString(),
  }));
}

export async function markDose(
  eventId: string,
  status: 'taken' | 'skipped',
  note?: string,
  medicationId?: string,
  patientId?: string,
  doseTime?: string
): Promise<MedicationEvent> {
  // Ensure we have IDs
  if (!patientId || !medicationId) {
    throw new Error('Missing patientId or medicationId');
  }

  const { data } = await apiClient.post('/medications/dose', {
    patient_id: patientId,
    medication_id: medicationId,
    status,
    dose_time: doseTime || '00:00',
    note: note || '',
    dose_date: new Date().toISOString().split('T')[0],
    reported_by: 'patient',
  });

  return {
    id: eventId,
    medicationId,
    medicationName: '',
    status,
    doseTime: doseTime || '',
    doseDate: new Date().toISOString().split('T')[0],
    note: note || '',
    timestamp: new Date().toISOString(),
  };
}

export async function addMedication(medData: Partial<Medication>): Promise<Medication> {
  const { data } = await apiClient.post('/medications', {
    patient_id: medData.patientId,
    name: medData.name || '',
    dosage: medData.dosage || '',
    frequency: medData.frequency || '',
    schedule: medData.schedule || [],
    start_date: medData.startDate,
    end_date: medData.endDate,
    notes: medData.notes,
    prescribed_by: medData.prescribedBy,
  });

  return {
    id: `med-${Date.now()}`,
    patientId: medData.patientId || '',
    name: medData.name || '',
    dosage: medData.dosage || '',
    frequency: medData.frequency || '',
    schedule: medData.schedule || [],
    startDate: medData.startDate || new Date().toISOString().split('T')[0],
    active: true,
    prescribedBy: medData.prescribedBy,
    notes: medData.notes,
  };
}

export async function getAdherenceData(patientId?: string, days?: number) {
  const pid = patientId || 'patient_1';
  const { data } = await apiClient.get(`/medications/${pid}/adherence`, { params: { days: days || 7 } });
  return data.daily_data || [];
}
