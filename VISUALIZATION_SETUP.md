# Frontend Setup for Visualization Features

## Step 1: Install Chart.js Dependencies

```bash
cd services/frontend
npm install chart.js react-chartjs-2
```

This adds support for interactive charts (pie, bar, line graphs).

## Step 2: Update Dashboard Component (Step 5)

Update your Dashboard.js to integrate the visualization component. In your Step 5 render section, add:

```javascript
import ResultsVisualization from './ResultsVisualization';

// Inside Step 5 component:
useEffect(() => {
  if (runResults?.id) {
    // Fetch metrics from backend
    fetch(`http://localhost:8000/api/v1/visualization/runs/${runResults.id}/metrics`)
      .then(response => response.json())
      .then(data => setVisualizationMetrics(data))
      .catch(err => console.error('Failed to fetch metrics:', err));
  }
}, [runResults?.id]);

// In the render section for Step 5:
{currentStep === 5 && (
  <div className="step-content">
    <h2>📊 Results & Data Quality Insights</h2>
    
    {runResults ? (
      <>
        <ResultsVisualization 
          runId={runResults.id}
          metrics={visualizationMetrics}
          planId={checkPlanUUID}
        />
        {/* ... existing results display ... */}
      </>
    ) : (
      <p>No results available</p>
    )}
  </div>
)}
```

## Step 3: Add State Variables

In your Dashboard component's useState section, add:

```javascript
const [visualizationMetrics, setVisualizationMetrics] = useState(null);
```

## Step 4: Verify Backend is Running

Make sure the backend API is running with the new visualization routes:

```bash
cd backend
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see the visualization routes registered:
```
POST /api/v1/visualization/runs/{run_id}/metrics
POST /api/v1/visualization/plans/{plan_id}/trend
POST /api/v1/visualization/summary/quality-by-column
```

## Step 5: Test Visualization

1. Upload a CSV file (Step 1)
2. Profile the data (Step 2)
3. Select or create checks (Steps 3-4)
4. Execute checks (Step 4 Execute button)
5. View Step 5 - should now show beautiful charts!

## Charts You'll See

### Overview Tab
- **Pass Rate Pie Chart**: Visual breakdown of passed vs failed checks
- **Check Type Distribution**: Bar chart showing results by category
- **Metric Cards**: Summary statistics at the top

### Column Details Tab
- **Quality Scorecard**: Table showing each column's quality score
- **Color-Coded Status**: Green (excellent), Yellow (good), Orange (fair), Red (poor)
- **Pass/Fail Counts**: Per-column check results

### Trends Tab (if viewing plan over time)
- **Pass Rate Trend**: Historical pass rate line chart
- **Results Trend**: Passed/failed results over time

## Troubleshooting

### Charts not showing?

1. Check browser console for errors (F12)
2. Verify backend is responding:
   ```bash
   curl http://localhost:8000/api/v1/visualization/runs/{run_id}/metrics
   ```
3. Ensure Chart.js packages are installed:
   ```bash
   npm list chart.js react-chartjs-2
   ```

### API returning 404?

Make sure backend/src/main.py has the visualization routes registered. Check:
```python
from src.api.routes import visualization
app.include_router(visualization.router, prefix="/api/v1/visualization")
```

### Data not loading?

1. Check that checks have been executed
2. Verify run_id is valid
3. Check backend logs for errors

## Next: Enable Chart Caching (Optional)

For better performance with large datasets, you can cache metrics:

```javascript
// In ResultsVisualization.js
const [metricsCache, setMetricsCache] = useState({});

useEffect(() => {
  if (runId && !metricsCache[runId]) {
    fetchMetrics();
  }
}, [runId, metricsCache]);
```

## Styling Customization

All styling is in `ResultsVisualization.css`. You can customize:
- Colors: `#10b981` (green), `#ef4444` (red), `#3b82f6` (blue)
- Fonts: Change `font-family` in `.visualization-container`
- Spacing: Adjust `padding` and `gap` values
- Breakpoints: Modify `@media` queries for responsive design

---

## Charts Library Overview

**Chart.js** provides:
- Small bundle size (~10KB)
- No dependencies
- Responsive by default
- Documentation: https://www.chartjs.org/

**Supported Charts** (included):
- Pie / Donut
- Bar / Horizontal Bar
- Line / Area
- Scatter
- Bubble
- Radar

---

## Performance Notes

- All charts are responsive and re-render on data changes
- Large datasets (1000+ checks) may need pagination
- Trends tab loads data on-demand (doesn't slow down initial render)
- Charts use Canvas rendering (faster than SVG)

---

## Mobile Responsive

The visualization component is fully mobile responsive:
- Desktop: Up to 4 columns for metrics
- Tablet: Up to 2 columns
- Mobile: Single column with stacked layout

