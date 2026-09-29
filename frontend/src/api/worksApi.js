import { apiClient } from './client';

export const worksApi = {
  getWorks: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.state_id) query.append('state_id', params.state_id);
    if (params.district_id) query.append('district_id', params.district_id);
    if (params.subdivision && params.subdivision !== 'All') query.append('subdivision', params.subdivision);
    if (params.constituency_id) query.append('constituency_id', params.constituency_id);
    if (params.mp_name && params.mp_name !== 'All') query.append('mp_name', params.mp_name);
    if (params.house_type && params.house_type !== 'All') query.append('house_type', params.house_type);
    if (params.risk_level && params.risk_level !== 'All') query.append('risk_level', params.risk_level);
    if (params.min_risk_score) query.append('min_risk_score', params.min_risk_score);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await apiClient(`/works${qs}`);
  },

  getWorkDetails: async (workId) => {
    return await apiClient(`/works/${encodeURIComponent(workId)}`);
  },

  createWork: async (payload) => {
    return await apiClient('/works', {
      body: payload
    });
  },

  uploadWorksBatch: async (worksList) => {
    return await apiClient('/works/upload', {
      method: 'POST',
      body: { works: worksList }
    });
  },

  uploadFileStream: async (file, jurisdiction = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (jurisdiction.state_id) formData.append('state_id', jurisdiction.state_id);
    if (jurisdiction.district_id) formData.append('district_id', jurisdiction.district_id);
    if (jurisdiction.constituency_id) formData.append('constituency_id', jurisdiction.constituency_id);

    return await apiClient('/works/upload-file', {
      method: 'POST',
      body: formData
    });
  },

  updateWorkLocation: async (workId, locationPayload) => {
    return await apiClient(`/works/${workId}/location`, {
      method: 'PUT',
      body: locationPayload
    });
  }
};

