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

  // Data state
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [apiStatus, setApiStatus] = useState('loading');
  const [profileData, setProfileData] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // RULES DEFINITION - Clear Mapping of 8 Categories to 13 Checks
  // ═══════════════════════════════════════════════════════════════
  // This mapping shows exactly which checks each rule category includes
  const rules = {
    rowCount: {
      name: '🔢 Row Count Validation',
      description: 'Volume: Check row counts (must have data, not too large)',
      color: '#ff6b6b',
      checks: ['row_count > 0', 'row_count < 1000000'],
      checkCount: 2
    },
    missingValues: {
      name: '✅ Missing Value Checks',
      description: 'Completeness: Detect NULL/missing values in critical columns',
      color: '#4ecdc4',
      checks: ['missing_count(CustomerID) = 0', 'missing_count(Email) = 0', 'missing_count(Name) = 0', 'missing_percent(Age) < 10'],
      checkCount: 4
    },
    duplicates: {
      name: '🔐 Duplicate Detection',
      description: 'Uniqueness: Find duplicate values in key columns',
      color: '#45b7d1',
      checks: ['duplicate_count(CustomerID) = 0', 'duplicate_count(Email) = 0'],
      checkCount: 2
    },
    formatValidation: {
      name: '📧 Format Validation',
      description: 'Validity: Check data format (email, date, phone, etc)',
      color: '#f9ca24',
      checks: ['invalid_count(Email) = 0 (email format)'],
      checkCount: 1
    },
    rangeValidation: {
      name: '📊 Range & Bounds',
      description: 'Statistical: Min/Max/Avg ranges and data quality thresholds',
      color: '#a29bfe',
      checks: ['min(Age) >= 13', 'max(Age) <= 120', 'avg(Age) between 20 and 80'],
      checkCount: 3
    },
    freshness: {
      name: '⏰ Data Freshness',
      description: 'Timeliness: Ensure data is current (not stale)',
      color: '#6c5ce7',
      checks: ['missing_count(SignupDate) = 0'],
      checkCount: 1
    },
    customPatterns: {
      name: '🎯 Custom Patterns',
      description: 'Advanced: Regex patterns, business rules (premium feature)',
      color: '#fd79a8',
      checks: ['Custom regex patterns available'],
      checkCount: 0
    },
    anomaly: {
      name: '⚠️ Anomaly Detection',
      description: 'AI: Detect statistical anomalies and outliers (ML-based)',
      color: '#fdcb6e',
      checks: ['Statistical anomalies', 'Outlier detection'],
      checkCount: 0
    }
  };

  // Mapping of actual check names to rule categories
  const checkToRuleMapping = {
    'row_count > 0': 'rowCount',
    'row_count < 1000000': 'rowCount',
    'missing_count(CustomerID) = 0': 'missingValues',
    'missing_count(Email) = 0': 'missingValues',
    'missing_count(Name) = 0': 'missingValues',
    'missing_percent(Age) < 10': 'missingValues',
    'duplicate_count(CustomerID) = 0': 'duplicates',
    'duplicate_count(Email) = 0': 'duplicates',
    'invalid_count(Email) = 0': 'formatValidation',
    'min(Age) >= 13': 'rangeValidation',
    'max(Age) <= 120': 'rangeValidation',
    'avg(Age) between 20 and 80': 'rangeValidation',
    'missing_count(SignupDate) = 0': 'freshness'
  };

  // Helper: Group checks by rule category
  const groupChecksByCategory = (checkDetails) => {
    const categorized = {};
    Object.keys(rules).forEach(key => {
      categorized[key] = { passed: [], failed: [] };
    });

    if (checkDetails) {
      checkDetails.forEach(check => {
        // Find matching rule category
        let ruleKey = null;
        Object.entries(checkToRuleMapping).forEach(([pattern, key]) => {
          if (check.name.includes(pattern) || pattern.includes(check.name)) {
            ruleKey = key;
          }
        });

        if (!ruleKey) {
          // Fallback: try to match by check name pattern
          if (check.name.includes('row_count')) ruleKey = 'rowCount';
          else if (check.name.includes('missing')) ruleKey = 'missingValues';
          else if (check.name.includes('duplicate')) ruleKey = 'duplicates';
          else if (check.name.includes('invalid')) ruleKey = 'formatValidation';
          else if (check.name.includes('min(Age)') || check.name.includes('max(Age)') || check.name.includes('avg(Age)')) ruleKey = 'rangeValidation';
          else if (check.name.includes('SignupDate')) ruleKey = 'freshness';
        }

        if (ruleKey) {
          if (check.outcome === 'pass') {
            categorized[ruleKey].passed.push(check);
          } else {
            categorized[ruleKey].failed.push(check);
          }
        }
      });
    }

    return categorized;
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

  // Handle file upload - First profile, then scan
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setUploadError('Select a CSV file first');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const apiUrl = getApiUrl();
      
      // Step 1: Profile the data first
      const profileFormData = new FormData();
      profileFormData.append('file', uploadFile);
      
      const profileRes = await fetch(`${apiUrl}/api/profile`, {
        method: 'POST',
        body: profileFormData,
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setProfileData(profile);
        setShowProfileModal(true);
      }
      
      // Reset upload state but keep file for scanning
      setUploading(false);
      
    } catch (err) {
      setUploadError(err.message || 'Upload error');
      setUploading(false);
      console.error(err);
    }
  };

  // Handle actual scan after profile review
  const handleScanWithSelectedRules = async () => {
    if (!uploadFile) {
      setUploadError('File missing');
      return;
    }

    setUploading(true);
    setShowProfileModal(false);

    try {
      const apiUrl = getApiUrl();
      
      // Get selected rules as comma-separated string
      const selectedRuleKeys = Object.entries(selectedRules)
        .filter(([_, selected]) => selected)
        .map(([key]) => key)
        .join(',');
      
      // Step 2: Run scan with selected rules
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('rules', selectedRuleKeys || 'all');

      const response = await fetch(`${apiUrl}/api/simple-upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedScan(result);
        setShowResultsModal(true);
        setUploadFile(null);
        setProfileData(null);
        
        // Refresh history
        const historyRes = await fetch(`${apiUrl}/api/summary`);
        if (historyRes.ok) {
          const data = await historyRes.json();
          setScanHistory(data.recent_scans || []);
        }
      } else {
        const error = await response.json();
        setUploadError(error.detail || 'Scan failed');
      }
    } catch (err) {
      setUploadError(err.message || 'Scan error');
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
              <p className="rules-info-text">💡 Tip: Select rules to see which 13 backend checks they include</p>
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
                      {rule.checkCount > 0 && (
                        <span className="check-count">📋 {rule.checkCount} checks</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="selected-summary">
                <strong>{Object.values(selectedRules).filter(Boolean).length}/{Object.keys(selectedRules).length}</strong> rule categories selected
                <br/>
                <span className="total-checks-info">
                  📊 Running <strong>13 backend checks</strong> (always includes all data quality checks)
                </span>
              </div>
            </div>

            {/* SCAN BUTTON */}
            <button
              className={`btn-scan ${uploading ? 'loading' : ''}`}
              onClick={handleFileUpload}
              disabled={uploading || !uploadFile}
            >
              {uploading ? (profileData ? '⏳ Scanning with selected rules...' : '⏳ Analyzing data...') : '🚀 Upload & Review'}
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
                  <h3>🔍 Checks by Category</h3>
                  <p className="category-info">Below shows all {selectedScan.total_checks} checks organized by rule category</p>
                  
                  {Object.entries(groupChecksByCategory(selectedScan.check_details)).map(([categoryKey, categoryData]) => {
                    const rule = rules[categoryKey];
                    const totalInCategory = categoryData.passed.length + categoryData.failed.length;
                    
                    if (totalInCategory === 0) return null;
                    
                    const categoryStatus = categoryData.failed.length === 0 ? 'pass' : categoryData.failed.length === totalInCategory ? 'fail' : 'partial';
                    
                    return (
                      <div key={categoryKey} className={`category-section category-${categoryStatus}`} style={{ borderLeftColor: rule.color }}>
                        <div className="category-header">
                          <h4>{rule.name}</h4>
                          <span className="category-badges">
                            <span className="badge passed">{categoryData.passed.length} ✅</span>
                            {categoryData.failed.length > 0 && (
                              <span className="badge failed">{categoryData.failed.length} ❌</span>
                            )}
                          </span>
                        </div>
                        
                        {/* Passed checks in category */}
                        {categoryData.passed.length > 0 && (
                          <div className="category-checks passed">
                            {categoryData.passed.map((check, idx) => (
                              <div key={`${categoryKey}-pass-${idx}`} className="check-item check-pass">
                                <span className="check-name">✅ {check.name}</span>
                                {check.column && <span className="check-column">[{check.column}]</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Failed checks in category */}
                        {categoryData.failed.length > 0 && (
                          <div className="category-checks failed">
                            {categoryData.failed.map((check, idx) => (
                              <div key={`${categoryKey}-fail-${idx}`} className="check-item check-fail">
                                <div className="check-name">❌ {check.name}</div>
                                {check.column && <div className="check-column">[{check.column}]</div>}
                                <div className="check-failure-details">
                                  {check.diagnostics?.value !== undefined && (
                                    <div className="failure-reason">
                                      <span className="label">📍 Found:</span>
                                      <span className="value">{JSON.stringify(check.diagnostics.value)}</span>
                                    </div>
                                  )}
                                  {check.diagnostics?.fail && (
                                    <div className="failure-reason">
                                      <span className="label">🎯 Expected:</span>
                                      <span className="value">{JSON.stringify(check.diagnostics.fail)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DATA PROFILE MODAL */}
      {showProfileModal && profileData && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn-close"
              onClick={() => setShowProfileModal(false)}
            >
              ✕
            </button>

            <h2>📊 Data Profile & Rule Selection</h2>

            <div className="modal-body">
              {/* Data Profile Info */}
              <div className="profile-section">
                <h3>📈 Data Profile</h3>
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="label">📋 File</span>
                    <span className="value">{profileData.filename}</span>
                  </div>
                  <div className="profile-item">
                    <span className="label">📊 Rows</span>
                    <span className="value">{profileData.row_count}</span>
                  </div>
                  <div className="profile-item">
                    <span className="label">📑 Columns</span>
                    <span className="value">{profileData.column_count}</span>
                  </div>
                  <div className="profile-item">
                    <span className="label">⚠️ Missing Values</span>
                    <span className="value">{profileData.data_quality_indicators.has_missing_values ? '❌ Yes' : '✅ No'}</span>
                  </div>
                  <div className="profile-item">
                    <span className="label">🔁 Duplicates</span>
                    <span className="value">{profileData.data_quality_indicators.has_duplicates ? '❌ Yes' : '✅ No'}</span>
                  </div>
                  <div className="profile-item">
                    <span className="label">🔤 Empty Strings</span>
                    <span className="value">{profileData.data_quality_indicators.empty_strings}</span>
                  </div>
                </div>
              </div>

              {/* Column Info */}
              <div className="profile-section">
                <h3>📍 Columns ({profileData.column_count})</h3>
                <div className="columns-list">
                  {profileData.columns.map((col, idx) => (
                    <div key={idx} className="column-item">
                      <span className="col-name">{col}</span>
                      <span className="col-type">{profileData.dtypes[col]}</span>
                      <span className="col-missing">{profileData.missing_percent[col]}% missing</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Data */}
              <div className="profile-section">
                <h3>👁️ Sample Data (first 5 rows)</h3>
                <div className="sample-data">
                  <table>
                    <thead>
                      <tr>
                        {profileData.columns.map((col, idx) => (
                          <th key={idx}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.sample_data.map((row, ridx) => (
                        <tr key={ridx}>
                          {profileData.columns.map((col, cidx) => (
                            <td key={cidx}>{String(row[col] || '—').substring(0, 20)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rules Selection Reminder */}
              <div className="profile-section">
                <h3>✅ Selected Rules for Scanning</h3>
                <p className="rule-count-info">
                  {Object.values(selectedRules).filter(Boolean).length}/{Object.keys(selectedRules).length} categories selected
                  <br/>
                  <small>Running only checks for selected categories</small>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowProfileModal(false)}
                >
                  ← Back to Rules
                </button>
                <button
                  className="btn-primary"
                  onClick={handleScanWithSelectedRules}
                  disabled={uploading}
                >
                  {uploading ? '⏳ Scanning...' : '🚀 Scan with Selected Rules'}
                </button>
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
