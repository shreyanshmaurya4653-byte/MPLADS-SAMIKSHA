import { apiClient } from './client';

export const evidenceApi = {
  getByWorkId: (workId) => apiClient(`/evidence/work/${workId}`),
  getAll: (limit = 60) => apiClient(`/evidence/all?limit=${limit}`),
  verifyDocument: (docId, status, notes) => apiClient(`/evidence/verify/${docId}`, {
    method: 'POST',
    body: { status, notes }
  })
};
