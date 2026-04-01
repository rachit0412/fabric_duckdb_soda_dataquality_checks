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
  const [selectedScan, setSelectedScan] = useState(null);

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
            📋 Quality Rules (Soda)
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📊 Scan History ({scanHistory.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            ❤️ System Status
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
            <div className="rules-section">
              <h2>📋 Data Quality Rules (Soda Core)</h2>
              <p className="section-desc">
                These rules are automatically tested when you upload data. Customize them in the configuration files.
              </p>

              <div className="rules-grid">
                <div className="rule-card">
                  <h3>🔢 Volume Checks</h3>
                  <ul>
                    <li><code>row_count &gt; 0</code> - Data must exist</li>
                    <li><code>row_count &lt; 1M</code> - Reasonable size</li>
                  </ul>
                  <p className="rule-note">Validates that datasets have expected size</p>
                </div>

                <div className="rule-card">
                  <h3>✅ Completeness</h3>
                  <ul>
                    <li><code>missing_count(col) = 0</code> - No nulls</li>
                    <li><code>missing_percent(col) &lt; 5%</code> - Mostly complete</li>
                  </ul>
                  <p className="rule-note">Checks for missing or null values</p>
                </div>

                <div className="rule-card">
                  <h3>🔐 Uniqueness</h3>
                  <ul>
                    <li><code>duplicate_count(col) = 0</code> - No duplicates</li>
                  </ul>
                  <p className="rule-note">Primary key and unique constraint validation</p>
                </div>

                <div className="rule-card">
                  <h3>📧 Validity</h3>
                  <ul>
                    <li><code>invalid_count(email) = 0</code> - Email format</li>
                    <li><code>valid format: email</code> - RFC 5322</li>
                  </ul>
                  <p className="rule-note">Format and pattern validation</p>
                </div>

                <div className="rule-card">
                  <h3>📊 Statistical</h3>
                  <ul>
                    <li><code>min(col) &gt;= value</code> - Minimum bound</li>
                    <li><code>max(col) &lt;= value</code> - Maximum bound</li>
                    <li><code>avg(col) between X and Y</code> - Range check</li>
                  </ul>
                  <p className="rule-note">Numeric range and distribution validation</p>
                </div>

                <div className="rule-card">
                  <h3>⏰ Freshness</h3>
                  <ul>
                    <li><code>freshness(date_col) &lt; 7d</code> - Recent data</li>
                  </ul>
                  <p className="rule-note">Data timeliness validation</p>
                </div>
              </div>

              <div className="config-section">
                <h3>🔧 To Customize Rules:</h3>
                <ol>
                  <li>Edit <code>soda_duckdb/checks.yml</code></li>
                  <li>Add/modify rules for your table</li>
                  <li>Upload data to test new rules</li>
                  <li>View results in Scan History</li>
                </ol>
                <p className="file-path">📁 File: <code>soda_duckdb/checks.yml</code></p>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════ */}
        {/* HISTORY TAB */}
        {/* ═════════════════════════════════════ */}
        {activeTab === 'history' && (
          <section className="tab-content">
            <div className="history-section">
              <h2>📊 Scan History</h2>
              <p className="section-desc">Track all your data quality scans and results over time</p>

              {scanHistory.length === 0 ? (
                <div className="empty-state">
                  <p>No scans yet. Upload a CSV file to get started!</p>
                </div>
              ) : (
                <div className="history-list">
                  {scanHistory.map((scan) => (
                    <div 
                      key={scan.scan_id} 
                      className={`history-item ${scan.status.toLowerCase()}`}
                      onClick={() => setSelectedScan(selectedScan?.scan_id === scan.scan_id ? null : scan)}
                    >
                      <div className="history-header">
                        <div className="history-title">
                          <span className="status-badge">{scan.status}</span>
                          <span className="table-name">{scan.table_name}</span>
                        </div>
                        <div className="history-meta">
                          <span className="pass-rate">
                            {(scan.pass_rate * 100).toFixed(1)}% Pass
                          </span>
                          <span className="timestamp">
                            {new Date(scan.timestamp).toLocaleDateString()} {new Date(scan.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      
                      {selectedScan?.scan_id === scan.scan_id && (
                        <div className="history-details">
                          <p><strong>Scan ID:</strong> {scan.scan_id}</p>
                          <p><strong>Data Source:</strong> {scan.data_source}</p>
                          <p><strong>Duration:</strong> {scan.duration_seconds}s</p>
                          {scan.metadata && (
                            <>
                              <p><strong>Rows:</strong> {scan.metadata.row_count}</p>
                              <p><strong>Columns:</strong> {scan.metadata.columns?.join(', ')}</p>
                            </>
                          )}
                          <p><strong>Checks:</strong> {scan.total_checks} total</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════ */}
        {/* STATUS TAB */}
        {/* ═════════════════════════════════════ */}
        {activeTab === 'status' && (
          <section className="tab-content">
            <div className="dashboard">
              <div className="card">
                <h2>API Status</h2>
                {loading ? (
                  <p>Loading API status...</p>
                ) : (
                  <div className="status-info">
                    <p><strong>Status:</strong> <span className="status-healthy">{data?.status || 'offline'}</span></p>
                    <p><strong>Version:</strong> {data?.version || '1.0.0'}</p>
                    <p><strong>Storage Backend:</strong> {data?.services?.storage_backend || 'postgresql'}</p>
                    <p className={data?.services?.storage_available ? 'success' : 'error'}>
                      <strong>Storage:</strong> {data?.services?.storage_available ? '✅ Available' : '❌ Unavailable'}
                    </p>
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Features</h2>
                <ul>
                  <li>✅ Real-time Data Quality Monitoring</li>
                  <li>✅ Soda Core Integration</li>
                  <li>✅ Volume, Completeness & Uniqueness Checks</li>
                  <li>✅ Format & Pattern Validation</li>
                  <li>✅ Statistical Range Analysis</li>
                  <li>✅ Data Freshness Tracking</li>
                  <li>✅ Scan History & Trends</li>
                  <li>✅ REST API Integration</li>
                </ul>
              </div>

              <div className="card">
                <h2>Quick Links</h2>
                <div className="links">
                  <a href="/docs" target="_blank" rel="noopener noreferrer">
                    📚 API Documentation
                  </a>
                  <a href="/api/health" target="_blank" rel="noopener noreferrer">
                    ❤️ API Health Check
                  </a>
                </div>
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
