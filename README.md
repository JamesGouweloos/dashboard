# Baines River Camp - Booking Dashboard

A modern, interactive dashboard for analyzing booking and revenue data for Baines River Camp. Built with React/Next.js for a beautiful frontend and Python for data analysis.

## 📊 Features

- **Real-time Revenue Analytics**: Track revenue trends over time
- **Booking Status Breakdown**: Visualize confirmed vs provisional bookings
- **Top Sources Analysis**: Identify the most valuable booking channels
- **Revenue Extras Tracking**: Monitor additional revenue streams
- **Payment Status Monitoring**: Track payment completion rates
- **Responsive Design**: Works beautifully on all devices
- **Animated Charts**: Smooth, interactive visualizations using Recharts

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn

### Installation (First Time Setup)

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Process the booking data:**
   ```bash
   python process_booking_data.py
   ```
   
   This will generate `dashboard_data.json` from `bookingData.csv`

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Weekly Updates (Windows)

Simply run the update script:
```bash
update_dashboard.bat
```

Then restart the dev server:
```bash
npm run dev
```

## 📁 Project Structure

```
├── app/
│   ├── api/data/         # API endpoint for dashboard data
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main dashboard page
│   └── globals.css       # Global styles
├── components/
│   ├── DashboardLayout.tsx    # Main dashboard wrapper
│   ├── SummaryCards.tsx      # Summary statistics cards
│   ├── RevenueChart.tsx      # Revenue trends chart
│   ├── BookingStatusChart.tsx # Booking status pie chart
│   ├── TopSourcesChart.tsx   # Top booking sources bar chart
│   ├── TopExtrasChart.tsx    # Top revenue extras chart
│   └── PaymentStatusChart.tsx # Payment status pie chart
├── process_booking_data.py   # Python data processing script
├── bookingData.csv           # Raw booking data (not in git)
└── dashboard_data.json       # Processed data for dashboard
```

## 🔄 Weekly Data Updates

To process new booking data each week:

1. **Replace the booking data:**
   - Update `bookingData.csv` with the new export
   
2. **Run the processing script:**
   ```bash
   python process_booking_data.py
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

## 📦 Building for Production

1. **Build the Next.js application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion (animations)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Data Processing**: Python, Pandas, NumPy

## 📊 Dashboard Components

### Summary Cards
- Total Revenue
- Total Bookings
- Bed Nights
- Total Guests (PAX)

### Charts
- Revenue Trends (Line Chart)
- Booking Status Distribution (Pie Chart)
- Top Booking Sources (Horizontal Bar Chart)
- Top Revenue Extras (Bar Chart)
- Payment Status (Pie Chart)

## 🔒 Data Privacy

- CSV files are excluded from version control
- All data remains local to your machine
- No external services or APIs are used

## 📝 License

Internal use only - Baines River Camp

