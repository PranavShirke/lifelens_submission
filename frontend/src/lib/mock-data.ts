import type {
  User, Memory, Medication, MedicationEvent, FamilyRequest,
  Trigger, MoodDataPoint, AgentSuggestion, ChatMessage, VisitorMoodCorrelation,
  Reminder, MoodDistribution, PersonDirectory, MessageBoardEntry, AgentWorkflow
} from '@/lib/types';

// ============ USERS ============
export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'alice',
    fullName: 'Alice Sharma',
    role: 'patient',
    patientId: 'patient-1',
    avatarUrl: '',
  },
  {
    id: 'user-2',
    username: 'bob',
    fullName: 'Dr. Bob Verma',
    role: 'caretaker',
    patients: [
      { id: 'patient-1', name: 'Alice Sharma', username: 'alice' },
      { id: 'patient-2', name: 'Ravi Kumar', username: 'ravi' },
    ],
    avatarUrl: '',
  },
  {
    id: 'user-3',
    username: 'carol',
    fullName: 'Carol Sharma',
    role: 'family',
    patients: [
      { id: 'patient-1', name: 'Alice Sharma', username: 'alice' },
    ],
    avatarUrl: '',
  },
];

export const demoCredentials = [
  { username: 'patient1', password: 'patient123', role: 'patient' as const, label: 'Patient (Alice Sharma)' },
  { username: 'caretaker1', password: 'care123', role: 'caretaker' as const, label: 'Caretaker (Mary Smith)' },
  { username: 'family1', password: 'family123', role: 'family' as const, label: 'Family (Sarah Doe)' },
];

// ============ MEMORIES ============
export const mockMemories: Memory[] = [
  {
    id: 'mem-1',
    type: 'image',
    patientId: 'patient-1',
    timestamp: '2026-04-02T09:30:00Z',
    caption: 'Morning walk at Juhu Beach with Priya. The sunrise was beautiful today — golden light reflecting off the waves.',
    personTags: ['Priya', 'Amit'],
    sentiment: 'happy',
    location: { lat: 19.0948, lon: 72.8267, name: 'Juhu Beach, Mumbai' },
    isMilestone: true,
    imageUrl: '/placeholder-beach.jpg',
  },
  {
    id: 'mem-2',
    type: 'text',
    patientId: 'patient-1',
    timestamp: '2026-04-01T14:15:00Z',
    content: 'Had lunch with Ravi today at the new restaurant near Bandra station. He told me about his promotion at work. I felt so proud of him. We shared gulab jamun for dessert — it reminded me of the ones Ma used to make.',
    personTags: ['Ravi'],
    sentiment: 'happy',
    location: { lat: 19.0544, lon: 72.8402, name: 'Bandra West, Mumbai' },
    isMilestone: false,
  },
  {
    id: 'mem-3',
    type: 'audio',
    patientId: 'patient-1',
    timestamp: '2026-03-31T18:00:00Z',
    transcript: 'Today I visited the old family house in Dadar. The mango tree in the backyard has grown so tall now. I remember when Papa planted it when I was just seven years old.',
    personTags: ['Papa'],
    sentiment: 'neutral',
    location: { lat: 19.0176, lon: 72.8474, name: 'Dadar, Mumbai' },
    isMilestone: true,
    audioUrl: '/placeholder-audio.mp3',
  },
  {
    id: 'mem-4',
    type: 'image',
    patientId: 'patient-1',
    timestamp: '2026-03-30T11:00:00Z',
    caption: 'Family photo at Gateway of India. Carol came to visit from Pune with the kids. Such a wonderful day together.',
    personTags: ['Carol', 'Arjun', 'Meera'],
    sentiment: 'happy',
    location: { lat: 18.9220, lon: 72.8347, name: 'Gateway of India, Mumbai' },
    isMilestone: true,
    imageUrl: '/placeholder-gateway.jpg',
  },
  {
    id: 'mem-5',
    type: 'text',
    patientId: 'patient-1',
    timestamp: '2026-03-29T09:00:00Z',
    content: 'Feeling a bit confused today. Couldn\'t remember where I kept my glasses. Dr. Bob said it\'s normal and not to worry too much. Need to take my evening medicine at 8 PM — remind me!',
    personTags: ['Dr. Bob'],
    sentiment: 'anxious',
    location: { lat: 19.0760, lon: 72.8777, name: 'Home, Andheri West' },
    isMilestone: false,
  },
  {
    id: 'mem-6',
    type: 'audio',
    patientId: 'patient-1',
    timestamp: '2026-03-28T16:30:00Z',
    transcript: 'Priya brought flowers today — yellow marigolds. We sat in the garden and she read to me from that book about birds. The mynah was singing along outside.',
    personTags: ['Priya'],
    sentiment: 'happy',
    location: { lat: 19.0760, lon: 72.8777, name: 'Home, Andheri West' },
    isMilestone: false,
  },
  {
    id: 'mem-7',
    type: 'image',
    patientId: 'patient-1',
    timestamp: '2026-03-27T10:00:00Z',
    caption: 'Painting class at the community center. Made a watercolor of Marine Drive. The instructor said it captured the mood perfectly.',
    personTags: [],
    sentiment: 'happy',
    location: { lat: 18.9440, lon: 72.8237, name: 'Marine Drive, Mumbai' },
    isMilestone: false,
    imageUrl: '/placeholder-painting.jpg',
  },
  {
    id: 'mem-8',
    type: 'text',
    patientId: 'patient-1',
    timestamp: '2026-03-26T20:00:00Z',
    content: 'Watched an old Bollywood movie with Amit tonight — Sholay. We used to watch it every summer when the kids were young. He still remembers all the Gabbar Singh dialogues.',
    personTags: ['Amit'],
    sentiment: 'happy',
    location: { lat: 19.0760, lon: 72.8777, name: 'Home, Andheri West' },
    isMilestone: false,
  },
  {
    id: 'mem-9',
    type: 'audio',
    patientId: 'patient-1',
    timestamp: '2026-03-25T14:00:00Z',
    transcript: 'Went to see Dr. Mehra for my regular checkup. She said my health is stable. Blood pressure is normal. Need to continue the memory exercises she recommended.',
    personTags: ['Dr. Mehra'],
    sentiment: 'neutral',
    location: { lat: 19.1136, lon: 72.8697, name: 'Kokilaben Hospital, Mumbai' },
    isMilestone: false,
  },
  {
    id: 'mem-10',
    type: 'image',
    patientId: 'patient-1',
    timestamp: '2026-03-24T08:30:00Z',
    caption: 'Temple visit at Siddhivinayak. Prayed for the family. Priya and Carol were there too. Peaceful morning.',
    personTags: ['Priya', 'Carol'],
    sentiment: 'neutral',
    location: { lat: 19.0169, lon: 72.8310, name: 'Siddhivinayak Temple, Mumbai' },
    isMilestone: true,
    imageUrl: '/placeholder-temple.jpg',
  },
];

// ============ MEDICATIONS ============
export const mockMedications: Medication[] = [
  {
    id: 'med-1',
    patientId: 'patient-1',
    name: 'Donepezil',
    dosage: '10mg',
    frequency: 'Once daily',
    schedule: ['08:00'],
    startDate: '2026-01-15',
    active: true,
    prescribedBy: 'Dr. Mehra',
    notes: 'Take with breakfast. For memory and cognitive function.',
  },
  {
    id: 'med-2',
    patientId: 'patient-1',
    name: 'Memantine',
    dosage: '5mg',
    frequency: 'Twice daily',
    schedule: ['09:00', '20:00'],
    startDate: '2026-02-01',
    active: true,
    prescribedBy: 'Dr. Mehra',
    notes: 'For moderate to severe symptoms. Monitor for dizziness.',
  },
  {
    id: 'med-3',
    patientId: 'patient-1',
    name: 'Vitamin D3',
    dosage: '1000 IU',
    frequency: 'Once daily',
    schedule: ['08:00'],
    startDate: '2026-01-01',
    active: true,
    prescribedBy: 'Dr. Mehra',
    notes: 'Supplement for bone health.',
  },
];

export const mockMedicationEvents: MedicationEvent[] = [
  // Today's events
  { id: 'evt-1', medicationId: 'med-1', medicationName: 'Donepezil', status: 'taken', doseTime: '08:00', doseDate: '2026-04-02', timestamp: '2026-04-02T08:05:00Z', note: '' },
  { id: 'evt-2', medicationId: 'med-2', medicationName: 'Memantine', status: 'taken', doseTime: '09:00', doseDate: '2026-04-02', timestamp: '2026-04-02T09:10:00Z', note: '' },
  { id: 'evt-3', medicationId: 'med-2', medicationName: 'Memantine', status: 'pending', doseTime: '20:00', doseDate: '2026-04-02', timestamp: '', note: '' },
  { id: 'evt-4', medicationId: 'med-3', medicationName: 'Vitamin D3', status: 'taken', doseTime: '08:00', doseDate: '2026-04-02', timestamp: '2026-04-02T08:05:00Z', note: '' },
  // Yesterday
  { id: 'evt-5', medicationId: 'med-1', medicationName: 'Donepezil', status: 'taken', doseTime: '08:00', doseDate: '2026-04-01', timestamp: '2026-04-01T08:10:00Z', note: '' },
  { id: 'evt-6', medicationId: 'med-2', medicationName: 'Memantine', status: 'taken', doseTime: '09:00', doseDate: '2026-04-01', timestamp: '2026-04-01T09:05:00Z', note: '' },
  { id: 'evt-7', medicationId: 'med-2', medicationName: 'Memantine', status: 'missed', doseTime: '20:00', doseDate: '2026-04-01', timestamp: '', note: 'Fell asleep early' },
  { id: 'evt-8', medicationId: 'med-3', medicationName: 'Vitamin D3', status: 'taken', doseTime: '08:00', doseDate: '2026-04-01', timestamp: '2026-04-01T08:10:00Z', note: '' },
  // 2 days ago
  { id: 'evt-9', medicationId: 'med-1', medicationName: 'Donepezil', status: 'taken', doseTime: '08:00', doseDate: '2026-03-31', timestamp: '2026-03-31T08:00:00Z', note: '' },
  { id: 'evt-10', medicationId: 'med-2', medicationName: 'Memantine', status: 'taken', doseTime: '09:00', doseDate: '2026-03-31', timestamp: '2026-03-31T09:00:00Z', note: '' },
  { id: 'evt-11', medicationId: 'med-2', medicationName: 'Memantine', status: 'skipped', doseTime: '20:00', doseDate: '2026-03-31', timestamp: '2026-03-31T20:30:00Z', note: 'Upset stomach' },
  { id: 'evt-12', medicationId: 'med-3', medicationName: 'Vitamin D3', status: 'taken', doseTime: '08:00', doseDate: '2026-03-31', timestamp: '2026-03-31T08:00:00Z', note: '' },
];

// ============ FAMILY REQUESTS ============
export const mockFamilyRequests: FamilyRequest[] = [
  {
    id: 'req-1',
    patientId: 'patient-1',
    requesterName: 'Carol Sharma',
    memoryType: 'image',
    description: 'Could you take a photo of Mom at her favorite spot in the garden? She always talks about the jasmine bush.',
    peopleInvolved: ['Alice', 'Priya'],
    eventDate: '2026-04-05',
    location: 'Home Garden',
    status: 'pending',
    createdAt: '2026-03-30T10:00:00Z',
  },
  {
    id: 'req-2',
    patientId: 'patient-1',
    requesterName: 'Carol Sharma',
    memoryType: 'text',
    description: 'Can you ask Mom to share her recipe for dal makhani? She used to make the best one and I want to preserve it.',
    status: 'completed',
    notes: 'Alice shared the recipe with detailed steps and her secret ingredient — a pinch of kasuri methi.',
    createdAt: '2026-03-20T14:00:00Z',
  },
];

// ============ TRIGGERS ============
export const mockTriggers: Trigger[] = [
  {
    id: 'trig-1',
    patientId: 'patient-1',
    type: 'mood_decline',
    severity: 'urgent',
    message: 'Significant mood decline detected over the past 3 days. Anxiety levels elevated.',
    timestamp: '2026-04-02T06:00:00Z',
    status: 'active',
    details: 'Average mood score dropped from 7.2 to 4.1. Three consecutive anxious entries detected.',
  },
  {
    id: 'trig-2',
    patientId: 'patient-1',
    type: 'missed_medication',
    severity: 'high',
    message: 'Evening Memantine dose missed yesterday. Two missed doses this week.',
    timestamp: '2026-04-01T22:00:00Z',
    status: 'active',
    details: 'Memantine 20:00 dose missed on April 1st. Previous miss on March 31st (skipped due to upset stomach).',
  },
  {
    id: 'trig-3',
    patientId: 'patient-1',
    type: 'inactivity',
    severity: 'medium',
    message: 'No new memories recorded in the last 24 hours. Encourage engagement.',
    timestamp: '2026-04-02T12:00:00Z',
    status: 'active',
    details: 'Last memory recorded was an audio note on April 1st. Average is 2-3 memories per day.',
  },
];

// ============ MOOD DATA ============
export const mockMoodData: MoodDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2026-03-04');
  date.setDate(date.getDate() + i);
  const sentiments = ['happy', 'neutral', 'anxious', 'sad', 'happy', 'happy', 'neutral'];
  const baseScore = 6 + Math.sin(i / 3) * 2;
  const score = Math.max(1, Math.min(10, baseScore + (Math.random() - 0.5) * 2));
  return {
    date: date.toISOString().split('T')[0],
    score: Math.round(score * 10) / 10,
    sentiment: sentiments[i % sentiments.length],
    notes: i % 5 === 0 ? 'Regular check-in' : undefined,
  };
});

export const mockMoodDistribution: MoodDistribution[] = [
  { emotion: 'Happy', count: 12, percentage: 40, color: '#10B981' },
  { emotion: 'Neutral', count: 8, percentage: 27, color: '#6B7280' },
  { emotion: 'Anxious', count: 5, percentage: 17, color: '#F59E0B' },
  { emotion: 'Sad', count: 3, percentage: 10, color: '#3B82F6' },
  { emotion: 'Confused', count: 2, percentage: 6, color: '#8B5CF6' },
];

// ============ AGENT SUGGESTIONS ============
export const mockAgentSuggestions: AgentSuggestion[] = [
  {
    id: 'sug-1',
    type: 'warning',
    title: 'Increased Confusion Episodes',
    description: 'Analysis of recent text memories shows increased mention of confusion and forgetfulness. Consider scheduling a checkup.',
    timestamp: '2026-04-02T08:00:00Z',
  },
  {
    id: 'sug-2',
    type: 'insight',
    title: 'Social Engagement Boost',
    description: 'Mood scores are 35% higher on days with visitor interactions. Priya and Carol visits correlate with the highest mood scores.',
    timestamp: '2026-04-01T16:00:00Z',
  },
  {
    id: 'sug-3',
    type: 'suggestion',
    title: 'Encourage Morning Walks',
    description: 'Beach walk memories consistently show positive sentiment. Recommend maintaining the morning routine for cognitive benefits.',
    timestamp: '2026-04-01T10:00:00Z',
  },
  {
    id: 'sug-4',
    type: 'insight',
    title: 'Memory Pattern: Visual > Audio',
    description: 'Image memories have 40% higher recall association than audio. Consider encouraging photo-based memory capture.',
    timestamp: '2026-03-31T14:00:00Z',
  },
  {
    id: 'sug-5',
    type: 'suggestion',
    title: 'Evening Medication Reminder',
    description: 'Evening doses are missed 3x more than morning ones. Suggest setting a phone alarm or asking a family member to call.',
    timestamp: '2026-03-31T09:00:00Z',
  },
];

// ============ VISITOR-MOOD CORRELATIONS ============
export const mockVisitorCorrelations: VisitorMoodCorrelation[] = [
  { visitorName: 'Priya', visitCount: 12, avgMood: 8.2, moodTrend: 'up' },
  { visitorName: 'Carol', visitCount: 4, avgMood: 7.8, moodTrend: 'stable' },
  { visitorName: 'Amit', visitCount: 8, avgMood: 7.5, moodTrend: 'up' },
  { visitorName: 'Ravi', visitCount: 3, avgMood: 7.0, moodTrend: 'stable' },
  { visitorName: 'Dr. Bob', visitCount: 6, avgMood: 6.5, moodTrend: 'down' },
];

// ============ REMINDERS ============
export const mockReminders: Reminder[] = [
  { id: 'rem-1', text: 'Take Memantine (evening dose)', time: '8:00 PM', type: 'medication' },
  { id: 'rem-2', text: 'Call Carol about weekend visit', time: '5:00 PM', type: 'memory' },
  { id: 'rem-3', text: 'Dr. Mehra appointment on Friday', time: 'Apr 4, 10:00 AM', type: 'appointment' },
];

// ============ CHAT MESSAGES ============
export const mockAgentWorkflow: AgentWorkflow = {
  planner: '1. Identify query intent: Personal memory recall about family events\n2. Search vector store for memories tagged with "beach" and "family"\n3. Apply temporal filter: last 30 days\n4. Cross-reference with mood data for emotional context\n5. Generate empathetic, grounded response with evidence',
  critic: 'Plan is well-structured. Evidence retrieved is relevant (3 memories scored >0.85). Response is grounded in actual memories. No hallucination detected. Emotional tone is appropriate for the patient context. ✅ Approved.',
  triggers: 'No new triggers generated from this query. Existing mood_decline trigger (trig-1) remains active. Recommend continued monitoring.',
  recommendations: '• Schedule more beach visits — consistently positive sentiment\n• Consider inviting Priya for the next walk (highest mood correlation)\n• Create a photo album of beach memories as a therapeutic tool',
  trace: [
    { agent: 'QueryParser', action: 'Parse intent', input: 'What happy memories do I have from the beach?', output: 'Intent: memory_recall, Filters: {location: beach, sentiment: happy}', duration: '120ms', status: 'success' },
    { agent: 'VectorSearch', action: 'Semantic search', input: 'beach happy memories patient-1', output: '3 results found (scores: 0.94, 0.89, 0.85)', duration: '180ms', status: 'success' },
    { agent: 'MoodAnalyzer', action: 'Context enrichment', input: '3 memories + mood data', output: 'All beach memories correlate with mood >7.5', duration: '95ms', status: 'success' },
    { agent: 'ResponseGenerator', action: 'Generate answer', input: 'Evidence + context', output: 'Empathetic response with 3 evidence citations', duration: '450ms', status: 'success' },
    { agent: 'Critic', action: 'Validate response', input: 'Generated response', output: 'Approved — grounded, appropriate, no hallucination', duration: '200ms', status: 'success' },
  ],
};

export const mockChatMessages: ChatMessage[] = [];

// ============ PERSON DIRECTORY ============
export const mockPersonDirectory: PersonDirectory[] = [
  { name: 'Priya', memoryCount: 3, memories: [mockMemories[0], mockMemories[5], mockMemories[9]] },
  { name: 'Carol', memoryCount: 2, memories: [mockMemories[3], mockMemories[9]] },
  { name: 'Amit', memoryCount: 2, memories: [mockMemories[0], mockMemories[7]] },
  { name: 'Ravi', memoryCount: 1, memories: [mockMemories[1]] },
  { name: 'Dr. Bob', memoryCount: 1, memories: [mockMemories[4]] },
  { name: 'Dr. Mehra', memoryCount: 1, memories: [mockMemories[8]] },
];

// ============ MESSAGE BOARD ============
export const mockMessages: MessageBoardEntry[] = [
  {
    id: 'msg-1',
    authorName: 'Carol Sharma',
    content: 'Hi Mom! The kids loved the stories you told them last weekend. Arjun keeps asking about the mango tree story. We love you! 💛',
    timestamp: '2026-04-01T18:00:00Z',
  },
  {
    id: 'msg-2',
    authorName: 'Carol Sharma',
    content: 'Planning to visit this Saturday with some of your favorite mithai from Pune. Can\'t wait to see you!',
    timestamp: '2026-03-28T12:00:00Z',
  },
];

// ============ WEEKLY ACTIVITY DATA ============
export const mockWeeklyActivity = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2026-03-04');
  date.setDate(date.getDate() + i);
  return {
    date: date.toISOString().split('T')[0],
    images: Math.floor(Math.random() * 3),
    audio: Math.floor(Math.random() * 2),
    text: Math.floor(Math.random() * 3),
    total: 0,
  };
}).map((d) => ({ ...d, total: d.images + d.audio + d.text }));

// ============ ADHERENCE DATA ============
export const mockAdherenceData = Array.from({ length: 7 }, (_, i) => {
  const date = new Date('2026-03-27');
  date.setDate(date.getDate() + i);
  const taken = 3 + Math.floor(Math.random() * 2);
  const total = 4;
  return {
    date: date.toISOString().split('T')[0],
    day: ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'][i],
    taken,
    missed: total - taken,
    total,
    adherence: Math.round((taken / total) * 100),
  };
});
