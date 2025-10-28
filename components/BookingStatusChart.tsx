'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'

interface BookingStatus {
  [key: string]: {
    count: number
    revenue: number
    bed_nights: number
    pax: number
  }
}

export default function BookingStatusChart({ data }: { data: BookingStatus }) {
  const chartData = Object.entries(data).map(([status, values]) => ({
    name: status,
    value: values.count,
    revenue: values.revenue
  }))

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <FileText className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Booking Status</h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

