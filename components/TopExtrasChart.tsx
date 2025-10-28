'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

interface ExtrasData {
  [key: string]: number
}

export default function TopExtrasChart({ data }: { data: ExtrasData }) {
  const chartData = Object.entries(data)
    .map(([name, revenue]) => ({
      name: name.length > 25 ? name.substring(0, 25) + '...' : name,
      revenue: revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Star className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Top Revenue Extras</h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 100 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: '#6B7280', fontSize: '10px' }}
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
          <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

