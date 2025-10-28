'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Moon, Receipt, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RevenueEfficiencyChartProps {
  data: any
}

export default function RevenueEfficiencyChart({ data }: RevenueEfficiencyChartProps) {
  const [efficiencyMetric, setEfficiencyMetric] = useState<'guest' | 'night' | 'booking'>('guest')

  const getChartData = () => {
    if (!data?.revenue_trends) return []

    // revenue_trends structure: { "2021-07": { revenue: 1267.5, bookings: 1, bed_nights: 9 }, ... }
    return Object.entries(data.revenue_trends).map(([period, periodData]: [string, any]) => {
      let efficiency: number = 0
      const revenue = periodData.revenue || 0
      const bookings = periodData.bookings || 0
      const bedNights = periodData.bed_nights || 0

      // Note: "per guest" uses booking count since guest data not available in revenue_trends
      // All three metrics show average booking value in different contexts
      if (efficiencyMetric === 'guest') {
        // Average revenue per booking (interpreted as per party/guest group)
        efficiency = bookings > 0 ? revenue / bookings : 0
      } else if (efficiencyMetric === 'night') {
        // Average revenue per bed night
        efficiency = bedNights > 0 ? revenue / bedNights : 0
      } else {
        // Average revenue per booking
        efficiency = bookings > 0 ? revenue / bookings : 0
      }

      return {
        period,
        efficiency: parseFloat(efficiency.toFixed(2)),
      }
    }).sort((a, b) => a.period.localeCompare(b.period))
  }

  const chartData = getChartData()

  const getIcon = () => {
    switch (efficiencyMetric) {
      case 'guest': return <Users className="h-5 w-5 text-primary-600" />
      case 'night': return <Moon className="h-5 w-5 text-primary-600" />
      default: return <Receipt className="h-5 w-5 text-primary-600" />
    }
  }

  const getLabel = () => {
    switch (efficiencyMetric) {
      case 'guest': return 'Per Guest'
      case 'night': return 'Per Night'
      default: return 'Per Booking'
    }
  }

  const avgEfficiency = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length 
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <h2 className="text-xl font-semibold text-gray-900">Revenue Efficiency</h2>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          {(['guest', 'night', 'booking'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setEfficiencyMetric(metric)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                efficiencyMetric === metric
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {metric === 'guest' ? 'Per Guest' : metric === 'night' ? 'Per Night' : 'Per Booking'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">Average {getLabel()}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            ${avgEfficiency.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
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
            tickFormatter={(value) => `$${value.toFixed(0)}`}
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
          <Bar 
            dataKey="efficiency" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name={getLabel()}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

