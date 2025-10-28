'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

interface RevenueTrends {
  [key: string]: {
    revenue: number
    bookings: number
    bed_nights: number
  }
}

export default function RevenueChart({ data }: { data: RevenueTrends }) {
  // Convert to array and format for chart
  const chartData = Object.entries(data)
    .map(([month, values]) => ({
      month: month.replace('-', ' '),
      revenue: values.revenue,
      bookings: values.bookings,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Revenue Trends</h2>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#6B7280' }}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            tick={{ fill: '#6B7280' }}
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px' }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#0ea5e9" 
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

