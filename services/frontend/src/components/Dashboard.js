/**
 * Dashboard Component
 * Main workflow orchestrator: guides user through data quality checks
 */

import React, { useState, useEffect } from 'react';
import DataSourceConnectV2 from './DataSourceConnectV2';
import ResultsVisualization from './ResultsVisualization';
import './Dashboard.css';

// SODA Core Native Checks - Comprehensive List
const SODA_CHECKS = {
  VOLUME: {
    category: '📊 Volume Checks',
    checks: [
      { id: 'row_count', label: 'row_count (Total rows)', description: 'Validates total number of rows', types: ['ALL'] },
      { id: 'row_count_range', label: 'row_count (Range)', description: 'Validates rows are within range', types: ['ALL'] },
    ]
  },
  COMPLETENESS: {
    category: '✅ Completeness Checks',
    checks: [
      { id: 'missing_count', label: 'missing_count (NULL/Empty)', description: 'Finds NULL or empty values', types: ['ALL'] },
      { id: 'missing_percent', label: 'missing_percent (% Missing)', description: 'Percentage of missing values', types: ['ALL'] },
      { id: 'valid_count', label: 'valid_count (Non-NULL)', description: 'Count of valid (non-NULL) rows', types: ['ALL'] },
    ]
  },
  UNIQUENESS: {
    category: '🔑 Uniqueness Checks',
    checks: [
      { id: 'duplicate_count', label: 'duplicate_count', description: 'Count of duplicate values', types: ['ALL'] },
      { id: 'invalid_percent', label: 'invalid_percent', description: 'Percentage of invalid values', types: ['ALL'] },
    ]
  },
  VALIDITY: {
    category: '📝 Validity Checks',
    checks: [
      { id: 'invalid_count', label: 'invalid_count (Pattern Match)', description: 'Invalid values matching pattern', types: ['STRING', 'VARCHAR', 'TEXT'] },
      { id: 'invalid_count_email', label: 'invalid_count (Email Format)', description: 'Invalid email addresses', types: ['STRING', 'VARCHAR', 'TEXT'] },
      { id: 'valid_emails', label: 'valid_count (Email Format)', description: 'Valid email addresses', types: ['STRING', 'VARCHAR', 'TEXT'] },
      { id: 'failed_rows', label: 'failed_rows (Custom Pattern)', description: 'Rows matching custom pattern', types: ['ALL'] },
    ]
  },
  STATISTICAL: {
    category: '📈 Statistical Checks',
    checks: [
      { id: 'min', label: 'min (Minimum Value)', description: 'Minimum value in column', types: ['NUMERIC', 'INT', 'FLOAT', 'DOUBLE', 'DATE', 'TIMESTAMP'] },
      { id: 'max', label: 'max (Maximum Value)', description: 'Maximum value in column', types: ['NUMERIC', 'INT', 'FLOAT', 'DOUBLE', 'DATE', 'TIMESTAMP'] },
      { id: 'avg', label: 'avg (Average/Mean)', description: 'Average of numeric values', types: ['NUMERIC', 'INT', 'FLOAT', 'DOUBLE'] },
      { id: 'stddev', label: 'stddev (Standard Deviation)', description: 'Standard deviation of values', types: ['NUMERIC', 'INT', 'FLOAT', 'DOUBLE'] },
      { id: 'values_between', label: 'values_between (Range)', description: 'Check value falls in range', types: ['NUMERIC', 'INT', 'FLOAT', 'DOUBLE', 'DATE', 'TIMESTAMP'] },
    ]
  },
  SCHEMA: {
    category: '🏗️ Schema Checks',
    checks: [
      { id: 'schema_type', label: 'schema_type (Type Match)', description: 'Validates column data type', types: ['ALL'] },
      { id: 'schema_column_exists', label: 'Column Exists', description: 'Checks column is present', types: ['ALL'] },
    ]
  },
  DISTRIBUTION: {
    category: '📊 Distribution Checks',
    checks: [
      { id: 'distinct_count', label: 'distinct_count', description: 'Count of distinct values', types: ['ALL'] },
      { id: 'frequency', label: 'frequency (Value Distribution)', description: 'Frequency of specific values', types: ['ALL'] },
    ]
  },
};

// Determine applicable checks based on column type
const getApplicableChecks = (columnType) => {
  const type = (columnType || '').toUpperCase();
  
  // Better type detection - handle various type names
  const isNumeric = ['INT', 'BIGINT', 'FLOAT', 'DOUBLE', 'NUMERIC', 'DECIMAL', 'NUMBER', 'INT64', 'FLOAT64'].some(t => type.includes(t));
  const isString = ['VARCHAR', 'STRING', 'TEXT', 'CHAR', 'OBJECT'].some(t => type.includes(t));
  const isDate = ['DATE', 'TIMESTAMP', 'DATETIME', 'TIME', 'DATETIME64'].some(t => type.includes(t));
  
  const applicable = {};
  
  Object.entries(SODA_CHECKS).forEach(([key, category]) => {
    applicable[key] = {
      ...category,
      checks: category.checks.filter(check => {
        // Always include checks marked for ALL types
        if (check.types.includes('ALL')) return true;
        
        // Type-specific checks
        if (isNumeric && check.types.some(t => ['NUMERIC', 'INT', 'FLOAT', 'DOUBLE'].includes(t))) return true;
        if (isString && check.types.some(t => ['STRING', 'VARCHAR', 'TEXT'].includes(t))) return true;
        if (isDate && check.types.some(t => ['DATE', 'TIMESTAMP'].includes(t))) return true;
        
        return false;
      })
    };
  });
  
  return applicable;
};

// Helper function to get columns from various metadata structures
const getColumnsFromMetadata = (metadata) => {
  if (!metadata) return [];
  
  // Try different possible structures
  if (metadata.schema?.columns) return metadata.schema.columns;
  if (metadata.columns) return metadata.columns;
  if (Array.isArray(metadata)) return metadata;
  
  return [];
};

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [checkPlan, setCheckPlan] = useState(null);
  const [checksToExecute, setChecksToExecute] = useState([]);
  const [runResults, setRunResults] = useState(null);
  const [runId, setRunId] = useState(null);
  const [metrics, setMetrics] = useState(null);
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
      // Persist metadata to localStorage for cross-step access
      localStorage.setItem(`metadata_${connectionId}`, JSON.stringify(data));
      console.log('[Metadata] Profiling complete and persisted:', { connectionId, columns: data.schema?.columns?.length || 0 });
    } catch (err) {
      const errMsg = `Metadata profiling failed: ${err.message}`;
      setError(errMsg);
      console.error('[Metadata] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async (connectionId) => {
    setLoading(true);
    setError('');
    try {
      console.log('[Step 3] Generating AI suggestions for connection:', connectionId);
      const res = await fetch(`${API_BASE}/suggestions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, limit: 10 }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      console.log('[Step 3] Received', data.suggestions?.length || 0, 'AI suggestions');
      setCurrentStep(3);
    } catch (err) {
      const errMsg = `Suggestions generation failed: ${err.message}`;
      setError(errMsg);
      console.error('[Step 3] Error generating suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const preparePlan = (checks) => {
    // Move to Step 4 (Plan Review) without executing yet
    setChecksToExecute(checks);
    
    // Restore metadata from localStorage if not in memory
    if (!metadata && selectedConnection) {
      const cached = localStorage.getItem(`metadata_${selectedConnection.id}`);
      if (cached) {
        try {
          const restoredMetadata = JSON.parse(cached);
          setMetadata(restoredMetadata);
          console.log('[Metadata] Restored from localStorage for Step 4');
        } catch (e) {
          console.error('[Metadata] Failed to restore from cache:', e);
        }
      }
    }
    
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
      setRunId(data.id); // Store run ID for metrics
      
      // Fetch metrics for visualization
      if (data.id) {
        fetchRunMetrics(data.id);
      }
      
      setCurrentStep(5);
    } catch (err) {
      setError(`Check execution failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunMetrics = async (runId) => {
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}/metrics`);
      if (res.ok) {
        const metricsData = await res.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
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
                  <p className="subtitle">Manually add Soda checks by column or select all available checks:</p>
                  
                  {/* Show all available Soda checks */}
                  <div className="all-soda-checks-section">
                    <h4>All Available SODA Core Checks</h4>
                    <div className="checks-by-category">
                      {Object.entries(SODA_CHECKS).map(([categoryKey, category]) => (
                        <div key={categoryKey} className="category-section">
                          <div className="category-header">{category.category}</div>
                          <div className="checks-grid">
                            {category.checks.map((check) => (
                              <div key={check.id} className="check-item">
                                <input 
                                  type="checkbox" 
                                  id={`soda-all-${check.id}`}
                                  className="soda-check"
                                  data-check-id={check.id}
                                  data-check-type={check.id}
                                />
                                <label htmlFor={`soda-all-${check.id}`}>
                                  <span className="check-label">{check.label}</span>
                                  <span className="check-description">{check.description}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Show column-specific checks if columns exist */}
                  {getColumnsFromMetadata(metadata).length > 0 && (
                    <div className="columns-specific-section">
                      <h4>By Column</h4>
                      <div className="columns-grid">
                        {getColumnsFromMetadata(metadata).map((col, colIdx) => {
                          const applicableChecks = getApplicableChecks(col.type);
                          return (
                            <div key={colIdx} className="column-selector">
                              <label><strong>{col.name}</strong> <span className="type">({col.type})</span></label>
                              <div className="check-options">
                                {Object.entries(applicableChecks).map(([categoryKey, category]) => 
                                  category.checks.length > 0 && (
                                    <div key={categoryKey} className="check-category">
                                      <div className="category-label">{category.category}</div>
                                      {category.checks.map((check) => (
                                        <div key={check.id} className="check-item">
                                          <input 
                                            type="checkbox" 
                                            id={`col-${colIdx}-${check.id}`}
                                            data-column={col.name}
                                            data-check-id={check.id}
                                            data-check-type={check.id}
                                          />
                                          <label htmlFor={`col-${colIdx}-${check.id}`}>
                                            <span className="check-label">{check.label}</span>
                                            <span className="check-description">{check.description}</span>
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    console.log('[Step 3] Check collection triggered');
                    
                    // Collect AI suggestions that are checked
                    const checkedAI = Array.from(document.querySelectorAll('input[id^="ai-check-"]:checked'))
                      .map(cb => {
                        const idx = parseInt(cb.id.replace('ai-check-', ''));
                        return suggestions[idx];
                      })
                      .filter(s => s);
                    
                    // Collect global SODA checks (not tied to specific columns)
                    const globalSodaChecks = Array.from(document.querySelectorAll('input[id^="soda-all-"]:checked'))
                      .map(cb => {
                        const checkId = cb.getAttribute('data-check-id');
                        // Find the check details from SODA_CHECKS
                        for (const [categoryKey, category] of Object.entries(SODA_CHECKS)) {
                          const check = category.checks.find(c => c.id === checkId);
                          if (check) {
                            return {
                              column: null,
                              check_type: checkId,
                              name: check.label,
                              description: check.description,
                              check_category: category.category,
                              is_global: true
                            };
                          }
                        }
                        return null;
                      })
                      .filter(c => c);
                    
                    // Collect column-specific manually selected Soda checks
                    const manualChecks = [];
                    const columns = getColumnsFromMetadata(metadata);
                    console.log('[Step 3] Metadata columns available:', columns.length, 'columns');
                    
                    if (columns.length > 0) {
                      columns.forEach((col, colIdx) => {
                        // Get all applicable checks for this column
                        const applicableChecks = getApplicableChecks(col.type);
                        
                        Object.entries(applicableChecks).forEach(([categoryKey, category]) => {
                          category.checks.forEach((check) => {
                            const checkboxId = `col-${colIdx}-${check.id}`;
                            const cb = document.getElementById(checkboxId);
                            if (cb && cb.checked) {
                              manualChecks.push({
                                column: col.name,
                                check_type: check.id,
                                name: `${col.name} - ${check.label}`,
                                description: check.description,
                                check_category: category.category
                              });
                            }
                          });
                        });
                      });
                    }
                    
                    const allChecks = [...checkedAI, ...globalSodaChecks, ...manualChecks];
                    console.log('[Step 3] Check collection result:', {
                      ai_suggestions: checkedAI.length,
                      global_soda: globalSodaChecks.length,
                      manual_column: manualChecks.length,
                      total: allChecks.length
                    });
                    
                    if (allChecks.length > 0) {
                      console.log('[Step 3] Proceeding to Step 4 with', allChecks.length, 'checks');
                      preparePlan(allChecks);
                    } else {
                      const errMsg = 'Please select at least one check';
                      setError(errMsg);
                      console.warn('[Step 3]', errMsg);
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
                  
                  <div className="custom-check-form">
                    <h4>Create Custom Check</h4>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const newCheck = {
                        name: formData.get('checkName') || `Custom - ${formData.get('checkType')}`,
                        column: formData.get('column'),
                        check_type: formData.get('checkType'),
                      };
                      setChecksToExecute([...checksToExecute, newCheck]);
                      e.target.reset();
                    }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Check Name (optional)</label>
                          <input type="text" name="checkName" placeholder="e.g., Email validation" />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Column *</label>
                          <select name="column" required>
                            <option value="">Select column...</option>
                            {getColumnsFromMetadata(metadata).map((col, idx) => (
                              <option key={idx} value={col.name}>{col.name} ({col.type})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Check Type *</label>
                          <select name="checkType" required>
                            <option value="">Select check type...</option>
                            <option value="missing_count">Missing/NULL Count</option>
                            <option value="duplicate_count">Duplicate Count</option>
                            <option value="invalid_count">Invalid Count (Pattern)</option>
                            <option value="outlier_count">Outlier Count</option>
                            <option value="failed_rows">Failed Rows</option>
                            <option value="valid_count">Valid Count</option>
                            <option value="schema_type">Schema Type Check</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn-add-check">+ Add Custom Check</button>
                    </form>
                  </div>

                  <div className="quick-add-checks">
                    <h4>Quick Add from Columns</h4>
                    {getColumnsFromMetadata(metadata).length > 0 && (
                      <>
                        <p className="subtitle">Quickly add missing_count check:</p>
                        <div className="quick-add-grid">
                          {getColumnsFromMetadata(metadata).map((col, colIdx) => (
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
              
              {/* Show visualization component if metrics are available */}
              {metrics ? (
                <>
                  <ResultsVisualization runId={runId} metrics={metrics} planId={checkPlan?.id} />
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
                        setRunId(null);
                        setMetrics(null);
                      }}
                    >
                      ↻ Start New Check
                    </button>
                  </div>
                </>
              ) : (
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
                        setRunId(null);
                        setMetrics(null);
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
              )}
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
