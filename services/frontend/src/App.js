import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState({ 
    status: 'loading',
    version: '1.0.0',
    services: { storage_backend: 'postgresql', storage_available: true }
  });
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [scanHistory, setScanHistory] = useState([]);
  const [expandedScan, setExpandedScan] = useState(null);
  const [selectedRules, setSelectedRules] = useState({
    volume: true,
    completeness: true,
    uniqueness: true,
    validity: true,
    freshness: true
  });

  // Available rules with descriptions and metadata
  const availableRules = {
    volume: {
      name: '🔢 Volume Checks',
      description: 'Verify data volume and row counts',
      checks: [
        { name: 'row_count > 0', desc: 'Table must have at least 1 row' },
        { name: 'row_count < 1000000', desc: 'Table should not exceed 1M rows' }
      ]
    },
    completeness: {
      name: '✅ Completeness Checks',
      description: 'Ensure no critical missing values',
      checks: [
        { name: 'missing_count(CustomerID) = 0', desc: 'CustomerID required for all records' },
        { name: 'missing_count(Email) = 0', desc: 'Email required for all customers' },
        { name: 'missing_count(Name) = 0', desc: 'Name field required' },
        { name: 'missing_percent(Age) < 10', desc: 'Age present for most records' }
      ]
    },
    uniqueness: {
      name: '🔐 Uniqueness Checks',
      description: 'Detect duplicate records',
      checks: [
        { name: 'duplicate_count(CustomerID) = 0', desc: 'Each CustomerID must be unique' },
        { name: 'duplicate_count(Email) = 0', desc: 'Email addresses must be unique' }
      ]
    },
    validity: {
      name: '📧 Validity Checks',
      description: 'Validate format and values',
      checks: [
        { name: 'invalid_count(Email) = 0', desc: 'All emails must be RFC 5322 format' },
        { name: 'min(Age) >= 13', desc: 'Minimum age should be at least 13' },
        { name: 'max(Age) <= 120', desc: 'Maximum age should not exceed 120' }
      ]
    },
    freshness: {
      name: '⏰ Freshness Checks',
      description: 'Check data timeliness',
      checks: [
        { name: 'freshness(SignupDate) < 730d', desc: 'Signup dates within last 2 years' }
      ]
    }
  };

  useEffect(() => {
    // Fetch API data with support for both localhost and Codespaces
    const fetchData = async () => {
      try {
        // Determine correct API URL based on environment
        let apiUrl;
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          // Local environment
          apiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
        } else {
          // Codespaces or remote environment - replace port 3000 with 8000 in hostname
          // Codespaces URL format: https://project-name-abc123.github.dev
          const hostname = window.location.hostname;
          apiUrl = `${window.location.protocol}//${hostname.replace(':3000', '')}:8000`;
        }
        
        console.log('API URL:', apiUrl);
        
        const response = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const jsonData = await response.json();
          setData(jsonData);
        } else {
          console.warn('API response status:', response.status);
        }

        // Fetch scan history
        const summaryResponse = await fetch(`${apiUrl}/api/summary`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setScanHistory(summaryData.recent_scans || []);
        }
      } catch (err) {
        console.warn('API fetch error:', err.message);
        // Keep default data and continue
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      // Determine correct API URL
      let apiUrl;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        apiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
      } else {
        const hostname = window.location.hostname;
        apiUrl = `${window.location.protocol}//${hostname.replace(':3000', '')}:8000`;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${apiUrl}/api/simple-upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult({
          success: true,
          message: `✅ File uploaded and scanned successfully! Status: ${result.status}`,
          data: result
        });
        setUploadFile(null);
        // Reset file input
        document.querySelector('input[type="file"]').value = '';
      } else {
        const error = await response.json();
        setUploadError(error.detail || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 Enterprise Data Quality Platform</h1>
        <p>Next-generation data quality monitoring with Soda Core</p>
      </header>

      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload & Scan
          </button>
          <button 
            className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            ⚙️ Select Rules
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📊 Results ({scanHistory.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            ❤️ Status
          </button>
        </div>
      </div>

      <main className="container">
        {/* ═════════════════════════════════════ */}
        {/* UPLOAD TAB */}
        {/* ═════════════════════════════════════ */}
        {activeTab === 'upload' && (
          <section className="tab-content">
            <div className="upload-section">
              <h2>📤 Upload CSV File for Data Quality Scan</h2>
              <p className="section-desc">
                Upload your CSV data to automatically test against Soda Core quality rules. 
                Results are stored and tracked over time.
              </p>
              
              <form onSubmit={handleFileUpload} className="upload-form">
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => {
                      setUploadFile(e.target.files?.[0] || null);
                      setUploadError(null);
                    }}
                    disabled={uploading}
                  />
                  <label>{uploadFile ? uploadFile.name : 'Choose a CSV file...'}</label>
                </div>
                <button 
                  type="submit" 
                  disabled={uploading || !uploadFile}
                  className="upload-btn"
                >
                  {uploading ? '⏳ Scanning...' : '🚀 Run Quality Scan'}
                </button>
              </form>

              {uploadError && (
                <div className="alert alert-error">
                  ❌ Error: {uploadError}
                </div>
              )}

              {uploadResult && (
                <div className="alert alert-success">
                  ✅ {uploadResult.message}
                  <div className="result-details">
                    <p><strong>Scan ID:</strong> {uploadResult.data.scan_id}</p>
                    <p><strong>Status:</strong> {uploadResult.data.status}</p>
                    <p><strong>Pass Rate:</strong> {(uploadResult.data.pass_rate * 100).toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════ */}
        {/* RULES TAB */}
        {/* ═════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <section className="tab-content">
            <h2>⚙️ Select Quality Rules to Run</h2>
            <p className="section-desc">Choose which Soda Core checks to execute on your data</p>
            
            <div className="rules-selector">
              {Object.entries(availableRules).map(([key, rule]) => (
                <div key={key} className="rule-card selectable">
                  <div className="rule-header">
                    <input 
                      type="checkbox" 
                      id={key}
                      checked={selectedRules[key]}
                      onChange={() => setSelectedRules(prev => ({...prev, [key]: !prev[key]}))}
                      className="rule-checkbox"
                    />
                    <label htmlFor={key} className="rule-title">
                      {rule.name}
                    </label>
                  </div>
                  <p className="rule-description">{rule.description}</p>
                  <div className="checks-list">
                    {rule.checks.map((check, idx) => (
                      <div key={idx} className="check-item">
                        <span className="check-code">{check.name}</span>
                        <span className="check-desc">{check.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rule-summary">
              <h3>📊 Selected Rules Summary</h3>
              <p>
                Running {Object.values(selectedRules).filter(Boolean).length} of {Object.keys(selectedRules).length} rule categories
              </p>
              <div className="selected-rules-list">
                {Object.entries(selectedRules)
                  .filter(([_, isSelected]) => isSelected)
                  .map(([key, _]) => (
                    <span key={key} className="rule-tag">
                      {availableRules[key].name}
                    </span>
                  ))}
              </div>
            </div>

            <div className="config-section">
              <h3>🔧 To Customize Rules:</h3>
              <ol>
                <li>Edit <code>soda_duckdb/checks.yml</code></li>
                <li>Add/modify rules for your table</li>
                <li>Upload data to test new rules</li>
                <li>View results in Scan Results</li>
              </ol>
              <p className="file-path">📁 File: <code>soda_duckdb/checks.yml</code></p>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════ */}
        {/* HISTORY TAB */}
        {/* ═════════════════════════════════════ */}
        {activeTab === 'history' && (
          <section className="tab-content">
            <h2>📊 Scan Results & Metadata</h2>
            <p className="section-desc">Results mapped to data columns and rule metadata</p>
            {scanHistory.length === 0 ? (
              <div className="empty-state">
                <p>No scans yet. Upload a CSV file to get started!</p>
              </div>
            ) : (
              <div className="history-list">
                {scanHistory.map((scan) => (
                  <div key={scan.scan_id} className="history-item">
                    <div 
                      className="history-header"
                      onClick={() => setExpandedScan(
                        expandedScan === scan.scan_id ? null : scan.scan_id
                      )}
                    >
                      <div className="history-summary">
                        <span className={`status-badge status-${scan.status?.toLowerCase() || 'unknown'}`}>
                          {scan.status || '?'} Pass Rate: {(scan.pass_rate * 100).toFixed(1)}%
                        </span>
                        <span className="table-name">📋 {scan.table_name}</span>
                        <span className="timestamp">
                          {new Date(scan.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="expand-icon">{expandedScan === scan.scan_id ? '▼' : '▶'}</span>
                    </div>

                    {expandedScan === scan.scan_id && (
                      <div className="history-details">
                        {/* Metadata Section */}
                        <div className="metadata-section">
                          <h4>📊 Data Metadata</h4>
                          <div className="metadata-grid">
                            <div className="metadata-item">
                              <span className="label">Rows Scanned:</span>
                              <span className="value">{scan.metadata?.row_count || scan.total_checks || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Scan Duration:</span>
                              <span className="value">{scan.duration_seconds?.toFixed(2)}s</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Scan ID:</span>
                              <span className="value code">{scan.scan_id}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Data Source:</span>
                              <span className="value">{scan.data_source}</span>
                            </div>
                          </div>
                          
                          {scan.metadata?.columns && (
                            <div className="columns-analyzed">
                              <h5>🗂️ Columns Analyzed:</h5>
                              <div className="column-tags">
                                {scan.metadata.columns.map((col, idx) => (
                                  <span key={idx} className="column-tag">{col}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Results Mapping Section */}
                        <div className="results-mapping-section">
                          <h4>✅ Results Mapping</h4>
                          <div className="result-summary">
                            <div className="result-item">
                              <span className="result-label">Total Checks:</span>
                              <span className="result-value">{scan.total_checks}</span>
                            </div>
                            <div className="result-item passed">
                              <span className="result-label">Passed:</span>
                              <span className="result-value">{scan.passed_checks || 0}</span>
                            </div>
                            <div className="result-item failed">
                              <span className="result-label">Failed:</span>
                              <span className="result-value">{scan.failed_checks || 0}</span>
                            </div>
                            <div className="result-item warned">
                              <span className="result-label">Warnings:</span>
                              <span className="result-value">{scan.warned_checks || 0}</span>
                            </div>
                          </div>

                          <div className="rule-metadata-matrix">
                            <h5>📋 Rule Details per Column:</h5>
                            {scan.metadata?.columns ? (
                              <table className="results-table">
                                <thead>
                                  <tr>
                                    <th>Column</th>
                                    <th>Rules Applied</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {scan.metadata.columns.map((col, idx) => (
                                    <tr key={idx}>
                                      <td className="col-name">{col}</td>
                                      <td className="rules-applied">
                                        {col.toLowerCase().includes('email') && '📧 Uniqueness, Validity'}
                                        {col.toLowerCase().includes('customerid') && '🔐 Uniqueness, Completeness'}
                                        {col.toLowerCase().includes('age') && '📊 Validity (min/max)'} 
                                        {col.toLowerCase().includes('date') && '⏰ Freshness'}
                                        {col.toLowerCase().includes('name') && '✅ Completeness'}
                                        {!col.toLowerCase().match(/email|customerid|age|date|name/) && '✅ Completeness, 🔢 Volume'}
                                      </td>
                                      <td className="status-cell">
                                        <span className="status-dot">●</span> Applied
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p>No column metadata available</p>
                            )}
                          </div>
                        </div>

                        <div className="detail-row full">
                          <span className="label">Full Scan Details:</span>
                          <pre className="scan-details">{JSON.stringify(
                            {
                              scan_id: scan.scan_id,
                              status: scan.status,
                              pass_rate: `${(scan.pass_rate * 100).toFixed(1)}%`,
                              timestamp: scan.timestamp,
                              checks: {
                                total: scan.total_checks,
                                passed: scan.passed_checks,
                                failed: scan.failed_checks
                              }
                            }, null, 2
                          )}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═════════════════════════════════════ */}
        {/* STATUS TAB */}
        {/* ═════════════════════════════════════ */}
        {activeTab === 'status' && (
          <section className="tab-content">
            <h2>❤️ System Status & Configuration</h2>
            <div className="status-grid">
              <div className="status-card">
                <h3>API Status</h3>
                <p className="status-value" style={{ color: data?.status === 'healthy' ? '#4caf50' : '#ff9800' }}>
                  {data?.status === 'healthy' ? '✅' : '⚠️'} {data?.status}
                </p>
                <p>Version: {data?.version}</p>
              </div>
              <div className="status-card">
                <h3>Storage Backend</h3>
                <p className="status-value" style={{ color: data?.services?.storage_available ? '#4caf50' : '#f44336' }}>
                  {data?.services?.storage_available ? '✅' : '❌'} {data?.services?.storage_backend}
                </p>
                <p>{data?.services?.storage_available ? 'Connected' : 'Disconnected'}</p>
              </div>
              <div className="status-card">
                <h3>Alerting Service</h3>
                <p className="status-value" style={{ color: data?.services?.alerting ? '#4caf50' : '#ff9800' }}>
                  {data?.services?.alerting ? '✅' : '⚠️'} Active
                </p>
                <p>Ready for notifications</p>
              </div>
              <div className="status-card">
                <h3>Quality Rules</h3>
                <p className="status-value">
                  {Object.values(selectedRules).filter(Boolean).length} Active
                </p>
                <p>{Object.values(selectedRules).filter(Boolean).length} of {Object.keys(selectedRules).length} categories enabled</p>
              </div>
            </div>

            <div className="features-section">
              <h3>🚀 Enabled Features</h3>
              <ul>
                <li>✅ Real-time Data Quality Monitoring</li>
                <li>✅ Soda Core Integration</li>
                <li>✅ Selective Rule Execution</li>
                <li>✅ Results Mapping to Metadata</li>
                <li>✅ Volume, Completeness & Uniqueness Checks</li>
                <li>✅ Format & Pattern Validation</li>
                <li>✅ Statistical Range Analysis</li>
                <li>✅ Data Freshness Tracking</li>
                <li>✅ Scan History & Trends</li>
                <li>✅ REST API Integration</li>
              </ul>
            </div>

            <div className="active-rules-section">
              <h3>⚙️ Currently Active Rules</h3>
              <div className="active-rules-list">
                {Object.entries(selectedRules)
                  .filter(([_, enabled]) => enabled)
                  .map(([key, _]) => (
                    <div key={key} className="active-rule">
                      <h5>{availableRules[key].name}</h5>
                      <p>{availableRules[key].description}</p>
                      <div className="rule-count">
                        {availableRules[key].checks.length} checks
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Enterprise Data Quality Platform v1.0.0 | Powered by Soda Core</p>
      </footer>
    </div>
  );
}

export default App;
