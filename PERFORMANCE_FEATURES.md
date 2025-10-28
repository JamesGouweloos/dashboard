# Performance Analysis Page - Feature Documentation

## Overview

The Performance page (`/performance`) provides comprehensive analysis tools to answer key business questions about revenue generation and efficiency.

## Features

### 1. Revenue Over Time Chart

**Question Answered:** What is the total revenue per year, quarter, or month?

**Features:**
- **Interactive Time Range Selector**: Toggle between Year, Quarter, and Month views
- **Single Unified Graph**: Shows revenue trends across all selected time periods
- **Visual Elements**:
  - Blue line chart with smooth transitions
  - Hover tooltips showing exact revenue amounts
  - Responsive design for all screen sizes
  - Total revenue summary card above the chart

**Data Source:** `data.revenue_trends`
**Chart Type:** Line Chart

**Controls:**
- Year/Quarter/Month toggle buttons in the header
- Automatically aggregates data based on selected range

---

### 2. Revenue Efficiency Chart

**Question Answered:** How much revenue was generated per guest, per night, or per booking?

**Features:**
- **Interactive Metric Selector**: Toggle between:
  - Per Guest (Revenue ÷ Number of Guests)
  - Per Night (Revenue ÷ Bed Nights)
  - Per Booking (Revenue ÷ Booking Count)
- **Time-Based Visualization**: Shows efficiency trends over time
- **Average Efficiency Display**: Summary card showing average efficiency for selected metric
- **Visual Elements**:
  - Green bar chart
  - Monthly granularity
  - Color-coded for performance
  - Responsive and interactive

**Data Source:** `data.revenue_trends` (monthly aggregates)

**Controls:**
- Per Guest/Per Night/Per Booking toggle buttons
- Real-time recalculation based on selected metric

**Usage:**
- Use Per Guest to understand guest spending behavior
- Use Per Night to analyze daily rates and pricing efficiency
- Use Per Booking to evaluate average booking value

---

### 3. Top Agents Chart

**Question Answered:** Which agents generated the highest revenue?

**Features:**
- **Horizontal Bar Chart**: Shows top 10 agents ranked by revenue
- **Color-Coded Bars**: Each agent has a distinct color
- **Interactive Tooltips**: Display exact revenue and booking counts
- **Summary Card**: Shows total revenue from top agents
- **Visual Elements**:
  - Purple/pink gradient summary card
  - Horizontal layout for easy reading
  - Agent names on Y-axis
  - Revenue on X-axis in thousands

**Data Source:** `data.by_agent`

**Display:**
- Top 10 agents by revenue
- Sorted descending by revenue
- Color-coded bars for visual distinction

---

### 4. Top Sources Chart

**Question Answered:** Which sources generated the highest revenue?

**Features:**
- Reuses existing `TopSourcesChart` component
- Shows booking source performance
- Helps identify marketing channel effectiveness
- Integrates with global filters

**Data Source:** `data.by_source`

---

## Page Layout

```
┌─────────────────────────────────────────┐
│  Performance Analysis Header            │
│  + Filters (Status & Class)              │
└─────────────────────────────────────────┘
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Revenue Over Time                  │ │
│  │  [Chart with Year/Quarter/Month]    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Revenue Efficiency                 │ │
│  │  [Chart with Per Guest/Night/Book] │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────┬───────────────────┐ │
│  │  Top Agents   │  Top Sources      │ │
│  │  [Chart]      │  [Chart]          │ │
│  └───────────────┴───────────────────┘ │
└─────────────────────────────────────────┘
```

## Filter Integration

All charts respond to the global filters:

**Status Filter:**
- All
- Confirmed
- Provisional

**Class Filter:**
- All
- Income Generating
- Non-Income Generating

**Behavior:**
- Filters apply to summary cards and all visualizations
- Real-time updates when filters change
- Maintains chart type and settings during filtering

## Data Requirements

The performance page requires the following data structures:

1. **`revenue_trends`**: Monthly revenue breakdown
   - Year → Month → {revenue, pax, bed_nights, count}

2. **`by_agent`**: Agent performance data
   - Agent name → {count, revenue, bed_nights}

3. **`by_source`**: Source performance data
   - Source name → {count, revenue, bed_nights}

## User Interactions

### Revenue Time Chart
1. Click Year/Quarter/Month to change time granularity
2. Hover over data points for exact values
3. Chart automatically redraws with new aggregation

### Revenue Efficiency Chart
1. Click Per Guest/Night/Booking to change metric
2. Hover over bars to see exact efficiency value
3. Summary card updates with average efficiency

### Top Agents Chart
1. Hover over bars to see agent details
2. View rankings and performance comparison
3. Color coding aids visual distinction

## Technical Implementation

### Components Used
- `RevenueTimeChart`: Custom line chart with time range selector
- `RevenueEfficiencyChart`: Custom bar chart with metric selector
- `TopAgentsChart`: Custom horizontal bar chart
- `TopSourcesChart`: Existing source visualization
- `DashboardFilters`: Global filter component

### Chart Library
- **Recharts**: All charts built with Recharts
- ResponsiveContainer for adaptive sizing
- Custom styling for brand consistency

### Responsive Design
- Charts scale to container width
- Mobile-friendly with readable text
- Touch-friendly controls

## Best Practices

### For Revenue Analysis
- Start with Year view for long-term trends
- Switch to Quarter for seasonal patterns
- Use Month for detailed month-over-month analysis

### For Efficiency Analysis
- Use Per Guest for guest behavior insights
- Use Per Night for pricing strategy evaluation
- Use Per Booking for average booking value

### For Agent Performance
- Review top agents for best practices
- Identify training opportunities
- Compare performance across agents

### For Source Analysis
- Evaluate marketing channel ROI
- Identify most effective sources
- Plan marketing budget allocation

## Future Enhancements

Potential additions:
1. Export charts as images/PDF
2. Date range picker for custom periods
3. Comparison mode (year-over-year)
4. Drill-down from aggregates to details
5. Performance benchmarking
6. Goal tracking and alerts

