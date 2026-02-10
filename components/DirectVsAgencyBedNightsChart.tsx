'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Moon, Building2, Users } from 'lucide-react'

interface DirectVsAgencyBedNightsChartProps {
  data: any
  selectedYears: number[]
  availableYears: number[]
  agencyConfig: { agentToType: Record<string, 'Agent' | 'Direct'> } | null
  statusFilter: string
  classFilter: string
  metric: 'revenue' | 'bed_nights'
}

const COLORS = {
  Direct: '#22c55e', // Green
  Agent: '#3b82f6'   // Blue
}

export default function DirectVsAgencyBedNightsChart({
  data,
  selectedYears,
  availableYears,
  agencyConfig,
  statusFilter,
  classFilter,
  metric
}: DirectVsAgencyBedNightsChartProps) {
  
  const chartData = useMemo(() => {
    if (!data?.monthly_bookings) return { 
      yearly: [], 
      yoyIncrease: [],
      ratioChange: [],
      total: { Direct: 0, Agent: 0 },
      pieData: [
        { name: 'Direct', value: 0 },
        { name: 'Agent', value: 0 }
      ]
    }

    const yearlyData: Record<number, { Direct: number; Agent: number }> = {}
    const totalData = { Direct: 0, Agent: 0 }
    const yearsToUse = selectedYears.length > 0 ? selectedYears : availableYears

    // Helper function to get agency type (defaults to 'Agent')
    const getAgentType = (agent: string): 'Agent' | 'Direct' => {
      if (!agencyConfig || !agencyConfig.agentToType) return 'Agent'
      return agencyConfig.agentToType[agent] || 'Agent'
    }

    // Process all years (we'll filter the output later)
    Object.entries(data.monthly_bookings).forEach(([yearStr, yearData]: [string, any]) => {
      const year = parseInt(yearStr)
      if (isNaN(year)) return

      if (!yearlyData[year]) {
        yearlyData[year] = { Direct: 0, Agent: 0 }
      }

      if (yearData && typeof yearData === 'object') {
        Object.values(yearData).forEach((monthBookings: any) => {
          if (!Array.isArray(monthBookings)) return
          monthBookings.forEach((booking: any) => {
            // Apply status filter
            if (statusFilter !== 'All') {
              const status = booking.Status || booking.status || booking['Booking Status']
              if (status !== statusFilter) return
            }

            // Apply class filter
            if (classFilter !== 'All') {
              const bookingClass = booking['Booking Class'] || booking.booking_class || booking.Booking_Class
              if (bookingClass !== classFilter) return
            }

            const agent = booking.Agent || booking.agent || 'Unknown'
            if (agent === 'Unknown') return

            const agentType = getAgentType(agent)
            
            // Calculate value based on metric
            let value = 0
            if (metric === 'revenue') {
              value = parseFloat(booking['Revenue Total'] || booking.revenue_total || 0) || 0
            } else {
              value = parseFloat(booking['Bed nights'] || booking.bed_nights || 0) || 0
            }
            
            if (value > 0) {
              yearlyData[year][agentType] += value
              totalData[agentType] += value
            }
          })
        })
      }
    })

    // Convert to array format for chart, filtering by selected years
    const yearlyArray = Object.entries(yearlyData)
      .map(([year, values]) => ({
        year: parseInt(year),
        Direct: values.Direct,
        Agent: values.Agent,
        Total: values.Direct + values.Agent
      }))
      .filter(item => yearsToUse.length === 0 || yearsToUse.includes(item.year))
      .sort((a, b) => a.year - b.year)

    // Calculate YoY % increase
    const yoyIncrease = yearlyArray.map((item, index) => {
      if (index === 0) {
        return {
          year: item.year,
          Direct: 0,
          Agent: 0
        }
      }
      const prevYear = yearlyArray[index - 1]
      const directChange = prevYear.Direct > 0 
        ? ((item.Direct - prevYear.Direct) / prevYear.Direct) * 100 
        : 0
      const agentChange = prevYear.Agent > 0 
        ? ((item.Agent - prevYear.Agent) / prevYear.Agent) * 100 
        : 0
      return {
        year: item.year,
        Direct: directChange,
        Agent: agentChange
      }
    })

    // Calculate % change in Direct/Agency ratio
    const ratioChange = yearlyArray.map((item, index) => {
      if (index === 0) {
        return {
          year: item.year,
          ratioChange: 0
        }
      }
      const prevYear = yearlyArray[index - 1]
      const prevRatio = prevYear.Agent > 0 ? prevYear.Direct / prevYear.Agent : 0
      const currentRatio = item.Agent > 0 ? item.Direct / item.Agent : 0
      const ratioChangePercent = prevRatio > 0 
        ? ((currentRatio - prevRatio) / prevRatio) * 100 
        : 0
      return {
        year: item.year,
        ratioChange: ratioChangePercent
      }
    })

    // Recalculate totals based on filtered years
    const filteredTotal = { Direct: 0, Agent: 0 }
    yearlyArray.forEach(item => {
      filteredTotal.Direct += item.Direct
      filteredTotal.Agent += item.Agent
    })

    return {
      yearly: yearlyArray,
      yoyIncrease: yoyIncrease,
      ratioChange: ratioChange,
      total: filteredTotal,
      pieData: [
        { name: 'Direct', value: filteredTotal.Direct },
        { name: 'Agent', value: filteredTotal.Agent }
      ]
    }
  }, [data, selectedYears, availableYears, agencyConfig, statusFilter, classFilter, metric])

  const totalValue = chartData.total.Direct + chartData.total.Agent
  const directPercentage = totalValue > 0 ? (chartData.total.Direct / totalValue * 100).toFixed(1) : '0'
  const agentPercentage = totalValue > 0 ? (chartData.total.Agent / totalValue * 100).toFixed(1) : '0'
  
  const formatValue = (value: number) => {
    if (metric === 'revenue') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString('en-US')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Moon className="h-5 w-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Direct vs Agency {metric === 'revenue' ? 'Revenue' : 'Bed Nights'}
          </h2>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Direct Bookings</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatValue(chartData.total.Direct)}
              </p>
              <p className="text-sm text-green-600 mt-1">{directPercentage}% of total</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Agency Bookings</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {formatValue(chartData.total.Agent)}
              </p>
              <p className="text-sm text-blue-600 mt-1">{agentPercentage}% of total</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yearly Comparison Bar Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Yearly Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="year" 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (metric === 'revenue') {
                    return `$${(value / 1000).toFixed(0)}k`
                  }
                  return value.toLocaleString()
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => {
                  if (metric === 'revenue') {
                    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                  return value.toLocaleString('en-US')
                }}
              />
              <Legend />
              <Bar dataKey="Direct" fill={COLORS.Direct} name="Direct" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Agent" fill={COLORS.Agent} name="Agent" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* YoY % Increase Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">YoY % Increase vs Previous Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.yoyIncrease}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="year" 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
              />
              <Legend />
              <Bar dataKey="Direct" fill={COLORS.Direct} name="Direct" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Agent" fill={COLORS.Agent} name="Agent" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Direct vs Agency Ratio Change Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">% Change in Direct/Agency Ratio</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.ratioChange}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="year" 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
              />
              <Bar dataKey="ratioChange" fill="#8b5cf6" name="Ratio Change" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart - Full Width Below */}
      {chartData.pieData && chartData.pieData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Total Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Direct' ? COLORS.Direct : COLORS.Agent} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => {
                  if (metric === 'revenue') {
                    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                  return value.toLocaleString('en-US')
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

