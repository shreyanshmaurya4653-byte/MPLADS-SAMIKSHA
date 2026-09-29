import { apiClient } from './client';

export const riskApi = {
  getRiskOverview: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.state_id && filters.state_id !== 'All') params.append('state_id', filters.state_id);
    if (filters.district_id && filters.district_id !== 'All') params.append('district_id', filters.district_id);
    if (filters.subdivision && filters.subdivision !== 'All') params.append('subdivision', filters.subdivision);
    if (filters.constituency_id && filters.constituency_id !== 'All') params.append('constituency_id', filters.constituency_id);
    const qs = params.toString();
    return await apiClient(`/risks/overview${qs ? `?${qs}` : ''}`);
  },

  getWorkRiskDossier: async (workId) => {
    return await apiClient(`/risks/work/${workId}`);
  },

  getAnomalyBreakdown: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.state_id && filters.state_id !== 'All') params.append('state_id', filters.state_id);
    if (filters.district_id && filters.district_id !== 'All') params.append('district_id', filters.district_id);
    if (filters.subdivision && filters.subdivision !== 'All') params.append('subdivision', filters.subdivision);
    if (filters.constituency_id && filters.constituency_id !== 'All') params.append('constituency_id', filters.constituency_id);
    const qs = params.toString();
    return await apiClient(`/risks/anomalies/breakdown${qs ? `?${qs}` : ''}`);
  },

  getSimilarityPairs: async (minThreshold = 40.0) => {
    return await apiClient(`/risks/similarity/all-pairs?min_threshold=${minThreshold}`);
  },

  getWorkSimilarities: async (workId) => {
    return await apiClient(`/risks/similarity/work/${workId}`);
  },

  compareProjects: async (workA, workB) => {
    return await apiClient(`/risks/similarity/compare?work_a=${workA}&work_b=${workB}`);
  },

  getContractorPerformance: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.state_id && filters.state_id !== 'All') params.append('state_id', filters.state_id);
    if (filters.district_id && filters.district_id !== 'All') params.append('district_id', filters.district_id);
    if (filters.subdivision && filters.subdivision !== 'All') params.append('subdivision', filters.subdivision);
    const qs = params.toString();
    return await apiClient(`/risks/contractors/performance${qs ? `?${qs}` : ''}`);
  },

  getComplianceResults: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.state_id && filters.state_id !== 'All') params.append('state_id', filters.state_id);
    if (filters.district_id && filters.district_id !== 'All') params.append('district_id', filters.district_id);
    if (filters.subdivision && filters.subdivision !== 'All') params.append('subdivision', filters.subdivision);
    const qs = params.toString();
    return await apiClient(`/risks/compliance/results${qs ? `?${qs}` : ''}`);
  },

  getModelRuns: async () => {
    return await apiClient('/risks/models/runs');
  },

  getDatabaseTablesSummary: async () => {
    return await apiClient('/risks/database/tables-summary');
  }
};
