import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkHealth();
    loadScans();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setHealth(response.data);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth({ status: 'unhealthy', error: error.message });
    }
  };

  const loadScans = async () => {
    try {
      // This would load recent scans from the API
      setScans([]);
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Data Quality Platform</h1>
        <div className={`status ${health?.status === 'healthy' ? 'healthy' : 'unhealthy'}`}>
          Status: {health?.status || 'Unknown'}
        </div>
      </header>

      <nav className="App-nav">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          Upload & Scan
        </button>
        <button
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </nav>

      <main className="App-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <h2>System Overview</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="stats">
                <div className="stat-card">
                  <h3>Total Scans</h3>
                  <p>{scans.length}</p>
                </div>
                <div className="stat-card">
                  <h3>System Health</h3>
                  <p>{health?.status}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="upload-section">
            <h2>Upload Data & Run Quality Checks</h2>
            <p>Upload functionality coming soon...</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="reports-section">
            <h2>Quality Reports</h2>
            <p>Reports functionality coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;