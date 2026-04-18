/**
 * API Client Utility
 * Centralized axios-based HTTP client for all backend API calls
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Get API base URL from environment or default
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service Methods
export const apiService = {
  // Connections
  async getConnections() {
    const response = await apiClient.get('/api/v1/connections');
    return response.data;
  },

  async uploadFile(file: File, fileName?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (fileName) formData.append('name', fileName);

    const response = await apiClient.post('/api/v1/connections/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Checks & Suggestions
  async getSuggestions(connectionId: string, datasetId: string) {
    const response = await apiClient.get('/api/v1/check-plans/suggestions', {
      params: { connection_id: connectionId, dataset_identifier: datasetId },
    });
    return response.data;
  },

  async getAllChecks() {
    const response = await apiClient.get('/api/v1/check-plans');
    return response.data;
  },

  async getCheckById(checkId: string) {
    const response = await apiClient.get(`/api/v1/check-plans/${checkId}`);
    return response.data;
  },

  async createCheckPlan(planData: any) {
    const response = await apiClient.post('/api/v1/check-plans', planData);
    return response.data;
  },

  // Runs (Execution)
  async executeCheck(checkPlanId: string) {
    const response = await apiClient.post(`/api/v1/runs/${checkPlanId}/execute`);
    return response.data;
  },

  async getRunStatus(runId: string) {
    const response = await apiClient.get(`/api/v1/runs/${runId}/status`);
    return response.data;
  },

  async getRunResults(runId: string) {
    const response = await apiClient.get(`/api/v1/runs/${runId}/results`);
    return response.data;
  },

  // Visualization
  async getMetrics(runId: string) {
    const response = await apiClient.get(`/api/v1/visualization/runs/${runId}/metrics`);
    return response.data;
  },

  async getTrends(planId: string, days: number = 7) {
    const response = await apiClient.get(`/api/v1/visualization/plans/${planId}/trend`, {
      params: { days },
    });
    return response.data;
  },

  async getAnomalies(runId: string) {
    const response = await apiClient.get(`/api/v1/runs/${runId}/results`);
    return response.data;
  },

  async getDrillDown(runId: string, columnName?: string) {
    const response = await apiClient.get(`/api/v1/results/runs/${runId}/results`, {
      params: columnName ? { column_name: columnName } : {},
    });
    return response.data;
  },

  async getQualityScoreboard(days: number = 7) {
    const response = await apiClient.get('/api/v1/visualization/summary/quality-by-column', {
      params: { days },
    });
    return response.data;
  },
};

export default apiClient;
