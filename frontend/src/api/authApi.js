import { apiClient } from './client';

export const authApi = {
  login: async (identifier, password, extra = {}) => {
    return await apiClient('/auth/login', {
      body: { 
        unique_id: identifier, 
        email: identifier, 
        password, 
        ...extra 
      }
    });
  },

  signup: async (payload) => {
    return await apiClient('/auth/signup', {
      body: payload
    });
  },

  getCurrentUser: async () => {
    return await apiClient('/auth/me');
  }
};
