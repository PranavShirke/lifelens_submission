export type AvatarEntityKind = 'person' | 'object' | 'patient';

export interface AvatarPerson {
  id?: string;
  name: string;
  relation?: string;
  relationTags?: string[];
  confidence?: number;
  notes?: string;
  image?: string | null;
  audio?: string | null;
}

export interface AvatarObject {
  id?: string;
  name: string;
  confidence?: number;
  notes?: string;
  location?: string;
  image?: string | null;
}

export interface AvatarStoredResponse {
  status: 'stored' | 'error';
  name?: string;
  avatar_url?: string | null;
  message?: string;
}

export interface AvatarRecognizePersonResponse {
  status: 'identified' | 'unknown' | 'no_face_detected' | 'ambiguous';
  person: AvatarPerson | null;
}

export interface AvatarFindObjectResponse {
  status: 'identified' | 'unknown';
  object: AvatarObject | null;
}

export interface AvatarChatResponse {
  status: 'found' | 'unknown';
  text: string;
  person?: Record<string, unknown>;
  audio_base64?: string | null;
  voice_source?: 'voice_clone' | 'stored_sample' | 'none' | null;
  voice_clone_enabled?: boolean;
  image_base64?: string | null;
  gallery?: string[];
}

export interface AvatarEnrollmentDraft {
  type: AvatarEntityKind;
  name: string;
  relation?: string;
  relationTags?: string[];
  age?: number;
  notes?: string;
  audioFile?: File | null;
}
