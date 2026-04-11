/**
 * Step 4: Review & Execute
 * Review check configuration and trigger execution
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useDispatch, useSelector } from 'react-redux';
import { wizardActions } from '../store/store';
import { RootState } from '../store/store';
import { apiService } from '../utils/apiClient';

const ReviewExecuteStep: React.FC = () => {
  const dispatch = useDispatch();
  const wizard = useSelector((state: RootState) => state.wizard);
  const { selectedConnection, selectedChecks, checkParameters } = wizard;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'executing' | 'success'>('idle');

  const handleExecute = async () => {
    if (!selectedConnection) {
      setError('No data source selected');
      return;
    }

    if (selectedChecks.length === 0) {
      setError('No checks selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setExecutionStatus('executing');

      // Create check plan
      const planData = {
        name: `Check Plan - ${new Date().toLocaleString()}`,
        connection_id: selectedConnection,
        dataset_identifier: 'dataset',
        description: `Automated check plan with ${selectedChecks.length} checks`,
        checks: selectedChecks,
        parameters: checkParameters,
      };

      const planResult = await apiService.createCheckPlan(planData);

      // Execute the check plan
      const result = await apiService.executeCheck(planResult.id);

      dispatch(wizardActions.setExecutionResult(result.run_id));
      setExecutionStatus('success');
      
      // Advance to results step automatically
      setTimeout(() => {
        dispatch(wizardActions.nextStep());
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Execution failed');
      setExecutionStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 4: Review & Execute
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Box sx={{ mb: 3 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="primary" />
              <Box>
                <Typography variant="subtitle2">Data Source</Typography>
                <Typography variant="body2" color="textSecondary">
                  Connection: {selectedConnection || 'Not selected'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="primary" />
              <Box>
                <Typography variant="subtitle2">Checks Selected</Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedChecks.length} checks configured
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {Object.keys(checkParameters).length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                <Box>
                  <Typography variant="subtitle2">Parameters</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {Object.keys(checkParameters).length} parameters configured
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Execution Status */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        {executionStatus === 'executing' && (
          <Box>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">
              Executing checks... This may take a few moments.
            </Typography>
          </Box>
        )}

        {executionStatus === 'success' && (
          <Box>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'green', mb: 1 }} />
            <Typography variant="body1">
              Execution started successfully! Proceeding to results...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Execute Button */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleExecute}
          disabled={loading || executionStatus === 'success'}
          startIcon={<PlayArrowIcon />}
        >
          {loading ? 'Executing...' : 'Execute Checks'}
        </Button>
        {executionStatus !== 'idle' && (
          <Typography variant="body2" color="textSecondary" sx={{ my: 'auto' }}>
            This will create a check execution run
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ReviewExecuteStep;
