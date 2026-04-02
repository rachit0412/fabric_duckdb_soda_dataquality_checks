import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import './ResultsVisualization.css';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

/**
 * ResultsVisualization Component
 * Displays comprehensive data quality metrics with interactive charts
 */
const ResultsVisualization = ({ runId, metrics, planId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planId && activeTab === 'trends') {
      fetchTrendData();
    }
  }, [planId, activeTab]);

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/visualization/plans/${planId}/trend?days=7`);
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (error) {
      console.error('Failed to fetch trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return <div className="visualization-container">No metrics available</div>;
  }

  return (
    <div className="visualization-container">
      <div className="vis-tabs">
        <button
          className={`vis-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`vis-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Column Details
        </button>
        {planId && (
          <button
            className={`vis-tab ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
        )}
      </div>

      <div className="vis-content">
        {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
        {activeTab === 'details' && <DetailsTab metrics={metrics} />}
        {activeTab === 'trends' && <TrendsTab trendData={trendData} loading={loading} />}
      </div>
    </div>
  );
};

/**
 * Overview Tab - Summary dashboard with status pie chart and key metrics
 */
const OverviewTab = ({ metrics }) => {
  const { summary, by_check_type } = metrics;

  // Status pie chart data
  const statusChartData = {
    labels: ['Passed ✓', 'Failed ✗'],
    datasets: [
      {
        data: [summary.passed, summary.failed],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#059669', '#dc2626'],
        borderWidth: 2,
      },
    ],
  };

  // Check type distribution
  const checkTypes = Object.keys(by_check_type || {});
  const passedByType = checkTypes.map(t => by_check_type[t].passed);
  const failedByType = checkTypes.map(t => by_check_type[t].failed);

  const typeChartData = {
    labels: checkTypes,
    datasets: [
      {
        label: 'Passed',
        data: passedByType,
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Failed',
        data: failedByType,
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="overview-tab">
      <div className="metrics-grid">
        <MetricCard
          label="Pass Rate"
          value={`${summary.pass_rate}%`}
          icon="📊"
          color={summary.pass_rate >= 80 ? 'green' : 'orange'}
        />
        <MetricCard
          label="Total Checks"
          value={summary.total_checks}
          icon="✓"
          color="blue"
        />
        <MetricCard
          label="Passed"
          value={summary.passed}
          icon="✓"
          color="green"
        />
        <MetricCard
          label="Failed"
          value={summary.failed}
          icon="✗"
          color="red"
        />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Check Status Distribution</h3>
          <div className="chart-wrapper">
            <Pie
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3>Results by Check Type</h3>
          <div className="chart-wrapper" style={{ minHeight: '300px' }}>
            <Bar
              data={typeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                scales: {
                  x: {
                    stacked: true,
                  },
                  y: {
                    stacked: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Details Tab - Per-column quality scorecard
 */
const DetailsTab = ({ metrics }) => {
  const { by_column } = metrics;
  const columns = Object.entries(by_column || {})
    .map(([col, data]) => ({
      name: col,
      quality_score: data.quality_score || 0,
      passed: data.passed,
      failed: data.failed,
      total: data.passed + data.failed,
    }))
    .sort((a, b) => a.quality_score - b.quality_score);

  return (
    <div className="details-tab">
      <h3>Data Quality by Column</h3>
      <table className="quality-table">
        <thead>
          <tr>
            <th>Column</th>
            <th>Quality Score</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col.name}>
              <td className="col-name">{col.name}</td>
              <td>
                <div className="score-bar">
                  <div
                    className="score-fill"
                    style={{
                      width: `${col.quality_score}%`,
                      backgroundColor: getScoreColor(col.quality_score),
                    }}
                  />
                  <span className="score-text">{col.quality_score.toFixed(1)}%</span>
                </div>
              </td>
              <td className="text-success">{col.passed}</td>
              <td className="text-danger">{col.failed}</td>
              <td>
                <span className={`badge badge-${getScoreStatus(col.quality_score)}`}>
                  {getScoreStatus(col.quality_score).toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Trends Tab - Historical pass rate trend line
 */
const TrendsTab = ({ trendData, loading }) => {
  if (loading) {
    return <div className="trends-tab">Loading trend data...</div>;
  }

  if (!trendData || trendData.data_points.length === 0) {
    return <div className="trends-tab">No trend data available</div>;
  }

  const dates = trendData.data_points.map(d => new Date(d.date).toLocaleDateString());
  const passRates = trendData.data_points.map(d => d.pass_rate);
  const passed = trendData.data_points.map(d => d.passed);
  const failed = trendData.data_points.map(d => d.failed);

  const trendChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Pass Rate (%)',
        data: passRates,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const resultChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Passed',
        data: passed,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Failed',
        data: failed,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="trends-tab">
      <div className="chart-card">
        <h3>Data Quality Trend (Pass Rate)</h3>
        <div className="chart-wrapper">
          <Line
            data={trendChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  title: {
                    display: true,
                    text: 'Pass Rate (%)',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="chart-card">
        <h3>Results Trend</h3>
        <div className="chart-wrapper">
          <Line
            data={resultChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * MetricCard - Display a single metric with icon and color
 */
const MetricCard = ({ label, value, icon, color }) => {
  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
};

/**
 * Helper functions
 */
const getScoreColor = (score) => {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
};

const getScoreStatus = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
};

export default ResultsVisualization;
