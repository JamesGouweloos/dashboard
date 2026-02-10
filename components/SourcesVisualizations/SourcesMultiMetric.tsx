'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'

interface SourceData {
  [key: string]: {
    count: number
    revenue: number
    bed_nights: number
    agency?: { count: number; revenue: number; bed_nights: number }
    direct?: { count: number; revenue: number; bed_nights: number }
  }
}

interface AgencyDirectData {
  [key: string]: {
    agency: { count: number; revenue: number; bed_nights: number }
    direct: { count: number; revenue: number; bed_nights: number }
  }
}

export default function SourcesMultiMetric({ data, agencyDirectData }: { data: SourceData; agencyDirectData?: AgencyDirectData }) {
  if (!data || typeof data !== 'object') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Multi-Metric Comparison</h2>
        </div>
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          No data available
        </div>
      </motion.div>
    )
  }

  const chartData = Object.entries(data)
    .map(([source, values]) => {
      const agencyInfo = agencyDirectData?.[source]?.agency || values.agency || { count: 0, revenue: 0, bed_nights: 0 }
      const directInfo = agencyDirectData?.[source]?.direct || values.direct || { count: values.count || 0, revenue: values.revenue || 0, bed_nights: values.bed_nights || 0 }
      
      return {
        source: source.length > 20 ? source.substring(0, 20) + '...' : source,
        fullSource: source,
        revenue: values.revenue,
        bookings: values.count,
        bedNights: values.bed_nights,
        revenuePerBooking: values.count > 0 ? values.revenue / values.count : 0,
        // Agency/Direct breakdown for tooltip
        agencyRevenue: agencyInfo.revenue || 0,
        directRevenue: directInfo.revenue || 0,
        agencyBookings: agencyInfo.count || 0,
        directBookings: directInfo.count || 0,
        agencyBedNights: agencyInfo.bed_nights || 0,
        directBedNights: directInfo.bed_nights || 0
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Normalize data for comparison (scale to 0-100)
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)
  const maxBookings = Math.max(...chartData.map(d => d.bookings), 1)
  const maxBedNights = Math.max(...chartData.map(d => d.bedNights), 1)

  const normalizedData = chartData.map(d => ({
    ...d,
    revenueNormalized: (d.revenue / maxRevenue) * 100,
    bookingsNormalized: (d.bookings / maxBookings) * 100,
    bedNightsNormalized: (d.bedNights / maxBedNights) * 100
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.fullSource}</p>
          <div className="space-y-1">
            <p className="text-primary-600">
              Revenue: <span className="font-medium">${data.revenue.toLocaleString()}</span>
            </p>
            <div className="pl-2 border-l-2 border-blue-400 text-sm">
              <p className="text-blue-600">
                Agency: <span className="font-medium">${data.agencyRevenue.toLocaleString()}</span> ({data.agencyBookings} bookings)
              </p>
              <p className="text-green-600">
                Direct: <span className="font-medium">${data.directRevenue.toLocaleString()}</span> ({data.directBookings} bookings)
              </p>
            </div>
            <p className="text-green-600">
              Bookings: <span className="font-medium">{data.bookings}</span>
            </p>
            <p className="text-purple-600">
              Bed Nights: <span className="font-medium">{data.bedNights}</span>
            </p>
            <p className="text-orange-600 text-sm mt-2 pt-2 border-t">
              Avg/Booking: <span className="font-medium">${data.revenuePerBooking.toFixed(0)}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Multi-Metric Comparison</h2>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={normalizedData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#6B7280' }}
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            dataKey="source" 
            type="category"
            tick={{ fill: '#6B7280', fontSize: '11px' }}
            width={150}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => {
              const labels: { [key: string]: string } = {
                revenueNormalized: 'Revenue',
                bookingsNormalized: 'Bookings',
                bedNightsNormalized: 'Bed Nights'
              }
              return labels[value] || value
            }}
          />
          <Bar dataKey="revenueNormalized" fill="#0ea5e9" name="Revenue" radius={[0, 4, 4, 0]} />
          <Bar dataKey="bookingsNormalized" fill="#22c55e" name="Bookings" radius={[0, 4, 4, 0]} />
          <Bar dataKey="bedNightsNormalized" fill="#a855f7" name="Bed Nights" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-xs text-gray-500 text-center">
        Values normalized to 0-100% scale for comparison. Hover over bars to see Agency vs Direct breakdown.
      </div>
    </motion.div>
  )
}
