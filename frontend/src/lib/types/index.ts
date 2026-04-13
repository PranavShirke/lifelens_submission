export type Role = 'patient' | 'caretaker' | 'family';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  patientId?: string;
  patients?: PatientInfo[];
  avatarUrl?: string;
}

export interface PatientInfo {
  id: string;
  name: string;
  username: string;
}

export interface Memory {
  id: string;
  type: 'image' | 'audio' | 'text';
  patientId: string;
  timestamp: string;
  caption?: string;
  transcript?: string;
  content?: string;
  analysis?: string;
  imageUrl?: string;
  audioUrl?: string;
  hasMedia?: boolean;
  personTags: string[];
  sentiment?: 'happy' | 'sad' | 'anxious' | 'neutral' | 'angry' | 'confused';
  location?: MemoryLocation;
  isMilestone: boolean;
  score?: number;
  keywords?: string[];
  category?: string;
}

export interface MemoryLocation {
  lat: number;
  lon: number;
  name: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: string[];
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  prescribedBy?: string;
}

export interface MedicationEvent {
  id: string;
  medicationId: string;
  medicationName: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  doseTime: string;
  doseDate: string;
  note?: string;
  timestamp: string;
}

export interface FamilyRequest {
  id: string;
  patientId: string;
  requesterName: string;
  memoryType: 'image' | 'audio' | 'text';
  description: string;
  peopleInvolved?: string[];
  eventDate?: string;
  location?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface Trigger {
  id: string;
  patientId: string;
  type: 'mood_decline' | 'missed_medication' | 'inactivity' | 'unusual_pattern';
  severity: 'urgent' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  status: 'active' | 'dismissed';
  details?: string;
}

export interface MoodDataPoint {
  date: string;
  score: number;
  sentiment: string;
  notes?: string;
}

export interface AgentSuggestion {
  id: string;
  type: 'warning' | 'insight' | 'suggestion';
  title: string;
  description: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  evidence?: Memory[];
  agentWorkflow?: AgentWorkflow;
  similarityScore?: number;
  keywords?: string[];
}

export interface AgentWorkflow {
  planner: string;
  critic: string;
  triggers: string;
  recommendations: string;
  trace: AgentTraceStep[];
}

export interface AgentTraceStep {
  agent: string;
  action: string;
  input: string;
  output: string;
  duration: string;
  status: 'success' | 'warning' | 'error';
}

export interface VisitorMoodCorrelation {
  visitorName: string;
  visitCount: number;
  avgMood: number;
  moodTrend: 'up' | 'down' | 'stable';
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  type: 'medication' | 'appointment' | 'memory';
}

export interface MoodDistribution {
  emotion: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PersonDirectory {
  name: string;
  memoryCount: number;
  memories: Memory[];
}

export interface MessageBoardEntry {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
}
