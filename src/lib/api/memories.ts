import { mockMemories, mockChatMessages, mockAgentWorkflow } from '@/lib/mock-data';
import type { Memory, ChatMessage } from '@/lib/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getMemories(patientId: string): Promise<Memory[]> {
  await delay(600);
  return mockMemories.filter((m) => m.patientId === patientId);
}

export async function searchMemories(query: string, patientId: string): Promise<{ answer: string; memories: Memory[] }> {
  await delay(1200);
  const keywords = query.toLowerCase().split(' ');
  const results = mockMemories
    .filter((m) => m.patientId === patientId)
    .map((m) => {
      const text = `${m.caption || ''} ${m.transcript || ''} ${m.content || ''} ${m.personTags.join(' ')} ${m.location?.name || ''}`.toLowerCase();
      const matchCount = keywords.filter((k) => text.includes(k)).length;
      return { ...m, score: matchCount > 0 ? 0.7 + (matchCount / keywords.length) * 0.3 : 0 };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    answer: results.length > 0
      ? `Based on your memories, I found ${results.length} relevant entries. ${results[0].caption || results[0].transcript || results[0].content || ''}`
      : 'I couldn\'t find any memories matching your query. Try asking about a specific person, place, or event.',
    memories: results,
  };
}

export async function createMemory(data: Partial<Memory>): Promise<Memory> {
  await delay(1000);
  const newMemory: Memory = {
    id: `mem-${Date.now()}`,
    type: data.type || 'text',
    patientId: data.patientId || 'patient-1',
    timestamp: new Date().toISOString(),
    caption: data.caption,
    content: data.content,
    transcript: data.transcript,
    personTags: data.personTags || [],
    sentiment: 'neutral',
    location: data.location,
    isMilestone: data.isMilestone || false,
  };
  return newMemory;
}

export async function askLifeLens(
  question: string,
  patientId: string,
  agenticMode: boolean
): Promise<ChatMessage> {
  await delay(1500);
  const { answer, memories } = await searchMemories(question, patientId);
  return {
    id: `chat-${Date.now()}`,
    role: 'assistant',
    content: answer,
    timestamp: new Date().toISOString(),
    evidence: memories,
    agentWorkflow: agenticMode ? mockAgentWorkflow : undefined,
    similarityScore: memories.length > 0 ? memories[0].score : undefined,
    keywords: question.toLowerCase().split(' ').filter((w) => w.length > 3),
  };
}

export function getChatHistory(): ChatMessage[] {
  return [...mockChatMessages];
}
