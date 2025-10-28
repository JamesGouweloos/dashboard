# Data Processing Summary - Baines River Camp Dashboard

## ✅ Completed Processing Steps

### 1. CSV Header Fix
- **Problem**: The original CSV had a multi-row header (rows 11, 12, and 13)
- **Solution**: Created `fix_csv_headers.py` to merge headers into a single row
- **Result**: `bookingData_fixed.csv` with clean single header row

### 2. Business Rules Applied

#### Rule 1: Remove MV-Matusadona Bookings ✅
- **Removed**: 49 bookings for "MV - Matusadona" property
- **Reason**: Only process Baines River Camp bookings

#### Rule 2: Filter Staff/Management Bookings ✅
- **Removed**: 28 bookings containing keywords: Scott, Brown, Craig, Featherby, TWF, Staff
- **Exceptions Kept**: WB3703, WB4118, WB2748, WB4001, WB3556
- **Reason**: Remove internal/non-revenue bookings

#### Rule 3 & 4: Booking Classification ✅
- **Income Generating**: 749 bookings
- **Non-Income Generating**: 72 bookings
- **Classification Logic**:
  - Accommodation = 0 → Non-Income Generating
  - **Exceptions**: WB3964, WB3762, WB4193, WB4242 remain Income Generating
  - All other bookings → Income Generating

#### Rule 5: Calculate Income Column ✅
- **Formula**: Sum of 51+ specific revenue columns
- **Includes**: Accommodation, Bar items, Curio items, Activities, Fees, etc.
- **Excludes**: Discounts (subtracted)
- **Total Income**: $2,880,813.68

#### Rule 6: Calculate Disbursements Column ✅
- **Formula**: Revenue Total - Income
- **Total Disbursements**: $646,357.99
- **Total Revenue**: $3,527,171.67

#### Rule 7: Yearly & Monthly Breakdowns ✅
- **Yearly Breakdown**: By year and status (Confirmed/Provisional)
- **Monthly Breakdown**: By year, month, and status
- **Metrics Tracked**: Bed nights, Accommodation, Income, Disbursements, Revenue Total, Outstanding

## 📊 Final Dataset Summary

- **Total Bookings**: 821 (down from 899 after filtering)
- **Confirmed**: 796 bookings
- **Provisional**: 25 bookings
- **Total Revenue**: $3,527,171.67
- **Total Income**: $2,880,813.68
- **Total Disbursements**: $646,357.99
- **Total Bed Nights**: 9,835
- **Total Guests (PAX)**: 3,256

## 🎯 Key Metrics by Status

### Confirmed Bookings
- Count: 796
- Revenue: $3,311,714.45
- Bed Nights: 9,172
- Guests: 3,075
- Income: $2,696,086.49
- Disbursements: $615,627.96
- Outstanding: $372,993.89

### Provisional Bookings
- Count: 25
- Revenue: $215,457.22
- Bed Nights: 663
- Guests: 181
- Income: $184,727.19
- Disbursements: $30,730.03
- Outstanding: $241,557.85

## 📁 Files Generated

1. **bookingData_fixed.csv** - Cleaned CSV with single header row
2. **dashboard_data.json** - Processed data for React dashboard
3. **fix_csv_headers.py** - Header fixing script
4. **process_booking_data.py** - Main data processing script
5. **update_dashboard.bat** - Automated update script

## 🔄 Weekly Update Process

To update the dashboard with new data each week:

1. Replace `bookingData.csv` with new export
2. Run: `update_dashboard.bat`
3. The script will:
   - Fix CSV headers
   - Apply business rules
   - Calculate income/disbursements
   - Generate breakdown tables
   - Create dashboard_data.json
4. Refresh your browser at http://localhost:3000

## 📈 Available Data for Dashboard

The dashboard now has access to:

### Summary Metrics
- Total bookings, revenue, payments, outstanding
- Total income and disbursements
- Income vs Non-Income generating counts
- Bed nights and guests

### Analysis Views
- By Status (Confirmed/Provisional)
- By Booking Class (Income/Non-Income Generating)
- By Source
- By Agent
- By Consultant
- Revenue trends by month

### Breakdown Tables
- **Yearly**: By year and status
- **Monthly**: By year, month, and status
- Both include: Bed nights, Accommodation, Income, Disbursements, Revenue Total, Outstanding

## ✅ Data Quality Assurance

- All MV-Matusadona bookings removed
- Staff/management bookings filtered (with exceptions)
- Income/Disbursements properly calculated
- Yearly and monthly breakdowns complete
- All 7 business rules successfully applied

## 🚀 Next Steps

The dashboard is ready to display the processed data at:
**http://localhost:3000**

All metrics are calculated and available in `dashboard_data.json`.

