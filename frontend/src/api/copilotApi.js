import { apiClient } from './client';

export const copilotApi = {
  askCopilot: (prompt) => apiClient('/ai-copilot/query', {
    method: 'POST',
    body: { prompt }
  }),
};
