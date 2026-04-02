/**
 * Dashboard Component
 * Main workflow orchestrator: guides user through data quality checks
 */

import React, { useState, useEffect } from 'react';
import DataSourceConnectV2 from './DataSourceConnectV2';
import './Dashboard.css';

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1); // 1=Connect, 2=Profile, 3=Suggestions, 4=Plan, 5=Results
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [checkPlan, setCheckPlan] = useState(null);
  const [runResults, setRunResults] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);

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
            <div className="step-placeholder">
              <h2>📊 Step 2: Profile Metadata</h2>
              <p>Connection: <strong>{selectedConnection.name}</strong></p>
              <p className="note">🔨 Metadata profiling coming soon - will extract schema, data types, and statistics</p>
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(3)}
              >
                Continue to Suggestions →
              </button>
            </div>
          )}

          {/* Step 3: AI Suggestions */}
          {currentStep === 3 && (
            <div className="step-placeholder">
              <h2>🤖 Step 3: AI-Suggested Checks</h2>
              <p>🔨 AI suggestions coming soon - engine will recommend checks based on metadata</p>
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(4)}
              >
                Continue to Plan →
              </button>
            </div>
          )}

          {/* Step 4: Create Check Plan */}
          {currentStep === 4 && (
            <div className="step-placeholder">
              <h2>✅ Step 4: Create Check Plan</h2>
              <p>🔨 Check plan builder coming soon - select and customize quality checks</p>
              <button
                className="btn-primary"
                onClick={() => setCurrentStep(5)}
              >
                View Results →
              </button>
            </div>
          )}

          {/* Step 5: View Results */}
          {currentStep === 5 && (
            <div className="step-placeholder">
              <h2>📈 Step 5: Results & Reports</h2>
              <p>🔨 Results dashboard coming soon - visualize check outcomes and detailed reports</p>
              <button
                className="btn-secondary"
                onClick={() => setCurrentStep(1)}
              >
                Start New Check
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
