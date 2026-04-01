import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // File upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Rule selection - Initial state with all rules
  const [selectedRules, setSelectedRules] = useState({
    rowCount: true,
    missingValues: true,
    duplicates: true,
    formatValidation: true,
    rangeValidation: true,
    freshness: true,
    customPatterns: false,
    anomaly: false
  });

  // Modals
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Data
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [apiStatus, setApiStatus] = useState('loading');

  // Rules definition - Expanded with all Soda Core check types
  const rules = {
    rowCount: {
      name: '🔢 Row Count Validation',
      description: 'Volume: Check row counts (must have data, not too large)',
      color: '#ff6b6b',
      checks: ['row_count > 0', 'row_count < 1000000']
    },
    missingValues: {
      name: '✅ Missing Value Checks',
      description: 'Completeness: Detect NULL/missing values in critical columns',
      color: '#4ecdc4',
      checks: ['missing_count(CustomerID)', 'missing_count(Email)', 'missing_count(Name)', 'missing_percent(Age)']
    },
    duplicates: {
      name: '🔐 Duplicate Detection',
      description: 'Uniqueness: Find duplicate values in key columns',
      color: '#45b7d1',
      checks: ['duplicate_count(CustomerID)', 'duplicate_count(Email)']
    },
    formatValidation: {
      name: '📧 Format Validation',
      description: 'Validity: Check data format (email, date, phone, etc)',
      color: '#f9ca24',
      checks: ['invalid_count(Email) with email format check']
    },
    rangeValidation: {
      name: '📊 Range & Bounds',
      description: 'Statistical: Min/Max/Avg ranges and data quality thresholds',
      color: '#a29bfe',
      checks: ['min(Age) >= 13', 'max(Age) <= 120', 'avg(Age) between 20 and 80']
    },
    freshness: {
      name: '⏰ Data Freshness',
      description: 'Timeliness: Ensure data is current (not stale)',
      color: '#6c5ce7',
      checks: ['freshness(SignupDate) < 730 days']
    },
    customPatterns: {
      name: '🎯 Custom Patterns',
      description: 'Advanced: Regex patterns, business rules (premium feature)',
      color: '#fd79a8',
      checks: ['Custom regex patterns available']
    },
    anomaly: {
      name: '⚠️ Anomaly Detection',
      description: 'AI: Detect statistical anomalies and outliers (ML-based)',
      color: '#fdcb6e',
      checks: ['Statistical anomalies', 'Outlier detection']
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
                <strong>{Object.values(selectedRules).filter(Boolean).length}/{Object.keys(selectedRules).length}</strong> rule categories selected
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

              {selectedScan.check_details && selectedScan.check_details.length > 0 && (
                <div className="detailed-checks-section">
                  <h3>🔍 Individual Check Results</h3>
                  <div className="checks-list">
                    {selectedScan.check_details.map((check, idx) => (
                      <div key={idx} className={`check-item check-${check.outcome}`}>
                        <div className="check-header">
                          <span className={`check-outcome ${check.outcome}`}>
                            {check.outcome === 'pass' ? '✅' : '❌'} {check.name}
                          </span>
                          {check.column && (
                            <span className="check-column">[{check.column}]</span>
                          )}
                        </div>
                        <div className="check-body">
                          <div className="check-status">
                            {check.outcome === 'pass' ? (
                              <span className="status-pass">PASSED</span>
                            ) : (
                              <>
                                <span className="status-fail">FAILED</span>
                                {check.diagnostics?.value !== undefined && (
                                  <span className="check-value">
                                    Actual: {JSON.stringify(check.diagnostics.value)}
                                  </span>
                                )}
                                {check.diagnostics?.fail && (
                                  <span className="check-expected">
                                    Expected: {JSON.stringify(check.diagnostics.fail)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
