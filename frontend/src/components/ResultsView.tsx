import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

interface CheckResult {
  check_name: string;
  check_type: string;
  status: 'passed' | 'warned' | 'failed' | 'error';
  metric_name?: string;
  metric_value?: number;
  metric_threshold?: number;
  execution_time_ms: number;
  query_used?: string;
  sample_failing_rows?: any[];
  error_message?: string;
}

export const ResultsView: React.FC<{ runId: string }> = ({ runId }) => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ passed: 0, warned: 0, failed: 0, errored: 0 });

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get(`${API_BASE}/runs/${runId}/results`);
        setResults(res.data.results);
        setSummary({
          passed: res.data.passed,
          warned: res.data.warned,
          failed: res.data.failed,
          errored: res.data.errored
        });
      } catch (err) {
        console.error('Failed to fetch results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    const interval = setInterval(fetchResults, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [runId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✓';
      case 'warned': return '⚠';
      case 'failed': return '✗';
      case 'error': return '!';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'green';
      case 'warned': return 'orange';
      case 'failed': return 'red';
      case 'error': return 'darkred';
      default: return 'gray';
    }
  };

  if (loading) return <div>Loading results...</div>;

  return (
    <div className="results-panel">
      <h2>Check Results for Run {runId}</h2>
      
      <div className="summary-stats">
        <div className="stat passed">
          <span className="number">{summary.passed}</span>
          <span className="label">Passed</span>
        </div>
        <div className="stat warned">
          <span className="number">{summary.warned}</span>
          <span className="label">Warned</span>
        </div>
        <div className="stat failed">
          <span className="number">{summary.failed}</span>
          <span className="label">Failed</span>
        </div>
        <div className="stat errored">
          <span className="number">{summary.errored}</span>
          <span className="label">Errored</span>
        </div>
      </div>

      <div className="results-list">
        {results.map((result, idx) => (
          <div key={idx} className={`result-card status-${result.status}`}>
            <div className="result-header">
              <span className="status-icon" style={{ color: getStatusColor(result.status) }}>
                {getStatusIcon(result.status)}
              </span>
              <h3>{result.check_name}</h3>
              <span className="check-type">{result.check_type}</span>
            </div>

            <div className="result-body">
              {result.metric_name && (
                <div className="metric">
                  <span className="metric-name">{result.metric_name}:</span>
                  <span className="metric-value">{result.metric_value}</span>
                  {result.metric_threshold !== undefined && (
                    <span className="metric-threshold">/ Threshold: {result.metric_threshold}</span>
                  )}
                </div>
              )}

              {result.query_used && (
                <details className="query-details">
                  <summary>View Query</summary>
                  <pre><code>{result.query_used}</code></pre>
                </details>
              )}

              {result.sample_failing_rows && result.sample_failing_rows.length > 0 && (
                <div className="failing-rows">
                  <h4>Sample Failing Rows:</h4>
                  <table>
                    <tbody>
                      {result.sample_failing_rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td><code>{JSON.stringify(row)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.sample_failing_rows.length > 5 && (
                    <p>... and {result.sample_failing_rows.length - 5} more</p>
                  )}
                </div>
              )}

              {result.error_message && (
                <div className="error-message">
                  <strong>Error:</strong> {result.error_message}
                </div>
              )}

              <div className="execution-time">
                Execution time: {result.execution_time_ms}ms
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={() => window.print()}>Print Report</button>
        <button onClick={async () => {
          const res = await axios.get(`${API_BASE}/runs/${runId}/export?format=json`);
          const blob = new Blob([res.data.data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `results-${runId}.json`;
          a.click();
        }}>
          Export JSON
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
