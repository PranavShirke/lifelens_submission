import apiClient from './client';

export type EnrollmentType = 'person' | 'object';

export interface EnrollmentRecord {
  id: string;
  patient_id: string;
  name: string;
  enrollment_type: EnrollmentType;
  relation?: string;
  age?: number;
  notes?: string;
  relationship_tags?: string[];
  image_caption?: string;
  image_quality_score?: number;
  voice_transcript?: string;
  voice_mood?: string;
  detected_objects?: string[];
  spatial_labels?: string[];
  image_base64?: string;
  audio_base64?: string;
  timestamp: string;
}

export async function enrollPerson(payload: {
  patientId: string;
  name: string;
  relation?: string;
  notes?: string;
  age?: string;
  imageFile: File;
  audioBlob?: Blob | null;
}) {
  const formData = new FormData();
  formData.append('patient_id', payload.patientId);
  formData.append('name', payload.name);
  formData.append('relation', payload.relation || 'Acquaintance');
  formData.append('notes', payload.notes || '');
  if (payload.age) formData.append('age', payload.age);
  formData.append('file', payload.imageFile);
  if (payload.audioBlob) {
    formData.append('audio_file', payload.audioBlob, `voice-${Date.now()}.webm`);
  }

  const { data } = await apiClient.post('/enrollment/person', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function enrollObject(payload: {
  patientId: string;
  name: string;
  notes?: string;
  imageFile: File;
}) {
  const formData = new FormData();
  formData.append('patient_id', payload.patientId);
  formData.append('name', payload.name);
  formData.append('notes', payload.notes || '');
  formData.append('file', payload.imageFile);

  const { data } = await apiClient.post('/enrollment/object', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function getEnrollmentRecords(patientId: string): Promise<EnrollmentRecord[]> {
  const { data } = await apiClient.get(`/enrollment/${patientId}`);
  return data.records || [];
}
