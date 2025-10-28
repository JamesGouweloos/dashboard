# Breakdown Table - Feature Overview

## 📊 Component: BreakdownTable.tsx

A comprehensive table component that displays yearly and monthly breakdown data with status filtering.

## ✨ Features

### 1. **Yearly Summary View**
- Displays aggregate data for each year
- Shows all metrics: Bed nights, Accommodation, Income, Disbursements, Revenue Total, Outstanding
- Breaks down by booking status (Confirmed/Provisional)
- Includes row totals when multiple statuses are present

### 2. **Status Filtering**
- Dropdown filter at the top right
- Options:
  - **All**: Shows all booking statuses
  - **Confirmed**: Only confirmed bookings
  - **Provisional**: Only provisional bookings
- Filter applies to both yearly and monthly views

### 3. **Monthly Details (Expandable)**
- Click "Show Details" to expand a year's monthly breakdown
- Each month can be clicked to show detailed metrics
- Displays the same 6 metrics for each month
- Color-coded values for quick visual scanning

### 4. **Interactive Features**
- **Expandable Years**: Click to show/hide monthly details
- **Expandable Months**: Click to show/hide month data
- **Smart Totals**: Calculates totals automatically
- **Responsive Design**: Works on desktop and mobile

## 📋 Displayed Metrics

For each year and month, the table shows:

1. **Bed Nights** - Total number of bed nights
2. **Accommodation** - Accommodation revenue (formatted as currency)
3. **Income** - Total income (green, formatted as currency)
4. **Disbursements** - Total disbursements (orange, formatted as currency)
5. **Revenue Total** - Total revenue (blue, bold, formatted as currency)
6. **Outstanding** - Outstanding amounts (red, formatted as currency)

## 🎨 Visual Design

- **Color Coding**: Income (green), Disbursements (orange), Revenue (blue), Outstanding (red)
- **Totals Row**: Highlighted with primary color background
- **Expandable Sections**: Smooth animations when expanding/collapsing
- **Hover Effects**: Interactive buttons for better UX
- **Responsive Layout**: Adapts to different screen sizes

## 📍 Location on Dashboard

The BreakdownTable appears at the bottom of the dashboard page, below the payment status chart.

It takes the full width of the page for optimal viewing of all data.

## 🔧 How It Works

1. **Data Source**: Receives data from `dashboard_data.json`
2. **Yearly Data**: Uses `yearly_breakdown` object
3. **Monthly Data**: Uses `monthly_breakdown` object
4. **Filtering**: Client-side filtering by status
5. **Sorting**: Years sorted chronologically, months by calendar order

## 💡 Usage Tips

- **Filter by Status**: Use the dropdown to focus on Confirmed or Provisional bookings
- **View Monthly Details**: Expand any year to see month-by-month breakdown
- **Navigate Months**: Click individual months to see detailed metrics
- **Compare Years**: Scroll through different years to see trends over time

## 📊 Data Structure

The component expects the following data structure:

```json
{
  "yearly_breakdown": {
    "2022": {
      "Confirmed": {
        "bed_nights": 123,
        "accommodation": 456.78,
        "income": 789.01,
        "disbursements": 234.56,
        "revenue_total": 1011.12,
        "outstanding": 321.43
      }
    }
  },
  "monthly_breakdown": {
    "2022": {
      "January": {
        "Confirmed": { /* same structure */ }
      }
    }
  }
}
```

## 🎯 Business Value

This table directly addresses **Rule 7** from the requirements:

✅ Bed nights breakdown by year and month  
✅ Accommodation revenue by year and month  
✅ Income calculation by year and month  
✅ Disbursements calculation by year and month  
✅ Revenue total by year and month  
✅ Total amount outstanding by year and month  
✅ Filter by Confirmed and Provisional status  
✅ Interactive drill-down capability  

Perfect for:
- Financial analysis and reporting
- Identifying seasonal trends
- Tracking outstanding amounts
- Planning and forecasting
- Executive presentations

