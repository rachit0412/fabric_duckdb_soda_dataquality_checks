import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const healthCheck = () => api.get('/health');

// Connections
export const getConnections = () => api.get('/api/v1/connections');
export const createConnection = (data: any) => api.post('/api/v1/connections', data);
export const testConnection = (id: string) => api.post(`/api/v1/connections/${id}/test`);
export const deleteConnection = (id: string) => api.delete(`/api/v1/connections/${id}`);

// Metadata
export const getMetadata = (connectionId: string) => 
  api.get(`/api/v1/metadata/${connectionId}/profile`);
export const refreshMetadata = (connectionId: string) => 
  api.post(`/api/v1/metadata/${connectionId}/refresh`);

// Suggestions
export const getSuggestions = (connectionId: string, params?: any) => 
  api.get(`/api/v1/suggestions/${connectionId}`, { params });

// Check Plans
export const getCheckPlans = () => api.get('/api/v1/check-plans');
export const createCheckPlan = (data: any) => api.post('/api/v1/check-plans', data);
export const getCheckPlan = (id: string) => api.get(`/api/v1/check-plans/${id}`);
export const deleteCheckPlan = (id: string) => api.delete(`/api/v1/check-plans/${id}`);

// Runs
export const getRuns = () => api.get('/api/v1/runs');
export const executeCheckPlan = (checkPlanId: string) => 
  api.post(`/api/v1/runs/${checkPlanId}/execute`);
export const getRunStatus = (runId: string) => api.get(`/api/v1/runs/${runId}/status`);
export const getRun = (runId: string) => api.get(`/api/v1/runs/${runId}`);

// Results
export const getResults = (runId: string) => api.get(`/api/v1/results/${runId}`);
export const getResultsSummary = (runId: string) => api.get(`/api/v1/results/${runId}/summary`);

// Visualization
export const getVisualization = (params: any) => api.get('/api/v1/visualization', { params });
