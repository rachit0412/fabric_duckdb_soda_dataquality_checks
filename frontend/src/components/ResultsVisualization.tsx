/**
 * Step 5: Results Visualization
 * Display metrics, trends, anomalies, and drill-down data
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { apiService } from '../utils/apiClient';
import { useRunPolling } from '../hooks/useRunPolling';
import Plot from 'react-plotly.js';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const ResultsVisualization: React.FC = () => {
  const { executionResult } = useSelector((state: RootState) => state.wizard);
  const [tabValue, setTabValue] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [anomalies, setAnomalies] = useState<any | null>(null);
  const [drillDown, setDrillDown] = useState<any | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll run status
  const { status, isPolling } = useRunPolling({
    runId: executionResult || '',
    enabled: !!executionResult,
    onComplete: (finalStatus) => {
      loadResults(executionResult);
    },
  });

  useEffect(() => {
    if (executionResult) {
      loadResults(executionResult);
    }
  }, [executionResult]);

  const loadResults = async (runId: string) => {
    try {
      setError(null);
      const [metricsData, anomaliesData, drillDownData] = await Promise.all([
        apiService.getMetrics(runId),
        apiService.getAnomalies(runId),
        apiService.getDrillDown(runId),
      ]);

      setMetrics(metricsData);
      setAnomalies(anomaliesData);
      setDrillDown(drillDownData);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    }
  };

  if (!executionResult) {
    return (
      <Box>
        <Alert severity="info">No execution result available</Alert>
      </Box>
    );
  }

  if (isPolling || !metrics) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography>
          {status?.status === 'running'
            ? `Check execution in progress... (${status.percent_complete}%)`
            : 'Loading results...'}
        </Typography>
        {status && (
          <Typography variant="body2" color="textSecondary">
            {status.pass_count} passed · {status.fail_count} failed · {status.warn_count} warnings
          </Typography>
        )}
      </Box>
    );
  }

  // Prepare data for Plotly charts
  const passFailWarningData = [
    {
      values: [
        metrics.summary.passed,
        metrics.summary.failed,
        (metrics.summary.total_checks - metrics.summary.passed - metrics.summary.failed) || 0,
      ],
      labels: ['Passed', 'Failed', 'Warnings'],
      type: 'pie' as const,
      marker: {
        colors: ['#4caf50', '#f44336', '#ff9800'],
      },
    },
  ];

  const passFailWarningLayout = {
    title: 'Check Results Distribution',
    height: 400,
    showlegend: true,
  };

  // Column quality scores
  const columnNames =
    drillDown?.columns?.map((c: any) => c.column_name) || [];
  const healthScores =
    drillDown?.columns?.map((c: any) => c.health_score) || [];

  const columnQualityData = [
    {
      x: columnNames,
      y: healthScores,
      type: 'bar' as const,
      marker: { color: '#1976d2' },
    },
  ];

  const columnQualityLayout = {
    title: 'Column Health Scores',
    xaxis: { title: 'Column' },
    yaxis: { title: 'Health Score (%)' },
    height: 400,
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 5: Results
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Pass Rate
              </Typography>
              <Typography variant="h5" sx={{ color: '#4caf50' }}>
                {metrics.summary.pass_rate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Passed
              </Typography>
              <Typography variant="h5" sx={{ color: '#4caf50' }}>
                {metrics.summary.passed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h5" sx={{ color: '#f44336' }}>
                {metrics.summary.failed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total Checks
              </Typography>
              <Typography variant="h5">
                {metrics.summary.total_checks}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="result tabs"
        >
          <Tab label="Overview" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="By Column" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Anomalies" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Details" id="tab-3" aria-controls="tabpanel-3" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Plot data={passFailWarningData} layout={passFailWarningLayout} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Check Summary
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {metrics.by_status.pass.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ✓ Passed Checks ({metrics.by_status.pass.length})
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {metrics.by_status.pass.map((check: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={check}
                            size="small"
                            color="success"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {metrics.by_status.fail.length > 0 && (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ✗ Failed Checks ({metrics.by_status.fail.length})
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {metrics.by_status.fail.map((check: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={check}
                            size="small"
                            color="error"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Plot data={columnQualityData} layout={columnQualityLayout} />
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Column</TableCell>
                <TableCell align="right">Health Score</TableCell>
                <TableCell align="right">Passed</TableCell>
                <TableCell align="right">Failed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drillDown?.columns?.map((col: any) => (
                <TableRow
                  key={col.column_name}
                  onClick={() => setSelectedColumn(col.column_name)}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f9f9f9' } }}
                >
                  <TableCell>{col.column_name}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${col.health_score}%`}
                      color={col.health_score > 80 ? 'success' : col.health_score > 50 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="right">{col.checks.filter((c: any) => c.status === 'pass').length}</TableCell>
                  <TableCell align="right">{col.checks.filter((c: any) => c.status !== 'pass').length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {anomalies?.anomaly_count > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Check</TableCell>
                  <TableCell>Column</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {anomalies?.anomalies?.map((anomaly: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{anomaly.check_name}</TableCell>
                    <TableCell>{anomaly.column_name}</TableCell>
                    <TableCell>{anomaly.type}</TableCell>
                    <TableCell>
                      <Chip
                        label={anomaly.severity}
                        color={
                          anomaly.severity === 'critical'
                            ? 'error'
                            : anomaly.severity === 'high'
                            ? 'warning'
                            : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{anomaly.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="success">No anomalies detected</Alert>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {selectedColumn && drillDown?.columns ? (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Details for {selectedColumn}
            </Typography>
            {drillDown.columns
              .find((c: any) => c.column_name === selectedColumn)
              ?.checks.map((check: any, idx: number) => (
                <Card key={idx} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2">{check.check_name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {check.validation_rule}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={check.status}
                        color={check.status === 'pass' ? 'success' : 'error'}
                        size="small"
                      />
                      {check.affected_rows_percent && (
                        <Chip
                          label={`${check.affected_rows_percent}% affected`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
          </Box>
        ) : (
          <Alert severity="info">
            Select a column from the "By Column" tab to view details
          </Alert>
        )}
      </TabPanel>
    </Box>
  );
};

export default ResultsVisualization;
