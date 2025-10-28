@echo off
REM Baines River Camp Dashboard Update Script for Windows
REM Run this script each week after receiving new booking data

echo.
echo 🔄 Updating Baines River Camp Dashboard...
echo.

REM Check if bookingData.csv exists
if not exist "bookingData.csv" (
    echo ❌ Error: bookingData.csv not found!
    echo    Please ensure your booking data file is named 'bookingData.csv'
    exit /b 1
)

REM Install Python dependencies if needed
echo 📦 Checking Python dependencies...
pip install -r requirements.txt --quiet

REM Fix CSV headers
echo.
echo 🔧 Fixing CSV headers...
python fix_csv_headers.py
if errorlevel 1 (
    echo ❌ Error: Failed to fix CSV headers
    exit /b 1
)

REM Process the data
echo.
echo 📊 Processing booking data...
python process_booking_data.py

REM Check if processing was successful
if exist "dashboard_data.json" (
    echo.
    echo ✅ Dashboard data updated successfully!
    echo.
    echo 🚀 To view the dashboard, run:
    echo    npm run dev
    echo.
) else (
    echo.
    echo ❌ Error: Failed to generate dashboard data
    exit /b 1
)

