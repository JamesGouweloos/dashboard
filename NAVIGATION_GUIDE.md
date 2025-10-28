# Navigation Guide - Baines Dashboard

## 🗂️ Multi-Page Structure

The dashboard now features a clean multi-page layout with left-side navigation.

### 📄 Pages

#### 1. **Dashboard** (`/`)
- Overview of key metrics
- Summary cards (Revenue, Bookings, Bed Nights, Guests)
- Quick visualizations
- Best for: High-level overview

#### 2. **Revenue** (`/revenue`)
- Revenue trends over time
- Booking status breakdown
- Payment status tracking
- Best for: Financial analysis

#### 3. **Sources** (`/sources`)
- Top booking sources
- Revenue extras analysis
- Performance by channel
- Best for: Marketing insights

#### 4. **Analysis** (`/analysis`)
- Detailed yearly & monthly breakdown
- Individual booking details
- Advanced filtering (Status & Class)
- Best for: Deep dive analysis

## 🎨 Sidebar Navigation

### Features
- **Persistent sidebar** on all pages
- **Active page highlighting** (blue background)
- **Hover animations** for better UX
- **Modern gradient design**
- **Icon-based navigation**

### Navigation Items
- 📊 Dashboard - Main overview
- 📈 Revenue - Revenue trends
- 🌐 Sources - Booking sources
- 📋 Analysis - Detailed breakdown

## 🚀 How to Use

### Navigation
- Click any item in the left sidebar to switch pages
- The active page is highlighted in blue
- Smooth transitions between pages

### Page-Specific Features

#### Dashboard Page
- Quick stats at a glance
- Multiple chart types
- Overview of all metrics

#### Revenue Page
- Focus on financial metrics
- Revenue trend analysis
- Payment tracking

#### Sources Page
- Channel performance
- Source attribution
- Extras revenue

#### Analysis Page
- Expandable yearly breakdowns
- Monthly detail views
- Individual booking listings
- Dual filter system (Status + Class)

## 🎯 Best Practices

### For Quick Overview
→ Use **Dashboard** page

### For Financial Analysis
→ Use **Revenue** page

### For Marketing Review
→ Use **Sources** page

### For Detailed Investigation
→ Use **Analysis** page with filters

### For Data Verification
→ Use **Analysis** page to view individual bookings

## 📱 Responsive Design

- Sidebar is always visible on desktop
- Mobile: Sidebar collapses (consider adding toggle)
- All charts remain interactive
- Tables are horizontally scrollable when needed

## 🔄 Data Flow

All pages fetch data from the same API endpoint:
- `/api/data` provides processed data
- Same data source = consistent metrics
- Filters apply in-memory (fast)

## ✨ Key Features

### Sidebar
- Dark gradient theme
- Active state indication
- Hover effects
- Icons from Lucide React
- Fixed position for easy access

### Page Layout
- Consistent header across pages
- Page-specific titles and descriptions
- Spacious content area
- Professional footer

### Navigation
- Client-side routing (fast)
- No page reload
- Maintains scroll position
- Smooth transitions

## 🎨 Styling

### Colors
- Sidebar: Gray-900 to Gray-800 gradient
- Active item: Primary-600 (blue)
- Inactive: Gray-300
- Hover: Gray-800 background

### Icons
- Layout Dashboard: Main dashboard
- Trending Up: Revenue
- Globe: Sources
- Bar Chart: Analysis

## 🚀 Next Steps

The navigation structure is ready. You can now:
1. Navigate between pages seamlessly
2. Filter data on the Analysis page
3. View detailed booking information
4. Analyze trends across different views

All pages are live at: **http://localhost:3000**

