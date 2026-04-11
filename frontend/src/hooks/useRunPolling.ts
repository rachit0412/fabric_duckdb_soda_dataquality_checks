/**
 * Custom Hook: useRunPolling
 * Polls run status at 2-second intervals until completion
 */

import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../utils/apiClient';

export interface RunStatus {
  run_id: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
  percent_complete: number;
  pass_count: number;
  fail_count: number;
  warn_count: number;
  total_duration_ms?: number;
  error_message?: string;
}

interface UseRunPollingOptions {
  runId: string;
  enabled?: boolean;
  pollInterval?: number; // milliseconds, default 2000
  onComplete?: (status: RunStatus) => void;
  onError?: (error: any) => void;
}

export const useRunPolling = ({
  runId,
  enabled = true,
  pollInterval = 2000,
  onComplete,
  onError,
}: UseRunPollingOptions) => {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [isPolling, setIsPolling] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiService.getRunStatus(runId);
      setStatus(data);
      setError(null);

      // Stop polling if run is complete or failed
      if (data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false);
        if (onComplete) onComplete(data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';
      setError(errorMessage);
      if (onError) onError(err);
    }
  }, [runId, onComplete, onError]);

  useEffect(() => {
    if (!isPolling || !runId) return;

    // Fetch immediately
    fetchStatus();

    // Setup interval
    const intervalId = setInterval(fetchStatus, pollInterval);

    return () => clearInterval(intervalId);
  }, [isPolling, runId, pollInterval, fetchStatus]);

  return {
    status,
    isPolling,
    error,
    retry: () => {
      setIsPolling(true);
      fetchStatus();
    },
  };
};
