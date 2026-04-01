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
      formData.append('table_name', uploadFile.name.replace('.csv', '').toLowerCase());

      const response = await fetch(`${apiUrl}/api/scan`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult({
          success: true,
          message: 'File uploaded and scanned successfully!',
          data: result
        });
        setUploadFile(null);
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
        <p>Next-generation data quality monitoring</p>
      </header>

      <main className="container">
        {/* File Upload Section */}
        <section className="upload-section">
          <h2>📤 Upload CSV File for Data Quality Scan</h2>
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
              {uploading ? '⏳ Uploading...' : '🚀 Scan Data Quality'}
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
              {uploadResult.data && (
                <pre>{JSON.stringify(uploadResult.data, null, 2)}</pre>
              )}
            </div>
          )}
        </section>

        {/* Dashboard Section */}
        <section className="dashboard">
          <div className="card">
            <h2>API Status</h2>
            {loading ? (
              <p>Loading API status...</p>
            ) : (
              <div className="status-info">
                <p><strong>Status:</strong> {data?.status || 'offline'}</p>
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
              <li>✅ AI-Powered Anomaly Detection</li>
              <li>✅ Historical Tracking &amp; Trends</li>
              <li>✅ Multi-Channel Alerting</li>
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
        </section>
      </main>

      <footer className="footer">
        <p>Enterprise Data Quality Platform v1.0.0</p>
      </footer>
    </div>
  );
}

export default App;
