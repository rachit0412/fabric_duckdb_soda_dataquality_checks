import React, { useState, useEffect } from 'react';
import './DetailedCheckResults.css';

/**
 * COMPREHENSIVE DETAILED RESULTS COMPONENT
 * Shows granular check-by-check information with drill-down capabilities
 * 
 * Features:
 * - 4 interconnected views (Grid, Details, Insights, Comparison)
 * - Pagination, filtering, sorting
 * - Error handling and loading states
 * - Drill-down navigation
 */

const DetailedCheckResults = ({ runId }) => {
  const [view, setView] = useState('grid'); // grid, details, insights, comparison
  const [gridData, setGridData] = useState([]);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [checkDetails, setCheckDetails] = useState(null);
  const [columnInsights, setColumnInsights] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);
  
  // Filters for grid view
  const [columnFilter, setColumnFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [checkTypeFilter, setCheckTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('column');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Load grid data on component mount
  useEffect(() => {
    if (runId && view === 'grid') {
      loadGridData();
    } else if (runId && view === 'comparison') {
      loadComparisonData();
    }
  }, [runId, view, columnFilter, statusFilter, checkTypeFilter, sortBy, page]);

  const loadGridData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        column_filter: columnFilter,
        status_filter: statusFilter,
        check_type_filter: checkTypeFilter,
        sort_by: sortBy,
        page,
        page_size: pageSize
      });
      
      const response = await fetch(
        `/api/v1/results/runs/${runId}/checks/grid?${params}`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      setGridData(data);
      setError(null);
    } catch (error) {
      console.error('Failed to load grid data:', error);
      setError(`Failed to load results: ${error.message}`);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCheckDetails = async (checkIndex) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/results/runs/${runId}/checks/${checkIndex}/details`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      setCheckDetails(data);
      setSelectedCheck(checkIndex);
      setView('details');
      setError(null);
    } catch (error) {
      console.error('Failed to load check details:', error);
      setError(`Failed to load check details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadColumnInsights = async (columnName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/results/runs/${runId}/column/${columnName}/insights`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      setColumnInsights(data);
      setSelectedColumn(columnName);
      setView('insights');
      setError(null);
    } catch (error) {
      console.error('Failed to load column insights:', error);
      setError(`Failed to load column insights: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/results/runs/${runId}/checks/comparison`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      setComparisonData(data);
      setError(null);
    } catch (error) {
      console.error('Failed to load comparison data:', error);
      setError(`Failed to load comparison data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render Grid View
  const renderGridView = () => {
    if (!gridData) {
      return <div className="no-data">No checks available. Run a data quality check first.</div>;
    }

    const items = gridData.items || gridData || [];
    const hasItems = Array.isArray(items) && items.length > 0;

    if (!hasItems) {
      return <div className="no-data">No checks available. Try adjusting your filters.</div>;
    }

    const summary = gridData.summary || { passed: 0, failed: 0, warned: 0, error: 0 };

    return (
      <div className="grid-view">
        <div className="grid-filters">
          <input
            type="text"
            placeholder="Filter by column..."
            value={columnFilter}
            onChange={(e) => {
              setColumnFilter(e.target.value);
              setPage(1);
            }}
            className="filter-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
            <option value="warn">Warned</option>
            <option value="error">Error</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="column">Sort by Column</option>
            <option value="status">Sort by Status</option>
            <option value="affected_rows">Sort by Affected Rows</option>
            <option value="metric_value">Sort by Metric Value</option>
          </select>
        </div>

        <div className="grid-summary">
          <div className="summary-card passed">
            <div className="summary-label">Passed</div>
            <div className="summary-value">{summary.passed || 0}</div>
          </div>
          <div className="summary-card failed">
            <div className="summary-label">Failed</div>
            <div className="summary-value">{summary.failed || 0}</div>
          </div>
          <div className="summary-card warned">
            <div className="summary-label">Warned</div>
            <div className="summary-value">{summary.warned || 0}</div>
          </div>
          <div className="summary-card error">
            <div className="summary-label">Error</div>
            <div className="summary-value">{summary.error || 0}</div>
          </div>
        </div>

        <table className="checks-table">
          <thead>
            <tr>
              <th>Check Name</th>
              <th>Column</th>
              <th>Status</th>
              <th>Metric</th>
              <th>Value vs Threshold</th>
              <th>Affected Rows</th>
              <th>Exec Time (ms)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {gridData.items.map((item, idx) => (
              <tr key={idx} className={`status-${item.status}`}>
                <td className="check-name">
                  <strong>{item.check_name}</strong>
                  <br />
                  <span className="dimension">{item.dimension}</span>
                </td>
                <td>{item.column_name}</td>
                <td>
                  <span className={`status-badge ${item.status}`}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td>{item.metric_name}</td>
                <td className="metric-comparison">
                  <div>{item.metric_value}</div>
                  {item.metric_threshold !== null && (
                    <div className="threshold">vs {item.metric_threshold}</div>
                  )}
                </td>
                <td>
                  <div>{item.affected_rows_count} rows</div>
                  {item.affected_rows_percent > 0 && (
                    <div className="percentage">({item.affected_rows_percent.toFixed(1)}%)</div>
                  )}
                </td>
                <td>{item.execution_time_ms}ms</td>
                <td>
                  <button
                    className="btn-details"
                    onClick={() => loadCheckDetails(idx)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {gridData.total_pages}
          </span>
          <button
            disabled={page >= gridData.total_pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Render Check Details View
  const renderDetailsView = () => {
    if (loading) return <div className="loading">Loading check details...</div>;
    if (!checkDetails) return null;

    const check = checkDetails;
    return (
      <div className="details-view">
        <button className="btn-back" onClick={() => setView('grid')}>
          ← Back to Grid
        </button>

        <div className="details-header">
          <h2>{check.check_identity.check_name}</h2>
          <span className={`status-badge ${check.execution_status.status}`}>
            {check.execution_status.status.toUpperCase()}
          </span>
        </div>

        {/* Check Identity */}
        <section className="details-section">
          <h3>Check Identity</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Check Type:</label>
              <span>{check.check_identity.check_type}</span>
            </div>
            <div className="detail-item">
              <label>Column:</label>
              <span>{check.check_identity.column_name}</span>
            </div>
            <div className="detail-item">
              <label>Data Quality Dimension:</label>
              <span className="dimension">{check.check_identity.dimension}</span>
            </div>
          </div>
        </section>

        {/* Validation Rule */}
        <section className="details-section">
          <h3>Validation Rule</h3>
          <div className="rule-box">
            <p><strong>Rule:</strong> {check.validation_rule.rule_description}</p>
            <div className="rule-details">
              <div className="detail-item">
                <label>Operator:</label>
                <span>{check.validation_rule.comparison_operator}</span>
              </div>
              <div className="detail-item">
                <label>Expected:</label>
                <span className="value-box">{check.validation_rule.expected_value}</span>
              </div>
              <div className="detail-item">
                <label>Actual:</label>
                <span className="value-box">{check.validation_rule.actual_value}</span>
              </div>
              <div className="detail-item">
                <label>Unit:</label>
                <span>{check.validation_rule.unit || '-'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Impacted Data */}
        <section className="details-section">
          <h3>Impacted Data</h3>
          <div className="impact-metrics">
            <div className="impact-card">
              <div className="metric-label">Total Rows</div>
              <div className="metric-value">{check.impacted_data.total_rows}</div>
            </div>
            <div className="impact-card">
              <div className="metric-label">Affected Rows</div>
              <div className="metric-value">{check.impacted_data.affected_rows_count}</div>
            </div>
            <div className="impact-card">
              <div className="metric-label">Percentage</div>
              <div className="metric-value">{check.impacted_data.affected_rows_percentage.toFixed(2)}%</div>
            </div>
            <div className="impact-card">
              <div className="metric-label">Passing Rows</div>
              <div className="metric-value">{check.impacted_data.passing_rows_count}</div>
            </div>
          </div>
        </section>

        {/* Sample Failing Rows */}
        {check.sample_data.failing_rows && check.sample_data.failing_rows.length > 0 && (
          <section className="details-section">
            <h3>Sample Failing Rows ({check.sample_data.failing_rows.length} shown)</h3>
            <div className="sample-rows">
              {check.sample_data.failing_rows.map((row, idx) => (
                <div key={idx} className="row-item">
                  <code>{JSON.stringify(row, null, 2)}</code>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Query Information */}
        <section className="details-section">
          <h3>Query Information</h3>
          <div className="query-box">
            <p><strong>Description:</strong> {check.query_information.query_description}</p>
            <pre className="query-text">{check.query_information.query_used}</pre>
          </div>
        </section>

        {/* Execution Metrics */}
        <section className="details-section">
          <h3>Execution Metrics</h3>
          <div className="exec-metrics">
            <div className="metric-item">
              <label>Execution Time:</label>
              <span>{check.execution_status.execution_time_ms}ms</span>
            </div>
            <div className="metric-item">
              <label>Completed at:</label>
              <span>{check.execution_status.completed_at}</span>
            </div>
            {check.execution_status.error && (
              <div className="metric-item error">
                <label>Error:</label>
                <span>{check.execution_status.error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Remediation */}
        <section className="details-section">
          <h3>Remediation Actions</h3>
          <div className="remediation">
            <div className="severity">
              <label>Severity:</label>
              <span className={`severity-badge ${check.remediation.severity.toLowerCase()}`}>
                {check.remediation.severity}
              </span>
            </div>
            <div className="priority">
              <label>Priority:</label>
              <div className="priority-bar" style={{width: `${(check.remediation.priority / 10) * 100}%`}}>
                {check.remediation.priority}/10
              </div>
            </div>
            <div className="suggested-fixes">
              <label>Suggested Fixes:</label>
              <ol>
                {check.remediation.suggested_fixes.map((fix, idx) => (
                  <li key={idx}>{fix}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    );
  };

  // Render Column Insights View
  const renderInsightsView = () => {
    if (loading) return <div className="loading">Loading column insights...</div>;
    if (!columnInsights) return null;

    return (
      <div className="insights-view">
        <button className="btn-back" onClick={() => setView('grid')}>
          ← Back to Grid
        </button>

        <div className="insights-header">
          <h2>Column: {columnInsights.column_name}</h2>
          <div className="quality-score">
            Quality Score: <strong>{columnInsights.data_samples.summary.data_quality_score.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="insights-cards">
          <div className="insight-card">
            <div className="card-label">Total Checks</div>
            <div className="card-value">{columnInsights.total_checks_on_column}</div>
          </div>
          <div className="insight-card passed">
            <div className="card-label">Passed</div>
            <div className="card-value">{columnInsights.checks_breakdown.passed}</div>
          </div>
          <div className="insight-card failed">
            <div className="card-label">Failed</div>
            <div className="card-value">{columnInsights.checks_breakdown.failed}</div>
          </div>
          <div className="insight-card warned">
            <div className="card-label">Warned</div>
            <div className="card-value">{columnInsights.checks_breakdown.warned}</div>
          </div>
        </div>

        {/* Checks by Type */}
        <section className="insights-section">
          <h3>Checks by Type</h3>
          {columnInsights.by_check_type.map((type, idx) => (
            <div key={idx} className="type-breakdown">
              <div className="type-header">
                <strong>{type.check_type}</strong>
                <span className="type-stats">
                  {type.passed}/{type.count} passed
                </span>
              </div>
              <div className="checks-list">
                {type.checks.map((check, cidx) => (
                  <div key={cidx} className={`check-item ${check.status}`}>
                    <span className="check-name">{check.name}</span>
                    <span className={`status-badge ${check.status}`}>
                      {check.status.toUpperCase()}
                    </span>
                    {check.affected_rows > 0 && (
                      <span className="affected-rows">{check.affected_rows} rows</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Critical Issues */}
        {columnInsights.critical_issues.length > 0 && (
          <section className="insights-section">
            <h3>Critical Issues</h3>
            {columnInsights.critical_issues.map((issue, idx) => (
              <div key={idx} className="critical-issue">
                <div className="issue-header">
                  <strong>{issue.check}</strong>
                  <span className={`status-badge ${issue.status}`}>
                    {issue.status.toUpperCase()}
                  </span>
                </div>
                <p className="issue-message">{issue.message}</p>
                <div className="issue-stats">
                  <span>{issue.affected_rows} rows affected ({issue.affected_percent.toFixed(1)}%)</span>
                </div>
                {issue.sample_rows.length > 0 && (
                  <div className="issue-samples">
                    <strong>Sample failing rows:</strong>
                    {issue.sample_rows.map((row, ridx) => (
                      <code key={ridx}>{JSON.stringify(row)}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Data Samples */}
        {columnInsights.data_samples.failing.length > 0 && (
          <section className="insights-section">
            <h3>Sample Failing Data</h3>
            <div className="data-samples">
              {columnInsights.data_samples.failing.map((row, idx) => (
                <div key={idx} className="sample-row">
                  <code>{JSON.stringify(row, null, 2)}</code>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  // Render Comparison View
  const renderComparisonView = () => {
    if (loading) return <div className="loading">Loading comparison data...</div>;
    if (!comparisonData) return null;

    return (
      <div className="comparison-view">
        <button className="btn-back" onClick={() => setView('grid')}>
          ← Back to Grid
        </button>

        <h2>Checks Comparison & Analysis</h2>

        {/* Top Failing Dimensions */}
        <section className="comparison-section">
          <h3>Top Failing Dimensions</h3>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Failed Checks</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.top_failing_dimensions.map(([dim, count], idx) => (
                  <tr key={idx}>
                    <td>{dim}</td>
                    <td className="count-cell">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Failing Columns */}
        <section className="comparison-section">
          <h3>Top Failing Columns</h3>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Failed Checks</th>
                  <th>Quality Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.top_failing_columns.map(([col, count], idx) => {
                  const colStats = comparisonData.by_column[col];
                  return (
                    <tr key={idx}>
                      <td><strong>{col}</strong></td>
                      <td className="count-cell">{count}</td>
                      <td className="score-cell">
                        {colStats.quality_score.toFixed(1)}%
                      </td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => loadColumnInsights(col)}
                        >
                          Insights
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* All Dimensions Breakdown */}
        <section className="comparison-section">
          <h3>All Dimensions Breakdown</h3>
          <div className="dimensions-grid">
            {Object.entries(comparisonData.by_dimension).map(([dim, stats]) => (
              <div key={dim} className="dimension-card">
                <h4>{dim}</h4>
                <div className="stat">
                  <span className="label">Passed:</span>
                  <span className="value passed">{stats.passed}</span>
                </div>
                <div className="stat">
                  <span className="label">Failed:</span>
                  <span className="value failed">{stats.failed}</span>
                </div>
                <div className="stat">
                  <span className="label">Warned:</span>
                  <span className="value warned">{stats.warned}</span>
                </div>
                <div className="stat">
                  <span className="label">Error:</span>
                  <span className="value error">{stats.error}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="detailed-check-results">
      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-message">
              <strong>Error Loading Results:</strong> {error}
            </div>
            <button 
              className="error-dismiss"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading results...</p>
          </div>
        </div>
      )}

      <div className="view-selector">
        <button
          className={`btn-view ${view === 'grid' ? 'active' : ''}`}
          onClick={() => setView('grid')}
          disabled={loading}
        >
          🔍 Checks Grid
        </button>
        <button
          className={`btn-view ${view === 'comparison' ? 'active' : ''}`}
          onClick={() => {
            setView('comparison');
            loadComparisonData();
          }}
          disabled={loading}
        >
          📊 Comparison
        </button>
        {columnInsights && (
          <button
            className={`btn-view ${view === 'insights' ? 'active' : ''}`}
            onClick={() => setView('insights')}
            disabled={loading}
          >
            🎯 Column Insights
          </button>
        )}
        {checkDetails && (
          <button
            className={`btn-view ${view === 'details' ? 'active' : ''}`}
            onClick={() => setView('details')}
            disabled={loading}
          >
            📋 Check Details
          </button>
        )}
      </div>

      <div className="view-content">
        {!error && !loading && view === 'grid' && renderGridView()}
        {!error && !loading && view === 'details' && renderDetailsView()}
        {!error && !loading && view === 'insights' && renderInsightsView()}
        {!error && !loading && view === 'comparison' && renderComparisonView()}
      </div>
    </div>
  );
};

export default DetailedCheckResults;
