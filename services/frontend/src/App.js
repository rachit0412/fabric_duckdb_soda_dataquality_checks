import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState({ 
    status: 'loading',
    version: '1.0.0',
    services: { storage_backend: 'postgresql', storage_available: true }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch API data
    const fetchData = async () => {
      try {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const apiUrl = `${protocol}//${hostname}:8000`;
        
        const response = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          const jsonData = await response.json();
          setData(jsonData);
        }
      } catch (err) {
        console.warn('API connection warning:', err.message);
        // Keep default data
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 Enterprise Data Quality Platform</h1>
        <p>Next-generation data quality monitoring</p>
      </header>

      <main className="container">
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
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">
                📚 API Documentation
              </a>
              <a href="http://localhost:8000/api/health" target="_blank" rel="noopener noreferrer">
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
