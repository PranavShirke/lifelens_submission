import { mockUsers, demoCredentials } from '@/lib/mock-data';
import type { User } from '@/lib/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function loginUser(username: string, password: string): Promise<{ token: string; user: User }> {
  await delay(800);
  const cred = demoCredentials.find((c) => c.username === username && c.password === password);
  if (!cred) throw new Error('Invalid credentials');
  const user = mockUsers.find((u) => u.username === username);
  if (!user) throw new Error('User not found');
  return { token: `mock-jwt-${user.id}-${Date.now()}`, user };
}

export async function registerUser(data: {
  username: string;
  password: string;
  fullName: string;
  role: string;
  patientId?: string;
}): Promise<{ token: string; user: User }> {
  await delay(1000);
  if (mockUsers.some((u) => u.username === data.username)) {
    throw new Error('Username already taken');
  }
  const newUser: User = {
    id: `user-${Date.now()}`,
    username: data.username,
    fullName: data.fullName,
    role: data.role as User['role'],
    patientId: data.role === 'patient' ? `patient-${Date.now()}` : undefined,
    patients: data.patientId ? [{ id: data.patientId, name: 'Alice Sharma', username: 'alice' }] : [],
  };
  return { token: `mock-jwt-${newUser.id}-${Date.now()}`, user: newUser };
}
