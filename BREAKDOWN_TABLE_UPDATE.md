# Breakdown Table Update - Booking Class Filter Added

## ✨ New Feature Added

### Additional Filter for "Income Generating" and "Non-Income Generating"

The breakdown table now includes a second filter dropdown for booking classification alongside the existing status filter.

## 🎯 What's New

### 1. **Dual Filter System**
- **Status Filter**: Filter by Confirmed, Provisional, or All
- **Class Filter**: Filter by Income Generating, Non-Income Generating, or All
- Both filters work independently and in combination

### 2. **Booking Class Summary Section**
A new summary table appears at the top of the breakdown showing:

#### Income Generating
- **Count**: Number of bookings
- **Revenue**: Total revenue
- **Bed Nights**: Total bed nights
- **Income**: Total income generated
- **Disbursements**: Total disbursements
- **Outstanding**: Amount still owed

#### Non-Income Generating  
- Same metrics as above
- Color-coded with orange background (vs green for Income Generating)

### 3. **Enhanced Filtering**

The table now supports:
- **Filter by Status**: View only Confirmed or Provisional bookings
- **Filter by Class**: View only Income Generating or Non-Income Generating bookings
- **Combined Filters**: Apply both filters simultaneously
- **All Option**: View everything together

## 📊 How It Works

### Example Usage

**Scenario 1**: View only Income Generating bookings
- Set Class Filter to "Income Generating"
- Shows: Summary table with only Income Generating row
- All yearly/monthly data remains visible (filtered by status only)

**Scenario 2**: View only Confirmed bookings  
- Set Status Filter to "Confirmed"
- Shows: Only Confirmed data in yearly/monthly breakdowns

**Scenario 3**: View Income Generating + Confirmed
- Set Class Filter to "Income Generating"  
- Set Status Filter to "Confirmed"
- Shows: Income Generating summary and Confirmed data in yearly/monthly views

## 🎨 Visual Design

### Color Coding
- **Green background**: Income Generating bookings
- **Orange background**: Non-Income Generating bookings
- **Blue text**: Revenue amounts
- **Green text**: Income
- **Orange text**: Disbursements  
- **Red text**: Outstanding amounts

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Filters: [Status ▼] [Class ▼]                      │
├─────────────────────────────────────────────────────┤
│ Overall Booking Class Summary                        │
│ ┌────────────┬──────┬──────────┬─────────...┐      │
│ │ Class      │ Count│ Revenue   │ Bed Nights│      │
│ ├────────────┼──────┼──────────┼─────────...┤      │
│ │ Income Gen │ 749  │ $X.XX    │ 8,234    │      │
│ │ Non-Income │ 72   │ $X.XX    │ 601      │      │
│ └────────────┴──────┴──────────┴─────────...┘      │
├─────────────────────────────────────────────────────┤
│ 2024 Summary                                         │
│ [Expanded yearly and monthly breakdowns...]         │
└─────────────────────────────────────────────────────┘
```

## 📈 Data Display

### Booking Class Summary Shows:
- **Count**: Total number of bookings in each class
- **Revenue**: Total revenue from bookings
- **Bed Nights**: Total bed nights  
- **Income**: Total income calculated
- **Disbursements**: Total disbursements
- **Outstanding**: Total amount outstanding

### Yearly/Monthly Breakdowns Show:
- Same metrics as before
- Data filtered by status and class selections
- Expandable to show month-by-month details

## ✅ Benefits

1. **Quick Overview**: See at a glance the split between Income and Non-Income Generating
2. **Dual Analysis**: Analyze both booking status AND classification
3. **Flexible Views**: Filter by either dimension independently
4. **Visual Clarity**: Color-coded rows make it easy to differentiate
5. **Complete Picture**: Summary + detailed breakdowns

## 🚀 How to Use

1. **Select Status Filter**: Choose Confirmed, Provisional, or All
2. **Select Class Filter**: Choose Income Generating, Non-Income Generating, or All
3. **View Summary**: Check the Booking Class Summary for overall metrics
4. **Expand Years**: Click "Show Details" to see monthly breakdowns
5. **Expand Months**: Click individual months to see detailed metrics

The filters apply globally to both the summary section and all yearly/monthly breakdown tables.

