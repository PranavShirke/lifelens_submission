import apiClient from './client';
import type {
  AvatarChatResponse,
  AvatarFindObjectResponse,
  AvatarRecognizePersonResponse,
  AvatarStoredResponse,
} from '@/lib/types/avatar';

interface RememberPersonInput {
  name: string;
  relation?: string;
  relationTags?: string[];
  notes?: string;
  age?: number;
  file: File;
  audioFile?: File | null;
}

interface RememberObjectInput {
  name: string;
  notes?: string;
  file: File;
}

function appendOptional(formData: FormData, key: string, value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  formData.append(key, String(value));
}

export async function recognizePerson(file: File): Promise<AvatarRecognizePersonResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/v1/recognize/person', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });

  return data;
}

export async function findObject(file: File): Promise<AvatarFindObjectResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/v1/find/object', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });

  return data;
}

export async function rememberPerson(input: RememberPersonInput): Promise<AvatarStoredResponse> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('name', input.name);
  appendOptional(formData, 'relation', input.relation || 'Acquaintance');
  if (input.relationTags && input.relationTags.length > 0) {
    formData.append('relation_tags', input.relationTags.join(','));
  }
  appendOptional(formData, 'notes', input.notes);
  appendOptional(formData, 'age', input.age);
  if (input.audioFile) {
    formData.append('audio_file', input.audioFile);
  }

  const { data } = await apiClient.post('/v1/remember/person', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  return data;
}

export async function rememberPatient(input: RememberPersonInput): Promise<AvatarStoredResponse> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('name', input.name);
  appendOptional(formData, 'relation', input.relation || 'Acquaintance');
  if (input.relationTags && input.relationTags.length > 0) {
    formData.append('relation_tags', input.relationTags.join(','));
  }
  appendOptional(formData, 'notes', input.notes);
  appendOptional(formData, 'age', input.age);
  if (input.audioFile) {
    formData.append('audio_file', input.audioFile);
  }

  const { data } = await apiClient.post('/v1/remember/patient', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  return data;
}

export async function rememberObject(input: RememberObjectInput): Promise<AvatarStoredResponse> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('name', input.name);
  appendOptional(formData, 'notes', input.notes);

  const { data } = await apiClient.post('/v1/remember/object', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  return data;
}

export async function queryAvatar(text: string): Promise<AvatarChatResponse> {
  const { data } = await apiClient.post('/v1/chat/query', { text });
  return data;
}
