'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'

interface SourceData {
  [key: string]: {
    count: number
    revenue: number
    bed_nights: number
  }
}

export default function TopSourcesChart({ data }: { data: SourceData }) {
  // Get top 10 sources by revenue
  const chartData = Object.entries(data)
    .map(([source, values]) => ({
      source: source.length > 20 ? source.substring(0, 20) + '...' : source,
      revenue: values.revenue,
      bookings: values.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Globe className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Top Booking Sources</h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            tick={{ fill: '#6B7280' }}
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <YAxis 
            dataKey="source" 
            type="category"
            tick={{ fill: '#6B7280', fontSize: '11px' }}
            width={150}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px' }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

