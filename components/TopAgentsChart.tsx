'use client'

import { motion } from 'framer-motion'
import { User, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface TopAgentsChartProps {
  data: any
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function TopAgentsChart({ data }: TopAgentsChartProps) {
  // Extract agent data
  const getAgentData = () => {
    if (!data?.by_agent) return []

    return Object.entries(data.by_agent)
      .map(([agent, stats]: [string, any]) => ({
        agent,
        revenue: stats.revenue || 0,
        bookings: stats.count || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10 agents
  }

  const agentData = getAgentData()
  const totalRevenue = agentData.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Top Performing Agents</h2>
        </div>
      </div>

      <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-gray-600">Total from Top Agents</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={agentData}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            type="number"
            stroke="#6b7280"
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            type="category" 
            dataKey="agent" 
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'revenue') return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              return value
            }}
          />
          <Legend />
          <Bar 
            dataKey="revenue" 
            name="Revenue"
            radius={[0, 8, 8, 0]}
          >
            {agentData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing top 10 agents by revenue
      </div>
    </motion.div>
  )
}

