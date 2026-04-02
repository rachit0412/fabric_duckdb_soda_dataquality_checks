import React, { useState, useEffect } from 'react';
import './DataSourceConnect.css';

// Dynamically determine API base URL based on current URL
const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8000/api/v1`;

export default function DataSourceConnectV2({ onConnectionCreated }) {
  const [connectionType, setConnectionType] = useState('postgres');
  const [inputMode, setInputMode] = useState('link');
  const [url, setUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingConnections, setExistingConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null); // Track selected connection

  // Connection type configurations
  const configs = {
    postgres: {
      label: 'PostgreSQL',
      icon: '🐘',
      placeholder: 'postgresql://user:pass@host:5432/db',
      dualmodeSupport: false,
    },
    csv: {
      label: 'CSV File',
      icon: '📄',
      placeholder: 's3://bucket/file.csv',
      dualmodeSupport: true,
    },
    parquet: {
      label: 'Parquet File',
      icon: '📦',
      placeholder: 's3://bucket/file.parquet',
      dualmodeSupport: true,
    },
    snowflake: {
      label: 'Snowflake',
      icon: '❄️',
      placeholder: 'snowflake://account/database/schema',
      dualmodeSupport: false,
    },
  };

  const config = configs[connectionType];
  const supportsDualMode = config.dualmodeSupport;

  // Load existing connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const res = await fetch(`${API_BASE}/connections/`);
        const data = await res.json();
        setExistingConnections(data.connections || []);
      } catch (e) {
        console.error('Failed to load connections:', e);
      }
    };
    loadConnections();
  }, []);

  // Build connection payload
  const buildPayload = () => {
    const autoName = `${connectionType}_${Date.now()}`;

    if (supportsDualMode && inputMode === 'upload') {
      if (!uploadFile) throw new Error('Please select a file');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', connectionType);
      formData.append('name', autoName);
      return { formData, isMultipart: true };
    }

    if (!url.trim()) throw new Error('URL/connection string required');
    return {
      data: {
        type: connectionType,
        name: autoName,
        remote_url: url,
        secret: secret || undefined,
      },
      isMultipart: false,
    };
  };

  // Handle connection creation
  const handleCreateConnection = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = buildPayload();
      
      // Choose endpoint based on upload type
      const endpoint = payload.isMultipart 
        ? `${API_BASE}/connections/upload` 
        : `${API_BASE}/connections/`;
      
      const options = {
        method: 'POST',
        ...(payload.isMultipart
          ? { body: payload.formData }
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload.data) }),
      };

      const res = await fetch(endpoint, options);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setSuccess(`✓ Connected as "${result.name}"`);
      setSelectedConnection(result); // Set selected connection instead of showing list
      setUrl('');
      setUploadFile(null);
      setSecret('');
      
      // Call parent callback to move to next step
      if (onConnectionCreated) {
        setTimeout(() => onConnectionCreated(result), 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting existing connection
  const handleSelectExisting = async (conn) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/connections/${conn.id}/test`, { method: 'POST' });
      if (res.ok) {
        setSuccess(`✓ Connection "${conn.name}" verified and ready`);
      } else {
        setError(`✗ Connection test failed for "${conn.name}"`);
      }
    } catch (err) {
      setError(`Error testing connection: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-source-connect">
      <div className="connect-container">
        <h2>📊 Step 1: Connect Data Source</h2>

        {/* Success State - Show selected connection */}
        {selectedConnection ? (
          <div className="success-state">
            <div className="success-card">
              <div className="success-icon">✓</div>
              <h3>Connection Ready</h3>
              <div className="selected-connection-display">
                <div className="conn-info">
                  <span className="conn-icon">{configs[selectedConnection.type]?.icon || '📁'}</span>
                  <div>
                    <div className="conn-label">{selectedConnection.name}</div>
                    <div className="conn-type">{selectedConnection.type.toUpperCase()}</div>
                  </div>
                </div>
              </div>
              <p className="success-message">{success}</p>
              <div className="action-buttons">
                <button 
                  className="btn-primary" 
                  onClick={() => setSelectedConnection(null)}
                >
                  ← Back to Connections
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    if (onConnectionCreated && selectedConnection) {
                      onConnectionCreated(selectedConnection);
                    }
                  }}
                >
                  Next: Profile Data →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                    </button>
                  ))}
                </div>
                <hr />
              </div>
            )}

            {/* New Connection Form */}
            <form onSubmit={handleCreateConnection} className="connection-form">
              <fieldset disabled={loading}>
                {/* Type Selector */}
                <div className="form-group">
                  <label>Data Source Type</label>
                  <div className="type-selector">
                    {Object.entries(configs).map(([type, cfg]) => (
                      <label key={type} className="type-option">
                        <input
                          type="radio"
                          name="connectionType"
                          value={type}
                          checked={connectionType === type}
                          onChange={() => {
                            setConnectionType(type);
                            setInputMode('link');
                          }}
                        />
                        <span className="type-icon">{cfg.icon}</span>
                        <span className="type-label">{cfg.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dual-mode selector */}
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
                        <span>Link</span>
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
                        <span>Upload</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* URL Input or File Upload */}
                {!supportsDualMode || inputMode === 'link' ? (
                  <div className="form-group">
                    <label htmlFor="url">
                      {connectionType === 'postgres' ? 'Connection String' : 'URL or Path'}
                    </label>
                    <input
                      id="url"
                      type="text"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder={config.placeholder}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="file-upload">Select File</label>
                    <div className="file-upload-area">
                      <p style={{ color: '#666', marginBottom: '10px', fontSize: '14px' }}>📤 Upload File</p>
                      <input
                        id="file-upload"
                        type="file"
                        accept={connectionType === 'csv' ? '.csv' : '.parquet'}
                        onChange={e => setUploadFile(e.target.files?.[0] || null)}
                        required
                      />
                      {uploadFile && <p className="file-selected">✓ {uploadFile.name}</p>}
                    </div>
                  </div>
                )}

                {/* Secret (optional) */}
                {!supportsDualMode || inputMode === 'link' ? (
                  <div className="form-group">
                    <label htmlFor="secret">API Key (optional)</label>
                    <input
                      id="secret"
                      type="password"
                      value={secret}
                      onChange={e => setSecret(e.target.value)}
                      placeholder="Leave blank if not needed"
                    />
                  </div>
                ) : null}

                {/* Messages */}
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {/* Submit Button */}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '⏳ Processing...' : supportsDualMode && inputMode === 'upload' ? '📤 Upload & Connect' : '✓ Connect'}
                </button>
              </fieldset>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
