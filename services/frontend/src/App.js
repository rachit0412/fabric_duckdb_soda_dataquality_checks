import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // File upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Rule selection
  const [selectedRules, setSelectedRules] = useState({
    volume: true,
    completeness: true,
    uniqueness: true,
    validity: true,
    freshness: true
  });

  // Modals
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Data
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [apiStatus, setApiStatus] = useState('loading');

  // Rules definition
  const rules = {
    volume: {
      name: '🔢 Volume',
      description: 'Validate row counts',
      color: '#ff6b6b'
    },
    completeness: {
      name: '✅ Completeness',
      description: 'Check for missing values',
      color: '#4ecdc4'
    },
    uniqueness: {
      name: '🔐 Uniqueness',
      description: 'Detect duplicates',
      color: '#45b7d1'
    },
    validity: {
      name: '📧 Validity',
      description: 'Format & bounds',
      color: '#f9ca24'
    },
    freshness: {
      name: '⏰ Freshness',
      description: 'Data timeliness',
      color: '#6c5ce7'
    }
  };

  // Get API URL
  const getApiUrl = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return `${window.location.protocol}//${window.location.hostname.replace(':3000', '')}:8000`;
  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = getApiUrl();
        
        // Check API status
        const healthRes = await fetch(`${apiUrl}/api/health`);
        if (healthRes.ok) {
          setApiStatus('healthy');
        } else {
          setApiStatus('offline');
        }

        // Fetch history
        const historyRes = await fetch(`${apiUrl}/api/summary`);
        if (historyRes.ok) {
          const data = await historyRes.json();
          setScanHistory(data.recent_scans || []);
        }
      } catch (err) {
        console.warn('API error:', err.message);
        setApiStatus('offline');
      }
    };

    setTimeout(fetchData, 500);
  }, []);

  // Handle file upload
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setUploadError('Select a CSV file first');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const apiUrl = getApiUrl();
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${apiUrl}/api/simple-upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedScan(result);
        setShowResultsModal(true);
        setUploadFile(null);
        
        // Refresh history
        const historyRes = await fetch(`${apiUrl}/api/summary`);
        if (historyRes.ok) {
          const data = await historyRes.json();
          setScanHistory(data.recent_scans || []);
        }
      } else {
        const error = await response.json();
        setUploadError(error.detail || 'Upload failed');
      }
    } catch (err) {
      setUploadError(err.message || 'Upload error');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="App">
      {/* HEADER */}
      <header className="header">
        <h1>🎯 Data Quality Platform</h1>
        <div className="header-buttons">
          <button 
            className="btn-icon"
            onClick={() => setShowHistoryModal(true)}
            title="View scan history"
          >
            📊 History ({scanHistory.length})
          </button>
          <span className={`status ${apiStatus === 'healthy' ? 'healthy' : 'offline'}`}>
            {apiStatus === 'healthy' ? '✅ Connected' : '⚠️ Offline'}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="content">
        <div className="grid-container">
          {/* LEFT: UPLOAD + RULES */}
          <section className="upload-rules-panel">
            {/* FILE UPLOAD */}
            <div className="upload-box">
              <h2>📤 Upload CSV File</h2>
              <div className="file-drop-zone">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null);
                    setUploadError(null);
                  }}
                  id="file-input"
                />
                <label htmlFor="file-input" className="file-label">
                  <span className="icon">📁</span>
                  <span className="text">
                    {uploadFile ? uploadFile.name : 'Click or drag CSV file here'}
                  </span>
                </label>
              </div>

              {uploadError && (
                <div className="error-message">❌ {uploadError}</div>
              )}
            </div>

            {/* RULE SELECTION */}
            <div className="rules-box">
              <h2>⚙️ Select Rules</h2>
              <div className="rules-grid">
                {Object.entries(rules).map(([key, rule]) => (
                  <label key={key} className="rule-checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={selectedRules[key]}
                      onChange={() => setSelectedRules(prev => ({
                        ...prev,
                        [key]: !prev[key]
                      }))}
                    />
                    <div 
                      className="rule-label"
                      style={{ borderLeftColor: rule.color }}
                    >
                      <span className="rule-name">{rule.name}</span>
                      <span className="rule-desc">{rule.description}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="selected-summary">
                <strong>{Object.values(selectedRules).filter(Boolean).length}/5</strong> rules selected
              </div>
            </div>

            {/* SCAN BUTTON */}
            <button
              className={`btn-scan ${uploading ? 'loading' : ''}`}
              onClick={handleFileUpload}
              disabled={uploading || !uploadFile}
            >
              {uploading ? '⏳ Scanning...' : '🚀 Run Scan'}
            </button>
          </section>

          {/* RIGHT: LATEST RESULTS */}
          <section className="results-preview-panel">
            {selectedScan ? (
              <div className="results-card">
                <h2>📊 Latest Results</h2>
                <div className="result-summary">
                  <div className="result-stat">
                    <span className="label">Status</span>
                    <span className={`value status-${selectedScan.status?.toLowerCase()}`}>
                      {selectedScan.status || '—'}
                    </span>
                  </div>
                  <div className="result-stat">
                    <span className="label">Pass Rate</span>
                    <span className="value">
                      {((selectedScan.pass_rate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="result-stat">
                    <span className="label">Checks</span>
                    <span className="value">
                      {selectedScan.total_checks || 0}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowResultsModal(true);
                  }}
                >
                  View Details →
                </button>
              </div>
            ) : scanHistory.length > 0 ? (
              <div className="results-card">
                <h2>📊 Previous Results</h2>
                <div className="history-preview">
                  {scanHistory.slice(0, 1).map(scan => (
                    <div key={scan.scan_id} className="preview-item">
                      <span className="table-name">{scan.table_name}</span>
                      <span className="pass-rate">
                        {((scan.pass_rate || 0) * 100).toFixed(1)}% pass
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => setShowHistoryModal(true)}
                >
                  View All History →
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <p>No scans yet</p>
                <p className="hint">Upload a CSV file to start testing</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* RESULTS MODAL */}
      {showResultsModal && selectedScan && (
        <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn-close"
              onClick={() => setShowResultsModal(false)}
            >
              ✕
            </button>

            <h2>📊 Scan Results</h2>

            <div className="modal-body">
              <div className="result-grid">
                <div className="result-box">
                  <span className="label">Table</span>
                  <span className="value">{selectedScan.table_name}</span>
                </div>
                <div className="result-box">
                  <span className="label">Status</span>
                  <span className={`value status-${selectedScan.status?.toLowerCase()}`}>
                    {selectedScan.status}
                  </span>
                </div>
                <div className="result-box">
                  <span className="label">Pass Rate</span>
                  <span className="value">
                    {((selectedScan.pass_rate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="result-box">
                  <span className="label">Duration</span>
                  <span className="value">
                    {(selectedScan.duration_seconds || 0).toFixed(2)}s
                  </span>
                </div>
              </div>

              {selectedScan.metadata && (
                <div className="metadata-section">
                  <h3>📈 Metadata</h3>
                  <div className="metadata-items">
                    <div className="metadata-item">
                      <span>Rows:</span>
                      <strong>{selectedScan.metadata.row_count || '—'}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Columns Analyzed:</span>
                      <strong>
                        {selectedScan.metadata.columns?.join(', ') || '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="checks-summary">
                <h3>✅ Checks Summary</h3>
                <div className="checks-items">
                  <div className="check">
                    <span className="label">Total</span>
                    <span className="value">{selectedScan.total_checks || 0}</span>
                  </div>
                  <div className="check passed">
                    <span className="label">Passed</span>
                    <span className="value">{selectedScan.passed_checks || 0}</span>
                  </div>
                  <div className="check failed">
                    <span className="label">Failed</span>
                    <span className="value">{selectedScan.failed_checks || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn-close"
              onClick={() => setShowHistoryModal(false)}
            >
              ✕
            </button>

            <h2>📊 Scan History</h2>

            <div className="modal-body">
              {scanHistory.length === 0 ? (
                <p className="empty-message">No scan history</p>
              ) : (
                <div className="history-list">
                  {scanHistory.map(scan => (
                    <div
                      key={scan.scan_id}
                      className="history-row"
                      onClick={() => {
                        setSelectedScan(scan);
                        setShowHistoryModal(false);
                        setShowResultsModal(true);
                      }}
                    >
                      <div className="history-main">
                        <span className="table">{scan.table_name}</span>
                        <span className="date">
                          {new Date(scan.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="history-stats">
                        <span className={`status status-${scan.status?.toLowerCase()}`}>
                          {scan.status}
                        </span>
                        <span className="pass-rate">
                          {((scan.pass_rate || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Data Quality Platform v1.0.0 • Powered by Soda Core</p>
      </footer>
    </div>
  );
}

export default App;
