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
  const [checksToExecute, setChecksToExecute] = useState([]);
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
      setSuggestions(data.suggestions || []);  // Extract suggestions array
      setCurrentStep(3);
    } catch (err) {
      setError(`Suggestions generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const preparePlan = (checks) => {
    // Move to Step 4 (Plan Review) without executing yet
    setChecksToExecute(checks);
    setCurrentStep(4);
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
          metadata_snapshot_id: metadata?.snapshot_id || null,
          connection_id: selectedConnection?.id || null,
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
              
              <div className="suggestions-container">
                {Array.isArray(suggestions) && suggestions.length > 0 ? (
                  <div className="suggestions-list">
                    <h3>🤖 AI-Recommended Checks</h3>
                    <p className="subtitle">Based on your data analysis:</p>
                    {suggestions.map((check, idx) => (
                      <div key={idx} className="suggestion-item">
                        <input type="checkbox" defaultChecked id={`ai-check-${idx}`} />
                        <div className="check-details">
                          <label htmlFor={`ai-check-${idx}`}><strong>{check.check_name || check.name}</strong></label>
                          <span className="check-type">{check.check_type}</span>
                          <span className="confidence">{Math.round((check.confidence || 0) * 100)}% confidence</span>
                          {check.rationale && <p className="rationale">{check.rationale}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="note">No AI suggestions available.</p>
                )}
                
                <div className="manual-selection">
                  <h3>📋 Soda Native Checks</h3>
                  <p className="subtitle">Or manually add Soda checks by column:</p>
                  {metadata && metadata.schema && metadata.schema.columns && (
                    <div className="columns-grid">
                      {metadata.schema.columns.map((col, idx) => (
                        <div key={idx} className="column-selector">
                          <label><strong>{col.name}</strong> <span className="type">({col.type})</span></label>
                          <div className="check-options">
                            <input type="checkbox" id={`col-${idx}-not-null`} />
                            <label htmlFor={`col-${idx}-not-null`}>missing_count (nulls)</label>
                            
                            <input type="checkbox" id={`col-${idx}-duplicate`} />
                            <label htmlFor={`col-${idx}-duplicate`}>duplicate_count</label>
                            
                            <input type="checkbox" id={`col-${idx}-invalid`} />
                            <label htmlFor={`col-${idx}-invalid`}>invalid_count (pattern)</label>
                            
                            <input type="checkbox" id={`col-${idx}-outlier`} />
                            <label htmlFor={`col-${idx}-outlier`}>outlier_count</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    // Collect AI suggestions that are checked
                    const checkedAI = Array.from(document.querySelectorAll('input[id^="ai-check-"]:checked'))
                      .map(cb => {
                        const idx = parseInt(cb.id.replace('ai-check-', ''));
                        return suggestions[idx];
                      })
                      .filter(s => s);
                    
                    // Collect manually selected Soda checks
                    const manualChecks = [];
                    if (metadata && metadata.schema) {
                      metadata.schema.columns.forEach((col, colIdx) => {
                        const checks = {
                          'not-null': 'missing_count',
                          'duplicate': 'duplicate_count',
                          'invalid': 'invalid_count',
                          'outlier': 'outlier_count'
                        };
                        
                        for (const [key, checkType] of Object.entries(checks)) {
                          const cb = document.getElementById(`col-${colIdx}-${key}`);
                          if (cb && cb.checked) {
                            manualChecks.push({
                              column: col.name,
                              check_type: checkType,
                              name: `${col.name} - ${checkType}`
                            });
                          }
                        }
                      });
                    }
                    
                    const allChecks = [...checkedAI, ...manualChecks];
                    
                    if (allChecks.length > 0) {
                      preparePlan(allChecks);
                    } else {
                      setError('Please select at least one check');
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ Creating Plan...' : `Create & Execute Plan → (${suggestions?.length || 0} suggested)`}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Plan Review & Execution */}
          {currentStep === 4 && checksToExecute && (
            <div className="step-content">
              <h2>📋 Step 4: Review & Execute Checks</h2>
              <p>Review your selected checks before execution:</p>
              
              <div className="plan-review">
                <div className="checks-summary">
                  <h3>Selected Checks ({checksToExecute.length})</h3>
                  <div className="checks-list">
                    {checksToExecute.map((check, idx) => (
                      <div key={idx} className="check-item-review">
                        <div className="check-info">
                          <strong>{check.check_name || check.name}</strong>
                          {check.column && <span className="column-badge">{check.column}</span>}
                          {check.check_type && <span className="type-badge">{check.check_type}</span>}
                          {check.confidence && <span className="confidence-badge">{Math.round(check.confidence * 100)}%</span>}
                        </div>
                        <button
                          className="btn-remove"
                          onClick={() => {
                            setChecksToExecute(checksToExecute.filter((_, i) => i !== idx));
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="add-check-section">
                  <h3>Add More Checks</h3>
                  <div className="quick-add-checks">
                    {metadata && metadata.schema && metadata.schema.columns && (
                      <>
                        <p className="subtitle">Quick add by column:</p>
                        <div className="quick-add-grid">
                          {metadata.schema.columns.map((col, colIdx) => (
                            <button
                              key={colIdx}
                              className="quick-add-btn"
                              onClick={() => {
                                const newCheck = {
                                  column: col.name,
                                  check_type: 'missing_count',
                                  name: `${col.name} - missing_count`
                                };
                                setChecksToExecute([...checksToExecute, newCheck]);
                              }}
                            >
                              + {col.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setCurrentStep(3);
                    setChecksToExecute([]);
                  }}
                  disabled={loading}
                >
                  ← Back to Selection
                </button>
                <button
                  className="btn-primary"
                  onClick={() => createCheckPlan(checksToExecute)}
                  disabled={loading || checksToExecute.length === 0}
                >
                  {loading ? '⏳ Executing...' : `Execute ${checksToExecute.length} Checks →`}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Results & Reports */}
          {currentStep === 5 && runResults && (
            <div className="step-content">
              <h2>📈 Step 5: Results & Reports</h2>
              
              <div className="results-display">
                <div className="result-card">
                  <h3>✓ Check Execution Complete</h3>
                  <div className="result-summary">
                    <div className="summary-stat">
                      <span className="stat-label">Total Checks:</span>
                      <span className="stat-value">{runResults.total_checks || checksToExecute.length}</span>
                    </div>
                    <div className="summary-stat passed">
                      <span className="stat-label">Passed:</span>
                      <span className="stat-value">{runResults.passed_checks || 0}</span>
                    </div>
                    <div className="summary-stat failed">
                      <span className="stat-label">Failed:</span>
                      <span className="stat-value">{runResults.failed_checks || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-label">Status:</span>
                      <span className="stat-value">{runResults.status || 'completed'}</span>
                    </div>
                  </div>
                  
                  {checksToExecute && checksToExecute.length > 0 && (
                    <div className="detailed-results">
                      <h4>Executed Checks Details:</h4>
                      <div className="checks-results-list">
                        {checksToExecute.map((check, idx) => (
                          <div key={idx} className="check-result-item">
                            <div className="check-result-header">
                              <span className="check-name">✓ {check.check_name || check.name}</span>
                              {check.column && <span className="column-tag">{check.column}</span>}
                              {check.check_type && <span className="type-tag">{check.check_type}</span>}
                            </div>
                            <div className="check-result-details">
                              {check.rationale && <p className="rationale"><strong>Rationale:</strong> {check.rationale}</p>}
                              {check.suggested_check_yaml && (
                                <div className="yaml-preview">
                                  <details>
                                    <summary>View YAML Config</summary>
                                    <pre>{check.suggested_check_yaml}</pre>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                      setChecksToExecute([]);
                      setRunResults(null);
                    }}
                  >
                    ↻ Start New Check
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      const report = `Data Quality Check Results\n${'='.repeat(50)}\nTotal Checks: ${checksToExecute.length}\nStatus: ${runResults.status}\n\nChecks Executed:\n${checksToExecute.map(c => `- ${c.check_name || c.name}`).join('\n')}`;
                      const blob = new Blob([report], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `dq-report-${Date.now()}.txt`;
                      a.click();
                    }}
                  >
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
