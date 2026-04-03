/**
 * AI Suggestions Component
 * Separate layout for AI-generated check suggestions per column
 * Features:
 * - Column-centric suggestion view
 * - Confidence scores
 * - Grouped by suggestion type
 * - Expandable suggestion details
 * - One-click apply to check plan
 */

import React, { useState, useEffect } from 'react';
import './AISuggestions.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Confidence badge component
const ConfidenceBadge = ({ confidence }) => {
  const getBackgroundColor = (conf) => {
    if (conf >= 0.9) return '#10b981';
    if (conf >= 0.7) return '#3b82f6';
    if (conf >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const getLabel = (conf) => {
    if (conf >= 0.9) return 'High';
    if (conf >= 0.7) return 'Medium-High';
    if (conf >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="confidence-badge" style={{ backgroundColor: getBackgroundColor(confidence) }}>
      <span className="confidence-label">{getLabel(confidence)}</span>
      <span className="confidence-value">{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
};

// Suggestion type icon
const SuggestionTypeIcon = ({ type }) => {
  const iconMap = {
    'completeness': '✓',
    'uniqueness': '🔑',
    'validity': '📝',
    'anomaly': '⚠️',
    'freshness': '⏰',
    'volume': '📊',
    'statistical': '📈',
    'schema': '🏗️',
  };
  return iconMap[type?.toLowerCase()] || '✨';
};

// Main component
const AISuggestions = ({ connectionId, onSuggestionsLoaded }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('column');
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [expandedItem, setExpandedItem] = useState(null);
  const [confirmApply, setConfirmApply] = useState(false);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/suggestions/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              connection_id: connectionId,
              confidence_threshold: 0.3 
            })
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          // Extract suggestions array from response
          const suggestionsList = data.suggestions || [];
          setSuggestions(suggestionsList);
          if (onSuggestionsLoaded) {
            onSuggestionsLoaded(suggestionsList);
          }
        } else {
          console.error('Failed to fetch suggestions:', response.status);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    if (connectionId) {
      fetchSuggestions();
    }
  }, [connectionId, onSuggestionsLoaded]);

  // Group suggestions
  const groupedSuggestions = groupBy === 'column' ? 
    suggestions.reduce((acc, sugg) => {
      const column = sugg.column || 'Table-level';
      if (!acc[column]) acc[column] = [];
      acc[column].push(sugg);
      return acc;
    }, {}) :
    suggestions.reduce((acc, sugg) => {
      const type = sugg.suggestion_type || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(sugg);
      return acc;
    }, {});

  // Toggle suggestion selection
  const toggleSuggestion = (id) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSuggestions(newSelected);
  };

  // Select all suggestions
  const selectAllSuggestions = () => {
    const allIds = new Set(suggestions.map((_, idx) => idx));
    setSelectedSuggestions(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedSuggestions(new Set());
  };

  // Apply selected suggestions
  const applySuggestions = () => {
    const selectedSuggList = suggestions.filter((_, idx) => selectedSuggestions.has(idx));
    if (onSuggestionsLoaded) {
      // Custom callback for applying
      console.log('Applying suggestions:', selectedSuggList);
    }
    setConfirmApply(false);
  };

  if (loading) {
    return <div className="loading">Loading AI suggestions...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="suggestions-container empty-state">
        <div className="empty-icon">✨</div>
        <h3>No Suggestions Available</h3>
        <p>AI suggestions will appear after analyzing your data structure</p>
      </div>
    );
  }

  const stats = {
    total: suggestions.length,
    highConfidence: suggestions.filter(s => s.confidence >= 0.7).length,
    byType: suggestions.reduce((acc, s) => {
      acc[s.suggestion_type] = (acc[s.suggestion_type] || 0) + 1;
      return acc;
    }, {})
  };

  return (
    <div className="suggestions-container">
      {/* Statistics */}
      <div className="suggestions-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Suggestions</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-number">{stats.highConfidence}</div>
          <div className="stat-label">High Confidence</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{Object.keys(stats.byType).length}</div>
          <div className="stat-label">Check Types</div>
        </div>
      </div>

      {/* Controls */}
      <div className="suggestions-controls">
        <div className="group-selector">
          <label>Group By:</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="group-select">
            <option value="column">Column</option>
            <option value="type">Suggestion Type</option>
          </select>
        </div>

        <div className="selection-controls">
          <button onClick={selectAllSuggestions} className="control-button">
            Select All ({suggestions.length})
          </button>
          <button onClick={deselectAll} className="control-button secondary">
            Clear Selection
          </button>
          <span className="selected-count">
            {selectedSuggestions.size} selected
          </span>
        </div>

        {selectedSuggestions.size > 0 && (
          <button 
            onClick={() => setConfirmApply(true)}
            className="apply-button"
          >
            Apply {selectedSuggestions.size} Suggestion{selectedSuggestions.size !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmApply && (
        <div className="confirmation-dialog">
          <div className="dialog-content">
            <h3>Apply Suggestions?</h3>
            <p>Add {selectedSuggestions.size} suggested checks to your check plan?</p>
            <div className="dialog-buttons">
              <button onClick={applySuggestions} className="button-confirm">✓ Apply</button>
              <button onClick={() => setConfirmApply(false)} className="button-cancel">✕ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="suggestions-list">
        {Object.entries(groupedSuggestions).map(([groupName, groupSuggestions]) => (
          <div key={groupName} className="suggestion-group">
            <div className="group-header">
              <h3>{groupName}</h3>
              <span className="group-count">{groupSuggestions.length}</span>
            </div>

            <div className="group-items">
              {groupSuggestions.map((sugg, idx) => {
                const suggestionIndex = suggestions.findIndex(s => 
                  s.column === sugg.column && s.suggestion_type === sugg.suggestion_type
                );
                const isExpanded = expandedItem === suggestionIndex;
                const isSelected = selectedSuggestions.has(suggestionIndex);

                return (
                  <div 
                    key={idx} 
                    className={`suggestion-item ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
                  >
                    {/* Main Content */}
                    <div className="suggestion-main" onClick={() => setExpandedItem(isExpanded ? null : suggestionIndex)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSuggestion(suggestionIndex)}
                        className="suggestion-checkbox"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="suggestion-icon">
                        {SuggestionTypeIcon({ type: sugg.suggestion_type })}
                      </div>

                      <div className="suggestion-info">
                        <div className="suggestion-title">
                          {sugg.check_name || sugg.suggestion_type}
                        </div>
                        <div className="suggestion-column">
                          {sugg.column && `Column: ${sugg.column}`}
                        </div>
                      </div>

                      <ConfidenceBadge confidence={sugg.confidence || 0.7} />

                      <div className="expand-icon">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="suggestion-details">
                        <div className="detail-row">
                          <span className="detail-label">Reason:</span>
                          <span className="detail-value">{sugg.reasoning || 'Data analysis suggests this check'}</span>
                        </div>

                        {sugg.description && (
                          <div className="detail-row">
                            <span className="detail-label">Description:</span>
                            <span className="detail-value">{sugg.description}</span>
                          </div>
                        )}

                        {sugg.params && (
                          <div className="detail-row">
                            <span className="detail-label">Parameters:</span>
                            <div className="params-list">
                              {Object.entries(sugg.params).map(([key, value]) => (
                                <div key={key} className="param-item">
                                  <code>{key}:</code> {JSON.stringify(value)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="detail-row metric-row">
                          <span className="detail-label">Confidence:</span>
                          <span className="metric-badge">
                            {(sugg.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        {sugg.sample_data && (
                          <div className="detail-row">
                            <span className="detail-label">Sample Issues:</span>
                            <div className="sample-data">
                              {sugg.sample_data.slice(0, 3).map((item, itemIdx) => (
                                <div key={itemIdx} className="sample-item">
                                  {JSON.stringify(item, null, 2)}
                                </div>
                              ))}
                              {sugg.sample_data.length > 3 && (
                                <div className="sample-more">
                                  ... and {sugg.sample_data.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="quick-actions">
                          <button 
                            className="quick-button apply"
                            onClick={() => {
                              setSelectedSuggestions(new Set([suggestionIndex]));
                              applySuggestions();
                            }}
                          >
                            Apply This Suggestion
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="suggestions-summary">
        <p>
          💡 Tip: High-confidence suggestions (⭐) are most likely to be useful for your data quality checks.
        </p>
      </div>
    </div>
  );
};

export default AISuggestions;
