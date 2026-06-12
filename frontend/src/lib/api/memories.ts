import apiClient from './client';
import type { Memory, ChatMessage, AgentWorkflow } from '@/lib/types';

// ---- Helpers ----

function mapBackendMemory(m: Record<string, unknown>): Memory {
  const personTags = m.person_tags
    ? typeof m.person_tags === 'string'
      ? (m.person_tags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
      : (m.person_tags as string[])
    : [];

  const timestamp = typeof m.timestamp === 'number'
    ? new Date((m.timestamp as number) * 1000).toISOString()
    : (m.timestamp as string) || new Date().toISOString();

  return {
    id: (m.id as string) || `mem-${Date.now()}`,
    type: (m.type as Memory['type']) || 'text',
    patientId: (m.patient_id as string) || '',
    timestamp,
    caption: m.caption as string | undefined,
    transcript: m.transcript as string | undefined,
    content: m.content as string | undefined,
    analysis: m.analysis as string | undefined,
    imageUrl: (m.image_base64 || m.source_image_base64) ? `data:image/jpeg;base64,${m.image_base64 || m.source_image_base64}` : undefined,
    audioUrl: m.audio_base64 ? `data:audio/wav;base64,${m.audio_base64}` : undefined,
    hasMedia: m.has_media as boolean | undefined,
    personTags,
    sentiment: m.sentiment as Memory['sentiment'] | undefined,
    location: m.location as Memory['location'] | undefined,
    isMilestone: m.category === 'Achievement',
    score: m.score as number | undefined,
    keywords: m.keywords as string[] | undefined,
    category: m.category as string | undefined,
  };
}

// ---- API Functions ----

export async function getMemories(patientId: string): Promise<Memory[]> {
  const { data } = await apiClient.get(`/memories/${patientId.replace('-', '_')}`);
  return (data.memories || []).map(mapBackendMemory);
}

export async function searchMemories(
  query: string,
  patientId: string
): Promise<{ answer: string; memories: Memory[] }> {
  const { data } = await apiClient.post('/search', {
    query,
    patient_id: patientId.replace('-', '_'),
    top_k: 5,
  });
  return {
    answer: data.answer || 'No answer found.',
    memories: (data.memories || []).map(mapBackendMemory),
  };
}

export async function createMemory(memData: Partial<Memory>): Promise<Memory> {
  await apiClient.post('/memory/create', {
    content: memData.content || memData.caption || memData.transcript || '',
    patient_id: memData.patientId?.replace('-', '_'),
    tags: memData.personTags?.join(', '),
    location: memData.location,
    is_milestone: memData.isMilestone || false,
  });

  // Return a constructed memory since the backend doesn't return the full object
  return {
    id: `mem-${Date.now()}`,
    type: memData.type || 'text',
    patientId: memData.patientId || '',
    timestamp: new Date().toISOString(),
    caption: memData.caption,
    content: memData.content,
    transcript: memData.transcript,
    personTags: memData.personTags || [],
    sentiment: 'neutral',
    location: memData.location,
    isMilestone: memData.isMilestone || false,
  };
}

export async function uploadImage(
  file: File,
  patientId: string,
  options?: { caption?: string; tags?: string; isMilestone?: boolean; location?: {lat: number, lon: number, name: string} }
): Promise<{ status: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patient_id', patientId.replace('-', '_'));
  if (options?.caption) formData.append('caption', options.caption);
  if (options?.tags) formData.append('tags', options.tags);
  if (options?.isMilestone) formData.append('is_milestone', 'true');
  if (options?.location) formData.append('location', JSON.stringify(options.location));

  const { data } = await apiClient.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function uploadAudio(
  file: File,
  patientId: string
): Promise<{ status: string; message: string; transcript?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patient_id', patientId.replace('-', '_'));

  const { data } = await apiClient.post('/upload/audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function askLifeLens(
  question: string,
  patientId: string,
  agenticMode: boolean
): Promise<ChatMessage> {
  const { data } = await apiClient.post('/chat', {
    question,
    patient_id: patientId.replace('-', '_'),
    agentic_mode: agenticMode,
  });

  const evidence = (data.evidence || []).map(mapBackendMemory);

  // Map agent_workflow from backend to frontend shape
  let agentWorkflow: AgentWorkflow | undefined;
  if (data.agent_workflow) {
    const aw = data.agent_workflow;
    agentWorkflow = {
      planner: aw.planner || '',
      critic: aw.critic || '',
      triggers: aw.triggers || '',
      recommendations: aw.recommendations || '',
      trace: (aw.trace || []).map((t: Record<string, string>) => ({
        agent: t.agent || '',
        action: t.action || '',
        input: t.input || '',
        output: t.output || '',
        duration: t.duration || '',
        status: (t.status as 'success' | 'warning' | 'error') || 'success',
      })),
    };
  }

  return {
    id: `chat-${Date.now()}`,
    role: 'assistant',
    content: data.answer || 'I could not generate a response.',
    timestamp: new Date().toISOString(),
    evidence,
    agentWorkflow,
    similarityScore: data.similarity_score,
    keywords: data.keywords,
  };
}

export function getChatHistory(): ChatMessage[] {
  // Chat history is now managed client-side in the component state
  return [];
}

export async function getMemoryMedia(memoryId: string): Promise<{ imageUrl?: string; audioUrl?: string }> {
  const { data } = await apiClient.get(`/memories/media/${memoryId}`);
  return {
    imageUrl: data.image_base64 ? `data:image/jpeg;base64,${data.image_base64}` : undefined,
    audioUrl: data.audio_base64 ? `data:audio/wav;base64,${data.audio_base64}` : undefined,
  };
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await apiClient.delete(`/memories/${memoryId}`);
}

