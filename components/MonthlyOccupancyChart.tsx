'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

interface MonthlyData {
  [month: string]: {
    total: number
    confirmed: number
    provisional: number
    average_daily: number
  }
}

interface MonthlyOccupancyChartProps {
  data: MonthlyData
  title?: string
}

export default function MonthlyOccupancyChart({ data, title = 'Monthly Occupancy Breakdown' }: MonthlyOccupancyChartProps) {
  // Convert object to array and sort by date
  const chartData = Object.entries(data)
    .map(([month, values]) => ({
      month,
      displayMonth: formatMonth(month),
      ...values
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="displayMonth" 
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            formatter={(value: number) => value.toFixed(1)}
          />
          <Legend />
          <Bar dataKey="total" fill="#3b82f6" name="Total Occupancy" />
          <Bar dataKey="confirmed" fill="#10b981" name="Confirmed" />
          <Bar dataKey="provisional" fill="#f59e0b" name="Provisional" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}



