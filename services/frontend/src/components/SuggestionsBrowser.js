import React, { useState, useMemo } from 'react';
import './SuggestionsBrowser.css';

/**
 * ADVANCED SUGGESTIONS BROWSER
 * Handles 100+ columns with smart filtering, grouping, and navigation
 * 
 * Features:
 * - Organize by check type (tabs)
 * - Organize by data quality dimension
 * - Search across columns and check names
 * - Collapsible column sections
 * - Visual severity indicators
 * - Quick-select patterns
 */

const SuggestionsBrowser = ({ suggestions, onSelectChecks, selectedIndexes = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, by-type, by-dimension, by-column
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedAll, setSelectedAll] = useState(false);
  const [dimensionFilter, setDimensionFilter] = useState('all');

  // Group suggestions by type, dimension, column
  const groupedData = useMemo(() => {
    if (!suggestions) return {};

    const byType = {};
    const byDimension = {};
    const byColumn = {};
    const dimensions = new Set();

    suggestions.forEach((sugg, idx) => {
      const type = sugg.suggested_check_yaml?.split('\n')[1]?.split(':')[1]?.trim() || 'Generic';
      const column = sugg.column || 'TABLE_LEVEL';
      const dimension = extractDimension(sugg);

      dimensions.add(dimension);

      // Group by type
      if (!byType[type]) byType[type] = [];
      byType[type].push({ ...sugg, originalIndex: idx });

      // Group by dimension
      if (!byDimension[dimension]) byDimension[dimension] = [];
      byDimension[dimension].push({ ...sugg, originalIndex: idx });

      // Group by column
      if (!byColumn[column]) byColumn[column] = [];
      byColumn[column].push({ ...sugg, originalIndex: idx });
    });

    return { byType, byDimension, byColumn, dimensions: Array.from(dimensions).sort() };
  }, [suggestions]);

  const extractDimension = (sugg) => {
    const yaml = sugg.suggested_check_yaml || '';
    if (yaml.includes('missing')) return 'Completeness';
    if (yaml.includes('invalid') || yaml.includes('pattern')) return 'Validity';
    if (yaml.includes('duplicate') || yaml.includes('uniqueness')) return 'Uniqueness';
    if (yaml.includes('referential')) return 'Referential';
    if (yaml.includes('consistency')) return 'Consistency';
    if (yaml.includes('accuracy')) return 'Accuracy';
    return 'Other';
  };

  // Filter suggestions based on search + dimension filter
  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    
    return suggestions.filter((sugg, idx) => {
      const matchesSearch = 
        !searchTerm ||
        (sugg.column?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sugg.rationale?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sugg.check_type?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDimension = 
        dimensionFilter === 'all' ||
        extractDimension(sugg) === dimensionFilter;

      return matchesSearch && matchesDimension;
    });
  }, [suggestions, searchTerm, dimensionFilter]);

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleCheckSelection = (index) => {
    const newSelected = selectedIndexes.includes(index)
      ? selectedIndexes.filter(i => i !== index)
      : [...selectedIndexes, index];
    onSelectChecks(newSelected);
  };

  const toggleSelectAll = (indexes) => {
    if (selectedIndexes.length === indexes.length && indexes.every(i => selectedIndexes.includes(i))) {
      onSelectChecks([]);
    } else {
      onSelectChecks(indexes);
    }
  };

  // Render by column view - best for large datasets
  const renderByColumnView = () => {
    const columns = Object.keys(groupedData.byColumn || {}).sort();
    
    return (
      <div className="suggestions-by-column">
        <div className="column-summary">
          <span className="summary-stat">
            <strong>{columns.length}</strong> columns with suggestions
          </span>
          <span className="summary-stat">
            <strong>{filteredSuggestions.length}</strong> total checks
          </span>
        </div>

        <div className="columns-grid">
          {columns.map(columnName => {
            const columnSuggestions = (groupedData.byColumn[columnName] || [])
              .filter(s => filteredSuggestions.some(fs => fs.column === s.column));
            
            if (columnSuggestions.length === 0) return null;

            const sectionKey = `col-${columnName}`;
            const isExpanded = expandedSections[sectionKey] !== false; // default expanded

            const columnIndexes = columnSuggestions.map(s => s.originalIndex);
            const allChecked = columnIndexes.every(i => selectedIndexes.includes(i));
            const someChecked = columnIndexes.some(i => selectedIndexes.includes(i));

            return (
              <div key={columnName} className="column-section">
                <div className="column-header" onClick={() => toggleSection(sectionKey)}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => toggleSelectAll(columnIndexes)}
                    onClick={e => e.stopPropagation()}
                    className={someChecked && !allChecked ? 'indeterminate' : ''}
                  />
                  <span className="column-name">
                    📊 {columnName === 'TABLE_LEVEL' ? '🔗 Table-Level Checks' : columnName}
                  </span>
                  <span className="check-count">{columnSuggestions.length}</span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </div>

                {isExpanded && (
                  <div className="column-checks">
                    {columnSuggestions.map((sugg, localIdx) => (
                      <div key={localIdx} className="check-card">
                        <div className="check-card-header">
                          <input
                            type="checkbox"
                            checked={selectedIndexes.includes(sugg.originalIndex)}
                            onChange={() => toggleCheckSelection(sugg.originalIndex)}
                          />
                          <span className="check-type-badge">
                            {sugg.check_type || 'Generic'}
                          </span>
                          <span className="dimension-badge">
                            {extractDimension(sugg)}
                          </span>
                        </div>
                        <div className="check-card-body">
                          <p className="rationale">{sugg.rationale || 'No description'}</p>
                          {sugg.suggested_check_yaml && (
                            <details className="yaml-details">
                              <summary>View YAML Config</summary>
                              <pre>{sugg.suggested_check_yaml}</pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render by type view
  const renderByTypeView = () => {
    const types = Object.keys(groupedData.byType || {}).sort();

    return (
      <div className="suggestions-by-type">
        {types.map(type => {
          const typeSuggestions = (groupedData.byType[type] || [])
            .filter(s => filteredSuggestions.some(fs => fs.check_type === type || type === 'Generic'));

          if (typeSuggestions.length === 0) return null;

          const sectionKey = `type-${type}`;
          const isExpanded = expandedSections[sectionKey] !== false;

          const typeIndexes = typeSuggestions.map(s => s.originalIndex);
          const allChecked = typeIndexes.every(i => selectedIndexes.includes(i));

          return (
            <div key={type} className="type-section">
              <div className="type-header" onClick={() => toggleSection(sectionKey)}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => toggleSelectAll(typeIndexes)}
                  onClick={e => e.stopPropagation()}
                />
                <span className="type-name">📋 {type}</span>
                <span className="check-count">{typeSuggestions.length}</span>
                <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
              </div>

              {isExpanded && (
                <div className="type-checks">
                  {typeSuggestions.map((sugg, localIdx) => (
                    <div key={localIdx} className="check-item-compact">
                      <input
                        type="checkbox"
                        checked={selectedIndexes.includes(sugg.originalIndex)}
                        onChange={() => toggleCheckSelection(sugg.originalIndex)}
                      />
                      <div className="check-info">
                        <span className="column-tag">{sugg.column || 'TABLE'}</span>
                        <span className="rationale-short">{sugg.rationale?.substring(0, 60)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render by dimension view
  const renderByDimensionView = () => {
    const dims = groupedData.dimensions || [];

    return (
      <div className="suggestions-by-dimension">
        {dims.map(dimension => {
          const dimSuggestions = (groupedData.byDimension[dimension] || [])
            .filter(s => filteredSuggestions.some(fs => extractDimension(fs) === dimension));

          if (dimSuggestions.length === 0) return null;

          const sectionKey = `dim-${dimension}`;
          const isExpanded = expandedSections[sectionKey] !== false;

          const dimIndexes = dimSuggestions.map(s => s.originalIndex);
          const allChecked = dimIndexes.every(i => selectedIndexes.includes(i));

          return (
            <div key={dimension} className="dimension-section">
              <div className="dimension-header" onClick={() => toggleSection(sectionKey)}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => toggleSelectAll(dimIndexes)}
                  onClick={e => e.stopPropagation()}
                />
                <span className="dimension-name">
                  {getDimensionIcon(dimension)} {dimension}
                </span>
                <span className="check-count">{dimSuggestions.length}</span>
                <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
              </div>

              {isExpanded && (
                <div className="dimension-checks">
                  {dimSuggestions.map((sugg, localIdx) => (
                    <div key={localIdx} className="check-item-minimal">
                      <input
                        type="checkbox"
                        checked={selectedIndexes.includes(sugg.originalIndex)}
                        onChange={() => toggleCheckSelection(sugg.originalIndex)}
                      />
                      <span className="col-name">{sugg.column}</span>
                      <span className="check-type">{sugg.check_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getDimensionIcon = (dim) => {
    const icons = {
      'Completeness': '✓',
      'Validity': '✔',
      'Uniqueness': '◇',
      'Referential': '↔',
      'Consistency': '⚖',
      'Accuracy': '🎯',
      'Other': '?'
    };
    return icons[dim] || '?';
  };

  return (
    <div className="suggestions-browser">
      {/* Toolbar */}
      <div className="browser-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search columns, check names, descriptions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="toolbar-controls">
          <select
            value={dimensionFilter}
            onChange={e => setDimensionFilter(e.target.value)}
            className="dimension-filter"
          >
            <option value="all">All Dimensions</option>
            {groupedData.dimensions?.map(dim => (
              <option key={dim} value={dim}>{dim}</option>
            ))}
          </select>

          <div className="view-tabs">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
              title="Best for large datasets - organized by column"
            >
              📊 By Column
            </button>
            <button
              className={`tab-btn ${activeTab === 'by-type' ? 'active' : ''}`}
              onClick={() => setActiveTab('by-type')}
              title="Grouped by check type"
            >
              📋 By Type
            </button>
            <button
              className={`tab-btn ${activeTab === 'by-dimension' ? 'active' : ''}`}
              onClick={() => setActiveTab('by-dimension')}
              title="Grouped by data quality dimension"
            >
              📐 By Dimension
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="browser-stats">
        <span>Total: <strong>{suggestions?.length || 0}</strong></span>
        <span>Visible: <strong>{filteredSuggestions.length}</strong></span>
        <span>Selected: <strong>{selectedIndexes.length}</strong></span>
      </div>

      {/* Content */}
      <div className="browser-content">
        {activeTab === 'all' && renderByColumnView()}
        {activeTab === 'by-type' && renderByTypeView()}
        {activeTab === 'by-dimension' && renderByDimensionView()}
      </div>
    </div>
  );
};

export default SuggestionsBrowser;
