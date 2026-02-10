'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { CreditCard } from 'lucide-react'

interface PaymentStatus {
  fully_paid: number
  partially_paid: number
  unpaid: number
  overpaid: number
}

export default function PaymentStatusChart({ data }: { data: PaymentStatus }) {
  // Handle undefined/null data
  if (!data || typeof data !== 'object') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-2 mb-6">
          <CreditCard className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Payment Status</h2>
        </div>
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No data available
        </div>
      </motion.div>
    )
  }

  const chartData = [
    { name: 'Fully Paid', value: data.fully_paid || 0 },
    { name: 'Partially Paid', value: data.partially_paid || 0 },
    { name: 'Unpaid', value: data.unpaid || 0 },
    { name: 'Overpaid', value: data.overpaid || 0 },
  ].filter(item => item.value > 0)

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <CreditCard className="h-5 w-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Payment Status</h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

