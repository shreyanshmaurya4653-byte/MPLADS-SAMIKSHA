import { apiClient } from './client';

export const investigationsApi = {
  getCases: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return apiClient(`/investigations${queryString ? `?${queryString}` : ''}`);
  },

  getCaseById: (caseId) => apiClient(`/investigations/${caseId}`),

  createCase: (data) => apiClient('/investigations', { body: data }),

  updateCase: (caseId, data) => apiClient(`/investigations/${caseId}`, {
    method: 'PUT',
    body: data,
  }),
};
