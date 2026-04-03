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
  const [gridData, setGridData] = useState(null);
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
      const response = await fetch(
        `/api/v1/results/runs/${runId}/results`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform flat results into grid format
      let transformedData = (data.results || []).map((result, idx) => ({
        index: idx,
        check_name: result.check_name || 'Unknown',
        column: result.details?.column || 'N/A',
        outcome: result.outcome || 'unknown',
        message: result.message || '',
        affected_rows: result.metrics?.rows_affected || result.details?.rows_affected || 0,
        passed_rows: result.metrics?.passed_rows || 0,
        failed_rows: result.metrics?.failed_rows || 0,
        metrics: result.metrics || {},
        created_at: result.created_at
      }));
      
      // Apply filters
      if (columnFilter) {
        transformedData = transformedData.filter(r => 
          r.column.toLowerCase().includes(columnFilter.toLowerCase())
        );
      }
      
      if (statusFilter) {
        transformedData = transformedData.filter(r => r.outcome === statusFilter);
      }
      
      if (checkTypeFilter) {
        transformedData = transformedData.filter(r => 
          r.check_name.toLowerCase().includes(checkTypeFilter.toLowerCase())
        );
      }
      
      // Apply sorting
      transformedData.sort((a, b) => {
        let aVal, bVal;
        switch(sortBy) {
          case 'column':
            aVal = a.column;
            bVal = b.column;
            break;
          case 'status':
            aVal = a.outcome;
            bVal = b.outcome;
            break;
          case 'affected_rows':
            aVal = a.affected_rows;
            bVal = b.affected_rows;
            break;
          default:
            aVal = a.check_name;
            bVal = b.check_name;
        }
        return typeof aVal === 'string' 
          ? aVal.localeCompare(bVal)
          : aVal - bVal;
      });
      
      // Paginate
      const start = (page - 1) * pageSize;
      const paginatedData = transformedData.slice(start, start + pageSize);
      
      setGridData({
        data: paginatedData,
        totalCount: transformedData.length,
        totalChecks: data.total_checks,
        passedChecks: data.passed_checks,
        failedChecks: data.failed_checks
      });
      setError(null);
    } catch (error) {
      console.error('Failed to load grid data:', error);
      setError(`Failed to load results: ${error.message}`);
      setGridData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCheckDetails = async (checkIndex) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/results/runs/${runId}/results`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.results?.[checkIndex];
      
      if (!result) {
        throw new Error('Check result not found');
      }
      
      setCheckDetails({
        check_name: result.check_name,
        outcome: result.outcome,
        message: result.message,
        details: result.details || {},
        metrics: result.metrics || {},
        failed_rows: result.failed_rows || [],
        created_at: result.created_at
      });
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
        `/api/v1/results/runs/${runId}/results`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract insights for this column
      const columnResults = (data.results || []).filter(r => 
        r.details?.column === columnName || r.check_name?.toLowerCase().includes(columnName.toLowerCase())
      );
      
      const passCount = columnResults.filter(r => r.outcome === 'pass').length;
      const failCount = columnResults.filter(r => r.outcome === 'fail').length;
      
      setColumnInsights({
        column_name: columnName,
        total_checks: columnResults.length,
        passed_checks: passCount,
        failed_checks: failCount,
        quality_score: columnResults.length > 0 ? Math.round((passCount / columnResults.length) * 100) : 0,
        checks: columnResults
      });
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
        `/api/v1/results/runs/${runId}/results`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Generate comparison data from results
      const byStatus = {
        pass: (data.results || []).filter(r => r.outcome === 'pass'),
        fail: (data.results || []).filter(r => r.outcome === 'fail'),
        warn: (data.results || []).filter(r => r.outcome === 'warn')
      };
      
      setComparisonData({
        total_checks: data.total_checks,
        passed_checks: data.passed_checks,
        failed_checks: data.failed_checks,
        by_status: byStatus,
        summary: {
          pass_rate: data.total_checks > 0 ? Math.round((data.passed_checks / data.total_checks) * 100) : 0,
          fail_rate: data.total_checks > 0 ? Math.round((data.failed_checks / data.total_checks) * 100) : 0
        }
      });
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

    const items = gridData.data || [];
    const hasItems = Array.isArray(items) && items.length > 0;

    if (!hasItems) {
      return <div className="no-data">No checks available. Try adjusting your filters.</div>;
    }

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
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="column">Sort by Column</option>
            <option value="status">Sort by Status</option>
            <option value="affected_rows">Sort by Affected Rows</option>
            <option value="check_name">Sort by Check Name</option>
          </select>
        </div>

        <div className="grid-summary">
          <div className="summary-card passed">
            <div className="summary-label">Total Passed</div>
            <div className="summary-value">{gridData.passedChecks || 0}</div>
          </div>
          <div className="summary-card failed">
            <div className="summary-label">Total Failed</div>
            <div className="summary-value">{gridData.failedChecks || 0}</div>
          </div>
          <div className="summary-card total">
            <div className="summary-label">Total Checks</div>
            <div className="summary-value">{gridData.totalChecks || 0}</div>
          </div>
        </div>

        <table className="checks-table">
          <thead>
            <tr>
              <th>Check Name</th>
              <th>Column</th>
              <th>Status</th>
              <th>Affected Rows</th>
              <th>Message</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`status-${item.outcome}`}>
                <td className="check-name">
                  <strong>{item.check_name}</strong>
                </td>
                <td>{item.column}</td>
                <td>
                  <span className={`status-badge status-${item.outcome}`}>
                    {item.outcome.toUpperCase()}
                  </span>
                </td>
                <td>{item.affected_rows || 0}</td>
                <td className="message">{item.message}</td>
                <td>
                  <button
                    onClick={() => loadCheckDetails(item.index)}
                    className="btn-view"
                  >
                    View
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
            Page {page} of {Math.ceil(gridData.totalCount / pageSize)}
          </span>
          <button
            disabled={page >= Math.ceil(gridData.totalCount / pageSize)}
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
          <h2>{check.check_name}</h2>
          <span className={`status-badge status-${check.outcome}`}>
            {check.outcome.toUpperCase()}
          </span>
        </div>

        {/* Check Information */}
        <section className="details-section">
          <h3>Check Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Check Name:</label>
              <span>{check.check_name}</span>
            </div>
            <div className="detail-item">
              <label>Outcome:</label>
              <span className={`status-badge status-${check.outcome}`}>{check.outcome}</span>
            </div>
            <div className="detail-item">
              <label>Executed:</label>
              <span>{new Date(check.created_at).toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Message */}
        {check.message && (
          <section className="details-section">
            <h3>Message</h3>
            <div className="message-box">
              <p>{check.message}</p>
            </div>
          </section>
        )}

        {/* Metrics */}
        {check.metrics && Object.keys(check.metrics).length > 0 && (
          <section className="details-section">
            <h3>Metrics</h3>
            <div className="metrics-grid">
              {Object.entries(check.metrics).map(([key, value]) => (
                <div key={key} className="metric-item">
                  <label>{key}:</label>
                  <span className="value-box">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Failed Rows */}
        {check.failed_rows && check.failed_rows.length > 0 && (
          <section className="details-section">
            <h3>Failed Rows ({check.failed_rows.length} shown)</h3>
            <div className="sample-rows">
              {check.failed_rows.slice(0, 10).map((row, idx) => (
                <div key={idx} className="row-item">
                  <code>{JSON.stringify(row, null, 2)}</code>
                </div>
              ))}
              {check.failed_rows.length > 10 && (
                <div className="row-item"><em>... and {check.failed_rows.length - 10} more rows</em></div>
              )}
            </div>
          </section>
        )}

        {/* Details */}
        {check.details && (
          <section className="details-section">
            <h3>Details</h3>
            <div className="details-box">
              <pre>{JSON.stringify(check.details, null, 2)}</pre>
            </div>
          </section>
        )}
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

        {/* Summary Stats */}
        <section className="comparison-section">
          <h3>Overall Summary</h3>
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-label">Total Checks</div>
              <div className="stat-value">{comparisonData.total_checks}</div>
            </div>
            <div className="stat-card passed">
              <div className="stat-label">Passed Checks</div>
              <div className="stat-value">{comparisonData.passed_checks}</div>
            </div>
            <div className="stat-card failed">
              <div className="stat-label">Failed Checks</div>
              <div className="stat-value">{comparisonData.failed_checks}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pass Rate</div>
              <div className="stat-value">{comparisonData.summary?.pass_rate || 0}%</div>
            </div>
          </div>
        </section>

        {/* Status Breakdown */}
        <section className="comparison-section">
          <h3>Checks by Status</h3>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="status-pass">
                <td><strong>Passed</strong></td>
                <td>{comparisonData.by_status?.pass?.length || 0}</td>
                <td>
                  {comparisonData.total_checks > 0
                    ? (((comparisonData.by_status?.pass?.length || 0) / comparisonData.total_checks) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
              <tr className="status-fail">
                <td><strong>Failed</strong></td>
                <td>{comparisonData.by_status?.fail?.length || 0}</td>
                <td>
                  {comparisonData.total_checks > 0
                    ? (((comparisonData.by_status?.fail?.length || 0) / comparisonData.total_checks) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
              <tr className="status-warn">
                <td><strong>Warned</strong></td>
                <td>{comparisonData.by_status?.warn?.length || 0}</td>
                <td>
                  {comparisonData.total_checks > 0
                    ? (((comparisonData.by_status?.warn?.length || 0) / comparisonData.total_checks) * 100).toFixed(1)
                    : 0}%
                </td>
              </tr>
            </tbody>
          </table>
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
