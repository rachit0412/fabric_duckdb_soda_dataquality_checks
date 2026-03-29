# UI Screenshots & Preview

## Dashboard Overview

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  [🛡️] Data Quality Platform            🟢 System Healthy    [🔄 Refresh] ║
║       Enterprise Data Quality Monitoring & Validation                   ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│                │  │                │  │                │  │                │
│   📊           │  │   ✅           │  │   📈           │  │   ⚠️           │
│                │  │                │  │                │  │                │
│      42        │  │     1,247      │  │    94.5%       │  │       8        │
│                │  │                │  │                │  │                │
│ Monitored      │  │  Total Scans   │  │  Avg. Pass     │  │ Failed Scans   │
│ Tables         │  │                │  │  Rate          │  │                │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘

┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│ 📈 Pass Rate Trend (Last 7 Days)   │  │ 📊 Scans by Table                   │
│                                     │  │                                     │
│    100%│     ╱▔▔╲                  │  │                                     │
│        │    ╱    ╲                 │  │  customers  ████████████  142       │
│     90%│   ╱      ╲   ╱╲          │  │  orders     ████████  98            │
│        │  ╱        ╲_╱  ╲         │  │  products   ██████  76              │
│     80%│_╱               ╲_       │  │  inventory  ████  45                │
│        └─────────────────────     │  │  users      ███  32                 │
└─────────────────────────────────────┘  └─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ 📋 Monitored Tables                                      [▶️ Run New Scan]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Table Name    │ Scans │ Avg Pass Rate │  Last Scan   │ Status  │ Actions    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 📄 customers  │  142  │  🟢 95.2%     │ 10:30 AM     │ PASSED  │ 📊 📈     │
│ 📄 orders     │   98  │  🟢 93.5%     │ 10:25 AM     │ PASSED  │ 📊 📈     │
│ 📄 products   │   76  │  🟡 87.1%     │ 10:20 AM     │ PASSED  │ 📊 📈     │
│ 📄 inventory  │   45  │  🔴 68.4%     │ 10:15 AM     │ FAILED  │ 📊 📈     │
│ 📄 users      │   32  │  🟢 96.8%     │ 10:10 AM     │ PASSED  │ 📊 📈     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔄 Recent Scans                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🟢 customers    │ 2026-03-29 10:30:00  │ 95.2% │ PASSED                    │
│ 🟢 orders       │ 2026-03-29 10:25:00  │ 93.5% │ PASSED                    │
│ 🟢 products     │ 2026-03-29 10:20:00  │ 87.1% │ PASSED                    │
│ 🔴 inventory    │ 2026-03-29 10:15:00  │ 68.4% │ FAILED                    │
│ 🟢 users        │ 2026-03-29 10:10:00  │ 96.8% │ PASSED                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Key Visual Elements

### Header
- **Gradient Background**: Purple gradient (667eea → 764ba2)
- **Logo**: Shield icon in white rounded box
- **Status Indicator**: Pulsing green dot with "System Healthy"
- **Refresh Button**: White button with rotation icon

### Statistics Cards
- **White Cards**: Elevated with subtle shadows
- **Colored Icons**: Blue (Database), Green (Check), Purple (Trend), Red (Alert)
- **Large Numbers**: Bold 2xl font
- **Card Hover**: Lifts up 4px on hover

### Charts
- **Line Chart**: Smooth curved lines with gradient fill
- **Bar Chart**: Purple bars with animation
- **Responsive**: Adjusts to container size
- **Interactive**: Tooltips on hover

### Tables
- **Clean Rows**: Alternating hover states
- **Color-Coded Badges**: 
  - Green (≥90%): Excellent
  - Yellow (70-89%): Acceptable  
  - Red (<70%): Poor
- **Action Icons**: History and Trends buttons
- **Responsive**: Horizontal scroll on mobile

### Recent Activity
- **Timeline Style**: Dots indicating status
- **Gray Cards**: Hover effect to light gray
- **Timestamp**: Relative time format
- **Status Badges**: Color-coded PASSED/FAILED

## Color Palette

```
Primary Purple:   #667eea  ████████
Secondary Purple: #764ba2  ████████
Success Green:    #10b981  ████████
Warning Yellow:   #f59e0b  ████████
Error Red:        #ef4444  ████████
Background:       #f9fafb  ████████
Card White:       #ffffff  ████████
Text Gray:        #374151  ████████
Border Gray:      #e5e7eb  ████████
```

## Typography

- **Headers**: Inter/Segoe UI, Bold, 24-32px
- **Body**: Inter/Segoe UI, Regular, 14-16px
- **Labels**: Inter/Segoe UI, Medium, 12-14px
- **Numbers**: Inter/Segoe UI, Bold, 24-48px

## Icons

Using Lucide Icons:
- shield-check (Platform logo)
- database (Tables)
- check-circle (Success)
- trending-up (Trends)
- alert-circle (Errors)
- refresh-cw (Refresh)
- play (Run scan)
- history (View history)
- line-chart (Trends)

## Responsive Breakpoints

```
Mobile:   320px  - 767px   (Single column, stacked cards)
Tablet:   768px  - 1023px  (2 columns, compact tables)
Desktop:  1024px - 1439px  (3-4 columns, full tables)  
Large:    1440px+          (4 columns, spacious layout)
```

## Animation & Interactions

- **Card Hover**: Transform translateY(-4px), shadow increase
- **Button Hover**: Color darken, transform translateY(-2px)
- **Pulse Dot**: Opacity animation 0-1-0 over 2 seconds
- **Loading**: Rotating spinner with border animation
- **Chart Entry**: Smooth fade-in with scale animation
- **Auto-refresh**: Fade transition on data update

## Accessibility Features

- **Color Contrast**: WCAG AA compliance
- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Reader**: Proper ARIA labels
- **Focus States**: Visible focus rings
- **Alt Text**: Icons have descriptive text alternatives

## Mobile Optimizations

- **Touch Targets**: Minimum 44x44px
- **Responsive Tables**: Horizontal scroll with shadows
- **Collapsible Sections**: Mobile menu for navigation
- **Swipe Gestures**: Swipe to refresh
- **Optimized Charts**: Simplified for smaller screens

## Dark Mode (Future Enhancement)

```
Background:       #1f2937
Card:             #374151
Text:             #f9fafb
Border:           #4b5563
Primary:          #818cf8 (Lighter purple)
```

## Loading States

- **Initial Load**: Centered spinner with "Loading dashboard data..."
- **Refresh**: Spinner in refresh button
- **Empty State**: Inbox icon with "No tables monitored yet"

## Error States

- **Connection Error**: Red status indicator
- **No Data**: Friendly message with icon
- **API Error**: Toast notification (future)

## URL Structure

```
/                    → Dashboard (Main UI)
/api/docs           → Swagger API Documentation
/api/health         → Health Check (JSON)
/api/summary        → Dashboard Data (JSON)
/api/history/{table} → Table History (JSON)
/api/trends/{table}  → Trend Analysis (JSON)
```

This professional UI transforms the data quality platform from a backend service into a complete, user-friendly application! 🎨
