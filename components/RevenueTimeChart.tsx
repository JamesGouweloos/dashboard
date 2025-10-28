'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RevenueTimeChartProps {
  data: any
}

export default function RevenueTimeChart({ data }: RevenueTimeChartProps) {
  const [timeRange, setTimeRange] = useState<'year' | 'quarter' | 'month'>('month')

  // Transform data based on selected time range
  const getChartData = () => {
    if (!data?.revenue_trends) return []

    const dataMap = new Map<string, number>()

    // revenue_trends structure: { "2021-07": { revenue: 1267.5, bookings: 1, bed_nights: 9 }, ... }
    Object.entries(data.revenue_trends).forEach(([period, periodData]: [string, any]) => {
      const [year, month] = period.split('-')
      let key: string
      let revenue = periodData.revenue || 0

      if (timeRange === 'year') {
        key = year
        const existing = dataMap.get(key) || 0
        dataMap.set(key, existing + revenue)
      } else if (timeRange === 'quarter') {
        const quarter = Math.ceil(parseInt(month) / 3)
        key = `${year} Q${quarter}`
        const existing = dataMap.get(key) || 0
        dataMap.set(key, existing + revenue)
      } else {
        key = period
        dataMap.set(key, revenue)
      }
    })

    return Array.from(dataMap.entries())
      .map(([period, revenue]) => ({
        period,
        revenue
      }))
      .sort((a, b) => {
        if (timeRange === 'year') return a.period.localeCompare(b.period)
        if (timeRange === 'quarter') {
          const [yearA, qA] = a.period.split(' Q')
          const [yearB, qB] = b.period.split(' Q')
          return yearA.localeCompare(yearB) || parseInt(qA) - parseInt(qB)
        }
        return a.period.localeCompare(b.period)
      })
  }

  const chartData = getChartData()
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Revenue Over Time</h2>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          {(['year', 'quarter', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary-600" />
            <span className="text-sm text-gray-600">Total Revenue</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="period" 
            stroke="#6b7280"
            tick={{ fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            stroke="#6b7280"
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

