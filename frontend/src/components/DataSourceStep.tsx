/**
 * Step 1: Data Source Selection
 * Upload CSV or select existing connection
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDispatch, useSelector } from 'react-redux';
import { wizardActions } from '../store/store';
import { RootState } from '../store/store';
import { apiService } from '../utils/apiClient';

const DataSourceStep: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedConnection, uploadedFiles, error } = useSelector(
    (state: RootState) => state.wizard
  );
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConnections();
      setConnections(data || []);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size exceeds 100MB limit');
      return;
    }

    // Validate file type
    if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type)) {
      setUploadError('Only CSV and Excel files are supported');
      return;
    }

    try {
      setLoading(true);
      setUploadError(null);
      
      const fileName = newFileName || file.name;
      const result = await apiService.uploadFile(file, fileName);
      
      dispatch(wizardActions.setUploadedFiles([file]));
      dispatch(wizardActions.setSelectedConnection(result.id));
      setNewFileName('');
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 1: Select Data Source
      </Typography>

      {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

      <Grid container spacing={3}>
        {/* Existing Connections */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Existing Connections
          </Typography>
          {loading && <CircularProgress />}
          {connections.length === 0 && !loading && (
            <Typography color="textSecondary">No existing connections</Typography>
          )}
          {connections.map((conn) => (
            <Card
              key={conn.id}
              sx={{
                mb: 1,
                cursor: 'pointer',
                backgroundColor: selectedConnection === conn.id ? '#e3f2fd' : 'white',
                border: selectedConnection === conn.id ? '2px solid #1976d2' : '1px solid #ddd',
              }}
              onClick={() => dispatch(wizardActions.setSelectedConnection(conn.id))}
            >
              <CardContent>
                <Typography variant="subtitle2">{conn.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Type: {conn.type}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Upload New File */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Upload New File
          </Typography>
          <Card>
            <CardContent>
              <Box
                sx={{
                  p: 3,
                  border: '2px dashed #1976d2',
                  borderRadius: 1,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f5f5f5',
                  transition: 'all 0.3s',
                  '&:hover': { backgroundColor: '#efefef' },
                }}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="file-input"
                />
                <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                  <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
                  <Typography>Drag and drop or click to upload</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Supports CSV and Excel files up to 100MB
                  </Typography>
                </label>
              </Box>

              {uploadedFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Selected file: {uploadedFiles[0].name}
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                label="File Name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Optional: custom name"
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataSourceStep;
