import { apiClient } from './client';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  if (params.state_id && params.state_id !== 'All') q.append('state_id', params.state_id);
  if (params.district_id && params.district_id !== 'All') q.append('district_id', params.district_id);
  if (params.mp_name && params.mp_name !== 'All') q.append('mp_name', params.mp_name);
  if (params.house_type && params.house_type !== 'All') q.append('house_type', params.house_type);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export const predictionsApi = {
  getOverview: (params) => apiClient(`/predictions/overview${buildQuery(params)}`),
  getDelays: (params) => apiClient(`/predictions/delays${buildQuery(params)}`),
  getOverruns: (params) => apiClient(`/predictions/overruns${buildQuery(params)}`),
  getTrajectory: (params) => apiClient(`/predictions/trajectory${buildQuery(params)}`),
};
