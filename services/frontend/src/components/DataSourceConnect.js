/**
 * DataSourceConnect Component
 * Step 1: Connect to a data source (PostgreSQL, CSV, Parquet)
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import './DataSourceConnect.css';

export default function DataSourceConnect({ onConnectionCreated, onNext }) {
  const [connectionType, setConnectionType] = useState('postgres');
  const [formData, setFormData] = useState({
    name: '',
    remote_url: '',
    secret: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingConnections, setExistingConnections] = useState([]);

  // Load existing connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

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
      if (!formData.remote_url.trim()) {
        throw new Error('Remote URL is required');
      }

      // Create connection
      const connection = await apiClient.createConnection({
        name: formData.name,
        type: connectionType,
        remote_url: formData.remote_url,
        secret: formData.secret || '',
      });

      setSuccess(`✓ Connection "${connection.name}" created successfully`);
      setFormData({ name: '', remote_url: '', secret: '' });
      
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
    },
    csv: {
      label: 'CSV File',
      placeholder: 's3://bucket/file.csv or /local/path/file.csv',
      icon: '📄',
    },
    parquet: {
      label: 'Parquet File',
      placeholder: 's3://bucket/file.parquet or /local/path/file.parquet',
      icon: '📦',
    },
    snowflake: {
      label: 'Snowflake',
      placeholder: 'snowflake://account.region/database/schema',
      icon: '❄️',
    },
  };

  const config = connectionTypeConfig[connectionType];

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
            </div>

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

            {/* Remote URL */}
            <div className="form-group">
              <label htmlFor="remote_url">Connection String *</label>
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
                {connectionType === 'csv' && 'HTTP URL, S3 path, or local file path'}
                {connectionType === 'parquet' && 'HTTP URL, S3 path, or local file path'}
                {connectionType === 'snowflake' && 'snowflake://account-id/database/schema'}
              </p>
            </div>

            {/* Secret / Credentials */}
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

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Success Message */}
            {success && <div className="success-message">{success}</div>}

            {/* Submit Button */}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Creating...' : '✓ Create Connection'}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
