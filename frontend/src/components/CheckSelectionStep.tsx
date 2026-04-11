/**
 * Step 2: Check Selection
 * Select checks to run from suggestions and available checks
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDispatch, useSelector } from 'react-redux';
import { wizardActions } from '../store/store';
import { RootState } from '../store/store';
import { apiService } from '../utils/apiClient';

const CheckSelectionStep: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedConnection, selectedChecks } = useSelector(
    (state: RootState) => state.wizard
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allChecks, setAllChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    loadChecks();
  }, [selectedConnection]);

  const loadChecks = async () => {
    if (!selectedConnection) return;

    try {
      setLoading(true);
      setError(null);

      const [suggestionsData, checksData] = await Promise.all([
        apiService.getSuggestions(selectedConnection, 'dataset'),
        apiService.getAllChecks(),
      ]);

      setSuggestions(suggestionsData?.suggestions || []);
      setAllChecks(checksData?.checks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load checks');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (checkId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedChecks, checkId]
      : selectedChecks.filter((id) => id !== checkId);
    dispatch(wizardActions.setSelectedChecks(newSelected));
  };

  const handleSelectAll = () => {
    const allIds = allChecks.map((c) => c.id);
    dispatch(wizardActions.setSelectedChecks(allIds));
  };

  const handleClearAll = () => {
    dispatch(wizardActions.setSelectedChecks([]));
  };

  const checkTypes = Array.from(new Set(allChecks.map((c) => c.check_type)));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 2: Select Checks to Run
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button variant="outlined" size="small" onClick={handleSelectAll}>
          Select All
        </Button>
        <Button variant="outlined" size="small" onClick={handleClearAll}>
          Clear All
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadChecks}
          disabled={loading}
        >
          Refresh
        </Button>
        <Typography variant="body2" color="textSecondary" sx={{ ml: 'auto' }}>
          {selectedChecks.length} of {allChecks.length} selected
        </Typography>
      </Box>

      {loading && <CircularProgress />}

      {/* Suggested Checks */}
      {suggestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Suggested Checks
          </Typography>
          <Grid container spacing={2}>
            {suggestions.map((check) => (
              <Grid item xs={12} md={6} key={check.id}>
                <Card>
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedChecks.includes(check.id)}
                          onChange={(e) => handleCheckChange(check.id, e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2">{check.check_name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {check.rationale}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              label={`Confidence: ${(check.confidence_score * 100).toFixed(0)}%`}
                              size="small"
                              color={check.confidence_score > 0.8 ? 'success' : 'default'}
                            />
                          </Box>
                        </Box>
                      }
                      sx={{ width: '100%' }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* All Available Checks */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          All Available Checks
        </Typography>

        {checkTypes.map((type) => (
          <Box key={type} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#1976d2' }}>
              {type}
            </Typography>
            {allChecks
              .filter((c) => c.check_type === type)
              .map((check) => (
                <Card key={check.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedChecks.includes(check.id)}
                          onChange={(e) =>
                            handleCheckChange(check.id, e.target.checked)
                          }
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{check.check_name}</Typography>
                        </Box>
                      }
                      sx={{ width: '100%' }}
                    />
                  </CardContent>
                </Card>
              ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CheckSelectionStep;
