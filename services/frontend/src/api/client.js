/**
 * API Client Service
 * Handles all communication with MVP backend API
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class APIClient {
  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      // Handle empty responses
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ════════════════════════════════════════
  // CONNECTIONS
  // ════════════════════════════════════════

  /**
   * Create a new data source connection
   * POST /connections/
   */
  async createConnection(connectionData) {
    return this.request('/connections/', {
      method: 'POST',
      body: JSON.stringify(connectionData),
    });
  }

  /**
   * List all connections
   * GET /connections/
   */
  async listConnections() {
    return this.request('/connections/');
  }

  /**
   * Get a specific connection by ID
   * GET /connections/{id}
   */
  async getConnection(connectionId) {
    return this.request(`/connections/${connectionId}`);
  }

  /**
   * Test connection validity
   * POST /connections/{id}/test
   */
  async testConnection(connectionId) {
    return this.request(`/connections/${connectionId}/test`, {
      method: 'POST',
    });
  }

  /**
   * Delete a connection
   * DELETE /connections/{id}
   */
  async deleteConnection(connectionId) {
    return this.request(`/connections/${connectionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Upload a data source file (CSV or Parquet)
   * POST /connections/upload
   * Supports: CSV, Parquet
   */
  async uploadDataSource(uploadData) {
    const { name, type, file } = uploadData;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('type', type);
    formData.append('file', file);

    const url = `${API_BASE}/connections/upload`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // Note: Don't set Content-Type header for FormData - browser will set it with correct boundary
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'File upload failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  // ════════════════════════════════════════
  // METADATA (future implementation)
  // ════════════════════════════════════════

  /**
   * Get metadata for a connection
   * POST /metadata/profile
   */
  async profileMetadata(connectionId, tables = null) {
    return this.request('/metadata/profile', {
      method: 'POST',
      body: JSON.stringify({
        connection_id: connectionId,
        tables: tables,
      }),
    });
  }

  /**
   * Get metadata snapshot
   * GET /metadata/{snapshot_id}
   */
  async getMetadataSnapshot(snapshotId) {
    return this.request(`/metadata/${snapshotId}`);
  }

  // ════════════════════════════════════════
  // SUGGESTIONS (future implementation)
  // ════════════════════════════════════════

  /**
   * Get check suggestions for a dataset
   * POST /suggestions/
   */
  async getSuggestions(metadataSnapshotId) {
    return this.request('/suggestions/', {
      method: 'POST',
      body: JSON.stringify({
        metadata_snapshot_id: metadataSnapshotId,
      }),
    });
  }

  // ════════════════════════════════════════
  // CHECKS (future implementation)
  // ════════════════════════════════════════

  /**
   * Create a check plan
   * POST /check-plans/
   */
  async createCheckPlan(planData) {
    return this.request('/check-plans/', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  /**
   * List check plans
   * GET /check-plans/
   */
  async listCheckPlans() {
    return this.request('/check-plans/');
  }

  /**
   * Get a specific check plan
   * GET /check-plans/{id}
   */
  async getCheckPlan(planId) {
    return this.request(`/check-plans/${planId}`);
  }

  // ════════════════════════════════════════
  // RUNS (future implementation)
  // ════════════════════════════════════════

  /**
   * Execute a check plan (create a run)
   * POST /runs/
   */
  async executeRun(checkPlanId) {
    return this.request('/runs/', {
      method: 'POST',
      body: JSON.stringify({
        check_plan_id: checkPlanId,
      }),
    });
  }

  /**
   * List all runs
   * GET /runs/
   */
  async listRuns() {
    return this.request('/runs/');
  }

  /**
   * Get a specific run
   * GET /runs/{id}
   */
  async getRun(runId) {
    return this.request(`/runs/${runId}`);
  }

  /**
   * Get run status (for polling)
   * GET /runs/{id}/status
   */
  async getRunStatus(runId) {
    return this.request(`/runs/${runId}/status`);
  }

  // ════════════════════════════════════════
  // RESULTS (future implementation)
  // ════════════════════════════════════════

  /**
   * Get results for a run
   * GET /runs/{id}/results
   */
  async getRunResults(runId) {
    return this.request(`/runs/${runId}/results`);
  }

  /**
   * Get detailed result for a specific check
   * GET /results/{result_id}
   */
  async getCheckResult(resultId) {
    return this.request(`/results/${resultId}`);
  }

  /**
   * Export results
   * POST /results/export
   */
  async exportResults(runId, format = 'json') {
    return this.request('/results/export', {
      method: 'POST',
      body: JSON.stringify({
        run_id: runId,
        format: format, // json, csv, html, pdf
      }),
    });
  }

  // ════════════════════════════════════════
  // HEALTH
  // ════════════════════════════════════════

  /**
   * Check API health
   */
  async health() {
    try {
      const response = await fetch(`${API_BASE.replace('/api/v1', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export default new APIClient();
