/**
 * DataSourceConnect Component V2
 * Step 1: Connect to a data source with dual-mode support (Link + Upload for CSV/Parquet)
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import './DataSourceConnect.css';

export default function DataSourceConnect({ onConnectionCreated, onNext }) {
  const [connectionType, setConnectionType] = useState('postgres');
  const [inputMode, setInputMode] = useState('link'); // 'link' or 'upload' for CSV/Parquet
  const [formData, setFormData] = useState({
    name: '',
    remote_url: '',
    secret: '',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingConnections, setExistingConnections] = useState([]);

  // Load existing connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  // Reset mode when switching connection type
  useEffect(() => {
    setInputMode(['csv', 'parquet'].includes(connectionType) ? 'link' : 'link');
    setUploadFile(null);
    setFormData({ name: '', remote_url: '', secret: '' });
  }, [connectionType]);

  const loadConnections = async () => {
    try {
      const connections = await apiClient.listConnections();
      setExistingConnections(connections);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      const expectedExt = connectionType === 'csv' ? 'csv' : 'parquet';
      
      if (ext !== expectedExt) {
        setError(`Please select a ${expectedExt.toUpperCase()} file`);
        return;
      }

      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        setError('File size exceeds 500MB limit');
        return;
      }

      setUploadFile(file);
      setError('');
    }
  };

  const handleCreateConnection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate inputs
      if (!formData.name.trim()) {
        throw new Error('Connection name is required');
      }

      let connection;

      if (['csv', 'parquet'].includes(connectionType) && inputMode === 'upload') {
        // File upload mode
        if (!uploadFile) {
          throw new Error(`Please select a ${connectionType.toUpperCase()} file to upload`);
        }

        connection = await apiClient.uploadDataSource({
          name: formData.name,
          type: connectionType,
          file: uploadFile,
        });
      } else {
        // Link mode (for all types, or CSV/Parquet with URL)
        if (!formData.remote_url.trim()) {
          throw new Error('URL or connection string is required');
        }

        connection = await apiClient.createConnection({
          name: formData.name,
          type: connectionType,
          remote_url: formData.remote_url,
          secret: formData.secret || '',
        });
      }

      const modeText = inputMode === 'upload' ? 'uploaded' : 'linked';
      setSuccess(`✓ Connection "${connection.name}" ${modeText} successfully`);
      setFormData({ name: '', remote_url: '', secret: '' });
      setUploadFile(null);
      
      // Reload connections list
      await loadConnections();
      
      // Call parent callback
      if (onConnectionCreated) {
        onConnectionCreated(connection);
      }

      // Optionally proceed to next step
      if (onNext) {
        setTimeout(() => onNext(connection), 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = async (connection) => {
    setLoading(true);
    try {
      // Test the connection
      await apiClient.testConnection(connection.id);
      setSuccess(`✓ Connection "${connection.name}" verified`);
      
      if (onConnectionCreated) {
        onConnectionCreated(connection);
      }
      
      if (onNext) {
        setTimeout(() => onNext(connection), 1000);
      }
    } catch (err) {
      setError(`Failed to verify connection: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const connectionTypeConfig = {
    postgres: {
      label: 'PostgreSQL',
      placeholder: 'postgresql://user:password@host:5432/database',
      icon: '🐘',
      description: 'Connect to PostgreSQL database',
      dualmodeSupport: false,
      offlineMode: false,
    },
    csv: {
      label: 'CSV File',
      placeholder: 's3://bucket/file.csv or /local/path/file.csv',
      icon: '📄',
      description: 'Import CSV files from URL or upload directly',
      dualmodeSupport: true,
      offlineMode: true, // Upload mode works offline
    },
    parquet: {
      label: 'Parquet File',
      placeholder: 's3://bucket/file.parquet or /local/path/file.parquet',
      icon: '📦',
      description: 'Import Parquet files from URL or upload directly',
      dualmodeSupport: true,
      offlineMode: true, // Upload mode works offline
    },
    snowflake: {
      label: 'Snowflake',
      placeholder: 'snowflake://account.region/database/schema',
      icon: '❄️',
      description: 'Connect to Snowflake data warehouse',
      dualmodeSupport: false,
      offlineMode: false,
    },
  };

  const config = connectionTypeConfig[connectionType];
  const supportsDualMode = config.dualmodeSupport;

  return (
    <div className="data-source-connect">
      <div className="connect-container">
        <h2>📊 Step 1: Connect Data Source</h2>
        <p className="subtitle">Link your database or file to start quality checks</p>

        {/* Existing Connections */}
        {existingConnections.length > 0 && (
          <div className="existing-connections">
            <h3>Recent Connections</h3>
            <div className="connection-list">
              {existingConnections.map(conn => (
                <button
                  key={conn.id}
                  className="connection-item"
                  onClick={() => handleSelectExisting(conn)}
                  disabled={loading}
                >
                  <span className="conn-name">{conn.name}</span>
                  <span className="conn-type">{conn.type.toUpperCase()}</span>
                  <span className="conn-date">
                    {new Date(conn.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
            <hr />
          </div>
        )}

        {/* New Connection Form */}
        <form onSubmit={handleCreateConnection} className="connection-form">
          <fieldset disabled={loading}>
            {/* Connection Type Selector */}
            <div className="form-group">
              <label>Data Source Type</label>
              <div className="type-selector">
                {Object.entries(connectionTypeConfig).map(([type, cfg]) => (
                  <label key={type} className="type-option">
                    <input
                      type="radio"
                      name="connectionType"
                      value={type}
                      checked={connectionType === type}
                      onChange={() => setConnectionType(type)}
                    />
                    <span className="type-icon">{cfg.icon}</span>
                    <span className="type-label">{cfg.label}</span>
                  </label>
                ))}
              </div>
              <p className="config-description">{config.description}</p>
            </div>

            {/* Dual-mode selector for CSV/Parquet */}
            {supportsDualMode && (
              <div className="form-group mode-selector">
                <label>Input Mode</label>
                <div className="mode-options">
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="inputMode"
                      value="link"
                      checked={inputMode === 'link'}
                      onChange={() => setInputMode('link')}
                    />
                    <span className="mode-icon">🔗</span>
                    <span className="mode-label">Link</span>
                    <span className="mode-desc">URL or S3 path</span>
                  </label>
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="inputMode"
                      value="upload"
                      checked={inputMode === 'upload'}
                      onChange={() => setInputMode('upload')}
                    />
                    <span className="mode-icon">📤</span>
                    <span className="mode-label">Upload</span>
                    <span className="mode-desc">Direct file upload (offline ✓)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Connection Name */}
            <div className="form-group">
              <label htmlFor="name">Connection Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Production Database"
                required
              />
            </div>

            {/* Conditional input: Link or Upload */}
            {!supportsDualMode || inputMode === 'link' ? (
              <div className="form-group">
                <label htmlFor="remote_url">
                  {connectionType === 'postgres' ? 'Connection String' : 'URL or Path'} *
                </label>
                <input
                  id="remote_url"
                  type="text"
                  name="remote_url"
                  value={formData.remote_url}
                  onChange={handleInputChange}
                  placeholder={config.placeholder}
                  required
                />
                <p className="hint">
                  {connectionType === 'postgres' && 'Format: postgresql://user:password@host:port/database'}
                  {connectionType === 'csv' && 'HTTP URL, S3 path (s3://bucket/file.csv), or local path (/path/file.csv)'}
                  {connectionType === 'parquet' && 'HTTP URL, S3 path (s3://bucket/file.parquet), or local path (/path/file.parquet)'}
                  {connectionType === 'snowflake' && 'Format: snowflake://account-id/database/schema'}
                </p>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="file-upload">
                  Select {connectionType.toUpperCase()} File *
                </label>
                <div className="file-upload-area">
                  <input
                    id="file-upload"
                    type="file"
                    accept={connectionType === 'csv' ? '.csv' : '.parquet'}
                    onChange={handleFileChange}
                    required
                  />
                  <div className="upload-hint">
                    {uploadFile ? (
                      <p className="file-selected">✓ {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                    ) : (
                      <p>Drag & drop or click to select {connectionType.toUpperCase()} file (max 500MB)</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Secret / Credentials (only for link mode or non-file types) */}
            {!supportsDualMode || inputMode === 'link' ? (
              <div className="form-group">
                <label htmlFor="secret">API Key / Secret (Optional)</label>
                <input
                  id="secret"
                  type="password"
                  name="secret"
                  value={formData.secret}
                  onChange={handleInputChange}
                  placeholder="For cloud services: API key or access token"
                />
              </div>
            ) : null}

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Success Message */}
            {success && <div className="success-message">{success}</div>}

            {/* Submit Button */}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Processing...' : supportsDualMode && inputMode === 'upload' ? '📤 Upload & Connect' : '✓ Create Connection'}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
