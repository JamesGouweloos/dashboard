'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface DailyOccupancy {
  date: string
  total: number
  confirmed: number
  provisional: number
}

interface OccupancyChartProps {
  data: DailyOccupancy[]
  title?: string
}

export default function OccupancyChart({ data, title = 'Daily Occupancy Trends' }: OccupancyChartProps) {
  const [mode, setMode] = useState<'total' | 'breakdown'>('total')
  
  // Format data for chart - sample every Nth point for readability
  const sampleRate = Math.max(1, Math.floor(data.length / 100))
  const chartData = data.filter((_, index) => index % sampleRate === 0 || index === data.length - 1)
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden" role="group">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'total' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setMode('total')}
          >
            Total Occupancy
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
              mode === 'breakdown' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setMode('breakdown')}
          >
            Confirmed & Provisional
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis />
          <Tooltip 
            labelFormatter={formatDate}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
          <Legend />
          {mode === 'total' ? (
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Total Occupancy"
              dot={false}
            />
          ) : (
            <>
              <Line 
                type="monotone" 
                dataKey="confirmed" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Confirmed"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="provisional" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Provisional"
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

