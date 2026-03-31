import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/health');
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
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
            {loading && <p>Loading...</p>}
            {error && <p className="error">Error: {error}</p>}
            {data && (
              <div className="status-info">
                <p><strong>Status:</strong> {data.status}</p>
                <p><strong>Version:</strong> {data.version}</p>
                <p><strong>Storage Backend:</strong> {data.services?.storage_backend}</p>
                <p className={data.services?.storage_available ? 'success' : 'error'}>
                  <strong>Storage Available:</strong> {data.services?.storage_available ? 'Yes ✓' : 'No ✗'}
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Features</h2>
            <ul>
              <li>✅ Real-time Data Quality Monitoring</li>
              <li>✅ AI-Powered Anomaly Detection</li>
              <li>✅ Historical Tracking & Trends</li>
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
