import apiClient from './client';

export async function getDashboardStats(patientId: string) {
  const { data } = await apiClient.get(`/dashboard/stats/${patientId}`);
  return {
    totalCount: data.total_count || 0,
    recentCount: data.recent_count || 0,
    streak: data.streak || 0,
    typeCounts: data.type_counts || {},
    moodDistribution: data.mood_distribution || {},
    dailyCounts: data.daily_counts || {},
  };
}

export async function getMoodData(patientId: string, days: number = 30) {
  const { data } = await apiClient.get(`/dashboard/mood/${patientId}`, { params: { days } });
  return {
    moodTrend: data.mood_trend || [],
    distribution: data.distribution || [],
  };
}

export async function getAgentInsights(patientId: string) {
  const { data } = await apiClient.get(`/dashboard/insights/${patientId}`);
  return {
    insights: data.insights || [],
    warnings: data.warnings || [],
    suggestions: data.suggestions || [],
    summary: data.summary || '',
  };
}

export async function getSuggestions(patientId: string) {
  const { data } = await apiClient.get(`/suggestions/${patientId}`);
  return data.suggestions || [];
}

// ==================== REMINDERS ====================

export async function getReminders(patientId: string) {
  const { data } = await apiClient.get(`/reminders/${patientId}`);
  return data.reminders || [];
}

export async function createReminder(patientId: string, task: string, time: string) {
  const { data } = await apiClient.post('/reminders', { patient_id: patientId, task, time });
  return data.reminder || data;
}

export async function completeReminder(reminderId: string) {
  const { data } = await apiClient.post(`/reminders/${reminderId}/complete`);
  return data;
}

export async function deleteReminder(reminderId: string) {
  const { data } = await apiClient.delete(`/reminders/${reminderId}`);
  return data;
}

// ==================== EXPORT ====================

export async function downloadMemoryBook(patientId: string) {
  const response = await apiClient.get(`/export/memory-book/${patientId}`, {
    responseType: 'blob',
    timeout: 60000,
  });
  const blob = new Blob([response.data], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${patientId}_memory_book.html`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

