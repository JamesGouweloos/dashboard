# Baines River Camp Dashboard - Setup Guide

## 🎉 Setup Complete!

Your dashboard is ready to use. The data has been processed successfully with:
- **899 Total Bookings**
- **$4,141,325.71 Total Revenue**
- **18,430 Bed Nights**

## 🚀 Starting the Dashboard

The development server should be starting now. Access it at:
**http://localhost:3000**

If the server isn't running, start it with:
```bash
npm run dev
```

## 📊 What's Included

### Dashboard Features:
1. **Summary Cards**: Quick overview of key metrics
2. **Revenue Trends**: Monthly revenue visualization
3. **Booking Status**: Breakdown of confirmed vs provisional
4. **Top Sources**: Leading booking channels
5. **Top Extras**: Highest revenue extra categories
6. **Payment Status**: Payment completion tracking

### Interactive Charts:
- Fully responsive design
- Smooth animations
- Interactive tooltips
- Beautiful color schemes

## 🔄 Weekly Updates

Each week when you receive new booking data:

### Windows:
1. Replace `bookingData.csv` with the new file
2. Run: `update_dashboard.bat`
3. Refresh your browser

### Manual Process:
1. Replace `bookingData.csv`
2. Run: `python process_booking_data.py`
3. Restart: `npm run dev`

## 📁 Important Files

- `bookingData.csv` - Your weekly data export (not in git)
- `dashboard_data.json` - Processed data (auto-generated)
- `process_booking_data.py` - Python processing script
- `app/` - React dashboard components
- `components/` - Reusable chart components

## 🛠️ Development Commands

```bash
# Process new data
python process_booking_data.py

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📱 Features Highlight

### Why This Architecture?

**Python Backend:**
- Powerful data processing with Pandas
- Flexible analytics capabilities
- Easy to add new metrics
- Handles complex CSV structures

**React Frontend:**
- Modern, responsive UI
- Smooth animations
- Interactive charts
- Fast performance
- Professional appearance

### Data Flow:
```
CSV Export → Python Processing → JSON Data → React Dashboard
```

## ✨ Next Steps

1. **View the Dashboard**: Open http://localhost:3000
2. **Explore the Visualizations**: Click and hover on charts
3. **Monitor Weekly**: Run the update script each week
4. **Customize** (optional): Modify components for additional insights

## 🎨 Customization

Want to add more metrics or change the design?

- **Add Charts**: Create new components in `components/`
- **Update Analysis**: Modify `process_booking_data.py`
- **Change Styling**: Edit `app/globals.css` or use Tailwind classes
- **Add Filters**: Implement date range or property filters

## 🔒 Data Privacy

- All data stays local on your machine
- CSV files are excluded from git
- No external APIs or cloud services
- Fully self-contained solution

## 📞 Support

For questions or issues, the code is well-documented with inline comments.

Happy analyzing! 📊

