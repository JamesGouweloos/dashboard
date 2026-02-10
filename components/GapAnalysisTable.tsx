'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingDown, AlertCircle, DollarSign, Target } from 'lucide-react'

interface DailyOccupancy {
  date: string
  total: number
  confirmed: number
  provisional: number
}

interface GapPeriod {
  startDate: string
  endDate: string
  duration: number
  minAvailable: number
  maxAvailable: number
  avgAvailable: number
  avgOccupancy: number
  totalDays: number
}

interface GapAnalysisTableProps {
  data: DailyOccupancy[]
}

const TOTAL_ROOMS = 9 // 6 Luxury Suites + 2 Junior Suites + 1 Family Suite
const MIN_AVAILABLE_THRESHOLD = 4 // More than 4 rooms available

type PeriodType = {
  startDate: string
  endDate: string
  dates: string[]
  occupancies: number[]
}

export default function GapAnalysisTable({ data }: GapAnalysisTableProps) {
  const [sortBy, setSortBy] = useState<'duration' | 'available' | 'date'>('date')
  const [minDuration, setMinDuration] = useState(1)

  // Helper function to close a period
  const closePeriod = (period: PeriodType | null, periods: GapPeriod[], minDuration: number): void => {
    if (period && period.dates.length >= minDuration) {
      const availabilities = period.occupancies.map(occ => TOTAL_ROOMS - occ)
      periods.push({
        startDate: period.startDate,
        endDate: period.endDate,
        duration: period.dates.length,
        minAvailable: Math.min(...availabilities),
        maxAvailable: Math.max(...availabilities),
        avgAvailable: availabilities.reduce((a, b) => a + b, 0) / availabilities.length,
        avgOccupancy: period.occupancies.reduce((a, b) => a + b, 0) / period.occupancies.length,
        totalDays: period.dates.length
      })
    }
  }

  // Calculate gaps and periods
  const gapPeriods = useMemo(() => {
    if (!data || data.length === 0) return []

    const periods: GapPeriod[] = []
    let currentPeriod: PeriodType | null = null

    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    sortedData.forEach(day => {
      const available = TOTAL_ROOMS - day.total
      
      if (available > MIN_AVAILABLE_THRESHOLD) {
        // Start or continue a period
        if (!currentPeriod) {
          currentPeriod = {
            startDate: day.date,
            endDate: day.date,
            dates: [day.date],
            occupancies: [day.total]
          }
        } else {
          // Check if this date is consecutive
          const lastDate = new Date(currentPeriod.endDate)
          const currentDate = new Date(day.date)
          const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff === 1) {
            // Consecutive - extend period
            currentPeriod.endDate = day.date
            currentPeriod.dates.push(day.date)
            currentPeriod.occupancies.push(day.total)
          } else {
            // Gap - save current period and start new one
            closePeriod(currentPeriod, periods, minDuration)
            currentPeriod = {
              startDate: day.date,
              endDate: day.date,
              dates: [day.date],
              occupancies: [day.total]
            }
          }
        }
      } else {
        // End current period if exists
        closePeriod(currentPeriod, periods, minDuration)
        currentPeriod = null
      }
    })

    // Don't forget the last period
    closePeriod(currentPeriod, periods, minDuration)

    // Sort periods
    return periods.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return b.duration - a.duration
        case 'available':
          return b.avgAvailable - a.avgAvailable
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        default:
          return 0
      }
    })
  }, [data, sortBy, minDuration])

  // Calculate promotional insights
  const insights = useMemo(() => {
    if (gapPeriods.length === 0) return null

    const totalGapDays = gapPeriods.reduce((sum, p) => sum + p.duration, 0)
    const longestPeriod = gapPeriods[0]
    const avgGapDuration = totalGapDays / gapPeriods.length
    const highAvailabilityPeriods = gapPeriods.filter(p => p.avgAvailable >= 7).length

    return {
      totalGapDays,
      totalPeriods: gapPeriods.length,
      longestPeriod,
      avgGapDuration,
      highAvailabilityPeriods,
      potentialRevenue: totalGapDays * 5 * 300 // Estimate: 5 rooms * $300/night
    }
  }, [gapPeriods])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatDateRange = (start: string, end: string) => {
    if (start === end) {
      return formatDate(start)
    }
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Target className="h-6 w-6 text-primary-600" />
          <h3 className="text-xl font-semibold text-gray-800">Gap Analysis & Promotional Opportunities</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Min Duration:</label>
            <select
              value={minDuration}
              onChange={(e) => setMinDuration(parseInt(e.target.value))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value={1}>1+ days</option>
              <option value={3}>3+ days</option>
              <option value={7}>7+ days</option>
              <option value={14}>14+ days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'duration' | 'available' | 'date')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="date">Date</option>
              <option value="duration">Duration</option>
              <option value="available">Available Rooms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insights Summary */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{insights.totalPeriods}</p>
            <p className="text-sm text-gray-600">Gap Periods</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{insights.totalGapDays}</p>
            <p className="text-sm text-gray-600">Total Gap Days</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{insights.longestPeriod.duration}</p>
            <p className="text-sm text-gray-600">Longest Gap (days)</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${(insights.potentialRevenue / 1000).toFixed(0)}k</p>
            <p className="text-sm text-gray-600">Est. Revenue Potential</p>
          </div>
        </div>
      )}

      {/* Periods Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available Rooms
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Occupancy
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Opportunity
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {gapPeriods.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No periods found with more than {MIN_AVAILABLE_THRESHOLD} rooms available
                </td>
              </tr>
            ) : (
              gapPeriods.map((period, index) => {
                const opportunityLevel = period.avgAvailable >= 7 ? 'high' : period.avgAvailable >= 6 ? 'medium' : 'low'
                
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDateRange(period.startDate, period.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {period.duration} {period.duration === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="font-semibold">{period.avgAvailable.toFixed(1)}</span>
                        <span className="text-gray-500 text-xs ml-1">
                          (min: {period.minAvailable}, max: {period.maxAvailable})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {period.avgOccupancy.toFixed(1)} / {TOTAL_ROOMS}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        opportunityLevel === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : opportunityLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {opportunityLevel === 'high' ? '🔥 High Priority' : 
                         opportunityLevel === 'medium' ? '⚡ Medium Priority' : 
                         '💡 Low Priority'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Promotional Recommendations */}
      {gapPeriods.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-semibold text-amber-900 mb-2">💡 Promotional Recommendations</h4>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Focus promotional campaigns on {insights?.longestPeriod.duration}-day gaps for maximum impact</li>
            <li>Consider last-minute deals for periods with 7+ rooms available</li>
            <li>Target confirmed bookings to fill {insights?.highAvailabilityPeriods} high-availability periods</li>
            <li>Estimated revenue potential: ${(insights?.potentialRevenue || 0).toLocaleString()} from filling gap periods</li>
          </ul>
        </div>
      )}
    </motion.div>
  )
}

