/**
 * Dashboard Component
 * Main workflow orchestrator: guides user through data quality checks
 */

import React, { useState, useEffect } from 'react';
import DataSourceConnectV2 from './DataSourceConnectV2';
import './Dashboard.css';

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [checkPlan, setCheckPlan] = useState(null);
  const [runResults, setRunResults] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = `http://${window.location.hostname}:8000/api/v1`;

  // Check API health on mount
  useEffect(() => {
    checkAPIHealth();
  }, []);

  const checkAPIHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      setApiStatus(response.ok ? 'healthy' : 'unhealthy');
    } catch {
      setApiStatus('offline');
    }
  };

  const handleConnectionCreated = (connection) => {
    setSelectedConnection(connection);
    setCurrentStep(2);
    profileMetadata(connection.id);
  };

  const profileMetadata = async (connectionId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/metadata/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const data = await res.json();
      setMetadata(data);
    } catch (err) {
      setError(`Metadata profiling failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async (connectionId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/suggestions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, limit: 10 }),
      });
      const data = await res.json();
      setSuggestions(data);
      setCurrentStep(3);
    } catch (err) {
      setError(`Suggestions generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createCheckPlan = async (checks) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/check-plans/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Plan_${Date.now()}`,
          connection_id: selectedConnection.id,
          checks: checks,
        }),
      });
      const data = await res.json();
      setCheckPlan(data);
      executeCheckPlan(data.id);
    } catch (err) {
      setError(`Check plan creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeCheckPlan = async (planId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/runs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_plan_id: planId }),
      });
      const data = await res.json();
      setRunResults(data);
      setCurrentStep(5);
    } catch (err) {
      setError(`Check execution failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToStep = (step) => {
    if (step > currentStep) return; // Can't jump ahead
    setCurrentStep(step);
  };

  const getStepStatus = (step) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'upcoming';
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📊 Data Quality Platform</h1>
          <p>Discover, validate, and monitor data quality with AI-powered checks</p>
        </div>
        <div className="api-status">
          <span className={`status-badge ${apiStatus}`}>
            {apiStatus === 'healthy' && '🟢 API Ready'}
            {apiStatus === 'unhealthy' && '🟠 API Unhealthy'}
            {apiStatus === 'offline' && '🔴 API Offline'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Sidebar - Progress Steps */}
        <aside className="progress-sidebar">
          <h3>Workflow Progress</h3>
          <ol className="steps-list">
            <li
              className={`step ${getStepStatus(1)}`}
              onClick={() => handleGoToStep(1)}
            >
              <span className="step-number">1</span>
              <span className="step-name">Connect Source</span>
            </li>
            <li
              className={`step ${getStepStatus(2)}`}
              onClick={() => handleGoToStep(2)}
            >
              <span className="step-number">2</span>
              <span className="step-name">Profile Metadata</span>
            </li>
            <li
              className={`step ${getStepStatus(3)}`}
              onClick={() => handleGoToStep(3)}
            >
              <span className="step-number">3</span>
              <span className="step-name">AI Suggestions</span>
            </li>
            <li
              className={`step ${getStepStatus(4)}`}
              onClick={() => handleGoToStep(4)}
            >
              <span className="step-number">4</span>
              <span className="step-name">Create Plan</span>
            </li>
            <li
              className={`step ${getStepStatus(5)}`}
              onClick={() => handleGoToStep(5)}
            >
              <span className="step-number">5</span>
              <span className="step-name">View Results</span>
            </li>
          </ol>

          {/* Selected Connection Display */}
          {selectedConnection && (
            <div className="selected-connection">
              <h4>Current Connection</h4>
              <div className="conn-info">
                <p className="conn-name">{selectedConnection.name}</p>
                <p className="conn-type">{selectedConnection.type.toUpperCase()}</p>
                <button
                  className="btn-change"
                  onClick={() => {
                    setSelectedConnection(null);
                    setCurrentStep(1);
                  }}
                >
                  Change Connection
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="content-area">
          {/* Step 1: Connect Data Source */}
          {currentStep === 1 && (
            <DataSourceConnectV2
              onConnectionCreated={handleConnectionCreated}
              onNext={handleConnectionCreated}
            />
          )}

          {/* Step 2: Profile Metadata */}
          {currentStep === 2 && selectedConnection && (
            <div className="step-content">
              <h2>📊 Step 2: Profile Metadata</h2>
              <p>Connection: <strong>{selectedConnection.name}</strong> ({selectedConnection.type.toUpperCase()})</p>
              
              {loading && <p className="loading">🔄 Analyzing data structure...</p>}
              {error && <p className="error-message">{error}</p>}
              
              {metadata && (
                <div className="metadata-display">
                  <div className="metadata-section">
                    <h3>📋 Schema Information</h3>
                    <pre>{JSON.stringify(metadata.schema || metadata, null, 2)}</pre>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => generateSuggestions(selectedConnection.id)}
                    disabled={loading}
                  >
                    {loading ? '⏳ Generating...' : 'Generate AI Suggestions →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: AI Suggestions */}
          {currentStep === 3 && suggestions && (
            <div className="step-content">
              <h2>🤖 Step 3: AI-Suggested Checks</h2>
              
              {loading && <p className="loading">🔄 Preparing checks...</p>}
              {error && <p className="error-message">{error}</p>}
              
              {Array.isArray(suggestions) && suggestions.length > 0 ? (
                <div className="suggestions-list">
                  <p>Recommended quality checks based on your data:</p>
                  {suggestions.slice(0, 5).map((check, idx) => (
                    <div key={idx} className="suggestion-item">
                      <input type="checkbox" defaultChecked id={`check-${idx}`} />
                      <label htmlFor={`check-${idx}`}>{check}</label>
                    </div>
                  ))}
                  <button
                    className="btn-primary"
                    onClick={() => createCheckPlan(suggestions.slice(0, 5))}
                    disabled={loading}
                  >
                    {loading ? '⏳ Creating Plan...' : 'Create & Execute Plan →'}
                  </button>
                </div>
              ) : (
                <p className="note">No suggestions available. Please verify the connection.</p>
              )}
            </div>
          )}

          {/* Step 4: Check Results */}
          {currentStep === 5 && runResults && (
            <div className="step-content">
              <h2>📈 Step 5: Results & Reports</h2>
              
              <div className="results-display">
                <div className="result-card">
                  <h3>✓ Check Execution Complete</h3>
                  <div className="result-info">
                    <p><strong>Status:</strong> {runResults.status || 'completed'}</p>
                    <p><strong>Checks Run:</strong> {runResults.checks_run || '5'}</p>
                    <p><strong>Passed:</strong> {runResults.passed || '-'}</p>
                    <p><strong>Failed:</strong> {runResults.failed || '-'}</p>
                  </div>
                  
                  {runResults.results && (
                    <div className="detailed-results">
                      <h4>Detailed Results:</h4>
                      <pre>{JSON.stringify(runResults.results, null, 2)}</pre>
                    </div>
                  )}
                </div>
                
                <div className="action-buttons">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setCurrentStep(1);
                      setSelectedConnection(null);
                      setMetadata(null);
                      setSuggestions(null);
                      setCheckPlan(null);
                      setRunResults(null);
                    }}
                  >
                    ↻ Start New Check
                  </button>
                  <button className="btn-secondary">
                    📥 Export Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fallback for steps in progress */}
          {currentStep === 2 && loading && (
            <div className="step-content">
              <h2>📊 Step 2: Profiling Metadata</h2>
              <p className="loading">🔄 Analyzing {selectedConnection?.name}...</p>
            </div>
          )}
          
          {currentStep === 3 && loading && (
            <div className="step-content">
              <h2>🤖 Step 3: Generating Suggestions</h2>
              <p className="loading">🔄 AI is analyzing your data...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
