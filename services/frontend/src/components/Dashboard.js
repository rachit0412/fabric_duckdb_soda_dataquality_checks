/**
 * Dashboard Component
 * Main workflow orchestrator: guides user through data quality checks
 */

import React, { useState, useEffect } from 'react';
import DataSourceConnectV2 from './DataSourceConnectV2';
import ResultsVisualization from './ResultsVisualization';
import DetailedCheckResults from './DetailedCheckResults';
import SuggestionsBrowser from './SuggestionsBrowser';
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
  const [resultsView, setResultsView] = useState('detailed'); // 'detailed' or 'summary'

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
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} - ${res.statusText}`);
      }
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
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} - ${res.statusText}`);
      }
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
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} - ${res.statusText}`);
      }
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
      
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} - ${res.statusText}`);
      }
      
      const data = await res.json();
      if (!data.id) {
        throw new Error('Run creation failed: No run ID returned');
      }
      
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

          {/* Step 3: AI Suggestions & Check Selection */}
          {currentStep === 3 && suggestions && (
            <div className="step-content">
              <h2>🤖 Step 3: Select Checks to Execute</h2>
              <p className="step-description">
                Choose from AI suggestions, SODA checks, or add column-specific checks.
              </p>

              {loading && <p className="loading">🔄 Preparing checks...</p>}
              {error && <p className="error-message">{error}</p>}
              
              {/* AI SUGGESTIONS BROWSER */}
              <div style={{ marginBottom: '30px' }}>
                <h3>🤖 AI-Recommended Checks</h3>
                <p style={{ marginBottom: '15px', color: '#666' }}>Smart suggestions from analyzing your data</p>
                <SuggestionsBrowser
                  suggestions={suggestions}
                  selectedIndexes={checksToExecute
                    .filter(c => c.from === 'ai' || !c.from)
                    .map((checkToExecute) => {
                      return suggestions.findIndex(s => 
                        s.check_name === checkToExecute.check_name || 
                        s.name === checkToExecute.name
                      );
                    })
                    .filter(idx => idx >= 0)}
                  onSelectChecks={(selectedIndexes) => {
                    const selected = selectedIndexes
                      .map(idx => ({ ...suggestions[idx], from: 'ai' }))
                      .filter(s => s);
                    
                    // Keep manual checks, replace AI checks
                    const manualChecks = checksToExecute.filter(c => c.from === 'manual');
                    setChecksToExecute([...selected, ...manualChecks]);
                  }}
                />
              </div>

              {/* MANUAL SODA CHECKS */}
              <div style={{ marginBottom: '30px' }}>
                <h3>📋 SODA Core Native Checks</h3>
                <p style={{ marginBottom: '15px', color: '#666' }}>Manually select checks from SODA catalog</p>
                
                <div className="checks-by-category">
                  {Object.entries(SODA_CHECKS).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="category-section" style={{ marginBottom: '15px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                      <div className="category-header" style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                        {category.category}
                      </div>
                      <div className="checks-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {category.checks.map((check) => (
                          <div key={check.id} className="check-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="checkbox" 
                              id={`soda-all-${check.id}`}
                              checked={checksToExecute.some(c => c.from === 'manual' && c.check_type === check.id && !c.column)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setChecksToExecute([...checksToExecute, {
                                    column: null,
                                    check_type: check.id,
                                    name: check.label,
                                    description: check.description,
                                    check_category: category.category,
                                    from: 'manual'
                                  }]);
                                } else {
                                  setChecksToExecute(checksToExecute.filter(c => !(c.from === 'manual' && c.check_type === check.id && !c.column)));
                                }
                              }}
                            />
                            <label htmlFor={`soda-all-${check.id}`} style={{ cursor: 'pointer' }}>
                              <span style={{ fontWeight: '500' }}>{check.label}</span>
                              <span style={{ fontSize: '12px', color: '#666', display: 'block' }}>{check.description}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLUMN-SPECIFIC CHECKS */}
              {getColumnsFromMetadata(metadata).length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3>🔍 Column-Specific Checks</h3>
                  <p style={{ marginBottom: '15px', color: '#666' }}>Select checks for individual columns</p>
                  
                  <div className="columns-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                    {getColumnsFromMetadata(metadata).map((col, colIdx) => {
                      const applicableChecks = getApplicableChecks(col.type);
                      return (
                        <div key={colIdx} className="column-selector" style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                          <label style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>
                            📊 {col.name}
                            <span style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}>({col.type})</span>
                          </label>
                          <div className="check-options" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(applicableChecks).map(([categoryKey, category]) => 
                              category.checks.length > 0 && (
                                <div key={categoryKey} className="check-category">
                                  <div className="category-label" style={{ fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '4px' }}>
                                    {category.category}
                                  </div>
                                  {category.checks.map((check) => (
                                    <div key={check.id} className="check-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                      <input 
                                        type="checkbox" 
                                        id={`col-${colIdx}-${check.id}`}
                                        checked={checksToExecute.some(c => c.from === 'manual' && c.column === col.name && c.check_type === check.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setChecksToExecute([...checksToExecute, {
                                              column: col.name,
                                              check_type: check.id,
                                              name: `${col.name} - ${check.label}`,
                                              description: check.description,
                                              check_category: category.category,
                                              from: 'manual'
                                            }]);
                                          } else {
                                            setChecksToExecute(checksToExecute.filter(c => !(c.from === 'manual' && c.column === col.name && c.check_type === check.id)));
                                          }
                                        }}
                                      />
                                      <label htmlFor={`col-${colIdx}-${check.id}`} style={{ cursor: 'pointer', flex: 1 }}>
                                        {check.label}
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
              
              <div className="action-buttons" style={{ marginTop: '30px' }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (checksToExecute.length > 0) {
                      preparePlan(checksToExecute);
                    } else {
                      setError('Please select at least one check');
                    }
                  }}
                  disabled={loading || checksToExecute.length === 0}
                >
                  {loading ? '⏳ Creating Plan...' : `Create & Execute Plan (${checksToExecute.length} selected) →`}
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
              
              {/* View Selector Buttons */}
              <div className="results-view-selector" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                  className={`view-btn ${resultsView === 'detailed' ? 'active' : ''}`}
                  onClick={() => setResultsView('detailed')}
                  style={{
                    padding: '10px 16px',
                    border: resultsView === 'detailed' ? '2px solid #007bff' : '2px solid #ddd',
                    background: resultsView === 'detailed' ? '#007bff' : 'white',
                    color: resultsView === 'detailed' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                  }}
                >
                  🔍 Detailed Check Results
                </button>
                <button
                  className={`view-btn ${resultsView === 'summary' ? 'active' : ''}`}
                  onClick={() => setResultsView('summary')}
                  style={{
                    padding: '10px 16px',
                    border: resultsView === 'summary' ? '2px solid #007bff' : '2px solid #ddd',
                    background: resultsView === 'summary' ? '#007bff' : 'white',
                    color: resultsView === 'summary' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                  }}
                >
                  📊 Summary View
                </button>
              </div>

              {/* Detailed Results View */}
              {resultsView === 'detailed' && runId && (
                <DetailedCheckResults runId={runId} />
              )}

              {/* Summary Results View (old visualization) */}
              {resultsView === 'summary' && metrics ? (
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
              ) : resultsView === 'summary' ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  <p>No metrics available. Please run a data quality check first.</p>
                </div>
              ) : null}
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
