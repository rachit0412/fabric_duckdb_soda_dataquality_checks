import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

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

// File Upload
export const uploadFile = (name: string, fileType: string, file: File) => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('type', fileType);
  formData.append('file', file);
  return api.post('/api/v1/connections/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Metadata
export const profileMetadata = (data: { connection_id: string; tables?: string[] }) =>
  api.post('/api/v1/metadata/profile', data);
export const getMetadataSnapshot = (snapshotId: string) =>
  api.get(`/api/v1/metadata/${snapshotId}`);
export const getMetadataForConnection = (connectionId: string) =>
  api.get(`/api/v1/metadata/connection/${connectionId}`);

// Suggestions
export const generateSuggestions = (data: { connection_id?: string; metadata_snapshot_id?: string }) =>
  api.post('/api/v1/suggestions', data);
export const getSnapshotSuggestions = (snapshotId: string) =>
  api.get(`/api/v1/suggestions/${snapshotId}`);

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
export const getRunResults = (runId: string) =>
  api.get(`/api/v1/runs/${runId}/results`);

// Results
export const getResultsByColumn = (runId: string) =>
  api.get(`/api/v1/results/runs/${runId}/results/by-column/summary`);
export const getResultsFlat = (runId: string) =>
  api.get(`/api/v1/results/runs/${runId}/results`);

// Visualization
export const getRunMetrics = (runId: string) =>
  api.get(`/api/v1/visualization/runs/${runId}/metrics`);
export const getPlanTrend = (planId: string, days?: number) =>
  api.get(`/api/v1/visualization/plans/${planId}/trend`, { params: { days: days || 7 } });
export const getQualityByColumn = (days?: number) =>
  api.get('/api/v1/visualization/summary/quality-by-column', { params: { days: days || 7 } });
