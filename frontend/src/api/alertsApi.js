import { apiClient } from './client';

export const alertsApi = {
  getAlerts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params.alert_type && params.alert_type !== 'All') query.append('alert_type', params.alert_type);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiClient(`/alerts${qs}`);
  },

  updateStatus: async (alertId, status) => {
    return await apiClient(`/alerts/${alertId}/status`, {
      method: 'PATCH',
      body: { status }
    });
  },

  submitVerification: async (alertId, { officer_remarks, action_taken, status }) => {
    return await apiClient(`/alerts/${alertId}/verify`, {
      method: 'POST',
      body: { officer_remarks, action_taken, status }
    });
  }
};
