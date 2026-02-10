'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

interface PropertyMonthlyData {
  [property: string]: {
    [month: string]: {
      total: number
      confirmed: number
      provisional: number
      average_daily: number
    }
  }
}

interface PropertyOccupancyChartProps {
  data: PropertyMonthlyData
  title?: string
}

export default function PropertyOccupancyChart({ data, title = 'Occupancy by Property' }: PropertyOccupancyChartProps) {
  // Get all properties and months
  const properties = Object.keys(data)
  const allMonths = new Set<string>()
  
  properties.forEach(prop => {
    Object.keys(data[prop]).forEach(month => allMonths.add(month))
  })
  
  const sortedMonths = Array.from(allMonths).sort()
  
  // Create chart data grouped by month
  const chartData = sortedMonths.map(month => {
    const monthData: any = { month, displayMonth: formatMonth(month) }
    properties.forEach(prop => {
      if (data[prop][month]) {
        monthData[prop] = data[prop][month].total
      } else {
        monthData[prop] = 0
      }
    })
    return monthData
  })

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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
          />
          <Legend />
          {properties.map((prop, index) => (
            <Bar 
              key={prop} 
              dataKey={prop} 
              fill={colors[index % colors.length]} 
              name={prop}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}



