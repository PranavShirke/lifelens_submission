import apiClient from './client';

export async function getFamilySummary(patientId: string, period: string = 'week') {
  const { data } = await apiClient.get(`/family/summary/${patientId}`, { params: { period } });
  return {
    summary: data.summary || '',
    emotionalTimeline: data.emotional_timeline || [],
    highlights: data.highlights || [],
    milestones: data.milestones || [],
    visitorRecap: data.visitor_recap || '',
    mediaGallery: data.media_gallery || [],
  };
}

export async function getFamilyRequests(patientId: string) {
  const { data } = await apiClient.get(`/family/requests/${patientId}`);
  return data.requests || [];
}

export async function submitFamilyRequest(payload: {
  patient_id: string;
  requester_name: string;
  memory_type: string;
  description: string;
  details?: Record<string, unknown>;
}) {
  const { data } = await apiClient.post('/family/requests', payload);
  return data;
}

export async function updateFamilyRequest(requestId: string, status: string, notes?: string) {
  const { data } = await apiClient.put(`/family/requests/${requestId}`, { status, notes });
  return data;
}

export async function getMilestones(patientId: string) {
  const { data } = await apiClient.get(`/family/milestones/${patientId}`);
  return data.milestones || [];
}

export async function getMessages(patientId: string) {
  const { data } = await apiClient.get(`/family/messages/${patientId}`);
  return data.messages || [];
}

export async function postMessage(patientId: string, authorName: string, content: string) {
  const { data } = await apiClient.post('/family/messages', {
    patient_id: patientId,
    author_name: authorName,
    content,
  });
  return data.message || data;
}

export async function getMapMemories(patientId: string) {
  const { data } = await apiClient.get(`/map/memories/${patientId}`);
  return data.memories || [];
}

export async function fulfillFamilyRequest(
  requestId: string,
  patientId: string,
  content: string,
  notes?: string
) {
  const { data } = await apiClient.post('/family/requests/fulfill', {
    request_id: requestId,
    patient_id: patientId,
    content,
    notes,
  });
  return data;
}

