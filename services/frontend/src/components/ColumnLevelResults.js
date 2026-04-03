/**
 * Column-Level Results Component
 * Optimized for displaying data quality results for 100+ columns
 * Features:
 * - Compact table view with pagination
 * - Quality score visualization
 * - Category breakdown
 * - Sorting and filtering
 * - Top issues highlighting
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ColumnLevelResults.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Status badge component
const StatusBadge = ({ status, quality_score }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'FAIL': return '#ef4444';
      case 'ERROR': return '#7c2d12';
      default: return '#6b7280';
    }
  };

  return (
    <span 
      className="status-badge"
      style={{ backgroundColor: getStatusColor(status), color: 'white' }}
      title={`Quality Score: ${quality_score}%`}
    >
      {status}
    </span>
  );
};

// Quality score bar component
const QualityScoreBar = ({ score }) => {
  const getBarColor = (score) => {
    if (score >= 95) return '#10b981';
    if (score >= 80) return '#eab308';
    if (score >= 50) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="quality-bar-container">
      <div className="quality-bar" style={{ 
        width: `${score}%`,
        backgroundColor: getBarColor(score)
      }} />
      <span className="quality-score-text">{score.toFixed(1)}%</span>
    </div>
  );
};

// Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="pagination">
      <button 
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
      >
        ← Previous
      </button>
      
      <span className="page-info">
        Page {currentPage + 1} of {totalPages || 1}
      </span>
      
      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= (totalPages - 1)}
      >
        Next →
      </button>
    </div>
  );
};

// Category breakdown component
const CategoryBreakdown = ({ categories }) => {
  return (
    <div className="category-breakdown">
      {categories && categories.map((cat, idx) => (
        <div key={idx} className="category-item" title={cat.category}>
          <span className="category-name">{cat.category}</span>
          <span className="category-stats">
            {cat.passed}/{cat.total} ✓
          </span>
        </div>
      ))}
    </div>
  );
};

// Main component
const ColumnLevelResults = ({ runId }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState('quality_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [columnFilter, setColumnFilter] = useState('');
  const [itemsPerPage] = useState(10);
  const [expandedColumn, setExpandedColumn] = useState(null);

  // Fetch results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/results/runs/${runId}/results/by-column/summary?sort_by=${sortBy}&sort_order=${sortOrder}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          console.error('Failed to fetch results:', response.status);
          setResults(null);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    if (runId) {
      fetchResults();
    }
  }, [runId, sortBy, sortOrder]);

  // Filter columns
  const filteredColumns = results?.columns?.filter(col => 
    col.column_name.toLowerCase().includes(columnFilter.toLowerCase())
  ) || [];

  // Paginate
  const totalPages = Math.ceil(filteredColumns.length / itemsPerPage);
  const startIdx = currentPage * itemsPerPage;
  const paginatedColumns = filteredColumns.slice(startIdx, startIdx + itemsPerPage);

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(0);
  };

  if (loading) {
    return <div className="loading">Loading column results...</div>;
  }

  if (!results) {
    return <div className="error">Failed to load results</div>;
  }

  const summaryStats = results.summary_stats || {};

  return (
    <div className="column-results-container">
      {/* Summary Statistics */}
      <div className="results-summary">
        <div className="summary-card">
          <h3>Total Columns</h3>
          <div className="summary-value">{results.total_columns}</div>
        </div>
        <div className="summary-card warning">
          <h3>With Failures</h3>
          <div className="summary-value">{results.columns_with_failures}</div>
        </div>
        <div className="summary-card">
          <h3>Total Checks</h3>
          <div className="summary-value">{summaryStats.total_checks || 0}</div>
        </div>
        <div className="summary-card success">
          <h3>Passed</h3>
          <div className="summary-value">{summaryStats.checks_passed || 0}</div>
        </div>
        <div className="summary-card error">
          <h3>Failed</h3>
          <div className="summary-value">{summaryStats.checks_failed || 0}</div>
        </div>
        <div className="summary-card">
          <h3>Overall Quality</h3>
          <div className="summary-value-percent">
            {(summaryStats.overall_quality_score || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="controls-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Filter columns by name..."
            value={columnFilter}
            onChange={(e) => {
              setColumnFilter(e.target.value);
              setCurrentPage(0);
            }}
            className="filter-input"
          />
          <span className="filter-result-count">
            {filteredColumns.length} column{filteredColumns.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table-Level Checks */}
      {results.table_level_checks && results.table_level_checks.total_checks > 0 && (
        <div className="table-level-checks">
          <h3>📊 Table-Level Checks</h3>
          <div className="table-checks-stats">
            <span>Total: {results.table_level_checks.total_checks}</span>
            <span className="passed">✓ {results.table_level_checks.passed_checks}</span>
            <span className="failed">✗ {results.table_level_checks.failed_checks}</span>
          </div>
        </div>
      )}

      {/* Columns Table */}
      <div className="columns-table-wrapper">
        <table className="columns-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('column_name')}>
                Column Name {sortBy === 'column_name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="sortable" onClick={() => handleSort('quality_score')}>
                Quality {sortBy === 'quality_score' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th>Checks</th>
              <th>Categories</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedColumns.length > 0 ? (
              paginatedColumns.map((col, idx) => (
                <tr key={idx} className={`row-${col.status.toLowerCase()}`}>
                  <td className="column-name">
                    <strong>{col.column_name}</strong>
                    {col.column_type && <span className="column-type">{col.column_type}</span>}
                  </td>
                  <td className="quality-score-cell">
                    <QualityScoreBar score={col.quality_score} />
                  </td>
                  <td className="status-cell">
                    <StatusBadge status={col.status} quality_score={col.quality_score} />
                  </td>
                  <td className="checks-cell">
                    {col.passed_checks}/{col.total_checks} ✓
                  </td>
                  <td className="categories-cell">
                    <CategoryBreakdown categories={col.check_categories} />
                  </td>
                  <td className="action-cell">
                    <button
                      className="expand-button"
                      onClick={() => setExpandedColumn(expandedColumn === idx ? null : idx)}
                      title={expandedColumn === idx ? 'Collapse' : 'Expand'}
                    >
                      {expandedColumn === idx ? '▼' : '▶'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6"className="empty-message">No columns match the filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Details */}
      {expandedColumn !== null && paginatedColumns[expandedColumn] && (
        <div className="expanded-column-details">
          <div className="details-header">
            <h3>Details: {paginatedColumns[expandedColumn].column_name}</h3>
            <button onClick={() => setExpandedColumn(null)} className="close-button">✕</button>
          </div>
          
          {/* Top Issues */}
          {paginatedColumns[expandedColumn].top_issues && paginatedColumns[expandedColumn].top_issues.length > 0 && (
            <div className="top-issues">
              <h4>⚠️ Top Issues</h4>
              <ul>
                {paginatedColumns[expandedColumn].top_issues.map((issue, idx) => (
                  <li key={idx} className={`issue-${issue.status}`}>
                    <strong>{issue.check_name}</strong>
                    <span className="issue-message">{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Category Details */}
          <div className="category-details">
            <h4>Check Categories</h4>
            {paginatedColumns[expandedColumn].check_categories.map((cat, idx) => (
              <div key={idx} className="category-detail-item">
                <div className="category-header">
                  <span className="category-title">{cat.category}</span>
                  <span className="category-pass-rate">
                    {cat.pass_rate.toFixed(1)}% passed
                  </span>
                </div>
                <div className="category-stats">
                  <span>Total: {cat.total}</span>
                  <span className="passed">Passed: {cat.passed}</span>
                  <span className="failed">Failed: {cat.failed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ColumnLevelResults;
