import apiClient from './client';
import type { User } from '@/lib/types';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_info: {
    username: string;
    full_name: string;
    role: string;
    patient_id: string;
    patients: Array<{ patient_id?: string; full_name?: string; username?: string }>;
  };
}

function mapBackendUser(info: LoginResponse['user_info'], token: string): { token: string; user: User } {
  const role = info.role as User['role'];
  const patients = (info.patients || []).map((p) => ({
    id: p.patient_id || '',
    name: p.full_name || p.username || '',
    username: p.username || '',
  }));

  return {
    token,
    user: {
      id: info.username,
      username: info.username,
      fullName: info.full_name,
      role,
      patientId: info.patient_id || undefined,
      patients: patients.length > 0 ? patients : undefined,
    },
  };
}

export async function loginUser(username: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  return mapBackendUser(data.user_info, data.access_token);
}

export async function registerUser(regData: {
  username: string;
  password: string;
  fullName: string;
  role: string;
  patientId?: string;
}): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/register', regData);
  return mapBackendUser(data.user_info, data.access_token);
}

export async function getPatients(): Promise<Array<{ patient_id: string; full_name: string; username: string }>> {
  const { data } = await apiClient.get('/auth/patients');
  return data.patients || [];
}
