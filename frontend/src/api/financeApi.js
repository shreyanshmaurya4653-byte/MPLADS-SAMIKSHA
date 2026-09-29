import { apiClient } from './client';

export const financeApi = {
  getOverview: (params = {}) => {
    const query = new URLSearchParams();
    if (params.state_id && params.state_id !== 'All') query.append('state_id', params.state_id);
    if (params.district_id && params.district_id !== 'All') query.append('district_id', params.district_id);
    if (params.subdivision && params.subdivision !== 'All') query.append('subdivision', params.subdivision);
    if (params.constituency_id && params.constituency_id !== 'All') query.append('constituency_id', params.constituency_id);
    if (params.mp_name && params.mp_name !== 'All') query.append('mp_name', params.mp_name);
    if (params.house_type && params.house_type !== 'All') query.append('house_type', params.house_type);
    const qs = query.toString();
    return apiClient(`/finance/overview${qs ? `?${qs}` : ''}`);
  },
  getPayments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.flaggedOnly) query.append('flaggedOnly', 'true');
    if (params.state_id && params.state_id !== 'All') query.append('state_id', params.state_id);
    if (params.district_id && params.district_id !== 'All') query.append('district_id', params.district_id);
    if (params.mp_name && params.mp_name !== 'All') query.append('mp_name', params.mp_name);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return apiClient(`/finance/payments${qs ? `?${qs}` : ''}`);
  },
};
