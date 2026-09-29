import { apiClient } from './client';

export const auditLogsApi = {
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.entity_type) query.append('entity_type', params.entity_type);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return apiClient(`/audit-logs${queryString ? `?${queryString}` : ''}`);
  },
};
