import { apiClient } from './client';

export const jurisdictionApi = {
  getHierarchy: async () => {
    return await apiClient('/jurisdiction/hierarchy');
  },

  getGeoMaster: async () => {
    return await apiClient('/jurisdiction/geo-master');
  },

  getParliamentMembers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.house_type && params.house_type !== 'All') query.append('house_type', params.house_type);
    if (params.state_id && params.state_id !== 'All') query.append('state_id', params.state_id);
    if (params.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiClient(`/jurisdiction/parliament${qs}`);
  }
};

