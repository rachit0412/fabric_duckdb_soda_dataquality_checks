# 🎨 Professional Web UI - Data Quality Platform

## Overview

Your Data Quality Platform now includes a **modern, professional web dashboard** with:

- ✅ Real-time monitoring dashboard
- ✅ Interactive charts and visualizations  
- ✅ Table-by-table quality metrics
- ✅ Historical trend analysis
- ✅ Scan history timeline
- ✅ Responsive design (mobile-friendly)
- ✅ No build steps required (pure HTML/CSS/JS)

---

## 🚀 Accessing the UI

### Local Development

```powershell
# Start the platform
.\manage.ps1 start

# Open dashboard
start http://localhost:8000
```

### Docker Container

```powershell
# Start containers
docker compose up -d

# Access UI
start http://localhost:8000
```

The dashboard automatically loads at the root URL (`/`).

---

## 📊 UI Features

### 1. **Real-Time Dashboard**

The main dashboard provides at-a-glance insights:

- **Monitored Tables**: Total number of tables being tracked
- **Total Scans**: Cumulative count of all data quality scans
- **Average Pass Rate**: Overall data quality health percentage
- **Failed Scans**: Number of scans that didn't meet quality standards

### 2. **Interactive Charts**

**Pass Rate Trend Chart** (Line Chart)
- Shows pass rate trends over the last 7 days
- Visualize quality improvements or degradation
- Smooth animated transitions

**Scans by Table** (Bar Chart)
- Distribution of scans across tables
- Identify which tables are monitored most frequently
- Quick comparison view

### 3. **Tables Overview**

Comprehensive table list with:
- Table name with icon
- Total scan count
- Average pass rate (color-coded: green ≥90%, yellow ≥70%, red <70%)
- Last scan timestamp
- Current status (PASSED/FAILED)
- Quick action buttons (History & Trends)

### 4. **Recent Activity Feed**

- Timeline of last 20 scans across all tables
- Color-coded success/failure indicators
- Timestamp for each scan
- Pass rate percentage
- Click to view details

### 5. **Auto-Refresh**

- Dashboard refreshes every 30 seconds automatically
- Manual refresh button available in header
- Real-time health status indicator

---

## 🎨 Design Features

### Professional Appearance

- **Gradient Header**: Modern purple gradient (matches enterprise branding)
- **Card-Based Layout**: Clean, organized information hierarchy
- **Smooth Animations**: Hover effects and transitions
- **Lucide Icons**: Modern, crisp iconography
- **Tailwind CSS**: Professional styling framework
- **Chart.js**: Interactive, animated charts
- **Alpine.js**: Reactive data binding

### Responsive Design

The UI automatically adapts to:
- Desktop (1920px+)
- Laptop (1366px)
- Tablet (768px)
- Mobile (320px+)

### Color Scheme

| Color | Usage | Hex |
|-------|-------|-----|
| Primary Purple | Headers, buttons, accents | `#667eea` |
| Secondary Purple | Hover states | `#764ba2` |
| Success Green | Pass indicators | `#10b981` |
| Warning Yellow | Moderate quality | `#f59e0b` |
| Error Red | Failed scans | `#ef4444` |
| Background | Page background | `#f9fafb` |

---

## 🔧 Customization

### Branding

Edit [src/ui/dashboard.html](src/ui/dashboard.html):

```html
<!-- Change title -->
<h1 class="text-3xl font-bold">Your Company Name</h1>
<p class="text-purple-100 text-sm">Your Tagline</p>

<!-- Update logo -->
<div class="bg-white bg-opacity-20 p-3 rounded-lg">
    <img src="/your-logo.png" class="w-8 h-8" />
</div>
```

### Colors

Modify Tailwind colors:

```html
<style>
    .gradient-bg {
        background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
    }
</style>
```

### Refresh Interval

Change auto-refresh timing:

```javascript
// In dashboard.html, find:
setInterval(() => this.loadDashboardData(), 30000);

// Change 30000 (30 seconds) to your desired interval in milliseconds
```

---

## 📡 API Integration

The UI calls these REST endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | System health check |
| `/api/summary` | GET | Dashboard statistics & data |
| `/api/history/{table}` | GET | Scan history for a table |
| `/api/trends/{table}` | GET | Trend analysis |

### API Response Format

**`/api/summary`** returns:

```json
{
  "total_tables": 5,
  "total_scans": 142,
  "average_pass_rate": 0.953,
  "failed_scans": 3,
  "tables": [
    {
      "table_name": "customers",
      "scan_count": 45,
      "avg_pass_rate": 95.2,
      "last_scan": "2026-03-29T10:30:00",
      "last_status": "PASSED"
    }
  ],
  "recent_scans": [
    {
      "scan_id": "abc-123",
      "table_name": "orders",
      "timestamp": "2026-03-29T11:00:00",
      "status": "PASSED",
      "pass_rate": 98.5
    }
  ]
}
```

---

## 🚦 Status Indicators

### Health Status

- **Green Pulse**: System healthy, database connected
- **Red Pulse**: Connection issues

### Table Status

| Badge | Meaning | Color |
|-------|---------|-------|
| **PASSED** | All quality checks passed | Green |
| **FAILED** | Some checks failed | Red |
| **UNKNOWN** | No recent scans | Gray |

### Pass Rate Colors

| Range | Badge Color | Meaning |
|-------|-------------|---------|
| ≥ 90% | Green | Excellent quality |
| 70-89% | Yellow | Acceptable quality |
| < 70% | Red | Poor quality |

---

## 🎯 User Workflows

### View Overall Health

1. Open dashboard: `http://localhost:8000`
2. Check the 4 stat cards at top
3. View pass rate trend chart
4. Scan recent activity feed

### Investigate a Table

1. Find table in "Monitored Tables" section
2. Check its average pass rate and last scan
3. Click **History** icon to see all scans
4. Click **Trends** icon for trend analysis

### Run a New Scan

1. Click "Run New Scan" button
2. Modal shows API endpoint and CLI command
3. Use provided examples to trigger scans
4. Dashboard auto-refreshes with new results

### Monitor in Real-Time

1. Keep dashboard open
2. Auto-refreshes every 30 seconds
3. Watch recent scans appear in activity feed
4. Charts update automatically

---

## 🛠️ Troubleshooting

### UI Won't Load

**Problem**: Blank page or 404 error

**Solution**:
```powershell
# Check if UI file exists
Test-Path "src/ui/dashboard.html"

# Restart API server
.\manage.ps1 restart

# Check logs
.\manage.ps1 logs
```

### No Data Showing

**Problem**: UI loads but shows "0" everywhere

**Solutions**:
1. **No database configured**: Check `.env` has `STORAGE_BACKEND=postgresql`
2. **No scans run yet**: Run a scan first
3. **Database connection issue**: Run `.\manage.ps1 test`

```powershell
# Check database connection
.\manage.ps1 test

# Run a test scan
.\manage.ps1 shell
python main.py scan --csv /app/data/test.csv --table test_table
```

### Charts Not Rendering

**Problem**: Dashboard loads but charts are blank

**Solution**:
- Check browser console for JavaScript errors
- Ensure internet connection (CDN resources)
- Try different browser
- Clear browser cache

### Auto-Refresh Not Working

**Problem**: Data doesn't update automatically

**Solution**:
- Check browser console for errors
- Verify `/api/summary` endpoint works: `http://localhost:8000/api/summary`
- Manual refresh with button in header

---

## 🔒 Security Considerations

### Production Deployment

1. **Enable HTTPS**: Use reverse proxy (nginx, Caddy)
2. **Add Authentication**: Implement OAuth2/JWT
3. **Rate Limiting**: Prevent abuse
4. **CORS Settings**: Restrict origins

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name dq.yourcompany.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Authentication (Future Enhancement)

Add to `server.py`:

```python
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.get("/", dependencies=[Depends(security)])
async def root():
    # Dashboard protected by token
```

---

## 📈 Performance Tips

### Optimize for Many Tables

If monitoring 50+ tables:

1. **Pagination**: Add table pagination in UI
2. **Lazy Loading**: Load charts on-demand
3. **Cache Summary**: Cache `/api/summary` response for 10-30 seconds
4. **Database Indexes**: Ensure proper indexes on timestamp fields

### Reduce Load

```javascript
// Increase refresh interval for large deployments
setInterval(() => this.loadDashboardData(), 60000); // 60 seconds instead of 30
```

---

## 🎨 Advanced Customizations

### Add Company Logo

```html
<!-- Replace icon in header -->
<div class="bg-white bg-opacity-20 p-3 rounded-lg">
    <img src="/static/logo.png" class="w-8 h-8" />
</div>
```

### Custom Metrics

Add new stat card:

```html
<div class="stat-card card-hover">
    <div class="flex items-center justify-between mb-3">
        <div class="bg-indigo-100 p-3 rounded-lg">
            <i data-lucide="your-icon" class="w-6 h-6 text-indigo-600"></i>
        </div>
        <span class="text-2xl font-bold" x-text="customMetric">0</span>
    </div>
    <h3 class="text-gray-600 text-sm font-medium">Your Metric</h3>
</div>
```

### Additional Charts

Add new chart section:

```html
<div class="bg-white rounded-xl shadow-md p-6">
    <h2 class="text-xl font-bold mb-4">Your Chart Title</h2>
    <canvas id="yourChart" height="250"></canvas>
</div>
```

---

## 🌐 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| IE 11 | - | ❌ Not supported |

---

## 📱 Mobile Experience

The UI is fully responsive:

- Touch-friendly buttons
- Swipeable tables
- Collapsible sections
- Optimized charts
- Mobile navigation

Test on mobile:
```powershell
# Find your local IP
ipconfig | findstr IPv4

# Access from mobile
http://YOUR_IP:8000
```

---

## 🎊 Next Steps

### Enhance the UI

1. **Add Filtering**: Filter tables by status, pass rate
2. **Search Function**: Search tables by name
3. **Export Data**: Download reports as CSV/Excel
4. **Dark Mode**: Toggle dark/light theme
5. **Alerts Panel**: Show active alerts
6. **User Preferences**: Save custom dashboard layouts
7. **Drill-Down Views**: Detailed check-by-check analysis

### Integrate with Tools

- **Grafana**: Use Grafana dashboard for advanced visualizations
- **Power BI**: Connect Power BI to PostgreSQL
- **Slack/Teams**: Show dashboard snapshots in chat
- **Email Reports**: Schedule dashboard screenshots

---

## 📚 Resources

- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Chart.js Docs**: https://www.chartjs.org/docs
- **Alpine.js Docs**: https://alpinejs.dev
- **Lucide Icons**: https://lucide.dev/icons

---

## ✅ Summary

**You now have**:
- ✅ Professional web-based dashboard
- ✅ Real-time data quality monitoring
- ✅ Interactive charts and visualizations
- ✅ Mobile-responsive design
- ✅ Zero build tools required
- ✅ Easy to customize

**Access it**:
```powershell
.\manage.ps1 start
start http://localhost:8000
```

Enjoy your beautiful new UI! 🎨🚀
