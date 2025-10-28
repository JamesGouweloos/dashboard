#!/bin/bash

# Baines River Camp Dashboard Update Script
# Run this script each week after receiving new booking data

echo "🔄 Updating Baines River Camp Dashboard..."
echo ""

# Check if bookingData.csv exists
if [ ! -f "bookingData.csv" ]; then
    echo "❌ Error: bookingData.csv not found!"
    echo "   Please ensure your booking data file is named 'bookingData.csv'"
    exit 1
fi

# Install Python dependencies if needed
echo "📦 Checking Python dependencies..."
pip install -r requirements.txt --quiet

# Process the data
echo ""
echo "📊 Processing booking data..."
python process_booking_data.py

# Check if processing was successful
if [ -f "dashboard_data.json" ]; then
    echo ""
    echo "✅ Dashboard data updated successfully!"
    echo ""
    echo "🚀 To view the dashboard, run:"
    echo "   npm run dev"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to generate dashboard data"
    exit 1
fi

